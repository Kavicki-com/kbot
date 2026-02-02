import { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, TextInput, RefreshControl } from 'react-native';
import { Text, Card, Avatar, Chip, IconButton, Searchbar } from 'react-native-paper';
import { router, useLocalSearchParams, Stack } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { supabase } from '../../../../lib/supabase';
import { colors, spacing } from '../../../../lib/theme';

interface Conversation {
    id: string;
    customer_phone: string;
    customer_name: string | null;
    last_message_at: string;
    status: 'active' | 'archived' | 'closed';
    last_message?: {
        content: string;
        direction: 'incoming' | 'outgoing';
    };
}

export default function ConversationsScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();

    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [filteredConversations, setFilteredConversations] = useState<Conversation[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'archived'>('all');

    useEffect(() => {
        loadConversations();

        // Subscribe to real-time updates
        const subscription = supabase
            .channel('conversations')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'whatsapp_conversations',
                filter: `bot_configuration_id=eq.${id}`
            }, () => {
                loadConversations();
            })
            .subscribe();

        return () => {
            subscription.unsubscribe();
        };
    }, [id]);

    useEffect(() => {
        filterConversations();
    }, [searchQuery, statusFilter, conversations]);

    async function loadConversations() {
        try {
            setLoading(true);

            let query = supabase
                .from('whatsapp_conversations')
                .select(`
                    *,
                    whatsapp_messages(content, direction, sent_at)
                `)
                .eq('bot_configuration_id', id)
                .order('last_message_at', { ascending: false });

            if (statusFilter !== 'all') {
                query = query.eq('status', statusFilter);
            }

            const { data, error } = await query;

            if (error) throw error;

            // Process conversations to get last message
            const processedConversations = (data || []).map((conv: any) => ({
                ...conv,
                last_message: conv.whatsapp_messages?.[0] || null
            }));

            setConversations(processedConversations);
        } catch (error) {
            console.error('Error loading conversations:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }

    function filterConversations() {
        let filtered = conversations;

        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(conv =>
                conv.customer_name?.toLowerCase().includes(query) ||
                conv.customer_phone.includes(query)
            );
        }

        setFilteredConversations(filtered);
    }

    function onRefresh() {
        setRefreshing(true);
        loadConversations();
    }

    function formatPhoneNumber(phone: string): string {
        // Format as +55 (XX) XXXXX-XXXX
        const cleaned = phone.replace(/\D/g, '');
        if (cleaned.length === 13) {
            return `+${cleaned.slice(0, 2)} (${cleaned.slice(2, 4)}) ${cleaned.slice(4, 9)}-${cleaned.slice(9)}`;
        }
        return phone;
    }

    function getInitials(name: string | null, phone: string): string {
        if (name) {
            const parts = name.split(' ');
            if (parts.length >= 2) {
                return (parts[0][0] + parts[1][0]).toUpperCase();
            }
            return name.substring(0, 2).toUpperCase();
        }
        return phone.substring(0, 2);
    }

    function formatTimestamp(timestamp: string): string {
        const date = new Date(timestamp);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Agora';
        if (diffMins < 60) return `${diffMins}min`;
        if (diffHours < 24) return `${diffHours}h`;
        if (diffDays < 7) return `${diffDays}d`;

        return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    }

    function renderConversationItem({ item }: { item: Conversation }) {
        return (
            <TouchableOpacity
                onPress={() => router.push(`/chatbots/${id}/conversation/${item.id}`)}
            >
                <Card style={styles.conversationCard}>
                    <Card.Content style={styles.conversationContent}>
                        <Avatar.Text
                            size={50}
                            label={getInitials(item.customer_name, item.customer_phone)}
                            style={{ backgroundColor: colors.primary }}
                        />

                        <View style={styles.conversationInfo}>
                            <View style={styles.conversationHeader}>
                                <Text variant="titleMedium" style={styles.customerName}>
                                    {item.customer_name || formatPhoneNumber(item.customer_phone)}
                                </Text>
                                <Text variant="bodySmall" style={styles.timestamp}>
                                    {formatTimestamp(item.last_message_at)}
                                </Text>
                            </View>

                            {item.customer_name && (
                                <Text variant="bodySmall" style={styles.phoneNumber}>
                                    {formatPhoneNumber(item.customer_phone)}
                                </Text>
                            )}

                            {item.last_message && (
                                <View style={styles.lastMessageRow}>
                                    {item.last_message.direction === 'outgoing' && (
                                        <MaterialCommunityIcons
                                            name="check-all"
                                            size={16}
                                            color={colors.primary}
                                            style={{ marginRight: 4 }}
                                        />
                                    )}
                                    <Text
                                        variant="bodyMedium"
                                        style={styles.lastMessage}
                                        numberOfLines={1}
                                    >
                                        {item.last_message.content}
                                    </Text>
                                </View>
                            )}
                        </View>

                        <MaterialCommunityIcons
                            name="chevron-right"
                            size={24}
                            color={colors.textDisabled}
                        />
                    </Card.Content>
                </Card>
            </TouchableOpacity>
        );
    }

    return (
        <View style={styles.container}>
            <Stack.Screen
                options={{
                    headerTitle: 'Conversas WhatsApp',
                    headerLeft: () => (
                        <IconButton
                            icon="arrow-left"
                            onPress={() => router.back()}
                        />
                    ),
                }}
            />

            <View style={styles.filtersContainer}>
                <Searchbar
                    placeholder="Buscar por nome ou número"
                    onChangeText={setSearchQuery}
                    value={searchQuery}
                    style={styles.searchBar}
                />

                <View style={styles.chipsRow}>
                    <Chip
                        selected={statusFilter === 'all'}
                        onPress={() => setStatusFilter('all')}
                        style={styles.filterChip}
                    >
                        Todas
                    </Chip>
                    <Chip
                        selected={statusFilter === 'active'}
                        onPress={() => setStatusFilter('active')}
                        style={styles.filterChip}
                    >
                        Ativas
                    </Chip>
                    <Chip
                        selected={statusFilter === 'archived'}
                        onPress={() => setStatusFilter('archived')}
                        style={styles.filterChip}
                    >
                        Arquivadas
                    </Chip>
                </View>
            </View>

            <FlatList
                data={filteredConversations}
                renderItem={renderConversationItem}
                keyExtractor={item => item.id}
                contentContainerStyle={styles.listContent}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        colors={[colors.primary]}
                    />
                }
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <MaterialCommunityIcons
                            name="message-outline"
                            size={64}
                            color={colors.textDisabled}
                        />
                        <Text variant="titleMedium" style={styles.emptyTitle}>
                            Nenhuma conversa
                        </Text>
                        <Text variant="bodyMedium" style={styles.emptyText}>
                            As conversas do WhatsApp aparecerão aqui
                        </Text>
                    </View>
                }
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    filtersContainer: {
        padding: spacing.md,
        backgroundColor: colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    searchBar: {
        marginBottom: spacing.sm,
    },
    chipsRow: {
        flexDirection: 'row',
        gap: spacing.sm,
    },
    filterChip: {
        marginRight: spacing.xs,
    },
    listContent: {
        padding: spacing.md,
        paddingBottom: spacing.xxl,
    },
    conversationCard: {
        marginBottom: spacing.sm,
    },
    conversationContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
    },
    conversationInfo: {
        flex: 1,
    },
    conversationHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.xs,
    },
    customerName: {
        fontWeight: '600',
        color: colors.text,
        flex: 1,
    },
    timestamp: {
        color: colors.textSecondary,
        marginLeft: spacing.sm,
    },
    phoneNumber: {
        color: colors.textSecondary,
        marginBottom: spacing.xs,
    },
    lastMessageRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    lastMessage: {
        color: colors.textSecondary,
        flex: 1,
    },
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing.xxl * 2,
    },
    emptyTitle: {
        marginTop: spacing.md,
        marginBottom: spacing.sm,
        color: colors.textSecondary,
        fontWeight: '600',
    },
    emptyText: {
        color: colors.textDisabled,
        textAlign: 'center',
    },
});
