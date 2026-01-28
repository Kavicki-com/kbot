import { useEffect, useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, useWindowDimensions, Pressable } from 'react-native';
import { Text, Card, FAB, Chip, ActivityIndicator, Searchbar, Menu, IconButton, Button, Dialog, Portal } from 'react-native-paper';
import { router, useFocusEffect } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { supabase } from '../../../lib/supabase';
import { colors, spacing, breakpoints } from '../../../lib/theme';
import type { BotConfiguration } from '../../../lib/types';

type FilterType = 'all' | 'active' | 'inactive';

export default function ChatbotsScreen() {
    const { width } = useWindowDimensions();
    const isDesktop = width >= breakpoints.tablet;
    const isLargeDesktop = width >= breakpoints.desktop;

    const [bots, setBots] = useState<BotConfiguration[]>([]);
    const [filteredBots, setFilteredBots] = useState<BotConfiguration[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [filter, setFilter] = useState<FilterType>('all');
    const [filterMenuVisible, setFilterMenuVisible] = useState(false);
    const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
    const [botToDelete, setBotToDelete] = useState<BotConfiguration | null>(null);
    const [deleting, setDeleting] = useState(false);

    useFocusEffect(
        useCallback(() => {
            loadBots();
        }, [])
    );

    useEffect(() => {
        filterBots();
    }, [bots, searchQuery, filter]);

    async function loadBots(isRefresh = false) {
        if (isRefresh) setRefreshing(true);
        else setLoading(true);

        try {
            const { data, error } = await supabase
                .from('bot_configurations')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setBots(data || []);
        } catch (error) {
            console.error('Error loading bots:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }

    function filterBots() {
        let result = [...bots];

        // Apply search filter
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            result = result.filter(bot =>
                bot.company_name.toLowerCase().includes(query) ||
                bot.bot_name.toLowerCase().includes(query)
            );
        }

        // Apply status filter
        if (filter === 'active') {
            result = result.filter(bot => bot.is_active);
        } else if (filter === 'inactive') {
            result = result.filter(bot => !bot.is_active);
        }

        setFilteredBots(result);
    }

    async function toggleBotStatus(bot: BotConfiguration) {
        try {
            const { error } = await supabase
                .from('bot_configurations')
                .update({ is_active: !bot.is_active })
                .eq('id', bot.id);

            if (error) throw error;

            setBots(prev => prev.map(b =>
                b.id === bot.id ? { ...b, is_active: !b.is_active } : b
            ));
        } catch (error) {
            console.error('Error toggling bot status:', error);
        }
    }

    async function deleteBot() {
        if (!botToDelete) return;

        setDeleting(true);
        try {
            const { error } = await supabase
                .from('bot_configurations')
                .delete()
                .eq('id', botToDelete.id);

            if (error) throw error;

            setBots(prev => prev.filter(b => b.id !== botToDelete.id));
            setDeleteDialogVisible(false);
            setBotToDelete(null);
        } catch (error) {
            console.error('Error deleting bot:', error);
        } finally {
            setDeleting(false);
        }
    }

    function confirmDelete(bot: BotConfiguration) {
        setBotToDelete(bot);
        setDeleteDialogVisible(true);
    }

    const getFilterLabel = () => {
        switch (filter) {
            case 'active': return 'Ativos';
            case 'inactive': return 'Inativos';
            default: return 'Todos';
        }
    };

    const getGridColumns = () => {
        if (isLargeDesktop) return 3;
        if (isDesktop) return 2;
        return 1;
    };

    if (loading) {
        return (
            <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

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
                    {/* Header */}
                    <View style={styles.header}>
                        <Text variant="headlineMedium" style={styles.pageTitle}>
                            Meus Chatbots
                        </Text>
                        <Text variant="bodyMedium" style={styles.subtitle}>
                            {bots.length} chatbot{bots.length !== 1 ? 's' : ''} criado{bots.length !== 1 ? 's' : ''}
                        </Text>
                    </View>

                    {/* Search and Filters */}
                    <View style={[styles.filtersRow, isDesktop && styles.filtersRowDesktop]}>
                        <Searchbar
                            placeholder="Buscar por nome..."
                            onChangeText={setSearchQuery}
                            value={searchQuery}
                            style={[styles.searchbar, isDesktop && styles.searchbarDesktop]}
                            inputStyle={styles.searchInput}
                        />

                        <Menu
                            visible={filterMenuVisible}
                            onDismiss={() => setFilterMenuVisible(false)}
                            anchor={
                                <Button
                                    mode="outlined"
                                    icon="filter-variant"
                                    onPress={() => setFilterMenuVisible(true)}
                                    style={styles.filterButton}
                                >
                                    {getFilterLabel()}
                                </Button>
                            }
                        >
                            <Menu.Item
                                leadingIcon={filter === 'all' ? 'check' : undefined}
                                onPress={() => { setFilter('all'); setFilterMenuVisible(false); }}
                                title="Todos"
                            />
                            <Menu.Item
                                leadingIcon={filter === 'active' ? 'check' : undefined}
                                onPress={() => { setFilter('active'); setFilterMenuVisible(false); }}
                                title="Ativos"
                            />
                            <Menu.Item
                                leadingIcon={filter === 'inactive' ? 'check' : undefined}
                                onPress={() => { setFilter('inactive'); setFilterMenuVisible(false); }}
                                title="Inativos"
                            />
                        </Menu>
                    </View>

                    {/* Stats Summary */}
                    <View style={styles.statsRow}>
                        <View style={styles.statBadge}>
                            <MaterialCommunityIcons name="check-circle" size={16} color={colors.success} />
                            <Text style={styles.statText}>
                                {bots.filter(b => b.is_active).length} ativos
                            </Text>
                        </View>
                        <View style={styles.statBadge}>
                            <MaterialCommunityIcons name="pause-circle" size={16} color={colors.textDisabled} />
                            <Text style={styles.statText}>
                                {bots.filter(b => !b.is_active).length} inativos
                            </Text>
                        </View>
                    </View>

                    {/* Bots Grid */}
                    {filteredBots.length === 0 ? (
                        <Card style={styles.emptyCard}>
                            <Card.Content style={styles.emptyContent}>
                                <MaterialCommunityIcons
                                    name={searchQuery || filter !== 'all' ? "magnify-close" : "robot-outline"}
                                    size={64}
                                    color={colors.textDisabled}
                                />
                                <Text variant="titleMedium" style={styles.emptyTitle}>
                                    {searchQuery || filter !== 'all'
                                        ? 'Nenhum chatbot encontrado'
                                        : 'Nenhum chatbot criado ainda'}
                                </Text>
                                <Text variant="bodyMedium" style={styles.emptyText}>
                                    {searchQuery || filter !== 'all'
                                        ? 'Tente ajustar os filtros de busca'
                                        : 'Clique no botão + para criar seu primeiro chatbot'}
                                </Text>
                                {(searchQuery || filter !== 'all') && (
                                    <Button
                                        mode="text"
                                        onPress={() => { setSearchQuery(''); setFilter('all'); }}
                                        style={styles.clearButton}
                                    >
                                        Limpar filtros
                                    </Button>
                                )}
                            </Card.Content>
                        </Card>
                    ) : (
                        <View style={[
                            styles.botsGrid,
                            isDesktop && styles.botsGridDesktop
                        ]}>
                            {filteredBots.map((bot) => (
                                <Pressable
                                    key={bot.id}
                                    onPress={() => router.push(`/chatbots/${bot.id}/edit` as any)}
                                    style={({ hovered }: { hovered?: boolean }) => [
                                        styles.botCardWrapper,
                                        isDesktop && {
                                            width: isLargeDesktop ? '32%' : '48%'
                                        },
                                        hovered && styles.botCardHovered
                                    ]}
                                >
                                    <Card style={styles.botCard}>
                                        <Card.Content>
                                            {/* Bot Header */}
                                            <View style={styles.botHeader}>
                                                <View style={[
                                                    styles.botAvatar,
                                                    { backgroundColor: bot.primary_color || colors.primary }
                                                ]}>
                                                    <MaterialCommunityIcons
                                                        name="robot"
                                                        size={24}
                                                        color="#FFFFFF"
                                                    />
                                                </View>
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

                                            {/* Bot Details */}
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

                                            {/* Actions */}
                                            <View style={styles.botActions}>
                                                <Button
                                                    mode="text"
                                                    icon={bot.is_active ? "pause" : "play"}
                                                    onPress={(e) => {
                                                        e.stopPropagation();
                                                        toggleBotStatus(bot);
                                                    }}
                                                    compact
                                                    textColor={bot.is_active ? colors.warning : colors.success}
                                                >
                                                    {bot.is_active ? 'Pausar' : 'Ativar'}
                                                </Button>
                                                <Button
                                                    mode="text"
                                                    icon="pencil"
                                                    onPress={() => router.push(`/chatbots/${bot.id}/edit` as any)}
                                                    compact
                                                >
                                                    Editar
                                                </Button>
                                                <IconButton
                                                    icon="delete"
                                                    iconColor={colors.error}
                                                    size={20}
                                                    onPress={() => confirmDelete(bot)}
                                                />
                                            </View>
                                        </Card.Content>
                                    </Card>
                                </Pressable>
                            ))}
                        </View>
                    )}
                </View>
            </ScrollView>

            <FAB
                icon="plus"
                style={styles.fab}
                onPress={() => router.push('/chatbots/new')}
                label={isDesktop ? "Novo Chatbot" : undefined}
            />

            {/* Delete Confirmation Dialog */}
            <Portal>
                <Dialog visible={deleteDialogVisible} onDismiss={() => setDeleteDialogVisible(false)}>
                    <Dialog.Icon icon="alert" color={colors.error} />
                    <Dialog.Title style={styles.dialogTitle}>Excluir Chatbot?</Dialog.Title>
                    <Dialog.Content>
                        <Text variant="bodyMedium">
                            Tem certeza que deseja excluir o chatbot "{botToDelete?.company_name}"?
                            Esta ação não pode ser desfeita.
                        </Text>
                    </Dialog.Content>
                    <Dialog.Actions>
                        <Button onPress={() => setDeleteDialogVisible(false)} disabled={deleting}>
                            Cancelar
                        </Button>
                        <Button
                            onPress={deleteBot}
                            textColor={colors.error}
                            loading={deleting}
                            disabled={deleting}
                        >
                            Excluir
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
    header: {
        marginBottom: spacing.lg,
    },
    pageTitle: {
        fontWeight: 'bold',
        color: colors.text,
    },
    subtitle: {
        color: colors.textSecondary,
        marginTop: spacing.xs,
    },
    filtersRow: {
        gap: spacing.md,
        marginBottom: spacing.md,
    },
    filtersRowDesktop: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    searchbar: {
        backgroundColor: colors.surface,
        elevation: 0,
        borderWidth: 1,
        borderColor: colors.divider,
    },
    searchbarDesktop: {
        flex: 1,
        maxWidth: 400,
    },
    searchInput: {
        fontSize: 14,
    },
    filterButton: {
        borderColor: colors.divider,
    },
    statsRow: {
        flexDirection: 'row',
        gap: spacing.md,
        marginBottom: spacing.lg,
    },
    statBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        paddingVertical: spacing.xs,
        paddingHorizontal: spacing.sm,
        backgroundColor: colors.surface,
        borderRadius: spacing.sm,
    },
    statText: {
        fontSize: 12,
        color: colors.textSecondary,
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
    clearButton: {
        marginTop: spacing.md,
    },
    botsGrid: {
        gap: spacing.md,
    },
    botsGridDesktop: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    botCardWrapper: {
        marginBottom: spacing.md,
    },
    botCardHovered: {
        opacity: 0.95,
    },
    botCard: {
        elevation: 1,
    },
    botHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        marginBottom: spacing.md,
    },
    botAvatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
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
        marginTop: 2,
    },
    statusChip: {
    },
    botDetails: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
        marginBottom: spacing.md,
        justifyContent: 'flex-start',
        alignItems: 'flex-start',
    },
    detailChip: {
        backgroundColor: colors.primary,
    },
    detailChipText: {
        color: '#FFFFFF',
    },
    botActions: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
        borderTopWidth: 1,
        borderTopColor: colors.divider,
        paddingTop: spacing.sm,
        marginTop: spacing.sm,
    },
    fab: {
        position: 'absolute',
        right: spacing.md,
        bottom: spacing.md,
        backgroundColor: colors.primary,
    },
    dialogTitle: {
        textAlign: 'center',
    },
});
