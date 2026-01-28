import { useState } from 'react';
import { View, StyleSheet, ScrollView, Platform } from 'react-native';
import { Text, TextInput, Button, Snackbar, Card } from 'react-native-paper';
import { Link, router } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { colors, spacing } from '../../lib/theme';

export default function LoginScreen() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [snackbar, setSnackbar] = useState({ visible: false, message: '' });

    async function handleLogin() {
        if (!email || !password) {
            setSnackbar({ visible: true, message: 'Preencha todos os campos' });
            return;
        }

        setLoading(true);
        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) throw error;

            if (data.session) {
                router.replace('/(tabs)');
            }
        } catch (error: any) {
            setSnackbar({
                visible: true,
                message: error.message || 'Erro ao fazer login'
            });
        } finally {
            setLoading(false);
        }
    }

    return (
        <View style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.content}>
                    {/* Logo/Header */}
                    <View style={styles.header}>
                        <View style={styles.logoContainer}>
                            <Text style={styles.logoText}>💬</Text>
                        </View>
                        <Text style={styles.title}>KBot Dashboard</Text>
                        <Text style={styles.subtitle}>
                            Gerencie seus chatbots de forma simples
                        </Text>
                    </View>

                    {/* Login Card */}
                    <Card style={styles.card}>
                        <Card.Content>
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
                                autoComplete="password"
                                style={styles.input}
                                left={<TextInput.Icon icon="lock" />}
                                right={
                                    <TextInput.Icon
                                        icon={showPassword ? 'eye-off' : 'eye'}
                                        onPress={() => setShowPassword(!showPassword)}
                                    />
                                }
                            />

                            <Button
                                mode="contained"
                                onPress={handleLogin}
                                loading={loading}
                                disabled={loading}
                                style={styles.button}
                                contentStyle={styles.buttonContent}
                            >
                                Entrar
                            </Button>

                            <View style={styles.divider}>
                                <View style={styles.dividerLine} />
                                <Text style={styles.dividerText}>ou</Text>
                                <View style={styles.dividerLine} />
                            </View>

                            <Link href="/(auth)/register" asChild>
                                <Button
                                    mode="outlined"
                                    style={styles.button}
                                    contentStyle={styles.buttonContent}
                                >
                                    Criar nova conta
                                </Button>
                            </Link>
                        </Card.Content>
                    </Card>

                    {/* Footer */}
                    <Text style={styles.footer}>
                        Plataforma white-label de chatbots com IA
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
        fontSize: 14,
        marginTop: spacing.lg,
    },
});
