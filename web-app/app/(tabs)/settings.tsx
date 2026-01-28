import { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Linking } from 'react-native';
import { Text, Button, Card, Switch, Divider, List, Avatar, Portal, Dialog, TextInput, Snackbar, ActivityIndicator } from 'react-native-paper';
import { router } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { colors, spacing } from '../../lib/theme';

interface UserProfile {
    id: string;
    email: string;
    organization_id: string;
    role: 'admin' | 'user';
    created_at: string;
}

interface Organization {
    id: string;
    name: string;
}

export default function SettingsScreen() {
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<UserProfile | null>(null);
    const [organization, setOrganization] = useState<Organization | null>(null);
    const [loggingOut, setLoggingOut] = useState(false);

    // Dialogs
    const [logoutDialogVisible, setLogoutDialogVisible] = useState(false);
    const [editProfileDialogVisible, setEditProfileDialogVisible] = useState(false);
    const [editOrgDialogVisible, setEditOrgDialogVisible] = useState(false);

    // Edit states
    const [newOrgName, setNewOrgName] = useState('');
    const [saving, setSaving] = useState(false);

    // Snackbar
    const [snackbar, setSnackbar] = useState({ visible: false, message: '', error: false });

    // Settings toggles
    const [emailNotifications, setEmailNotifications] = useState(true);
    const [pushNotifications, setPushNotifications] = useState(true);

    useEffect(() => {
        loadUserData();
    }, []);

    async function loadUserData() {
        try {
            const { data: { user: authUser } } = await supabase.auth.getUser();
            if (!authUser) return;

            // Get user profile
            const { data: userData, error: userError } = await supabase
                .from('users')
                .select('*')
                .eq('id', authUser.id)
                .single();

            if (userError) throw userError;
            setUser(userData);

            // Get organization
            if (userData.organization_id) {
                const { data: orgData, error: orgError } = await supabase
                    .from('organizations')
                    .select('*')
                    .eq('id', userData.organization_id)
                    .single();

                if (!orgError && orgData) {
                    setOrganization(orgData);
                    setNewOrgName(orgData.name);
                }
            }
        } catch (error) {
            console.error('Error loading user data:', error);
        } finally {
            setLoading(false);
        }
    }

    async function handleLogout() {
        setLoggingOut(true);
        try {
            await supabase.auth.signOut();
            router.replace('/(auth)/login');
        } catch (error) {
            console.error('Error logging out:', error);
            setSnackbar({ visible: true, message: 'Erro ao sair da conta', error: true });
            setLoggingOut(false);
        }
    }

    async function handleUpdateOrganization() {
        if (!newOrgName.trim()) {
            setSnackbar({ visible: true, message: 'Nome da organização é obrigatório', error: true });
            return;
        }

        setSaving(true);
        try {
            const { error } = await supabase
                .from('organizations')
                .update({ name: newOrgName })
                .eq('id', organization?.id);

            if (error) throw error;

            setOrganization(prev => prev ? { ...prev, name: newOrgName } : null);
            setEditOrgDialogVisible(false);
            setSnackbar({ visible: true, message: 'Organização atualizada!', error: false });
        } catch (error: any) {
            console.error('Error updating organization:', error);
            setSnackbar({ visible: true, message: error.message || 'Erro ao atualizar', error: true });
        } finally {
            setSaving(false);
        }
    }

    function formatDate(dateString: string) {
        return new Date(dateString).toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: 'long',
            year: 'numeric'
        });
    }

    if (loading) {
        return (
            <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <ScrollView contentContainerStyle={styles.content}>
                {/* Header */}
                <Text variant="headlineMedium" style={styles.pageTitle}>Configurações</Text>

                {/* Profile Section */}
                <Card style={styles.card}>
                    <Card.Content>
                        <View style={styles.profileHeader}>
                            <Avatar.Icon
                                size={64}
                                icon="account"
                                style={{ backgroundColor: colors.primary }}
                                color="#fff"
                            />
                            <View style={styles.profileInfo}>
                                <Text variant="titleLarge" style={styles.profileName}>
                                    {organization?.name || 'Usuário'}
                                </Text>
                                <Text variant="bodyMedium" style={styles.profileEmail}>
                                    {user?.email}
                                </Text>
                                <View style={styles.roleChip}>
                                    <MaterialCommunityIcons
                                        name={user?.role === 'admin' ? 'shield-crown' : 'account'}
                                        size={14}
                                        color={colors.primary}
                                    />
                                    <Text style={styles.roleText}>
                                        {user?.role === 'admin' ? 'Administrador' : 'Usuário'}
                                    </Text>
                                </View>
                            </View>
                        </View>
                    </Card.Content>
                </Card>

                {/* Organization Section */}
                <View style={styles.section}>
                    <Text variant="titleMedium" style={styles.sectionTitle}>
                        <MaterialCommunityIcons name="domain" size={20} color={colors.primary} /> Organização
                    </Text>

                    <Card style={styles.card}>
                        <List.Item
                            title="Nome da Organização"
                            description={organization?.name || 'Não definido'}
                            left={props => <List.Icon {...props} icon="office-building" />}
                            right={props => <List.Icon {...props} icon="chevron-right" />}
                            onPress={() => setEditOrgDialogVisible(true)}
                        />
                        <Divider />
                        <List.Item
                            title="Membro desde"
                            description={user?.created_at ? formatDate(user.created_at) : '-'}
                            left={props => <List.Icon {...props} icon="calendar" />}
                        />
                    </Card>
                </View>

                {/* Notifications Section */}
                <View style={styles.section}>
                    <Text variant="titleMedium" style={styles.sectionTitle}>
                        <MaterialCommunityIcons name="bell" size={20} color={colors.primary} /> Notificações
                    </Text>

                    <Card style={styles.card}>
                        <List.Item
                            title="Notificações por Email"
                            description="Receber atualizações por email"
                            left={props => <List.Icon {...props} icon="email" />}
                            right={() => (
                                <Switch
                                    value={emailNotifications}
                                    onValueChange={setEmailNotifications}
                                />
                            )}
                        />
                        <Divider />
                        <List.Item
                            title="Notificações Push"
                            description="Receber notificações no navegador"
                            left={props => <List.Icon {...props} icon="bell-ring" />}
                            right={() => (
                                <Switch
                                    value={pushNotifications}
                                    onValueChange={setPushNotifications}
                                />
                            )}
                        />
                    </Card>
                </View>

                {/* Security Section */}
                <View style={styles.section}>
                    <Text variant="titleMedium" style={styles.sectionTitle}>
                        <MaterialCommunityIcons name="shield-lock" size={20} color={colors.primary} /> Segurança
                    </Text>

                    <Card style={styles.card}>
                        <List.Item
                            title="Alterar Senha"
                            description="Atualize sua senha de acesso"
                            left={props => <List.Icon {...props} icon="lock-reset" />}
                            right={props => <List.Icon {...props} icon="chevron-right" />}
                            onPress={() => {
                                setSnackbar({ visible: true, message: 'Funcionalidade em breve!', error: false });
                            }}
                        />
                        <Divider />
                        <List.Item
                            title="Sessões Ativas"
                            description="Gerencie seus dispositivos conectados"
                            left={props => <List.Icon {...props} icon="devices" />}
                            right={props => <List.Icon {...props} icon="chevron-right" />}
                            onPress={() => {
                                setSnackbar({ visible: true, message: 'Funcionalidade em breve!', error: false });
                            }}
                        />
                    </Card>
                </View>

                {/* API Section */}
                <View style={styles.section}>
                    <Text variant="titleMedium" style={styles.sectionTitle}>
                        <MaterialCommunityIcons name="api" size={20} color={colors.primary} /> Integrações
                    </Text>

                    <Card style={styles.card}>
                        <List.Item
                            title="Chaves de API"
                            description="Gerencie suas chaves de integração"
                            left={props => <List.Icon {...props} icon="key" />}
                            right={props => <List.Icon {...props} icon="chevron-right" />}
                            onPress={() => {
                                setSnackbar({ visible: true, message: 'Funcionalidade em breve!', error: false });
                            }}
                        />
                        <Divider />
                        <List.Item
                            title="Webhooks"
                            description="Configure endpoints de webhook"
                            left={props => <List.Icon {...props} icon="webhook" />}
                            right={props => <List.Icon {...props} icon="chevron-right" />}
                            onPress={() => {
                                setSnackbar({ visible: true, message: 'Funcionalidade em breve!', error: false });
                            }}
                        />
                    </Card>
                </View>

                {/* Support Section */}
                <View style={styles.section}>
                    <Text variant="titleMedium" style={styles.sectionTitle}>
                        <MaterialCommunityIcons name="help-circle" size={20} color={colors.primary} /> Suporte
                    </Text>

                    <Card style={styles.card}>
                        <List.Item
                            title="Documentação"
                            description="Acesse a documentação completa"
                            left={props => <List.Icon {...props} icon="book-open-page-variant" />}
                            right={props => <List.Icon {...props} icon="open-in-new" />}
                            onPress={() => Linking.openURL('https://docs.kbot.com.br')}
                        />
                        <Divider />
                        <List.Item
                            title="Falar com Suporte"
                            description="Entre em contato via WhatsApp"
                            left={props => <List.Icon {...props} icon="whatsapp" />}
                            right={props => <List.Icon {...props} icon="open-in-new" />}
                            onPress={() => Linking.openURL('https://wa.me/5511999999999')}
                        />
                        <Divider />
                        <List.Item
                            title="Sobre o Kbot"
                            description="Versão 1.0.0"
                            left={props => <List.Icon {...props} icon="information" />}
                        />
                    </Card>
                </View>

                {/* Logout Button */}
                <View style={styles.logoutSection}>
                    <Button
                        mode="contained"
                        onPress={() => setLogoutDialogVisible(true)}
                        icon="logout"
                        style={styles.logoutButton}
                        buttonColor={colors.error}
                    >
                        Sair da Conta
                    </Button>
                </View>
            </ScrollView>

            {/* Logout Dialog */}
            <Portal>
                <Dialog visible={logoutDialogVisible} onDismiss={() => setLogoutDialogVisible(false)}>
                    <Dialog.Icon icon="logout" />
                    <Dialog.Title style={styles.dialogTitle}>Sair da Conta?</Dialog.Title>
                    <Dialog.Content>
                        <Text variant="bodyMedium">
                            Você será desconectado e precisará fazer login novamente.
                        </Text>
                    </Dialog.Content>
                    <Dialog.Actions>
                        <Button onPress={() => setLogoutDialogVisible(false)} disabled={loggingOut}>
                            Cancelar
                        </Button>
                        <Button
                            onPress={handleLogout}
                            textColor={colors.error}
                            loading={loggingOut}
                            disabled={loggingOut}
                        >
                            Sair
                        </Button>
                    </Dialog.Actions>
                </Dialog>
            </Portal>

            {/* Edit Organization Dialog */}
            <Portal>
                <Dialog visible={editOrgDialogVisible} onDismiss={() => setEditOrgDialogVisible(false)}>
                    <Dialog.Title>Editar Organização</Dialog.Title>
                    <Dialog.Content>
                        <TextInput
                            label="Nome da Organização"
                            value={newOrgName}
                            onChangeText={setNewOrgName}
                            mode="outlined"
                        />
                    </Dialog.Content>
                    <Dialog.Actions>
                        <Button onPress={() => setEditOrgDialogVisible(false)} disabled={saving}>
                            Cancelar
                        </Button>
                        <Button
                            onPress={handleUpdateOrganization}
                            loading={saving}
                            disabled={saving}
                        >
                            Salvar
                        </Button>
                    </Dialog.Actions>
                </Dialog>
            </Portal>

            {/* Snackbar */}
            <Snackbar
                visible={snackbar.visible}
                onDismiss={() => setSnackbar({ ...snackbar, visible: false })}
                duration={3000}
                style={snackbar.error ? { backgroundColor: colors.error } : undefined}
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
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        padding: spacing.md,
        paddingBottom: spacing.xxl,
    },
    pageTitle: {
        fontWeight: 'bold',
        marginBottom: spacing.lg,
        color: colors.text,
    },
    card: {
        marginBottom: spacing.md,
        backgroundColor: colors.surface,
    },
    profileHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
    },
    profileInfo: {
        flex: 1,
    },
    profileName: {
        fontWeight: 'bold',
        color: colors.text,
    },
    profileEmail: {
        color: colors.textSecondary,
        marginTop: 2,
    },
    roleChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        marginTop: spacing.sm,
        paddingVertical: spacing.xs,
        paddingHorizontal: spacing.sm,
        backgroundColor: colors.primary + '15',
        borderRadius: 12,
        alignSelf: 'flex-start',
    },
    roleText: {
        fontSize: 12,
        color: colors.primary,
        fontWeight: '500',
    },
    section: {
        marginBottom: spacing.lg,
    },
    sectionTitle: {
        color: colors.text,
        fontWeight: 'bold',
        marginBottom: spacing.sm,
    },
    logoutSection: {
        marginTop: spacing.lg,
    },
    logoutButton: {
        paddingVertical: spacing.xs,
    },
    dialogTitle: {
        textAlign: 'center',
    },
});
