// Application table allowlist shared by queries, authorization and backup.
export const tables = {
  "calendar_events": {
    "all_day": {
      "type": "boolean",
      "nullable": true
    },
    "assigned_to": {
      "type": "string",
      "nullable": true
    },
    "client_id": {
      "type": "string",
      "nullable": true
    },
    "color": {
      "type": "string",
      "nullable": true
    },
    "created_at": {
      "type": "string",
      "nullable": false
    },
    "created_by": {
      "type": "string",
      "nullable": true
    },
    "description": {
      "type": "string",
      "nullable": true
    },
    "end_date": {
      "type": "string",
      "nullable": true
    },
    "event_type": {
      "type": "string",
      "nullable": false
    },
    "id": {
      "type": "string",
      "nullable": false
    },
    "location": {
      "type": "string",
      "nullable": true
    },
    "start_date": {
      "type": "string",
      "nullable": false
    },
    "title": {
      "type": "string",
      "nullable": false
    },
    "updated_at": {
      "type": "string",
      "nullable": false
    }
  },
  "client_drive_folders": {
    "client_id": {
      "type": "string",
      "nullable": false
    },
    "created_at": {
      "type": "string",
      "nullable": false
    },
    "created_by": {
      "type": "string",
      "nullable": true
    },
    "folder_id": {
      "type": "string",
      "nullable": false
    },
    "folder_name": {
      "type": "string",
      "nullable": false
    },
    "folder_type": {
      "type": "string",
      "nullable": true
    },
    "id": {
      "type": "string",
      "nullable": false
    }
  },
  "client_folders": {
    "client_id": {
      "type": "string",
      "nullable": false
    },
    "created_at": {
      "type": "string",
      "nullable": false
    },
    "created_by": {
      "type": "string",
      "nullable": true
    },
    "description": {
      "type": "string",
      "nullable": true
    },
    "file_url": {
      "type": "string",
      "nullable": true
    },
    "folder_type": {
      "type": "string",
      "nullable": false
    },
    "id": {
      "type": "string",
      "nullable": false
    },
    "name": {
      "type": "string",
      "nullable": false
    }
  },
  "client_passwords": {
    "client_id": {
      "type": "string",
      "nullable": false
    },
    "created_at": {
      "type": "string",
      "nullable": false
    },
    "created_by": {
      "type": "string",
      "nullable": true
    },
    "encrypted_password": {
      "type": "string",
      "nullable": false
    },
    "id": {
      "type": "string",
      "nullable": false
    },
    "notes": {
      "type": "string",
      "nullable": true
    },
    "service_name": {
      "type": "string",
      "nullable": false
    },
    "updated_at": {
      "type": "string",
      "nullable": false
    },
    "username": {
      "type": "string",
      "nullable": true
    }
  },
  "clients": {
    "archived": {
      "type": "boolean",
      "nullable": false
    },
    "canva_link": {
      "type": "string",
      "nullable": true
    },
    "color_palette": {
      "type": "json",
      "nullable": true
    },
    "contact_email": {
      "type": "string",
      "nullable": true
    },
    "contact_name": {
      "type": "string",
      "nullable": true
    },
    "contact_phone": {
      "type": "string",
      "nullable": true
    },
    "created_at": {
      "type": "string",
      "nullable": false
    },
    "created_by": {
      "type": "string",
      "nullable": true
    },
    "custom_links": {
      "type": "json",
      "nullable": true
    },
    "google_drive_link": {
      "type": "string",
      "nullable": true
    },
    "id": {
      "type": "string",
      "nullable": false
    },
    "is_fixed_posting": {
      "type": "boolean",
      "nullable": false
    },
    "logo_url": {
      "type": "string",
      "nullable": true
    },
    "name": {
      "type": "string",
      "nullable": false
    },
    "notes": {
      "type": "string",
      "nullable": true
    },
    "segment": {
      "type": "string",
      "nullable": true
    },
    "social_links": {
      "type": "json",
      "nullable": true
    },
    "trello_link": {
      "type": "string",
      "nullable": true
    },
    "updated_at": {
      "type": "string",
      "nullable": false
    }
  },
  "equipment": {
    "created_at": {
      "type": "string",
      "nullable": false
    },
    "description": {
      "type": "string",
      "nullable": true
    },
    "id": {
      "type": "string",
      "nullable": false
    },
    "name": {
      "type": "string",
      "nullable": false
    }
  },
  "filmmaker_demands": {
    "assigned_to": {
      "type": "string",
      "nullable": true
    },
    "client_id": {
      "type": "string",
      "nullable": true
    },
    "created_at": {
      "type": "string",
      "nullable": false
    },
    "delivery_link": {
      "type": "string",
      "nullable": true
    },
    "description": {
      "type": "string",
      "nullable": true
    },
    "due_date": {
      "type": "string",
      "nullable": true
    },
    "filmmaker_id": {
      "type": "string",
      "nullable": false
    },
    "id": {
      "type": "string",
      "nullable": false
    },
    "status": {
      "type": "string",
      "nullable": false
    },
    "title": {
      "type": "string",
      "nullable": false
    },
    "updated_at": {
      "type": "string",
      "nullable": false
    },
    "visit_id": {
      "type": "string",
      "nullable": true
    }
  },
  "filmmaker_visits": {
    "assigned_to": {
      "type": "string",
      "nullable": true
    },
    "client_id": {
      "type": "string",
      "nullable": true
    },
    "created_at": {
      "type": "string",
      "nullable": false
    },
    "delivery_deadline": {
      "type": "string",
      "nullable": true
    },
    "description": {
      "type": "string",
      "nullable": true
    },
    "filmmaker_id": {
      "type": "string",
      "nullable": false
    },
    "id": {
      "type": "string",
      "nullable": false
    },
    "location": {
      "type": "string",
      "nullable": true
    },
    "notes": {
      "type": "string",
      "nullable": true
    },
    "reminder_sent": {
      "type": "boolean",
      "nullable": false
    },
    "status": {
      "type": "string",
      "nullable": false
    },
    "title": {
      "type": "string",
      "nullable": false
    },
    "updated_at": {
      "type": "string",
      "nullable": false
    },
    "visit_date": {
      "type": "string",
      "nullable": false
    }
  },
  "notifications": {
    "created_at": {
      "type": "string",
      "nullable": false
    },
    "created_by": {
      "type": "string",
      "nullable": false
    },
    "id": {
      "type": "string",
      "nullable": false
    },
    "message": {
      "type": "string",
      "nullable": false
    },
    "read_by": {
      "type": "json",
      "nullable": false
    },
    "target_user_id": {
      "type": "string",
      "nullable": true
    },
    "title": {
      "type": "string",
      "nullable": false
    }
  },
  "pautas": {
    "client_id": {
      "type": "string",
      "nullable": true
    },
    "created_at": {
      "type": "string",
      "nullable": false
    },
    "created_by": {
      "type": "string",
      "nullable": true
    },
    "description": {
      "type": "string",
      "nullable": true
    },
    "id": {
      "type": "string",
      "nullable": false
    },
    "title": {
      "type": "string",
      "nullable": false
    },
    "updated_at": {
      "type": "string",
      "nullable": false
    }
  },
  "posts": {
    "caption": {
      "type": "string",
      "nullable": true
    },
    "client_id": {
      "type": "string",
      "nullable": true
    },
    "created_at": {
      "type": "string",
      "nullable": false
    },
    "created_by": {
      "type": "string",
      "nullable": true
    },
    "id": {
      "type": "string",
      "nullable": false
    },
    "link": {
      "type": "string",
      "nullable": true
    },
    "media_url": {
      "type": "string",
      "nullable": true
    },
    "platform": {
      "type": "string",
      "nullable": false
    },
    "posted_at": {
      "type": "string",
      "nullable": true
    },
    "scheduled_date": {
      "type": "string",
      "nullable": false
    },
    "status": {
      "type": "string",
      "nullable": false
    },
    "title": {
      "type": "string",
      "nullable": false
    },
    "updated_at": {
      "type": "string",
      "nullable": false
    }
  },
  "profiles": {
    "avatar_url": {
      "type": "string",
      "nullable": true
    },
    "birthday": {
      "type": "string",
      "nullable": true
    },
    "created_at": {
      "type": "string",
      "nullable": false
    },
    "full_name": {
      "type": "string",
      "nullable": false
    },
    "id": {
      "type": "string",
      "nullable": false
    },
    "phone": {
      "type": "string",
      "nullable": true
    },
    "updated_at": {
      "type": "string",
      "nullable": false
    },
    "user_id": {
      "type": "string",
      "nullable": false
    }
  },
  "task_comments": {
    "content": {
      "type": "string",
      "nullable": false
    },
    "created_at": {
      "type": "string",
      "nullable": false
    },
    "id": {
      "type": "string",
      "nullable": false
    },
    "task_id": {
      "type": "string",
      "nullable": false
    },
    "user_id": {
      "type": "string",
      "nullable": false
    }
  },
  "task_templates": {
    "created_at": {
      "type": "string",
      "nullable": false
    },
    "created_by": {
      "type": "string",
      "nullable": false
    },
    "description": {
      "type": "string",
      "nullable": true
    },
    "id": {
      "type": "string",
      "nullable": false
    },
    "link": {
      "type": "string",
      "nullable": true
    },
    "priority": {
      "type": "string",
      "nullable": false
    },
    "title": {
      "type": "string",
      "nullable": false
    },
    "updated_at": {
      "type": "string",
      "nullable": false
    }
  },
  "tasks": {
    "cancelled": { "type": "boolean", "nullable": false },
    "assigned_to": {
      "type": "string",
      "nullable": true
    },
    "client_id": {
      "type": "string",
      "nullable": true
    },
    "created_at": {
      "type": "string",
      "nullable": false
    },
    "created_by": {
      "type": "string",
      "nullable": true
    },
    "delivery_link": {
      "type": "string",
      "nullable": true
    },
    "description": {
      "type": "string",
      "nullable": true
    },
    "due_date": {
      "type": "string",
      "nullable": true
    },
    "id": {
      "type": "string",
      "nullable": false
    },
    "pauta_id": {
      "type": "string",
      "nullable": true
    },
    "priority": {
      "type": "string",
      "nullable": false
    },
    "status": {
      "type": "string",
      "nullable": false
    },
    "title": {
      "type": "string",
      "nullable": false
    },
    "updated_at": {
      "type": "string",
      "nullable": false
    },
    "visit_id": {
      "type": "string",
      "nullable": true
    }
  },
  "user_roles": {
    "id": {
      "type": "string",
      "nullable": false
    },
    "role": {
      "type": "string",
      "nullable": false
    },
    "user_id": {
      "type": "string",
      "nullable": false
    }
  },
  "visit_equipment": {
    "equipment_id": {
      "type": "string",
      "nullable": false
    },
    "id": {
      "type": "string",
      "nullable": false
    },
    "visit_id": {
      "type": "string",
      "nullable": false
    }
  },
  "whatsapp_ai_messages": {
    "content": {
      "type": "string",
      "nullable": true
    },
    "created_at": {
      "type": "string",
      "nullable": false
    },
    "id": {
      "type": "string",
      "nullable": false
    },
    "name": {
      "type": "string",
      "nullable": true
    },
    "phone": {
      "type": "string",
      "nullable": false
    },
    "role": {
      "type": "string",
      "nullable": false
    },
    "tool_call_id": {
      "type": "string",
      "nullable": true
    },
    "tool_calls": {
      "type": "json",
      "nullable": true
    }
  },
  "whatsapp_config": {
    "created_at": {
      "type": "string",
      "nullable": false
    },
    "id": {
      "type": "string",
      "nullable": false
    },
    "instance_name": {
      "type": "string",
      "nullable": true
    },
    "notify_on_cancel": {
      "type": "boolean",
      "nullable": false
    },
    "notify_on_create": {
      "type": "boolean",
      "nullable": false
    },
    "notify_on_reminder": {
      "type": "boolean",
      "nullable": false
    },
    "notify_on_update": {
      "type": "boolean",
      "nullable": false
    },
    "phone_connected": {
      "type": "string",
      "nullable": true
    },
    "singleton": {
      "type": "boolean",
      "nullable": false
    },
    "status": {
      "type": "string",
      "nullable": false
    },
    "updated_at": {
      "type": "string",
      "nullable": false
    }
  },
  "whatsapp_message_logs": {
    "created_at": {
      "type": "string",
      "nullable": false
    },
    "error": {
      "type": "string",
      "nullable": true
    },
    "event": {
      "type": "string",
      "nullable": true
    },
    "id": {
      "type": "string",
      "nullable": false
    },
    "message": {
      "type": "string",
      "nullable": false
    },
    "phone": {
      "type": "string",
      "nullable": false
    },
    "provider_message_id": {
      "type": "string",
      "nullable": true
    },
    "provider_status": {
      "type": "string",
      "nullable": true
    },
    "recipient_label": {
      "type": "string",
      "nullable": true
    },
    "remote_jid": {
      "type": "string",
      "nullable": true
    }
  },
  "whatsapp_recipients": {
    "active": {
      "type": "boolean",
      "nullable": false
    },
    "created_at": {
      "type": "string",
      "nullable": false
    },
    "id": {
      "type": "string",
      "nullable": false
    },
    "label": {
      "type": "string",
      "nullable": false
    },
    "phone": {
      "type": "string",
      "nullable": false
    },
    "updated_at": {
      "type": "string",
      "nullable": false
    }
  }
} as const;
export type TableName = keyof typeof tables;
export type Row = Record<string, unknown>;
export const defaults: Partial<Record<TableName, Row>> = {
  "clients": {
    "color_palette": [],
    "social_links": {},
    "custom_links": [],
    "archived": false,
    "is_fixed_posting": false
  },
  "tasks": {
    "cancelled": false,
    "status": "a_fazer",
    "priority": "media"
  },
  "calendar_events": {
    "all_day": false
  },
  "filmmaker_visits": {
    "status": "agendada",
    "reminder_sent": false
  },
  "filmmaker_demands": {
    "status": "a_fazer"
  },
  "notifications": {
    "read_by": []
  },
  "posts": {
    "status": "agendado",
    "platform": "instagram"
  },
  "whatsapp_config": {
    "singleton": true,
    "status": "disconnected",
    "notify_on_create": true,
    "notify_on_update": true,
    "notify_on_cancel": true,
    "notify_on_reminder": true
  },
  "whatsapp_recipients": {
    "active": true
  }
};
export const references = {
  "calendar_events": {
    "assigned_to": [
      "auth_users",
      "SetNull"
    ],
    "client_id": [
      "clients",
      "SetNull"
    ],
    "created_by": [
      "auth_users",
      "SetNull"
    ]
  },
  "client_drive_folders": {
    "client_id": [
      "clients",
      "Cascade"
    ],
    "created_by": [
      "auth_users",
      "SetNull"
    ]
  },
  "client_folders": {
    "client_id": [
      "clients",
      "Cascade"
    ],
    "created_by": [
      "auth_users",
      "SetNull"
    ]
  },
  "client_passwords": {
    "client_id": [
      "clients",
      "Cascade"
    ],
    "created_by": [
      "auth_users",
      "SetNull"
    ]
  },
  "clients": {
    "created_by": [
      "auth_users",
      "SetNull"
    ]
  },
  "equipment": {},
  "filmmaker_demands": {
    "assigned_to": [
      "auth_users",
      "SetNull"
    ],
    "client_id": [
      "clients",
      "SetNull"
    ],
    "filmmaker_id": [
      "auth_users",
      "Cascade"
    ],
    "visit_id": [
      "filmmaker_visits",
      "SetNull"
    ]
  },
  "filmmaker_visits": {
    "assigned_to": [
      "auth_users",
      "SetNull"
    ],
    "client_id": [
      "clients",
      "SetNull"
    ],
    "filmmaker_id": [
      "auth_users",
      "Cascade"
    ]
  },
  "notifications": {
    "created_by": [
      "auth_users",
      "Cascade"
    ],
    "target_user_id": [
      "auth_users",
      "SetNull"
    ]
  },
  "pautas": {
    "client_id": [
      "clients",
      "SetNull"
    ],
    "created_by": [
      "auth_users",
      "SetNull"
    ]
  },
  "posts": {
    "client_id": [
      "clients",
      "SetNull"
    ],
    "created_by": [
      "auth_users",
      "SetNull"
    ]
  },
  "profiles": {
    "user_id": [
      "auth_users",
      "Cascade"
    ]
  },
  "task_comments": {
    "task_id": [
      "tasks",
      "Cascade"
    ],
    "user_id": [
      "auth_users",
      "Cascade"
    ]
  },
  "task_templates": {
    "created_by": [
      "auth_users",
      "Cascade"
    ]
  },
  "tasks": {
    "assigned_to": [
      "auth_users",
      "SetNull"
    ],
    "client_id": [
      "clients",
      "SetNull"
    ],
    "created_by": [
      "auth_users",
      "SetNull"
    ],
    "visit_id": [
      "filmmaker_visits",
      "Cascade"
    ]
  },
  "user_roles": {
    "user_id": [
      "auth_users",
      "Cascade"
    ]
  },
  "visit_equipment": {
    "equipment_id": [
      "equipment",
      "Cascade"
    ],
    "visit_id": [
      "filmmaker_visits",
      "Cascade"
    ]
  },
  "whatsapp_ai_messages": {},
  "whatsapp_config": {},
  "whatsapp_message_logs": {},
  "whatsapp_recipients": {}
} as const;
