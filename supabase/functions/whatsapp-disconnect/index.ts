import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, json, requireAdmin, evoFetch } from "../_shared/whatsapp.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const auth = await requireAdmin(req);
  if ("error" in auth) return auth.error;

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const admin = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: cfg } = await admin.from("whatsapp_config").select("*").eq("singleton", true).maybeSingle();
  if (cfg?.instance_name) {
    await evoFetch(`/instance/logout/${encodeURIComponent(cfg.instance_name)}`, { method: "DELETE" });
    await evoFetch(`/instance/delete/${encodeURIComponent(cfg.instance_name)}`, { method: "DELETE" });
  }
  await admin.from("whatsapp_config").update({
    instance_name: null,
    status: "disconnected",
    phone_connected: null,
  }).eq("singleton", true);
  return json({ ok: true });
});