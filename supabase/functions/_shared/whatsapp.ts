// Shared helpers for Evolution API + admin auth
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

export function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

export async function requireAdmin(req: Request) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return { error: json({ error: "Unauthorized" }, 401) };
  }
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );
  const token = authHeader.replace("Bearer ", "");
  const { data, error } = await supabase.auth.getClaims(token);
  if (error || !data?.claims) {
    return { error: json({ error: "Unauthorized" }, 401) };
  }
  const userId = data.claims.sub;
  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const { data: roleRow } = await admin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .maybeSingle();
  const role = roleRow?.role;
  if (role !== "admin" && role !== "gerente") {
    return { error: json({ error: "Forbidden" }, 403) };
  }
  return { userId, admin };
}

export function evoBase() {
  return (Deno.env.get("EVOLUTION_API_URL") ?? "").replace(/\/$/, "");
}

export async function evoFetch(path: string, init: RequestInit = {}) {
  const url = `${evoBase()}${path}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      apikey: Deno.env.get("EVOLUTION_API_KEY") ?? "",
      ...(init.headers ?? {}),
    },
  });
  const text = await res.text();
  let body: unknown = text;
  try {
    body = JSON.parse(text);
  } catch { /* keep as text */ }
  return { ok: res.ok, status: res.status, body };
}

export function normalizePhone(phone: string) {
  return phone.replace(/\D/g, "");
}

export async function sendWhatsappMessage(instance: string, phone: string, message: string) {
  return evoFetch(`/message/sendText/${encodeURIComponent(instance)}`, {
    method: "POST",
    body: JSON.stringify({
      number: normalizePhone(phone),
      text: message,
    }),
  });
}