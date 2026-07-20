## Integração WhatsApp via Evolution API para visitas

Vamos disparar mensagens no WhatsApp em 4 momentos da vida de uma visita: **agendamento, edição, cancelamento e lembrete de 20min**. Os destinatários são uma lista fixa de números configurada dentro do sistema, e teremos uma tela em Configurações para conectar a instância via QR code.

### O que será construído

**1. Configuração (nova aba em Configurações)**
- Campo para nome da instância Evolution + botão "Conectar" que abre modal com QR code (base64) e faz polling do status a cada 4s até ficar `open`.
- Botão "Reconectar" para gerar novo QR quando expirar.
- Botão "Desconectar / Excluir instância".
- Lista de números que recebem lembretes (adicionar/remover com validação de formato E.164, ex: `5511999999999`).
- Toggle para habilitar/desabilitar cada tipo de evento (agendada / editada / cancelada / lembrete).

**2. Banco de dados**
- `whatsapp_config` (singleton, admin-only): `instance_name`, `status`, `phone_connected`, flags de eventos ativos.
- `whatsapp_recipients`: números autorizados a receber (label + phone).
- Só admin/gerente pode ler/editar (RLS estrita).

**3. Edge functions (verify_jwt = false, protegidas por role interno)**
- `whatsapp-connect` — cria/reconecta instância (usa `EVOLUTION_API_KEY`), retorna QR base64.
- `whatsapp-status` — consulta `connectionState` da instância (polling do modal).
- `whatsapp-disconnect` — logout + delete na Evolution.
- `whatsapp-send` — helper interno chamado pelas outras funções, envia texto formatado para todos os recipients ativos.
- Webhook `whatsapp-webhook` — recebe `CONNECTION_UPDATE` da Evolution e atualiza `status` + `phone_connected` no banco.

**4. Disparos automáticos**
- **Nova visita / editada / cancelada**: hook no frontend (`FilmmakerVisits.tsx` e `Calendar.tsx`) chama `whatsapp-send` após salvar, com template do evento.
- **Lembrete 20min antes**: adicionar chamada ao `whatsapp-send` dentro do cron `visit-reminders` já existente (ao lado da notificação in-app).

**5. Templates de mensagem**

```text
🎬 Nova visita agendada
Cliente: {cliente}
Local: {local}
Data: {dd/MM/yyyy HH:mm}
Responsável: {nome}
```

```text
⏰ Lembrete: sua visita começa em 20 min
{título} — {HH:mm}
Local: {local}
```

```text
✏️ Visita atualizada / ❌ Visita cancelada
{título} — {dd/MM HH:mm}
```

### Secrets necessários
- `EVOLUTION_API_URL` = `https://evo.comunidadecode.com.br`
- `EVOLUTION_API_KEY` = `429683C4C977415CAAFCCE10F7D57E11` (vou pedir via `add_secret` para ficar seguro, não hardcoded)
- `EVOLUTION_WEBHOOK_SECRET` = gerado automaticamente

### Observação de segurança
A chave global da Evolution que você colou tem poder total sobre o servidor. Ela será armazenada como secret backend (nunca exposta no bundle do navegador) e todas as chamadas à Evolution passarão pelas edge functions com validação de role admin. O webhook público valida um secret no path para impedir chamadas forjadas.

### Fluxo do usuário
1. Admin abre **Configurações → WhatsApp** → clica "Conectar instância" → escaneia QR → status vira "Conectado".
2. Adiciona os números que devem receber (ex: gerente, coordenador de produção).
3. A partir daí, qualquer visita criada/editada/cancelada + lembrete de 20min dispara mensagem para todos os números ativos.
