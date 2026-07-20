import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, json, requireAdmin, evoFetch } from "../_shared/whatsapp.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const auth = await requireAdmin(req);
  if ("error" in auth) return auth.error;

  const { instanceName } = await req.json().catch(() => ({}));
  if (!instanceName || typeof instanceName !== "string") {
    return json({ error: "instanceName obrigatório" }, 400);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const secret = Deno.env.get("EVOLUTION_WEBHOOK_SECRET")!;
  const webhookUrl = `${supabaseUrl}/functions/v1/whatsapp-webhook?secret=${secret}`;

  // Try to create the instance; if it exists, connect instead to grab a new QR
  let qrcode: string | null = null;
  let status = "connecting";

  const create = await evoFetch(`/instance/create`, {
    method: "POST",
    body: JSON.stringify({
      instanceName,
      integration: "WHATSAPP-BAILEYS",
      qrcode: true,
      webhook: {
        url: webhookUrl,
        byEvents: false,
        base64: false,
        events: ["CONNECTION_UPDATE", "QRCODE_UPDATED", "MESSAGES_UPSERT"],
      },
    }),
  });

  if (create.ok) {
    // deno-lint-ignore no-explicit-any
    const body: any = create.body;
    qrcode = body?.qrcode?.base64 ?? null;
  } else {
    // Restart an existing Baileys session before requesting a new connection.
    // An instance can report `open` while its outbound socket is stale and all
    // accepted messages immediately change to ERROR.
    let restarted = await evoFetch(`/instance/restart/${encodeURIComponent(instanceName)}`, {
      method: "POST",
    });
    // Older Evolution releases expose the same endpoint as PUT.
    if (!restarted.ok) {
      restarted = await evoFetch(`/instance/restart/${encodeURIComponent(instanceName)}`, {
        method: "PUT",
      });
    }
    if (!restarted.ok && restarted.status !== 404) {
      console.error("[whatsapp-connect] failed to restart existing instance", {
        status: restarted.status,
        body: restarted.body,
      });
    }

    const conn = await evoFetch(`/instance/connect/${encodeURIComponent(instanceName)}`);
    if (!conn.ok) {
      return json({ error: "Falha ao criar/conectar instância", detail: create.body ?? conn.body }, 500);
    }
    // deno-lint-ignore no-explicit-any
    const body: any = conn.body;
    qrcode = body?.base64 ?? body?.qrcode?.base64 ?? null;
  }

  // Ensure the webhook config includes MESSAGES_UPSERT (needed for the AI chat).
  // Safe to call every connect; Evolution upserts the webhook config.
  await evoFetch(`/webhook/set/${encodeURIComponent(instanceName)}`, {
    method: "POST",
    body: JSON.stringify({
      webhook: {
        enabled: true,
        url: webhookUrl,
        byEvents: false,
        base64: false,
        events: ["CONNECTION_UPDATE", "QRCODE_UPDATED", "MESSAGES_UPSERT"],
      },
    }),
  });

  const admin = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  await admin.from("whatsapp_config").update({
    instance_name: instanceName,
    status,
  }).eq("singleton", true);

  return json({ qrcode, status });
});