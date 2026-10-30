// Shared helpers for Evolution API + admin auth
import { createClient } from '../../internal-client.ts';
import { integrationContext } from '../../context.ts';
import { isManager } from '../../auth.ts';
export const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
export function json(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
}
export async function requireAdmin(req) {
    const actor = integrationContext.getStore()?.actor;
    if (!actor) return { error: json({error:'Unauthorized'},401) };
    if (!isManager(actor)) return { error: json({error:'Forbidden'},403) };
    if (!process.env.EVOLUTION_API_URL || !process.env.EVOLUTION_API_KEY) return { error: json({error:'Configure a integração do WhatsApp no servidor'},503) };
    return { userId: actor.id, admin: createClient() };
}
export function evoBase() {
    return (process.env.EVOLUTION_API_URL ?? "").replace(/\/$/, "");
}
export async function evoFetch(path, init = {}) {
    const url = `${evoBase()}${path}`;
    const res = await fetch(url, {
        ...init,
        headers: {
            "Content-Type": "application/json",
            apikey: process.env.EVOLUTION_API_KEY ?? "",
            ...(init.headers ?? {}),
        },
    });
    const text = await res.text();
    let body = text;
    try {
        body = JSON.parse(text);
    }
    catch { /* keep as text */ }
    return { ok: res.ok, status: res.status, body };
}
export function normalizePhone(phone) {
    return phone.replace(/\D/g, "");
}
export async function resolveWhatsappNumber(instance, phone) {
    const normalized = normalizePhone(phone);
    const result = await evoFetch(`/chat/whatsappNumbers/${encodeURIComponent(instance)}`, {
        method: "POST",
        body: JSON.stringify({ numbers: [normalized] }),
    });
    if (!result.ok || !Array.isArray(result.body)) {
        return { number: normalized, exists: null, lookup: result };
    }
    const match = result.body[0];
    const canonical = normalizePhone(match?.number ?? match?.jid?.split("@")[0] ?? normalized);
    return { number: canonical, exists: match?.exists ?? null, lookup: result };
}
export async function sendWhatsappMessage(instance, phone, message) {
    const normalized = normalizePhone(phone);
    const resolved = await resolveWhatsappNumber(instance, phone);
    if (resolved.exists === false) {
        return { ok: false, status: 422, body: "Número não encontrado no WhatsApp" };
    }
    // Evolution/Baileys may resolve Brazilian mobile numbers to their canonical
    // WhatsApp JID without the ninth digit. Sending the originally typed number
    // in that case can return a message ID that immediately changes to ERROR.
    // Prefer the address confirmed by whatsappNumbers, falling back only when
    // the provider could not resolve it.
    const destination = resolved.exists === true && resolved.number
        ? resolved.number
        : normalized;
    return evoFetch(`/message/sendText/${encodeURIComponent(instance)}`, {
        method: "POST",
        body: JSON.stringify({
            number: destination,
            text: message,
        }),
    });
}
