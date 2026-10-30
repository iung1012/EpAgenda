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
}
