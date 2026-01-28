import { useState } from 'react';
import { View, StyleSheet, ScrollView, Platform } from 'react-native';
import { Text, TextInput, Button, Snackbar, Card } from 'react-native-paper';
import { Link, router } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { colors, spacing } from '../../lib/theme';

export default function RegisterScreen() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [orgName, setOrgName] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [snackbar, setSnackbar] = useState({ visible: false, message: '' });

    async function handleRegister() {
        // Validações
        if (!email || !password || !confirmPassword || !orgName) {
            setSnackbar({ visible: true, message: 'Preencha todos os campos' });
            return;
        }

        if (password !== confirmPassword) {
            setSnackbar({ visible: true, message: 'As senhas não coincidem' });
            return;
        }

        if (password.length < 6) {
            setSnackbar({ visible: true, message: 'A senha deve ter pelo menos 6 caracteres' });
            return;
        }

        setLoading(true);
        try {
            // Criar usuário
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        organization_name: orgName,
                    },
                },
            });

            if (authError) throw authError;

            if (authData.user) {
                setSnackbar({
                    visible: true,
                    message: 'Conta criada com sucesso! Redirecionando...'
                });

                // Aguarda um pouco para mostrar mensagem
                setTimeout(() => {
                    router.replace('/(tabs)');
                }, 1500);
            }
        } catch (error: any) {
            setSnackbar({
                visible: true,
                message: error.message || 'Erro ao criar conta'
            });
        } finally {
            setLoading(false);
        }
    }

    return (
        <View style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.content}>
                    {/* Header */}
                    <View style={styles.header}>
                        <View style={styles.logoContainer}>
                            <Text style={styles.logoText}>💬</Text>
                        </View>
                        <Text style={styles.title}>Criar Conta</Text>
                        <Text style={styles.subtitle}>
                            Comece a criar chatbots inteligentes
                        </Text>
                    </View>

                    {/* Register Card */}
                    <Card style={styles.card}>
                        <Card.Content>
                            <TextInput
                                label="Nome da Empresa"
                                value={orgName}
                                onChangeText={setOrgName}
                                mode="outlined"
                                autoCapitalize="words"
                                style={styles.input}
                                left={<TextInput.Icon icon="office-building" />}
                            />

                            <TextInput
                                label="Email"
                                value={email}
                                onChangeText={setEmail}
                                mode="outlined"
                                keyboardType="email-address"
                                autoCapitalize="none"
                                autoComplete="email"
                                style={styles.input}
                                left={<TextInput.Icon icon="email" />}
                            />

                            <TextInput
                                label="Senha"
                                value={password}
                                onChangeText={setPassword}
                                mode="outlined"
                                secureTextEntry={!showPassword}
                                autoCapitalize="none"
                                style={styles.input}
                                left={<TextInput.Icon icon="lock" />}
                                right={
                                    <TextInput.Icon
                                        icon={showPassword ? 'eye-off' : 'eye'}
                                        onPress={() => setShowPassword(!showPassword)}
                                    />
                                }
                            />

                            <TextInput
                                label="Confirmar Senha"
                                value={confirmPassword}
                                onChangeText={setConfirmPassword}
                                mode="outlined"
                                secureTextEntry={!showPassword}
                                autoCapitalize="none"
                                style={styles.input}
                                left={<TextInput.Icon icon="lock-check" />}
                            />

                            <Button
                                mode="contained"
                                onPress={handleRegister}
                                loading={loading}
                                disabled={loading}
                                style={styles.button}
                                contentStyle={styles.buttonContent}
                            >
                                Criar Conta
                            </Button>

                            <View style={styles.divider}>
                                <View style={styles.dividerLine} />
                                <Text style={styles.dividerText}>ou</Text>
                                <View style={styles.dividerLine} />
                            </View>

                            <Link href="/(auth)/login" asChild>
                                <Button
                                    mode="outlined"
                                    style={styles.button}
                                    contentStyle={styles.buttonContent}
                                >
                                    Já tenho uma conta
                                </Button>
                            </Link>
                        </Card.Content>
                    </Card>

                    <Text style={styles.footer}>
                        Ao criar uma conta, você concorda com nossos Termos de Uso
                    </Text>
                </View>
            </ScrollView>

            <Snackbar
                visible={snackbar.visible}
                onDismiss={() => setSnackbar({ ...snackbar, visible: false })}
                duration={3000}
                action={{
                    label: 'OK',
                    onPress: () => setSnackbar({ ...snackbar, visible: false }),
                }}
            >
                {snackbar.message}
            </Snackbar>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    scrollContent: {
        flexGrow: 1,
        justifyContent: 'center',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xl,
        ...(Platform.OS === 'web' && {
            minHeight: '100vh',
        }),
    },
    content: {
        maxWidth: 480,
        width: '100%',
        alignSelf: 'center',
    },
    header: {
        alignItems: 'center',
        marginBottom: spacing.xl,
    },
    logoContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: spacing.md,
    },
    logoText: {
        fontSize: 40,
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        color: colors.text,
        marginBottom: spacing.xs,
    },
    subtitle: {
        fontSize: 16,
        color: colors.textSecondary,
        textAlign: 'center',
    },
    card: {
        elevation: 2,
        borderRadius: 16,
    },
    input: {
        marginBottom: spacing.md,
    },
    button: {
        marginTop: spacing.sm,
    },
    buttonContent: {
        paddingVertical: spacing.sm,
    },
    divider: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: spacing.lg,
    },
    dividerLine: {
        flex: 1,
        height: 1,
        backgroundColor: colors.divider,
    },
    dividerText: {
        marginHorizontal: spacing.md,
        color: colors.textSecondary,
        fontSize: 14,
    },
    footer: {
        textAlign: 'center',
        color: colors.textSecondary,
        fontSize: 12,
        marginTop: spacing.lg,
    },
});
