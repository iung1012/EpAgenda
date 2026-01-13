import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting process-visits function...');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Calculate the cutoff time (1 hour ago)
    const oneHourAgo = new Date();
    oneHourAgo.setHours(oneHourAgo.getHours() - 1);

    console.log(`Looking for visits before: ${oneHourAgo.toISOString()}`);

    // Find visits that:
    // - Are past their scheduled time by 1+ hour
    // - Are not cancelled
    // - Are not already completed (realizada)
    const { data: pendingVisits, error: fetchError } = await supabase
      .from('filmmaker_visits')
      .select('*')
      .lt('visit_date', oneHourAgo.toISOString())
      .neq('status', 'cancelada')
      .neq('status', 'realizada');

    if (fetchError) {
      console.error('Error fetching visits:', fetchError);
      throw fetchError;
    }

    console.log(`Found ${pendingVisits?.length || 0} visits to process`);

    if (!pendingVisits || pendingVisits.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No visits to process', processed: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let processedCount = 0;
    let demandsCreated = 0;

    for (const visit of pendingVisits) {
      console.log(`Processing visit: ${visit.id} - ${visit.title}`);

      // Update visit status to 'realizada'
      const { error: updateError } = await supabase
        .from('filmmaker_visits')
        .update({ status: 'realizada' })
        .eq('id', visit.id);

      if (updateError) {
        console.error(`Error updating visit ${visit.id}:`, updateError);
        continue;
      }

      processedCount++;
      console.log(`Visit ${visit.id} marked as completed`);

      // Check if a demand already exists for this visit
      const { data: existingDemand } = await supabase
        .from('filmmaker_demands')
        .select('id')
        .eq('visit_id', visit.id)
        .maybeSingle();

      if (existingDemand) {
        console.log(`Demand already exists for visit ${visit.id}, skipping creation`);
        continue;
      }

      // Create a demand for this visit
      const demandData = {
        title: `Demanda: ${visit.title}`,
        description: visit.description || `Demanda gerada automaticamente da visita "${visit.title}"`,
        filmmaker_id: visit.filmmaker_id,
        client_id: visit.client_id,
        visit_id: visit.id,
        status: 'em_processo',
        due_date: null, // Can be set later by the user
      };

      const { error: demandError } = await supabase
        .from('filmmaker_demands')
        .insert(demandData);

      if (demandError) {
        console.error(`Error creating demand for visit ${visit.id}:`, demandError);
        continue;
      }

      demandsCreated++;
      console.log(`Demand created for visit ${visit.id}`);
    }

    const result = {
      message: 'Visits processed successfully',
      processed: processedCount,
      demandsCreated: demandsCreated,
      totalVisitsChecked: pendingVisits.length,
    };

    console.log('Process completed:', result);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in process-visits function:', error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
