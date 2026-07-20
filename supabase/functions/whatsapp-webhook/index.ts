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

  return json({ ok: true });
});