import { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, useWindowDimensions } from 'react-native';
import { Text, Card, FAB, Chip, ActivityIndicator } from 'react-native-paper';
import { router } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { colors, spacing, breakpoints } from '../../lib/theme';
import type { BotConfiguration } from '../../lib/types';

export default function DashboardScreen() {
    const { width } = useWindowDimensions();
    const isDesktop = width >= breakpoints.tablet;
    const isLargeDesktop = width >= breakpoints.desktop;

    const [bots, setBots] = useState<BotConfiguration[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [stats, setStats] = useState({
        totalBots: 0,
        activeBots: 0,
        conversations: 0,
    });

    useEffect(() => {
        loadBots();
    }, []);

    async function loadBots(isRefresh = false) {
        if (isRefresh) setRefreshing(true);
        else setLoading(true);

        try {
            const { data, error } = await supabase
                .from('bot_configurations')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(5);

            if (error) throw error;

            setBots(data || []);
            setStats({
                totalBots: data?.length || 0,
                activeBots: data?.filter(b => b.is_active).length || 0,
                conversations: 0, // TODO: Implementar contagem real
            });
        } catch (error) {
            console.error('Error loading bots:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }

    if (loading) {
        return (
            <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    const getBotCardStyle = () => {
        if (!isDesktop) return styles.botCard;
        // On desktop, we want 2 cards per row on tablet, 3 on large desktop

        return [
            styles.botCard,
            {
                width: isLargeDesktop ? '32%' as const : '48%' as const,
                marginRight: 0
            }
        ];
    };

    return (
        <View style={styles.container}>
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={() => loadBots(true)}
                        colors={[colors.primary]}
                    />
                }
            >
                <View style={[styles.contentWrapper, isDesktop && styles.contentWrapperDesktop]}>
                    <Text variant="headlineMedium" style={styles.pageTitle}>Dashboard</Text>

                    {/* Stats Cards */}
                    <View style={styles.statsContainer}>
                        <Card style={styles.statCard}>
                            <Card.Content style={styles.statContent}>
                                <MaterialCommunityIcons name="robot" size={32} color={colors.primary} />
                                <Text variant="displaySmall" style={styles.statNumber}>
                                    {stats.totalBots}
                                </Text>
                                <Text variant="bodyMedium" style={styles.statLabel}>
                                    Total de Bots
                                </Text>
                            </Card.Content>
                        </Card>

                        <Card style={styles.statCard}>
                            <Card.Content style={styles.statContent}>
                                <MaterialCommunityIcons name="check-circle" size={32} color={colors.success} />
                                <Text variant="displaySmall" style={styles.statNumber}>
                                    {stats.activeBots}
                                </Text>
                                <Text variant="bodyMedium" style={styles.statLabel}>
                                    Bots Ativos
                                </Text>
                            </Card.Content>
                        </Card>

                        <Card style={styles.statCard}>
                            <Card.Content style={styles.statContent}>
                                <MaterialCommunityIcons name="message-text" size={32} color={colors.info} />
                                <Text variant="displaySmall" style={styles.statNumber}>
                                    {stats.conversations}
                                </Text>
                                <Text variant="bodyMedium" style={styles.statLabel}>
                                    Conversas Hoje
                                </Text>
                            </Card.Content>
                        </Card>
                    </View>

                    {/* Bots List */}
                    <View style={styles.section}>
                        <Text variant="titleLarge" style={styles.sectionTitle}>
                            Seus Chatbots Recentes
                        </Text>

                        <View style={[styles.botsGrid, isDesktop && styles.botsGridDesktop]}>
                            {bots.length === 0 ? (
                                <Card style={styles.emptyCard}>
                                    <Card.Content style={styles.emptyContent}>
                                        <MaterialCommunityIcons
                                            name="robot-outline"
                                            size={64}
                                            color={colors.textDisabled}
                                        />
                                        <Text variant="titleMedium" style={styles.emptyTitle}>
                                            Nenhum chatbot criado ainda
                                        </Text>
                                        <Text variant="bodyMedium" style={styles.emptyText}>
                                            Clique no botão + para criar seu primeiro chatbot
                                        </Text>
                                    </Card.Content>
                                </Card>
                            ) : (
                                bots.map((bot) => (
                                    <Card
                                        key={bot.id}
                                        style={getBotCardStyle()}
                                        onPress={() => router.push(`/chatbots/${bot.id}/edit` as any)}
                                    >
                                        <Card.Content>
                                            <View style={styles.botHeader}>
                                                <View style={styles.botInfo}>
                                                    <Text variant="titleMedium" style={styles.botName}>
                                                        {bot.company_name}
                                                    </Text>
                                                    <Text variant="bodySmall" style={styles.botDescription}>
                                                        {bot.bot_name}
                                                    </Text>
                                                </View>
                                                <Chip
                                                    mode="flat"
                                                    style={[
                                                        styles.statusChip,
                                                        { backgroundColor: bot.is_active ? colors.success + '20' : colors.textDisabled + '20' }
                                                    ]}
                                                    textStyle={{
                                                        color: bot.is_active ? colors.success : colors.textDisabled,
                                                        fontSize: 12,
                                                    }}
                                                >
                                                    {bot.is_active ? 'Ativo' : 'Pausado'}
                                                </Chip>
                                            </View>

                                            <View style={styles.botDetails}>
                                                <Chip
                                                    icon={({ size }) => (
                                                        <MaterialCommunityIcons name="account-voice" size={size} color="#FFFFFF" />
                                                    )}
                                                    style={styles.detailChip}
                                                    textStyle={styles.detailChipText}
                                                    compact
                                                >
                                                    {bot.tone_of_voice === 'professional' && 'Profissional'}
                                                    {bot.tone_of_voice === 'casual' && 'Casual'}
                                                    {bot.tone_of_voice === 'friendly' && 'Amigável'}
                                                    {bot.tone_of_voice === 'technical' && 'Técnico'}
                                                    {bot.tone_of_voice === 'custom' && 'Personalizado'}
                                                </Chip>
                                                {bot.whatsapp_number && (
                                                    <Chip
                                                        icon={({ size }) => (
                                                            <MaterialCommunityIcons name="whatsapp" size={size} color="#FFFFFF" />
                                                        )}
                                                        style={styles.detailChip}
                                                        textStyle={styles.detailChipText}
                                                        compact
                                                    >
                                                        WhatsApp
                                                    </Chip>
                                                )}
                                                {bot.knowledge_base_enabled && (
                                                    <Chip
                                                        icon={({ size }) => (
                                                            <MaterialCommunityIcons name="book-open-variant" size={size} color="#FFFFFF" />
                                                        )}
                                                        style={styles.detailChip}
                                                        textStyle={styles.detailChipText}
                                                        compact
                                                    >
                                                        RAG
                                                    </Chip>
                                                )}
                                            </View>
                                        </Card.Content>
                                    </Card>
                                ))
                            )}
                        </View>
                    </View>
                </View>
            </ScrollView>

            <FAB
                icon="plus"
                style={styles.fab}
                onPress={() => router.push('/chatbots/new')}
                label={isDesktop ? "Novo Chatbot" : undefined}
            />
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
    scrollContent: {
        flexGrow: 1,
    },
    contentWrapper: {
        padding: spacing.md,
        paddingBottom: 100,
        width: '100%',
    },
    contentWrapperDesktop: {
        padding: spacing.xl,
        maxWidth: 1600,
        marginHorizontal: 'auto',
    },
    pageTitle: {
        fontWeight: 'bold',
        marginBottom: spacing.lg,
        color: colors.text,
    },
    statsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.md,
        marginBottom: spacing.lg,
    },
    statCard: {
        flex: 1,
        minWidth: 140,
        elevation: 1,
    },
    statContent: {
        alignItems: 'center',
        paddingVertical: spacing.md,
    },
    statNumber: {
        color: colors.text,
        fontWeight: 'bold',
        marginTop: spacing.xs,
    },
    statLabel: {
        color: colors.textSecondary,
        textAlign: 'center',
        marginTop: spacing.xs,
    },
    section: {
        marginBottom: spacing.lg,
    },
    sectionTitle: {
        color: colors.text,
        fontWeight: 'bold',
        marginBottom: spacing.md,
    },
    emptyCard: {
        elevation: 0,
        backgroundColor: colors.surface,
    },
    emptyContent: {
        alignItems: 'center',
        paddingVertical: spacing.xl,
    },
    emptyTitle: {
        color: colors.text,
        marginTop: spacing.md,
    },
    emptyText: {
        color: colors.textSecondary,
        textAlign: 'center',
        marginTop: spacing.sm,
    },
    botCard: {
        marginBottom: spacing.md,
        elevation: 1,
    },
    botHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: spacing.md,
    },
    botInfo: {
        flex: 1,
    },
    botName: {
        color: colors.text,
        fontWeight: 'bold',
    },
    botDescription: {
        color: colors.textSecondary,
        marginTop: spacing.xs,
    },
    statusChip: {
    },
    botDetails: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
        justifyContent: 'flex-start',
        alignItems: 'flex-start',
    },
    detailChip: {
        backgroundColor: colors.primary,
    },
    detailChipText: {
        color: '#FFFFFF',
    },
    fab: {
        position: 'absolute',
        right: spacing.md,
        bottom: spacing.md,
        backgroundColor: colors.primary,
    },
    botsGrid: {
        gap: spacing.md,
    },
    botsGridDesktop: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
});
