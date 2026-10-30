import { createClient } from '../internal-client.ts';
import { corsHeaders, json, requireAdmin, evoFetch } from "./_shared/whatsapp.js";
export default async function handler(req) {
    if (req.method === "OPTIONS")
        return new Response("ok", { headers: corsHeaders });
    const auth = await requireAdmin(req);
    if ("error" in auth)
        return auth.error;
    const supabaseUrl = process.env.APP_INTERNAL_URL;
    const admin = createClient(supabaseUrl, process.env.INTERNAL_SERVICE_KEY);
    const { data: cfg } = await admin.from("whatsapp_config").select("*").eq("singleton", true).maybeSingle();
    if (!cfg?.instance_name)
        return json({ status: "disconnected" });
    const res = await evoFetch(`/instance/connectionState/${encodeURIComponent(cfg.instance_name)}`);
    // deno-lint-ignore no-explicit-any
    const body = res.body;
    const state = body?.instance?.state ?? body?.state ?? "unknown";
    const mapped = state === "open" ? "connected" : state === "close" ? "disconnected" : "connecting";
    await admin.from("whatsapp_config").update({ status: mapped }).eq("singleton", true);
    return json({ status: mapped, raw: state });
}
