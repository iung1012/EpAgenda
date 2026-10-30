import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, json } from "../_shared/whatsapp.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const url = new URL(req.url);
  const providedSecret = url.searchParams.get("secret");
  if (providedSecret !== Deno.env.get("EVOLUTION_WEBHOOK_SECRET")) {
    return json({ error: "Unauthorized" }, 401);
  }

  const payload = await req.json().catch(() => null);
  if (!payload) return json({ error: "Invalid payload" }, 400);

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // deno-lint-ignore no-explicit-any
  const p: any = payload;
  const event = p.event ?? p.type;
  const instance = p.instance ?? p.instanceName ?? p.data?.instance;

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
    const remoteJid: string | undefined = msg?.key?.remoteJid;
    // Ignore group messages and our own sends
    if (!fromMe && remoteJid && !remoteJid.includes("@g.us")) {
      const text: string | undefined =
        msg?.message?.conversation ??
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
          // Fire-and-forget the AI handler
          const url = `${Deno.env.get("SUPABASE_URL")}/functions/v1/whatsapp-ai`;
          fetch(url, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-internal-secret": Deno.env.get("CRON_SECRET") ?? "",
            },
            body: JSON.stringify({ phone, text }),
          }).catch(() => {});
        }
      }
    }
  }

  return json({ ok: true });
});