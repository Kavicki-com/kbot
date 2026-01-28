export interface Organization {
    id: string;
    name: string;
    created_at: string;
    updated_at: string;
}

export interface User {
    id: string;
    email: string;
    organization_id: string;
    role: 'admin' | 'user';
    created_at: string;
}

export interface BotConfiguration {
    id: string;
    organization_id: string;

    // Identificação
    bot_name: string;
    company_name: string;

    // Personalidade
    tone_of_voice: 'professional' | 'casual' | 'friendly' | 'technical' | 'custom';
    system_prompt: string;

    // Configurações
    business_hours: BusinessHours;

    // Coleta de Leads
    collect_name: boolean;
    collect_email: boolean;
    collect_phone: boolean;
    custom_fields: CustomField[];

    // Branding
    primary_color: string;
    avatar_url: string | null;

    // Integração
    whatsapp_number: string | null;
    typebot_id: string | null;

    // RAG
    knowledge_base_enabled: boolean;

    // Status
    is_active: boolean;

    created_at: string;
    updated_at: string;
}

export interface BusinessHours {
    enabled: boolean;
    schedule?: {
        monday?: DaySchedule;
        tuesday?: DaySchedule;
        wednesday?: DaySchedule;
        thursday?: DaySchedule;
        friday?: DaySchedule;
        saturday?: DaySchedule;
        sunday?: DaySchedule;
    };
    offline_message?: string;
}

export interface DaySchedule {
    start: string; // HH:mm format
    end: string;   // HH:mm format
}

export interface CustomField {
    id: string;
    label: string;
    type: 'text' | 'email' | 'phone' | 'number';
    required: boolean;
}

export interface KnowledgeBaseDocument {
    id: string;
    bot_configuration_id: string;
    file_name: string;
    file_url: string;
    file_size: number;
    mime_type: string;
    uploaded_at: string;
}
