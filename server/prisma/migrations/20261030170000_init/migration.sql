-- CreateTable
CREATE TABLE "auth_users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "password_hash" TEXT,
    "confirmed" BOOLEAN NOT NULL DEFAULT true,
    "disabled" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TEXT NOT NULL,
    "updated_at" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "auth_sessions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "token_hash" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "expires_at" DATETIME NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "auth_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth_users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "auth_activation_tokens" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "token_hash" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "expires_at" DATETIME NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "auth_activation_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth_users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "calendar_events" (
    "all_day" BOOLEAN DEFAULT false,
    "assigned_to" TEXT,
    "client_id" TEXT,
    "color" TEXT,
    "created_at" TEXT NOT NULL DEFAULT '',
    "created_by" TEXT,
    "description" TEXT,
    "end_date" TEXT,
    "event_type" TEXT NOT NULL,
    "id" TEXT NOT NULL PRIMARY KEY,
    "location" TEXT,
    "start_date" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "updated_at" TEXT NOT NULL DEFAULT '',
    CONSTRAINT "calendar_events_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "auth_users" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "calendar_events_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "calendar_events_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth_users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "client_drive_folders" (
    "client_id" TEXT NOT NULL,
    "created_at" TEXT NOT NULL DEFAULT '',
    "created_by" TEXT,
    "folder_id" TEXT NOT NULL,
    "folder_name" TEXT NOT NULL,
    "folder_type" TEXT,
    "id" TEXT NOT NULL PRIMARY KEY,
    CONSTRAINT "client_drive_folders_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "client_drive_folders_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth_users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "client_folders" (
    "client_id" TEXT NOT NULL,
    "created_at" TEXT NOT NULL DEFAULT '',
    "created_by" TEXT,
    "description" TEXT,
    "file_url" TEXT,
    "folder_type" TEXT NOT NULL,
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    CONSTRAINT "client_folders_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "client_folders_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth_users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "client_passwords" (
    "client_id" TEXT NOT NULL,
    "created_at" TEXT NOT NULL DEFAULT '',
    "created_by" TEXT,
    "encrypted_password" TEXT NOT NULL,
    "id" TEXT NOT NULL PRIMARY KEY,
    "notes" TEXT,
    "service_name" TEXT NOT NULL,
    "updated_at" TEXT NOT NULL DEFAULT '',
    "username" TEXT,
    CONSTRAINT "client_passwords_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "client_passwords_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth_users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "clients" (
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "canva_link" TEXT,
    "color_palette" JSONB DEFAULT '[]',
    "contact_email" TEXT,
    "contact_name" TEXT,
    "contact_phone" TEXT,
    "created_at" TEXT NOT NULL DEFAULT '',
    "created_by" TEXT,
    "custom_links" JSONB DEFAULT '[]',
    "google_drive_link" TEXT,
    "id" TEXT NOT NULL PRIMARY KEY,
    "is_fixed_posting" BOOLEAN NOT NULL DEFAULT false,
    "logo_url" TEXT,
    "name" TEXT NOT NULL,
    "notes" TEXT,
    "segment" TEXT,
    "social_links" JSONB DEFAULT '{}',
    "trello_link" TEXT,
    "updated_at" TEXT NOT NULL DEFAULT '',
    CONSTRAINT "clients_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth_users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "equipment" (
    "created_at" TEXT NOT NULL DEFAULT '',
    "description" TEXT,
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "filmmaker_demands" (
    "assigned_to" TEXT,
    "client_id" TEXT,
    "created_at" TEXT NOT NULL DEFAULT '',
    "delivery_link" TEXT,
    "description" TEXT,
    "due_date" TEXT,
    "filmmaker_id" TEXT NOT NULL,
    "id" TEXT NOT NULL PRIMARY KEY,
    "status" TEXT NOT NULL DEFAULT 'a_fazer',
    "title" TEXT NOT NULL,
    "updated_at" TEXT NOT NULL DEFAULT '',
    "visit_id" TEXT,
    CONSTRAINT "filmmaker_demands_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "auth_users" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "filmmaker_demands_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "filmmaker_demands_filmmaker_id_fkey" FOREIGN KEY ("filmmaker_id") REFERENCES "auth_users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "filmmaker_demands_visit_id_fkey" FOREIGN KEY ("visit_id") REFERENCES "filmmaker_visits" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "filmmaker_visits" (
    "assigned_to" TEXT,
    "client_id" TEXT,
    "created_at" TEXT NOT NULL DEFAULT '',
    "delivery_deadline" TEXT,
    "description" TEXT,
    "filmmaker_id" TEXT NOT NULL,
    "id" TEXT NOT NULL PRIMARY KEY,
    "location" TEXT,
    "notes" TEXT,
    "reminder_sent" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'agendada',
    "title" TEXT NOT NULL,
    "updated_at" TEXT NOT NULL DEFAULT '',
    "visit_date" TEXT NOT NULL,
    CONSTRAINT "filmmaker_visits_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "auth_users" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "filmmaker_visits_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "filmmaker_visits_filmmaker_id_fkey" FOREIGN KEY ("filmmaker_id") REFERENCES "auth_users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "notifications" (
    "created_at" TEXT NOT NULL DEFAULT '',
    "created_by" TEXT NOT NULL,
    "id" TEXT NOT NULL PRIMARY KEY,
    "message" TEXT NOT NULL,
    "read_by" JSONB NOT NULL DEFAULT '[]',
    "target_user_id" TEXT,
    "title" TEXT NOT NULL,
    CONSTRAINT "notifications_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth_users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "notifications_target_user_id_fkey" FOREIGN KEY ("target_user_id") REFERENCES "auth_users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "pautas" (
    "client_id" TEXT,
    "created_at" TEXT NOT NULL DEFAULT '',
    "created_by" TEXT,
    "description" TEXT,
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "updated_at" TEXT NOT NULL DEFAULT '',
    CONSTRAINT "pautas_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "pautas_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth_users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "posts" (
    "caption" TEXT,
    "client_id" TEXT,
    "created_at" TEXT NOT NULL DEFAULT '',
    "created_by" TEXT,
    "id" TEXT NOT NULL PRIMARY KEY,
    "link" TEXT,
    "media_url" TEXT,
    "platform" TEXT NOT NULL DEFAULT 'instagram',
    "posted_at" TEXT,
    "scheduled_date" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'agendado',
    "title" TEXT NOT NULL,
    "updated_at" TEXT NOT NULL DEFAULT '',
    CONSTRAINT "posts_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "posts_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth_users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "profiles" (
    "avatar_url" TEXT,
    "birthday" TEXT,
    "created_at" TEXT NOT NULL DEFAULT '',
    "full_name" TEXT NOT NULL,
    "id" TEXT NOT NULL PRIMARY KEY,
    "phone" TEXT,
    "updated_at" TEXT NOT NULL DEFAULT '',
    "user_id" TEXT NOT NULL,
    CONSTRAINT "profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth_users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "task_comments" (
    "content" TEXT NOT NULL,
    "created_at" TEXT NOT NULL DEFAULT '',
    "id" TEXT NOT NULL PRIMARY KEY,
    "task_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    CONSTRAINT "task_comments_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "task_comments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth_users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "task_templates" (
    "created_at" TEXT NOT NULL DEFAULT '',
    "created_by" TEXT NOT NULL,
    "description" TEXT,
    "id" TEXT NOT NULL PRIMARY KEY,
    "link" TEXT,
    "priority" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "updated_at" TEXT NOT NULL DEFAULT '',
    CONSTRAINT "task_templates_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth_users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "tasks" (
    "cancelled" BOOLEAN NOT NULL DEFAULT false,
    "assigned_to" TEXT,
    "client_id" TEXT,
    "created_at" TEXT NOT NULL DEFAULT '',
    "created_by" TEXT,
    "delivery_link" TEXT,
    "description" TEXT,
    "due_date" TEXT,
    "id" TEXT NOT NULL PRIMARY KEY,
    "pauta_id" TEXT,
    "priority" TEXT NOT NULL DEFAULT 'media',
    "status" TEXT NOT NULL DEFAULT 'a_fazer',
    "title" TEXT NOT NULL,
    "updated_at" TEXT NOT NULL DEFAULT '',
    "visit_id" TEXT,
    CONSTRAINT "tasks_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "auth_users" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "tasks_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "tasks_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth_users" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "tasks_visit_id_fkey" FOREIGN KEY ("visit_id") REFERENCES "filmmaker_visits" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "user_roles" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "role" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth_users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "visit_equipment" (
    "equipment_id" TEXT NOT NULL,
    "id" TEXT NOT NULL PRIMARY KEY,
    "visit_id" TEXT NOT NULL,
    CONSTRAINT "visit_equipment_equipment_id_fkey" FOREIGN KEY ("equipment_id") REFERENCES "equipment" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "visit_equipment_visit_id_fkey" FOREIGN KEY ("visit_id") REFERENCES "filmmaker_visits" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "whatsapp_ai_messages" (
    "content" TEXT,
    "created_at" TEXT NOT NULL DEFAULT '',
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT,
    "phone" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "tool_call_id" TEXT,
    "tool_calls" JSONB
);

-- CreateTable
CREATE TABLE "whatsapp_config" (
    "created_at" TEXT NOT NULL DEFAULT '',
    "id" TEXT NOT NULL PRIMARY KEY,
    "instance_name" TEXT,
    "notify_on_cancel" BOOLEAN NOT NULL DEFAULT true,
    "notify_on_create" BOOLEAN NOT NULL DEFAULT true,
    "notify_on_reminder" BOOLEAN NOT NULL DEFAULT true,
    "notify_on_update" BOOLEAN NOT NULL DEFAULT true,
    "phone_connected" TEXT,
    "singleton" BOOLEAN NOT NULL DEFAULT true,
    "status" TEXT NOT NULL DEFAULT 'disconnected',
    "updated_at" TEXT NOT NULL DEFAULT ''
);

-- CreateTable
CREATE TABLE "whatsapp_message_logs" (
    "created_at" TEXT NOT NULL DEFAULT '',
    "error" TEXT,
    "event" TEXT,
    "id" TEXT NOT NULL PRIMARY KEY,
    "message" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "provider_message_id" TEXT,
    "provider_status" TEXT,
    "recipient_label" TEXT,
    "remote_jid" TEXT
);

-- CreateTable
CREATE TABLE "whatsapp_recipients" (
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TEXT NOT NULL DEFAULT '',
    "id" TEXT NOT NULL PRIMARY KEY,
    "label" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "updated_at" TEXT NOT NULL DEFAULT ''
);

-- CreateTable
CREATE TABLE "storage_objects" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "bucket" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "owner_id" TEXT,
    "mime_type" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "created_at" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "webhook_receipts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "whatsapp_outbox" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "event" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "available_at" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "sent_at" TEXT,
    "last_error" TEXT
);

-- CreateIndex
CREATE UNIQUE INDEX "auth_users_email_key" ON "auth_users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "auth_sessions_token_hash_key" ON "auth_sessions"("token_hash");

-- CreateIndex
CREATE INDEX "auth_sessions_user_id_idx" ON "auth_sessions"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "auth_activation_tokens_token_hash_key" ON "auth_activation_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "auth_activation_tokens_user_id_idx" ON "auth_activation_tokens"("user_id");

-- CreateIndex
CREATE INDEX "calendar_events_assigned_to_idx" ON "calendar_events"("assigned_to");

-- CreateIndex
CREATE INDEX "calendar_events_client_id_idx" ON "calendar_events"("client_id");

-- CreateIndex
CREATE INDEX "calendar_events_created_by_idx" ON "calendar_events"("created_by");

-- CreateIndex
CREATE INDEX "calendar_events_created_at_idx" ON "calendar_events"("created_at");

-- CreateIndex
CREATE INDEX "client_drive_folders_client_id_idx" ON "client_drive_folders"("client_id");

-- CreateIndex
CREATE INDEX "client_drive_folders_created_by_idx" ON "client_drive_folders"("created_by");

-- CreateIndex
CREATE INDEX "client_drive_folders_created_at_idx" ON "client_drive_folders"("created_at");

-- CreateIndex
CREATE INDEX "client_folders_client_id_idx" ON "client_folders"("client_id");

-- CreateIndex
CREATE INDEX "client_folders_created_by_idx" ON "client_folders"("created_by");

-- CreateIndex
CREATE INDEX "client_folders_created_at_idx" ON "client_folders"("created_at");

-- CreateIndex
CREATE INDEX "client_passwords_client_id_idx" ON "client_passwords"("client_id");

-- CreateIndex
CREATE INDEX "client_passwords_created_by_idx" ON "client_passwords"("created_by");

-- CreateIndex
CREATE INDEX "client_passwords_created_at_idx" ON "client_passwords"("created_at");

-- CreateIndex
CREATE INDEX "clients_created_by_idx" ON "clients"("created_by");

-- CreateIndex
CREATE INDEX "clients_created_at_idx" ON "clients"("created_at");

-- CreateIndex
CREATE INDEX "equipment_created_at_idx" ON "equipment"("created_at");

-- CreateIndex
CREATE INDEX "filmmaker_demands_assigned_to_idx" ON "filmmaker_demands"("assigned_to");

-- CreateIndex
CREATE INDEX "filmmaker_demands_client_id_idx" ON "filmmaker_demands"("client_id");

-- CreateIndex
CREATE INDEX "filmmaker_demands_filmmaker_id_idx" ON "filmmaker_demands"("filmmaker_id");

-- CreateIndex
CREATE INDEX "filmmaker_demands_visit_id_idx" ON "filmmaker_demands"("visit_id");

-- CreateIndex
CREATE INDEX "filmmaker_demands_created_at_idx" ON "filmmaker_demands"("created_at");

-- CreateIndex
CREATE INDEX "filmmaker_demands_due_date_idx" ON "filmmaker_demands"("due_date");

-- CreateIndex
CREATE INDEX "filmmaker_visits_assigned_to_idx" ON "filmmaker_visits"("assigned_to");

-- CreateIndex
CREATE INDEX "filmmaker_visits_client_id_idx" ON "filmmaker_visits"("client_id");

-- CreateIndex
CREATE INDEX "filmmaker_visits_filmmaker_id_idx" ON "filmmaker_visits"("filmmaker_id");

-- CreateIndex
CREATE INDEX "filmmaker_visits_created_at_idx" ON "filmmaker_visits"("created_at");

-- CreateIndex
CREATE INDEX "filmmaker_visits_visit_date_idx" ON "filmmaker_visits"("visit_date");

-- CreateIndex
CREATE INDEX "notifications_created_by_idx" ON "notifications"("created_by");

-- CreateIndex
CREATE INDEX "notifications_target_user_id_idx" ON "notifications"("target_user_id");

-- CreateIndex
CREATE INDEX "notifications_created_at_idx" ON "notifications"("created_at");

-- CreateIndex
CREATE INDEX "pautas_client_id_idx" ON "pautas"("client_id");

-- CreateIndex
CREATE INDEX "pautas_created_by_idx" ON "pautas"("created_by");

-- CreateIndex
CREATE INDEX "pautas_created_at_idx" ON "pautas"("created_at");

-- CreateIndex
CREATE INDEX "posts_client_id_idx" ON "posts"("client_id");

-- CreateIndex
CREATE INDEX "posts_created_by_idx" ON "posts"("created_by");

-- CreateIndex
CREATE INDEX "posts_created_at_idx" ON "posts"("created_at");

-- CreateIndex
CREATE INDEX "posts_scheduled_date_idx" ON "posts"("scheduled_date");

-- CreateIndex
CREATE UNIQUE INDEX "profiles_user_id_key" ON "profiles"("user_id");

-- CreateIndex
CREATE INDEX "profiles_user_id_idx" ON "profiles"("user_id");

-- CreateIndex
CREATE INDEX "profiles_created_at_idx" ON "profiles"("created_at");

-- CreateIndex
CREATE INDEX "task_comments_task_id_idx" ON "task_comments"("task_id");

-- CreateIndex
CREATE INDEX "task_comments_user_id_idx" ON "task_comments"("user_id");

-- CreateIndex
CREATE INDEX "task_comments_created_at_idx" ON "task_comments"("created_at");

-- CreateIndex
CREATE INDEX "task_templates_created_by_idx" ON "task_templates"("created_by");

-- CreateIndex
CREATE INDEX "task_templates_created_at_idx" ON "task_templates"("created_at");

-- CreateIndex
CREATE INDEX "tasks_assigned_to_idx" ON "tasks"("assigned_to");

-- CreateIndex
CREATE INDEX "tasks_client_id_idx" ON "tasks"("client_id");

-- CreateIndex
CREATE INDEX "tasks_created_by_idx" ON "tasks"("created_by");

-- CreateIndex
CREATE INDEX "tasks_visit_id_idx" ON "tasks"("visit_id");

-- CreateIndex
CREATE INDEX "tasks_created_at_idx" ON "tasks"("created_at");

-- CreateIndex
CREATE INDEX "tasks_due_date_idx" ON "tasks"("due_date");

-- CreateIndex
CREATE INDEX "user_roles_user_id_idx" ON "user_roles"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_roles_user_id_role_key" ON "user_roles"("user_id", "role");

-- CreateIndex
CREATE INDEX "visit_equipment_equipment_id_idx" ON "visit_equipment"("equipment_id");

-- CreateIndex
CREATE INDEX "visit_equipment_visit_id_idx" ON "visit_equipment"("visit_id");

-- CreateIndex
CREATE UNIQUE INDEX "visit_equipment_visit_id_equipment_id_key" ON "visit_equipment"("visit_id", "equipment_id");

-- CreateIndex
CREATE INDEX "whatsapp_ai_messages_created_at_idx" ON "whatsapp_ai_messages"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "whatsapp_config_singleton_key" ON "whatsapp_config"("singleton");

-- CreateIndex
CREATE INDEX "whatsapp_config_created_at_idx" ON "whatsapp_config"("created_at");

-- CreateIndex
CREATE INDEX "whatsapp_message_logs_created_at_idx" ON "whatsapp_message_logs"("created_at");

-- CreateIndex
CREATE INDEX "whatsapp_recipients_created_at_idx" ON "whatsapp_recipients"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "storage_objects_bucket_path_key" ON "storage_objects"("bucket", "path");

-- CreateIndex
CREATE INDEX "whatsapp_outbox_sent_at_available_at_idx" ON "whatsapp_outbox"("sent_at", "available_at");
