import { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, TextInput, Button, Switch, Chip, Snackbar, SegmentedButtons } from 'react-native-paper';
import { router, useLocalSearchParams } from 'expo-router';
import { supabase } from '../../../lib/supabase';
import { colors, spacing } from '../../../lib/theme';
import PreviewModal from '../../../components/chatbot/PreviewModal';

const TONE_OPTIONS = [
    { value: 'professional', label: 'Profissional' },
    { value: 'casual', label: 'Casual' },
    { value: 'friendly', label: 'Amigável' },
    { value: 'technical', label: 'Técnico' },
];

const DEFAULT_PROMPTS = {
    professional: 'Você é um assistente virtual profissional e educado. Ajude o cliente de forma clara e objetiva.',
    casual: 'Você é um assistente virtual descontraído e amigável. Use uma linguagem leve e próxima do cliente.',
    friendly: 'Você é um assistente virtual amigável e acolhedor. Seja caloroso e atencioso nas respostas.',
    technical: 'Você é um assistente virtual técnico e preciso. Forneça informações detalhadas e específicas.',
};

export default function NewBotScreen() {
    const params = useLocalSearchParams();
    const isEdit = !!params.id;

    // Estados do formulário
    const [companyName, setCompanyName] = useState('');
    const [botName, setBotName] = useState('Assistente Virtual');
    const [toneOfVoice, setToneOfVoice] = useState('professional');
    const [systemPrompt, setSystemPrompt] = useState(DEFAULT_PROMPTS.professional);
    const [primaryColor, setPrimaryColor] = useState('#25D366');
    const [whatsappNumber, setWhatsappNumber] = useState('');

    // Toggles
    const [collectName, setCollectName] = useState(true);
    const [collectEmail, setCollectEmail] = useState(true);
    const [collectPhone, setCollectPhone] = useState(true);
    const [knowledgeBaseEnabled, setKnowledgeBaseEnabled] = useState(false);
    const [isActive, setIsActive] = useState(true);

    const [loading, setLoading] = useState(false);
    const [snackbar, setSnackbar] = useState({ visible: false, message: '' });

    function handleToneChange(value: string) {
        setToneOfVoice(value);
        if (value !== 'custom' && DEFAULT_PROMPTS[value as keyof typeof DEFAULT_PROMPTS]) {
            setSystemPrompt(DEFAULT_PROMPTS[value as keyof typeof DEFAULT_PROMPTS]);
        }
    }

    const [previewVisible, setPreviewVisible] = useState(false);

    async function handleSave() {
        // Validações
        if (!companyName.trim()) {
            setSnackbar({ visible: true, message: 'Nome da empresa é obrigatório' });
            return;
        }

        if (!botName.trim()) {
            setSnackbar({ visible: true, message: 'Nome do bot é obrigatório' });
            return;
        }

        if (!systemPrompt.trim()) {
            setSnackbar({ visible: true, message: 'Instruções do sistema são obrigatórias' });
            return;
        }

        setLoading(true);
        try {
            // Pegar organização do usuário
            const { data: userData, error: userError } = await supabase
                .from('users')
                .select('organization_id')
                .eq('id', (await supabase.auth.getUser()).data.user?.id)
                .single();

            if (userError) throw userError;

            const botData = {
                organization_id: userData.organization_id,
                company_name: companyName,
                bot_name: botName,
                tone_of_voice: toneOfVoice,
                system_prompt: systemPrompt,
                primary_color: primaryColor,
                whatsapp_number: whatsappNumber || null,
                collect_name: collectName,
                collect_email: collectEmail,
                collect_phone: collectPhone,
                knowledge_base_enabled: knowledgeBaseEnabled,
                is_active: isActive,
                business_hours: { enabled: false },
                custom_fields: [],
            };

            const { error } = await supabase
                .from('bot_configurations')
                .insert([botData]);

            if (error) throw error;

            setSnackbar({ visible: true, message: 'Chatbot criado com sucesso!' });

            setTimeout(() => {
                router.back();
            }, 1000);
        } catch (error: any) {
            console.error('Error creating bot:', error);
            setSnackbar({
                visible: true,
                message: error.message || 'Erro ao criar chatbot'
            });
        } finally {
            setLoading(false);
        }
    }

    const currentConfig = {
        company_name: companyName,
        bot_name: botName,
        tone_of_voice: toneOfVoice,
        system_prompt: systemPrompt,
        primary_color: primaryColor,
        avatar_url: null,
        whatsapp_number: whatsappNumber,
        collect_name: collectName,
        collect_email: collectEmail,
        collect_phone: collectPhone,
        knowledge_base_enabled: knowledgeBaseEnabled,
        is_active: isActive,
    };

    return (
        <View style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                {/* Seção: Informações Básicas */}
                <View style={styles.section}>
                    <Text variant="titleMedium" style={styles.sectionTitle}>
                        Informações Básicas
                    </Text>

                    <TextInput
                        label="Nome da Empresa *"
                        value={companyName}
                        onChangeText={setCompanyName}
                        mode="outlined"
                        style={styles.input}
                        placeholder="Ex: Padaria do João"
                    />

                    <TextInput
                        label="Nome do Bot *"
                        value={botName}
                        onChangeText={setBotName}
                        mode="outlined"
                        style={styles.input}
                        placeholder="Ex: Assistente Virtual"
                    />
                </View>

                {/* Seção: Personalidade */}
                <View style={styles.section}>
                    <Text variant="titleMedium" style={styles.sectionTitle}>
                        Personalidade
                    </Text>

                    <Text variant="bodySmall" style={styles.label}>
                        Tom de Voz
                    </Text>
                    <SegmentedButtons
                        value={toneOfVoice}
                        onValueChange={handleToneChange}
                        buttons={TONE_OPTIONS}
                        style={styles.segmented}
                    />

                    <TextInput
                        label="Instruções do Sistema *"
                        value={systemPrompt}
                        onChangeText={setSystemPrompt}
                        mode="outlined"
                        multiline
                        numberOfLines={4}
                        style={[styles.input, styles.textArea]}
                        placeholder="Descreva como o bot deve se comportar..."
                    />

                    <Button
                        icon="eye"
                        mode="text"
                        onPress={() => setPreviewVisible(true)}
                        style={{ alignSelf: 'flex-start' }}
                    >
                        Testar Personalidade no Chat
                    </Button>
                </View>

                {/* Seção: Coleta de Leads */}
                <View style={styles.section}>
                    <Text variant="titleMedium" style={styles.sectionTitle}>
                        Coleta de Leads
                    </Text>

                    <View style={styles.switchRow}>
                        <Text variant="bodyMedium">Coletar Nome</Text>
                        <Switch value={collectName} onValueChange={setCollectName} />
                    </View>

                    <View style={styles.switchRow}>
                        <Text variant="bodyMedium">Coletar Email</Text>
                        <Switch value={collectEmail} onValueChange={setCollectEmail} />
                    </View>

                    <View style={styles.switchRow}>
                        <Text variant="bodyMedium">Coletar Telefone</Text>
                        <Switch value={collectPhone} onValueChange={setCollectPhone} />
                    </View>
                </View>

                {/* Seção: Integração */}
                <View style={styles.section}>
                    <Text variant="titleMedium" style={styles.sectionTitle}>
                        Integração WhatsApp
                    </Text>

                    <TextInput
                        label="Número WhatsApp"
                        value={whatsappNumber}
                        onChangeText={setWhatsappNumber}
                        mode="outlined"
                        style={styles.input}
                        keyboardType="phone-pad"
                        placeholder="+55 11 99999-9999"
                        left={<TextInput.Icon icon="whatsapp" />}
                    />
                </View>

                {/* Seção: Base de Conhecimento */}
                <View style={styles.section}>
                    <Text variant="titleMedium" style={styles.sectionTitle}>
                        Base de Conhecimento (RAG)
                    </Text>

                    <View style={styles.switchRow}>
                        <View style={{ flex: 1 }}>
                            <Text variant="bodyMedium">Ativar RAG</Text>
                            <Text variant="bodySmall" style={styles.helperText}>
                                Permite upload de documentos para o bot consultar
                            </Text>
                        </View>
                        <Switch
                            value={knowledgeBaseEnabled}
                            onValueChange={setKnowledgeBaseEnabled}
                        />
                    </View>
                </View>

                {/* Seção: Status */}
                <View style={styles.section}>
                    <Text variant="titleMedium" style={styles.sectionTitle}>
                        Status
                    </Text>

                    <View style={styles.switchRow}>
                        <View style={{ flex: 1 }}>
                            <Text variant="bodyMedium">Bot Ativo</Text>
                            <Text variant="bodySmall" style={styles.helperText}>
                                Quando desativado, o bot não responde mensagens
                            </Text>
                        </View>
                        <Switch value={isActive} onValueChange={setIsActive} />
                    </View>
                </View>

                {/* Botões de Ação */}
                <View style={styles.actions}>
                    <Button
                        mode="outlined"
                        onPress={() => router.back()}
                        style={styles.button}
                        disabled={loading}
                    >
                        Cancelar
                    </Button>

                    <Button
                        mode="contained"
                        onPress={handleSave}
                        style={styles.button}
                        loading={loading}
                        disabled={loading}
                    >
                        {isEdit ? 'Salvar Alterações' : 'Criar Chatbot'}
                    </Button>
                </View>
            </ScrollView>

            <Snackbar
                visible={snackbar.visible}
                onDismiss={() => setSnackbar({ ...snackbar, visible: false })}
                duration={3000}
            >
                {snackbar.message}
            </Snackbar>

            <PreviewModal
                visible={previewVisible}
                onClose={() => setPreviewVisible(false)}
                botConfig={currentConfig}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    scrollContent: {
        padding: spacing.md,
        paddingBottom: spacing.xxl,
    },
    section: {
        marginBottom: spacing.lg,
    },
    sectionTitle: {
        color: colors.text,
        fontWeight: 'bold',
        marginBottom: spacing.md,
    },
    label: {
        color: colors.textSecondary,
        marginBottom: spacing.sm,
    },
    input: {
        marginBottom: spacing.md,
    },
    textArea: {
        minHeight: 100,
    },
    segmented: {
        marginBottom: spacing.md,
    },
    switchRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: colors.divider,
    },
    helperText: {
        color: colors.textSecondary,
        marginTop: spacing.xs,
    },
    actions: {
        flexDirection: 'row',
        gap: spacing.md,
        marginTop: spacing.lg,
    },
    button: {
        flex: 1,
    },
});
