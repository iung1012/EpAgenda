import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, json, requireAdmin, sendWhatsappMessage } from "../_shared/whatsapp.ts";

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
  for (const r of recipients) {
    const res = await sendWhatsappMessage(cfg.instance_name, r.phone, message);
    if (res.ok) sent++;
    else {
      console.error("[whatsapp-send] delivery rejected", { phone: r.phone, status: res.status, body: res.body });
      failures.push({ phone: r.phone, status: res.status, body: res.body });
    }
  }

  return json({ sent, failures });
});