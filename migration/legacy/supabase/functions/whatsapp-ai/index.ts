import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, json, sendWhatsappMessage } from "../_shared/whatsapp.ts";

const OPENAI_MODEL = "gpt-4o";
const HISTORY_LIMIT = 20;

type ChatMessage = {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  tool_calls?: unknown;
  tool_call_id?: string;
  name?: string;
};

const tools = [
  {
    type: "function",
    function: {
      name: "list_visits",
      description: "Lista visitas de filmagem agendadas em um intervalo de datas. Use para responder sobre agenda de gravações.",
      parameters: {
        type: "object",
        properties: {
          from: { type: "string", description: "Data inicial ISO (YYYY-MM-DD). Padrão: hoje." },
          to: { type: "string", description: "Data final ISO (YYYY-MM-DD). Padrão: hoje + 30 dias." },
          status: { type: "string", enum: ["agendada", "em_andamento", "concluida", "cancelada"] },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_calendar_events",
      description: "Lista eventos do calendário (reuniões, entregas, outros).",
      parameters: {
        type: "object",
        properties: {
          from: { type: "string" },
          to: { type: "string" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_tasks",
      description: "Lista tarefas. Filtre por status ou responsável quando útil.",
      parameters: {
        type: "object",
        properties: {
          status: { type: "string", enum: ["a_fazer", "em_andamento", "concluida"] },
          assigned_to_name: { type: "string", description: "Nome (parcial) do responsável." },
          due_before: { type: "string", description: "Data ISO (YYYY-MM-DD)." },
          limit: { type: "number" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_clients",
      description: "Lista clientes. Use search para filtrar por nome/segmento.",
      parameters: {
        type: "object",
        properties: {
          search: { type: "string" },
          limit: { type: "number" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_pautas",
      description: "Lista pautas de conteúdo.",
      parameters: {
        type: "object",
        properties: {
          client_name: { type: "string" },
          limit: { type: "number" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_posts",
      description: "Lista postagens marcadas como feitas em um intervalo.",
      parameters: {
        type: "object",
        properties: {
          from: { type: "string" },
          to: { type: "string" },
        },
      },
    },
  },
];

// deno-lint-ignore no-explicit-any
async function runTool(admin: any, name: string, args: any) {
  const today = new Date().toISOString().slice(0, 10);
  const in30 = new Date(Date.now() + 30 * 86400_000).toISOString().slice(0, 10);

  if (name === "list_visits") {
    const from = args.from ?? today;
    const to = args.to ?? in30;
    let q = admin
      .from("filmmaker_visits")
      .select("id,title,visit_date,location,status,description,clients(name),profiles!filmmaker_visits_filmmaker_id_fkey(full_name)")
      .gte("visit_date", `${from}T00:00:00`)
      .lte("visit_date", `${to}T23:59:59`)
      .order("visit_date")
      .limit(50);
    if (args.status) q = q.eq("status", args.status);
    const { data, error } = await q;
    return error ? { error: error.message } : data;
  }

  if (name === "list_calendar_events") {
    const from = args.from ?? today;
    const to = args.to ?? in30;
    const { data, error } = await admin
      .from("calendar_events")
      .select("id,title,event_type,start_date,end_date,location,description,clients(name)")
      .gte("start_date", `${from}T00:00:00`)
      .lte("start_date", `${to}T23:59:59`)
      .order("start_date")
      .limit(50);
    return error ? { error: error.message } : data;
  }

  if (name === "list_tasks") {
    let q = admin
      .from("tasks")
      .select("id,title,status,priority,due_date,description,clients(name),profiles!tasks_assigned_to_fkey(full_name)")
      .order("due_date", { ascending: true, nullsFirst: false })
      .limit(args.limit ?? 30);
    if (args.status) q = q.eq("status", args.status);
    if (args.due_before) q = q.lte("due_date", args.due_before);
    const { data, error } = await q;
    if (error) return { error: error.message };
    let out = data ?? [];
    if (args.assigned_to_name) {
      const needle = args.assigned_to_name.toLowerCase();
      out = out.filter((t: any) => t.profiles?.full_name?.toLowerCase().includes(needle));
    }
    return out;
  }

  if (name === "list_clients") {
    let q = admin.from("clients").select("id,name,segment,contact_name,contact_phone,contact_email,notes").eq("archived", false).limit(args.limit ?? 30);
    if (args.search) q = q.ilike("name", `%${args.search}%`);
    const { data, error } = await q;
    return error ? { error: error.message } : data;
  }

  if (name === "list_pautas") {
    let q = admin.from("pautas").select("id,title,description,status,clients(name)").limit(args.limit ?? 30);
    const { data, error } = await q;
    if (error) return { error: error.message };
    let out = data ?? [];
    if (args.client_name) {
      const needle = args.client_name.toLowerCase();
      out = out.filter((p: any) => p.clients?.name?.toLowerCase().includes(needle));
    }
    return out;
  }

  if (name === "list_posts") {
    const from = args.from ?? today;
    const to = args.to ?? today;
    const { data, error } = await admin
      .from("posts")
      .select("id,post_date,clients(name)")
      .gte("post_date", from)
      .lte("post_date", to)
      .order("post_date")
      .limit(100);
    return error ? { error: error.message } : data;
  }

  return { error: `ferramenta desconhecida: ${name}` };
}

async function callOpenAI(messages: ChatMessage[]) {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${Deno.env.get("OPENAI_API_KEY")}`,
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      messages,
      tools,
      temperature: 0.3,
    }),
  });
  const body = await res.json();
  if (!res.ok) {
    console.error("OpenAI error", body);
    throw new Error(body?.error?.message ?? `OpenAI ${res.status}`);
  }
  return body;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  // Only the webhook (internal) may invoke this
  if (req.headers.get("x-internal-secret") !== Deno.env.get("CRON_SECRET")) {
    return json({ error: "Unauthorized" }, 401);
  }

  const { phone, text } = await req.json().catch(() => ({}));
  if (!phone || !text) return json({ error: "phone e text obrigatórios" }, 400);

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // Load instance
  const { data: cfg } = await admin.from("whatsapp_config").select("instance_name,status").eq("singleton", true).maybeSingle();
  if (!cfg?.instance_name || cfg.status !== "connected") {
    return json({ skipped: "instância não conectada" });
  }

  // Save user message
  await admin.from("whatsapp_ai_messages").insert({ phone, role: "user", content: text });

  // Load recent history
  const { data: history } = await admin
    .from("whatsapp_ai_messages")
    .select("role,content,tool_calls,tool_call_id,name,created_at")
    .eq("phone", phone)
    .order("created_at", { ascending: false })
    .limit(HISTORY_LIMIT);

  const now = new Date().toISOString();
  const systemPrompt = `Você é o assistente da agência EP Mídias no WhatsApp. Responda em português, de forma direta e objetiva. Você tem acesso ao sistema interno (visitas de filmagem, tarefas, calendário, clientes, pautas e postagens) via ferramentas — use-as sempre que precisar de dados reais em vez de responder de memória. Formate datas como dd/MM HH:mm. Data/hora atual: ${now}.`;

  const messages: ChatMessage[] = [
    { role: "system", content: systemPrompt },
    ...(history ?? []).reverse().map((h: any) => ({
      role: h.role,
      content: h.content,
      tool_calls: h.tool_calls ?? undefined,
      tool_call_id: h.tool_call_id ?? undefined,
      name: h.name ?? undefined,
    })),
  ];

  let finalText = "";
  for (let step = 0; step < 5; step++) {
    const resp = await callOpenAI(messages);
    const choice = resp.choices?.[0]?.message;
    if (!choice) break;

    if (choice.tool_calls?.length) {
      messages.push({ role: "assistant", content: choice.content ?? null, tool_calls: choice.tool_calls });
      await admin.from("whatsapp_ai_messages").insert({
        phone, role: "assistant", content: choice.content ?? null, tool_calls: choice.tool_calls,
      });
      for (const tc of choice.tool_calls) {
        let args: any = {};
        try { args = JSON.parse(tc.function?.arguments ?? "{}"); } catch { /* noop */ }
        const result = await runTool(admin, tc.function?.name, args);
        const content = JSON.stringify(result).slice(0, 8000);
        messages.push({ role: "tool", content, tool_call_id: tc.id, name: tc.function?.name });
        await admin.from("whatsapp_ai_messages").insert({
          phone, role: "tool", content, tool_call_id: tc.id, name: tc.function?.name,
        });
      }
      continue;
    }

    finalText = (choice.content ?? "").trim();
    if (finalText) {
      await admin.from("whatsapp_ai_messages").insert({ phone, role: "assistant", content: finalText });
    }
    break;
  }

  if (!finalText) finalText = "Desculpe, não consegui gerar uma resposta agora.";

  const send = await sendWhatsappMessage(cfg.instance_name, phone, finalText);
  return json({ ok: send.ok, sent: send.ok, reply: finalText });
});