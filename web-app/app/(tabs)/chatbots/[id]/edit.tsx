import { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, TextInput, Button, Switch, Chip, Snackbar, SegmentedButtons, ActivityIndicator, IconButton, Card, Portal, Dialog } from 'react-native-paper';
import { router, useLocalSearchParams, Stack } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { supabase } from '../../../../lib/supabase';
import { colors, spacing } from '../../../../lib/theme';
import PreviewModal from '../../../../components/chatbot/PreviewModal';
import type { BotConfiguration } from '../../../../lib/types';

const TONE_OPTIONS = [
    { value: 'professional', label: 'Profissional' },
    { value: 'casual', label: 'Casual' },
    { value: 'friendly', label: 'Amigável' },
    { value: 'technical', label: 'Técnico' },
];

const DEFAULT_PROMPTS: Record<string, string> = {
    professional: 'Você é um assistente virtual profissional e educado. Ajude o cliente de forma clara e objetiva.',
    casual: 'Você é um assistente virtual descontraído e amigável. Use uma linguagem leve e próxima do cliente.',
    friendly: 'Você é um assistente virtual amigável e acolhedor. Seja caloroso e atencioso nas respostas.',
    technical: 'Você é um assistente virtual técnico e preciso. Forneça informações detalhadas e específicas.',
};

