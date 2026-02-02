import { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Image, ScrollView, Alert } from 'react-native';
import { Text, Button, Card, ActivityIndicator, IconButton, Chip } from 'react-native-paper';
import { router, useLocalSearchParams, Stack } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { supabase } from '../../../../lib/supabase';
import { colors, spacing } from '../../../../lib/theme';

interface WhatsAppInstance {
    id: string;
    instance_name: string;
    phone_number: string | null;
    status: 'disconnected' | 'connecting' | 'connected';
    qr_code: string | null;
    qr_code_expires_at: string | null;
    connected_at: string | null;
}

export default function WhatsAppConnectionScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();

    const [loading, setLoading] = useState(false);
    const [instance, setInstance] = useState<WhatsAppInstance | null>(null);
    const [qrCode, setQrCode] = useState<string | null>(null);
    const [status, setStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
    const [qrExpiresAt, setQrExpiresAt] = useState<string | null>(null);
    const [timeRemaining, setTimeRemaining] = useState<number>(0);
    const pollingInterval = useRef<NodeJS.Timeout | null>(null);
    const countdownInterval = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        loadInstance();
        return () => {
            if (pollingInterval.current) {
                clearInterval(pollingInterval.current);
            }
            if (countdownInterval.current) {
                clearInterval(countdownInterval.current);
            }
        };
    }, [id]);

    async function loadInstance() {
        try {
            const { data, error } = await supabase
                .from('whatsapp_instances')
                .select('*')
                .eq('bot_configuration_id', id)
                .maybeSingle();

            if (error) throw error;

            if (data) {
                setInstance(data);
                setStatus(data.status);
                if (data.status === 'connecting' && data.qr_code) {
                    setQrCode(data.qr_code);
                    setQrExpiresAt(data.qr_code_expires_at);
                    startCountdown(data.qr_code_expires_at);
                    startPolling();
                }
            }
        } catch (error) {
            console.error('Error loading instance:', error);
        }
    }

    async function generateQRCode() {
        setLoading(true);
        // Clear previous state
        setInstance(null);
        setQrCode(null);
        setStatus('connecting');

        try {
            const { data, error } = await supabase.functions.invoke('create-whatsapp-instance', {
                body: { botId: id }
            });

            if (error) throw error;

            if (data.status === 'already_connected') {
                Alert.alert('Já Conectado', 'Este bot já está conectado ao WhatsApp!');
                setStatus('connected');
                return;
            }

            setQrCode(data.qrCode);
            setQrExpiresAt(data.expiresAt);
            setStatus('connecting');
            if (data.expiresAt) {
                startCountdown(data.expiresAt);
            }
            startPolling();

        } catch (error: any) {
            console.error('Error generating QR:', error);
            Alert.alert('Erro', error.message || 'Falha ao gerar QR Code');
        } finally {
            setLoading(false);
        }
    }

    function startPolling() {
        // Clear existing interval first to avoid duplicates
        if (pollingInterval.current) clearInterval(pollingInterval.current);

        // Poll every 3 seconds to check connection status AND QR code updates
        pollingInterval.current = setInterval(async () => {
            const { data } = await supabase
                .from('whatsapp_instances')
                .select('status, phone_number, qr_code, qr_code_expires_at')
                .eq('bot_configuration_id', id)
                .single();

            if (data) {
                // Check if connected
                if (data.status === 'connected') {
                    setStatus('connected');
                    setInstance(prev => prev ? { ...prev, status: 'connected', phone_number: data.phone_number } : null);
                    if (pollingInterval.current) clearInterval(pollingInterval.current);
                    if (countdownInterval.current) clearInterval(countdownInterval.current);
                    return;
                }

                // Check for QR code update (if we didn't have one, or it changed)
                if (data.status === 'connecting' && data.qr_code && data.qr_code !== qrCode) {
                    console.log('QR Code received via polling!');
                    setQrCode(data.qr_code);
                    setQrExpiresAt(data.qr_code_expires_at);
                    if (data.qr_code_expires_at) {
                        startCountdown(data.qr_code_expires_at);
                    }
                }
            }
        }, 3000);
    }

    function startCountdown(expiresAt: string) {
        // Clear any existing countdown
        if (countdownInterval.current) {
            clearInterval(countdownInterval.current);
        }

        const updateCountdown = () => {
            const now = new Date().getTime();
            const expiry = new Date(expiresAt).getTime();
            const remaining = Math.max(0, Math.floor((expiry - now) / 1000));

            setTimeRemaining(remaining);

            if (remaining === 0) {
                // QR expired, auto-regenerate
                if (countdownInterval.current) {
                    clearInterval(countdownInterval.current);
                }
                generateQRCode();
            }
        };

        updateCountdown(); // Initial update
        countdownInterval.current = setInterval(updateCountdown, 1000);
    }

    function formatTime(seconds: number): string {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    async function cancelConnection() {
        if (pollingInterval.current) clearInterval(pollingInterval.current);
        if (countdownInterval.current) clearInterval(countdownInterval.current);

        setLoading(true);
        try {
            const instanceName = `bot-${id}`;
            const { error } = await supabase.functions.invoke('delete-whatsapp-instance', {
                body: { instanceName }
            });
            // Also reset local database to be sure
            await supabase
                .from('whatsapp_instances')
                .update({ status: 'disconnected', phone_number: null, qr_code: null })
                .eq('bot_configuration_id', id);

            if (error) console.error('Error deleting instance:', error);

            setStatus('disconnected');
            setQrCode(null);
            setInstance(null);
        } catch (error) {
            console.error('Error canceling:', error);
        } finally {
            setLoading(false);
        }
    }

    async function disconnect() {
        Alert.alert(
            'Desconectar WhatsApp',
            'Tem certeza que deseja desconectar o WhatsApp? Isso excluirá a sessão atual.',
            [
                { text: 'Voltar', style: 'cancel' },
                {
                    text: 'Desconectar',
                    style: 'destructive',
                    onPress: async () => {
                        if (pollingInterval.current) clearInterval(pollingInterval.current);
                        if (countdownInterval.current) clearInterval(countdownInterval.current);

                        setLoading(true);
                        try {
                            const instanceName = `bot-${id}`;

                            const { error } = await supabase.functions.invoke('delete-whatsapp-instance', {
                                body: { instanceName }
                            });

                            if (error && !error.message?.includes('400')) throw error;

                            // Also reset local database to be sure
                            await supabase
                                .from('whatsapp_instances')
                                .update({ status: 'disconnected', phone_number: null, qr_code: null })
                                .eq('bot_configuration_id', id);

                            setStatus('disconnected');
                            setQrCode(null);
                            setInstance(null);
                        } catch (error) {
                            console.error('Error disconnecting:', error);
                            Alert.alert('Erro', 'Falha ao desconectar. Tente novamente.');
                        } finally {
                            setLoading(false);
                        }
                    }
                }
            ]
        );
    }

    return (
        <View style={styles.container}>
            <Stack.Screen
                options={{
                    headerTitle: 'Conexão WhatsApp',
                    headerLeft: () => (
                        <IconButton
                            icon="arrow-left"
                            onPress={() => router.back()}
                        />
                    ),
                }}
            />

            <ScrollView contentContainerStyle={styles.content}>
                {/* Status Card */}
                <Card style={styles.card}>
                    <Card.Content>
                        <View style={styles.statusHeader}>
                            <MaterialCommunityIcons
                                name={
                                    status === 'connected' ? 'check-circle' :
                                        status === 'connecting' ? 'clock-outline' :
                                            'close-circle'
                                }
                                size={48}
                                color={
                                    status === 'connected' ? colors.success :
                                        status === 'connecting' ? colors.warning :
                                            colors.textDisabled
                                }
                            />
                            <View style={styles.statusInfo}>
                                <Text variant="headlineSmall" style={styles.statusTitle}>
                                    {status === 'connected' ? 'Conectado' :
                                        status === 'connecting' ? 'Aguardando Conexão' :
                                            'Desconectado'}
                                </Text>
                                {instance?.phone_number && (
                                    <Text variant="bodyMedium" style={styles.phoneNumber}>
                                        {instance.phone_number}
                                    </Text>
                                )}
                            </View>
                        </View>

                        <Chip
                            icon={
                                status === 'connected' ? 'check' :
                                    status === 'connecting' ? 'clock' :
                                        'close'
                            }
                            style={[
                                styles.statusChip,
                                {
                                    backgroundColor:
                                        status === 'connected' ? colors.success + '20' :
                                            status === 'connecting' ? colors.warning + '20' :
                                                colors.textDisabled + '20'
                                }
                            ]}
                        >
                            {status === 'connected' ? 'Ativo' :
                                status === 'connecting' ? 'Conectando...' :
                                    'Inativo'}
                        </Chip>
                    </Card.Content>
                </Card>

                {/* Instructions / QR Code */}
                {status === 'disconnected' && (
                    <Card style={styles.card}>
                        <Card.Content>
                            <Text variant="titleLarge" style={styles.cardTitle}>
                                Como Conectar
                            </Text>
                            <Text variant="bodyMedium" style={styles.instruction}>
                                1. Clique no botão abaixo para gerar o QR Code
                            </Text>
                            <Text variant="bodyMedium" style={styles.instruction}>
                                2. Abra o WhatsApp no celular do cliente
                            </Text>
                            <Text variant="bodyMedium" style={styles.instruction}>
                                3. Vá em "Aparelhos Conectados"
                            </Text>
                            <Text variant="bodyMedium" style={styles.instruction}>
                                4. Toque em "Conectar um aparelho"
                            </Text>
                            <Text variant="bodyMedium" style={styles.instruction}>
                                5. Escaneie o QR Code que aparecerá
                            </Text>

                            <Button
                                mode="contained"
                                onPress={generateQRCode}
                                loading={loading}
                                disabled={loading}
                                style={styles.button}
                                icon="qrcode"
                            >
                                Gerar QR Code
                            </Button>
                        </Card.Content>
                    </Card>
                )}

                {status === 'connecting' && !qrCode && (
                    <Card style={styles.card}>
                        <Card.Content style={styles.qrContainer}>
                            <ActivityIndicator size="large" color={colors.primary} style={{ marginVertical: 20 }} />
                            <Text variant="titleMedium" style={{ textAlign: 'center', marginBottom: 10 }}>
                                Iniciando conexão...
                            </Text>
                            <Text variant="bodyMedium" style={{ textAlign: 'center', color: colors.textSecondary, marginBottom: 20 }}>
                                Aguardando geração do QR Code. Se demorar, tente cancelar.
                            </Text>

                            <Button
                                mode="outlined"
                                onPress={cancelConnection}
                                textColor={colors.error}
                                style={{ borderColor: colors.error }}
                            >
                                Cancelar
                            </Button>
                        </Card.Content>
                    </Card>
                )}

                {status === 'connecting' && qrCode && (
                    <Card style={styles.card}>
                        <Card.Content style={styles.qrContainer}>
                            <Text variant="titleLarge" style={styles.cardTitle}>
                                Escaneie o QR Code
                            </Text>
                            <Text variant="bodyMedium" style={styles.qrInstruction}>
                                Abra o WhatsApp e escaneie este código
                            </Text>

                            <View style={styles.qrCodeWrapper}>
                                <Image
                                    source={{ uri: qrCode }}
                                    style={styles.qrCode}
                                    resizeMode="contain"
                                />
                            </View>

                            <View style={styles.countdownContainer}>
                                <MaterialCommunityIcons name="timer-outline" size={20} color={colors.warning} />
                                <Text variant="bodyMedium" style={styles.countdownText}>
                                    Expira em: {formatTime(timeRemaining)}
                                </Text>
                            </View>

                            <View style={styles.waitingIndicator}>
                                <ActivityIndicator size="small" color={colors.primary} />
                                <Text variant="bodySmall" style={styles.waitingText}>
                                    Aguardando conexão...
                                </Text>
                            </View>

                            <Button
                                mode="text"
                                onPress={generateQRCode}
                                style={{ marginTop: spacing.md }}
                            >
                                Gerar Novo QR Code
                            </Button>
                        </Card.Content>
                    </Card>
                )}

                {status === 'connected' && (
                    <Card style={styles.card}>
                        <Card.Content>
                            <MaterialCommunityIcons
                                name="check-circle"
                                size={64}
                                color={colors.success}
                                style={styles.successIcon}
                            />
                            <Text variant="titleLarge" style={styles.successTitle}>
                                WhatsApp Conectado!
                            </Text>
                            <Text variant="bodyMedium" style={styles.successText}>
                                O chatbot está ativo e respondendo mensagens automaticamente no WhatsApp.
                            </Text>

                            {instance?.connected_at && (
                                <Text variant="bodySmall" style={styles.connectedAt}>
                                    Conectado em: {new Date(instance.connected_at).toLocaleString('pt-BR')}
                                </Text>
                            )}

                            <Button
                                mode="outlined"
                                onPress={disconnect}
                                style={styles.button}
                                icon="logout"
                                textColor={colors.error}
                            >
                                Desconectar
                            </Button>
                        </Card.Content>
                    </Card>
                )}

                {/* Info Card */}
                <Card style={styles.infoCard}>
                    <Card.Content>
                        <View style={styles.infoRow}>
                            <MaterialCommunityIcons name="information" size={20} color={colors.primary} />
                            <Text variant="bodySmall" style={styles.infoText}>
                                O WhatsApp ficará conectado 24/7 e responderá automaticamente todas as mensagens recebidas.
                            </Text>
                        </View>
                    </Card.Content>
                </Card>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    content: {
        padding: spacing.md,
        paddingBottom: spacing.xxl,
    },
    card: {
        marginBottom: spacing.md,
    },
    statusHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.md,
    },
    statusInfo: {
        marginLeft: spacing.md,
        flex: 1,
    },
    statusTitle: {
        fontWeight: 'bold',
        color: colors.text,
    },
    phoneNumber: {
        color: colors.textSecondary,
        marginTop: spacing.xs,
    },
    statusChip: {
        alignSelf: 'flex-start',
    },
    cardTitle: {
        fontWeight: 'bold',
        marginBottom: spacing.md,
        color: colors.text,
    },
    instruction: {
        marginBottom: spacing.sm,
        color: colors.textSecondary,
    },
    button: {
        marginTop: spacing.lg,
    },
    qrContainer: {
        alignItems: 'center',
    },
    qrInstruction: {
        textAlign: 'center',
        color: colors.textSecondary,
        marginBottom: spacing.lg,
    },
    qrCodeWrapper: {
        backgroundColor: '#FFFFFF',
        padding: spacing.lg,
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    qrCode: {
        width: 250,
        height: 250,
    },
    countdownContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: spacing.md,
        gap: spacing.xs,
        backgroundColor: colors.warning + '15',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: 8,
    },
    countdownText: {
        color: colors.warning,
        fontWeight: '600',
    },
    waitingIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: spacing.lg,
        gap: spacing.sm,
    },
    waitingText: {
        color: colors.warning,
    },
    successIcon: {
        alignSelf: 'center',
        marginBottom: spacing.md,
    },
    successTitle: {
        textAlign: 'center',
        fontWeight: 'bold',
        color: colors.success,
        marginBottom: spacing.sm,
    },
    successText: {
        textAlign: 'center',
        color: colors.textSecondary,
        marginBottom: spacing.md,
    },
    connectedAt: {
        textAlign: 'center',
        color: colors.textDisabled,
        marginBottom: spacing.lg,
    },
    infoCard: {
        backgroundColor: colors.primary + '10',
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: spacing.sm,
    },
    infoText: {
        flex: 1,
        color: colors.textSecondary,
    },
});
