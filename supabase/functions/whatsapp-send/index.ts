import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, evoFetch, json, requireAdmin, sendWhatsappMessage } from "../_shared/whatsapp.ts";

// This function accepts either an authenticated admin/manager (from the UI)
// OR a server-to-server call using the internal CRON_SECRET header (for the cron job).
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  let admin = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  // Internal callers pass x-internal-secret. External callers must be admin/manager.
  const internalOk = req.headers.get("x-internal-secret") === Deno.env.get("CRON_SECRET");
  if (!internalOk) {
    const auth = await requireAdmin(req);
    if ("error" in auth) return auth.error;
    admin = auth.admin;
  }

  const { event, message, phone: overridePhone } = await req.json().catch(() => ({}));
  if (!message || typeof message !== "string") return json({ error: "message obrigatório" }, 400);

  const { data: cfg } = await admin.from("whatsapp_config").select("*").eq("singleton", true).maybeSingle();
  if (!cfg?.instance_name || cfg.status !== "connected") {
    return json({ sent: 0, skipped: "instância não conectada" });
  }

  // Respect event-level flags when provided by caller
  const flagMap: Record<string, string> = {
    create: "notify_on_create",
    update: "notify_on_update",
    cancel: "notify_on_cancel",
    reminder: "notify_on_reminder",
  };
  const flag = event && flagMap[event];
  if (flag && cfg[flag] === false) return json({ sent: 0, skipped: `${event} desativado` });

  let recipients: { phone: string }[] = [];
  if (typeof overridePhone === "string" && overridePhone.trim()) {
    recipients = [{ phone: overridePhone.replace(/\D/g, "") }];
  } else {
    const { data } = await admin
      .from("whatsapp_recipients")
      .select("phone")
      .eq("active", true);
    recipients = data ?? [];
  }

  let sent = 0;
  const failures: unknown[] = [];
  const accepted: { phone: string; messageId: string | null; remoteJid: string | null }[] = [];
  const logEntry = async (row: {
    phone: string;
    provider_status: string | null;
    provider_message_id: string | null;
    remote_jid: string | null;
    error: string | null;
    recipient_label?: string | null;
  }) => {
    try {
      let label = row.recipient_label ?? null;
      if (!label) {
        const { data } = await admin
          .from("whatsapp_recipients")
          .select("label")
          .eq("phone", row.phone)
          .maybeSingle();
        label = data?.label ?? null;
      }
      await admin.from("whatsapp_message_logs").insert({
        event: event ?? null,
        phone: row.phone,
        recipient_label: label,
        message,
        provider_status: row.provider_status,
        provider_message_id: row.provider_message_id,
        remote_jid: row.remote_jid,
        error: row.error,
      });
    } catch (e) {
      console.error("[whatsapp-send] failed to write log", e);
    }
  };
  for (const r of recipients) {
    const res = await sendWhatsappMessage(cfg.instance_name, r.phone, message);
    if (res.ok) {
      const body = res.body as {
        key?: { id?: string; remoteJid?: string };
        messageId?: string;
        status?: string;
      } | null;
      const messageId = body?.key?.id ?? body?.messageId ?? null;
      const remoteJid = body?.key?.remoteJid ?? null;
      let providerStatus = body?.status ?? null;

      if (!messageId) {
        console.error("[whatsapp-send] provider accepted request without message id", {
          phone: r.phone,
          status: res.status,
          body: res.body,
        });
        failures.push({
          phone: r.phone,
          status: 502,
          body: "A Evolution aceitou a requisição, mas não confirmou o envio com um ID de mensagem",
        });
        await logEntry({
          phone: r.phone,
          provider_status: providerStatus,
          provider_message_id: null,
          remote_jid: remoteJid,
          error: "no message id returned",
        });
        continue;
      }

      if (providerStatus === "PENDING") {
        await new Promise((resolve) => setTimeout(resolve, 1500));
        const confirmation = await evoFetch(`/chat/findStatusMessage/${encodeURIComponent(cfg.instance_name)}`, {
          method: "POST",
          body: JSON.stringify({
            where: { id: messageId, remoteJid, fromMe: true },
            limit: 1,
          }),
        });
        const confirmationBody = confirmation.body as
          | { status?: string; messages?: Array<{ status?: string }> }
          | Array<{ status?: string }>
          | null;
        providerStatus = Array.isArray(confirmationBody)
          ? confirmationBody[0]?.status ?? providerStatus
          : confirmationBody?.messages?.[0]?.status ?? confirmationBody?.status ?? providerStatus;
      }

      if (providerStatus === "PENDING" || providerStatus === "ERROR") {
        console.error("[whatsapp-send] message did not leave provider", {
          phone: r.phone,
          messageId,
          remoteJid,
          providerStatus,
        });
        failures.push({
          phone: r.phone,
          status: 502,
          body: providerStatus === "PENDING"
            ? "A Evolution recebeu a mensagem, mas ela ficou pendente e não saiu do servidor. Verifique/atualize a instalação da Evolution API e reconecte a instância."
            : "A Evolution não conseguiu enviar a mensagem.",
        });
        await logEntry({
          phone: r.phone,
          provider_status: providerStatus,
          provider_message_id: messageId,
          remote_jid: remoteJid,
          error: providerStatus,
        });
        continue;
      }

      sent++;
      accepted.push({ phone: r.phone, messageId, remoteJid });
      console.log("[whatsapp-send] message accepted", {
        phone: r.phone,
        messageId,
        remoteJid,
        providerStatus,
      });
      await logEntry({
        phone: r.phone,
        provider_status: providerStatus ?? "SENT",
        provider_message_id: messageId,
        remote_jid: remoteJid,
        error: null,
      });
    }
    else {
      console.error("[whatsapp-send] delivery rejected", { phone: r.phone, status: res.status, body: res.body });
      failures.push({ phone: r.phone, status: res.status, body: res.body });
      await logEntry({
        phone: r.phone,
        provider_status: "REJECTED",
        provider_message_id: null,
        remote_jid: null,
        error: typeof res.body === "string" ? res.body : JSON.stringify(res.body).slice(0, 500),
      });
    }
  }

  return json({ sent, accepted, failures });
});