export default function EditBotScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();

    // Loading states
    const [loadingBot, setLoadingBot] = useState(true);
    const [saving, setSaving] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);

    // Estados do formulário
    const [companyName, setCompanyName] = useState('');
    const [botName, setBotName] = useState('');
    const [toneOfVoice, setToneOfVoice] = useState('professional');
    const [systemPrompt, setSystemPrompt] = useState('');
    const [primaryColor, setPrimaryColor] = useState('#25D366');
    const [whatsappNumber, setWhatsappNumber] = useState('');

    // Toggles
    const [collectName, setCollectName] = useState(true);
    const [collectEmail, setCollectEmail] = useState(true);
    const [collectPhone, setCollectPhone] = useState(true);
    const [knowledgeBaseEnabled, setKnowledgeBaseEnabled] = useState(false);
    const [isActive, setIsActive] = useState(true);

    const [snackbar, setSnackbar] = useState({ visible: false, message: '', error: false });
    const [previewVisible, setPreviewVisible] = useState(false);
    const [discardDialogVisible, setDiscardDialogVisible] = useState(false);

    // Original data for comparison
    const [originalData, setOriginalData] = useState<BotConfiguration | null>(null);

    useEffect(() => {
        if (id) {
            loadBot();
        }
    }, [id]);

    // Track changes
    useEffect(() => {
        if (originalData) {
            const changed =
                companyName !== originalData.company_name ||
                botName !== originalData.bot_name ||
                toneOfVoice !== originalData.tone_of_voice ||
                systemPrompt !== originalData.system_prompt ||
                primaryColor !== originalData.primary_color ||
                whatsappNumber !== (originalData.whatsapp_number || '') ||
                collectName !== originalData.collect_name ||
                collectEmail !== originalData.collect_email ||
                collectPhone !== originalData.collect_phone ||
                knowledgeBaseEnabled !== originalData.knowledge_base_enabled ||
                isActive !== originalData.is_active;
            setHasChanges(changed);
        }
    }, [companyName, botName, toneOfVoice, systemPrompt, primaryColor, whatsappNumber,
        collectName, collectEmail, collectPhone, knowledgeBaseEnabled, isActive, originalData]);

    async function loadBot() {
        try {
            const { data, error } = await supabase
                .from('bot_configurations')
                .select('*')
                .eq('id', id)
                .single();

            if (error) throw error;

            if (data) {
                setOriginalData(data);
                setCompanyName(data.company_name);
                setBotName(data.bot_name);
                setToneOfVoice(data.tone_of_voice);
                setSystemPrompt(data.system_prompt);
                setPrimaryColor(data.primary_color);
                setWhatsappNumber(data.whatsapp_number || '');
                setCollectName(data.collect_name);
                setCollectEmail(data.collect_email);
                setCollectPhone(data.collect_phone);
                setKnowledgeBaseEnabled(data.knowledge_base_enabled);
                setIsActive(data.is_active);
            }
        } catch (error) {
            console.error('Error loading bot:', error);
            setSnackbar({ visible: true, message: 'Erro ao carregar chatbot', error: true });
        } finally {
            setLoadingBot(false);
        }
    }

    function handleToneChange(value: string) {
        setToneOfVoice(value);
        // Only update system prompt if it matches one of the default prompts
        const isDefaultPrompt = Object.values(DEFAULT_PROMPTS).includes(systemPrompt);
        if (isDefaultPrompt && DEFAULT_PROMPTS[value]) {
            setSystemPrompt(DEFAULT_PROMPTS[value]);
        }
    }

    function handleBack() {
        if (hasChanges) {
            setDiscardDialogVisible(true);
        } else {
            router.back();
        }
    }

    async function handleSave() {
        // Validações
        if (!companyName.trim()) {
            setSnackbar({ visible: true, message: 'Nome da empresa é obrigatório', error: true });
            return;
        }

        if (!botName.trim()) {
            setSnackbar({ visible: true, message: 'Nome do bot é obrigatório', error: true });
            return;
        }

        if (!systemPrompt.trim()) {
            setSnackbar({ visible: true, message: 'Instruções do sistema são obrigatórias', error: true });
            return;
        }

        setSaving(true);
        try {
            const botData = {
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
            };

            const { error } = await supabase
                .from('bot_configurations')
                .update(botData)
                .eq('id', id);

            if (error) throw error;

            setSnackbar({ visible: true, message: 'Chatbot atualizado com sucesso!', error: false });
            setHasChanges(false);

            // Update original data
            setOriginalData(prev => prev ? { ...prev, ...botData } as BotConfiguration : null);

            // Auto-open preview after save
            setTimeout(() => {
                setPreviewVisible(true);
            }, 500);

        } catch (error: any) {
            console.error('Error updating bot:', error);
            setSnackbar({
                visible: true,
                message: error.message || 'Erro ao atualizar chatbot',
                error: true
            });
        } finally {
            setSaving(false);
        }
    }

    const currentConfig = {
        company_name: companyName,
        bot_name: botName,
        tone_of_voice: toneOfVoice,
        system_prompt: systemPrompt,
        primary_color: primaryColor,
        avatar_url: null,
    };

    if (loadingBot) {
        return (
            <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.loadingText}>Carregando chatbot...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Stack.Screen
                options={{
                    headerTitle: `Editar: ${originalData?.company_name || 'Chatbot'}`,
                    headerLeft: () => (
                        <IconButton
                            icon="arrow-left"
                            onPress={handleBack}
                        />
                    ),
                }}
            />

            <ScrollView contentContainerStyle={styles.scrollContent}>
                {/* Status Card */}
                <Card style={[
                    styles.statusCard,
                    { backgroundColor: isActive ? colors.success + '15' : colors.textDisabled + '15' }
                ]}>
                    <Card.Content style={styles.statusContent}>
                        <View style={styles.statusInfo}>
                            <MaterialCommunityIcons
                                name={isActive ? "check-circle" : "pause-circle"}
                                size={24}
                                color={isActive ? colors.success : colors.textDisabled}
                            />
                            <View>
                                <Text variant="titleMedium" style={styles.statusTitle}>
                                    {isActive ? 'Bot Ativo' : 'Bot Pausado'}
                                </Text>
                                <Text variant="bodySmall" style={styles.statusSubtitle}>
                                    {isActive ? 'Respondendo mensagens' : 'Não está respondendo'}
                                </Text>
                            </View>
                        </View>
                        <Switch value={isActive} onValueChange={setIsActive} />
                    </Card.Content>
                </Card>

                {/* Seção: Informações Básicas */}
                <View style={styles.section}>
                    <Text variant="titleMedium" style={styles.sectionTitle}>
                        <MaterialCommunityIcons name="information" size={20} color={colors.primary} /> Informações Básicas
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
                        <MaterialCommunityIcons name="account-voice" size={20} color={colors.primary} /> Personalidade
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
                        <MaterialCommunityIcons name="account-plus" size={20} color={colors.primary} /> Coleta de Leads
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
                        <MaterialCommunityIcons name="whatsapp" size={20} color={colors.primary} /> Integração WhatsApp
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
                        <MaterialCommunityIcons name="book-open-variant" size={20} color={colors.primary} /> Base de Conhecimento (RAG)
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

                    {knowledgeBaseEnabled && (
                        <Card style={styles.ragCard} mode="outlined">
                            <Card.Content>
                                <MaterialCommunityIcons
                                    name="file-document-multiple-outline"
                                    size={32}
                                    color={colors.textSecondary}
                                />
                                <Text variant="bodyMedium" style={styles.ragText}>
                                    Funcionalidade de upload de documentos em breve.
                                </Text>
                            </Card.Content>
                        </Card>
                    )}
                </View>

                {/* Seção: Aparência */}
                <View style={styles.section}>
                    <Text variant="titleMedium" style={styles.sectionTitle}>
                        <MaterialCommunityIcons name="palette" size={20} color={colors.primary} /> Aparência
                    </Text>

                    <Text variant="bodySmall" style={styles.label}>
                        Cor Principal
                    </Text>
                    <View style={styles.colorRow}>
                        {['#25D366', '#128C7E', '#2196F3', '#9C27B0', '#FF5722', '#E91E63'].map(color => (
                            <Chip
                                key={color}
                                selected={primaryColor === color}
                                onPress={() => setPrimaryColor(color)}
                                style={[
                                    styles.colorChip,
                                    { backgroundColor: color },
                                    primaryColor === color && styles.colorChipSelected
                                ]}
                                textStyle={{ color: '#FFFFFF' }}
                            >
                                {primaryColor === color ? '✓' : ''}
                            </Chip>
                        ))}
                    </View>
                </View>

                {/* WhatsApp Connection */}
                <Card style={styles.whatsappCard}>
                    <Card.Content>
                        <View style={styles.whatsappHeader}>
                            <MaterialCommunityIcons name="whatsapp" size={32} color="#25D366" />
                            <View style={{ flex: 1, marginLeft: spacing.md }}>
                                <Text variant="titleMedium" style={styles.whatsappTitle}>
                                    Conectar WhatsApp
                                </Text>
                                <Text variant="bodySmall" style={styles.whatsappSubtitle}>
                                    Gere um QR Code para conectar o WhatsApp do cliente
                                </Text>
                            </View>
                        </View>
                        <Button
                            mode="outlined"
                            onPress={() => router.push(`/chatbots/${id}/whatsapp` as any)}
                            style={{ marginTop: spacing.md }}
                            icon="qrcode"
                        >
                            Gerenciar Conexão
                        </Button>
                    </Card.Content>
                </Card>

                {/* Botões de Ação */}
                <View style={styles.actions}>
                    <Button
                        mode="outlined"
                        onPress={handleBack}
                        style={styles.button}
                        disabled={saving}
                    >
                        Cancelar
                    </Button>

                    <Button
                        mode="contained"
                        onPress={handleSave}
                        style={styles.button}
                        loading={saving}
                        disabled={saving || !hasChanges}
                        icon="content-save"
                    >
                        Salvar Alterações
                    </Button>
                </View>

                {hasChanges && (
                    <Text style={styles.unsavedChanges}>
                        * Você tem alterações não salvas
                    </Text>
                )}
            </ScrollView>

            <Snackbar
                visible={snackbar.visible}
                onDismiss={() => setSnackbar({ ...snackbar, visible: false })}
                duration={3000}
                style={snackbar.error ? { backgroundColor: colors.error } : undefined}
            >
                {snackbar.message}
            </Snackbar>

            <PreviewModal
                visible={previewVisible}
                onClose={() => setPreviewVisible(false)}
                botConfig={currentConfig}
            />

            {/* Discard Changes Dialog */}
            <Portal>
                <Dialog visible={discardDialogVisible} onDismiss={() => setDiscardDialogVisible(false)}>
                    <Dialog.Icon icon="alert" color={colors.warning} />
                    <Dialog.Title style={styles.dialogTitle}>Descartar alterações?</Dialog.Title>
                    <Dialog.Content>
                        <Text variant="bodyMedium">
                            Você tem alterações não salvas. Deseja sair sem salvar?
                        </Text>
                    </Dialog.Content>
                    <Dialog.Actions>
                        <Button onPress={() => setDiscardDialogVisible(false)}>
                            Continuar Editando
                        </Button>
                        <Button
                            onPress={() => {
                                setDiscardDialogVisible(false);
                                router.back();
                            }}
                            textColor={colors.error}
                        >
                            Descartar
                        </Button>
                    </Dialog.Actions>
                </Dialog>
            </Portal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.background,
    },
    loadingText: {
        marginTop: spacing.md,
        color: colors.textSecondary,
    },
    scrollContent: {
        padding: spacing.md,
        paddingBottom: spacing.xxl,
    },
    statusCard: {
        marginBottom: spacing.lg,
    },
    statusContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    statusInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
    },
    statusTitle: {
        fontWeight: 'bold',
        color: colors.text,
    },
    statusSubtitle: {
        color: colors.textSecondary,
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
    colorRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
    },
    colorChip: {
        height: 40,
        width: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    colorChipSelected: {
        borderWidth: 3,
        borderColor: colors.text,
    },
    ragCard: {
        marginTop: spacing.md,
        alignItems: 'center',
    },
    ragText: {
        marginTop: spacing.sm,
        color: colors.textSecondary,
        textAlign: 'center',
    },
    actions: {
        flexDirection: 'row',
        gap: spacing.md,
        marginTop: spacing.lg,
    },
    button: {
        flex: 1,
    },
    unsavedChanges: {
        textAlign: 'center',
        marginTop: spacing.md,
        color: colors.warning,
        fontSize: 12,
    },
    whatsappCard: {
        marginBottom: spacing.lg,
        backgroundColor: '#E8F5E9',
    },
    whatsappHeader: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    whatsappTitle: {
        fontWeight: 'bold',
        color: colors.text,
    },
    whatsappSubtitle: {
        color: colors.textSecondary,
        marginTop: spacing.xs,
    },
    dialogTitle: {
        textAlign: 'center',
    },
});
