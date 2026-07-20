import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, json, requireAdmin, evoFetch } from "../_shared/whatsapp.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const auth = await requireAdmin(req);
  if ("error" in auth) return auth.error;

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const admin = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: cfg } = await admin.from("whatsapp_config").select("*").eq("singleton", true).maybeSingle();
  if (!cfg?.instance_name) return json({ status: "disconnected" });

  const res = await evoFetch(`/instance/connectionState/${encodeURIComponent(cfg.instance_name)}`);
  // deno-lint-ignore no-explicit-any
  const body: any = res.body;
  const state = body?.instance?.state ?? body?.state ?? "unknown";
  const mapped = state === "open" ? "connected" : state === "close" ? "disconnected" : "connecting";

  await admin.from("whatsapp_config").update({ status: mapped }).eq("singleton", true);
  return json({ status: mapped, raw: state });
});