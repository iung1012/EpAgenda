import { createClient } from '../internal-client.ts';
import { corsHeaders, json } from "./_shared/whatsapp.js";
import { db } from '../db.ts';
export default async function handler(req) {
    if (req.method === "OPTIONS")
        return new Response("ok", { headers: corsHeaders });
    const url = new URL(req.url);
    const providedSecret = url.searchParams.get("secret");
    if (providedSecret !== process.env.EVOLUTION_WEBHOOK_SECRET) {
        return json({ error: "Unauthorized" }, 401);
    }
    const payload = await req.json().catch(() => null);
    if (!payload)
        return json({ error: "Invalid payload" }, 400);
    const admin = createClient(process.env.APP_INTERNAL_URL, process.env.INTERNAL_SERVICE_KEY);
    // deno-lint-ignore no-explicit-any
    const p = payload;
    const event = p.event ?? p.type;
    const instance = p.instance ?? p.instanceName ?? p.data?.instance;
    const cfg = await db.whatsapp_config.findFirst({where:{singleton:true}});
    if (!cfg || cfg.instance_name !== instance) return json({ok:true,ignored:true});
    if (event === "connection.update" || event === "CONNECTION_UPDATE") {
        const state = p.data?.state ?? p.data?.connection ?? p.state;
        const phone = p.data?.wuid?.split("@")[0] ?? p.data?.phone ?? p.data?.owner ?? null;
        const mapped = state === "open" ? "connected" : state === "close" ? "disconnected" : "connecting";
        await admin.from("whatsapp_config").update({
            status: mapped,
            ...(phone ? { phone_connected: phone } : {}),
        }).eq("singleton", true).eq("instance_name", instance ?? "");
    }
    if (event === "messages.upsert" || event === "MESSAGES_UPSERT") {
        const msg = p.data;
        const fromMe = msg?.key?.fromMe;
        const remoteJid = msg?.key?.remoteJid;
        // Ignore group messages and our own sends
        if (!fromMe && remoteJid && !remoteJid.includes("@g.us")) {
            const text = msg?.message?.conversation ??
                msg?.message?.extendedTextMessage?.text ??
                msg?.message?.imageMessage?.caption ??
                undefined;
            const phone = remoteJid.split("@")[0].replace(/\D/g, "");
            if (text && phone) {
                // Only respond to authorized recipients
                const { data: allowed } = await admin
                    .from("whatsapp_recipients")
                    .select("phone")
                    .eq("active", true);
                const ok = (allowed ?? []).some((r) => r.phone.replace(/\D/g, "") === phone);
                if (ok) {
                    if (!process.env.OPENAI_API_KEY) return json({error:'Assistente de IA ainda não configurado'},503);
                    const messageId = msg?.key?.id;
                    if (!messageId) return json({error:'Identificador de mensagem ausente'},400);
                    try { await db.webhook_receipts.create({data:{id:`${instance}:${messageId}`}}); }
                    catch (error) { if(error.code==='P2002')return json({ok:true,duplicate:true}); throw error; }
                    // Claim the provider message once before processing it.
                    const url = `${process.env.APP_INTERNAL_URL}/api/functions/whatsapp-ai`;
                    await fetch(url, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            "x-internal-secret": process.env.CRON_SECRET ?? "",
                        },
                        body: JSON.stringify({ phone, text }),
                    }).then(response => { if (!response.ok)
                        throw new Error('AI handler failed: ' + response.status); });
                }
            }
        }
    }
    return json({ ok: true });
}
