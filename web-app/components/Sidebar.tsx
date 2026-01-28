import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Text, Surface, Avatar } from 'react-native-paper';
import { Link, usePathname } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, spacing } from '../lib/theme';

export default function Sidebar() {
    const pathname = usePathname();

    const isActive = (path: string) => {
        if (path === '/' && pathname === '/') return true;
        if (path !== '/' && pathname.startsWith(path)) return true;
        return false;
    };

    const menuItems = [
        {
            icon: 'view-dashboard',
            label: 'Dashboard',
            path: '/',
        },
        {
            icon: 'robot',
            label: 'Chatbots',
            path: '/chatbots',
        },
        {
            icon: 'cog',
            label: 'Configurações',
            path: '/settings',
        },
    ];

    return (
        <Surface style={styles.container} elevation={1}>
            <View style={styles.header}>
                <Avatar.Icon
                    size={40}
                    icon="robot"
                    style={{ backgroundColor: colors.primary }}
                    color="#fff"
                />
                <Text variant="titleMedium" style={styles.title}>Kbot</Text>
            </View>

            <View style={styles.menu}>
                {menuItems.map((item) => (
                    <Link key={item.path} href={item.path as any} asChild>
                        <Pressable
                            style={({ pressed, hovered }) => [
                                styles.menuItem,
                                isActive(item.path) && styles.menuItemActive,
                                (pressed || hovered) && styles.menuItemHovered
                            ]}
                        >
                            {({ hovered }) => (
                                <View style={styles.menuContent}>
                                    <MaterialCommunityIcons
                                        name={item.icon as any}
                                        size={24}
                                        color={isActive(item.path) ? colors.primary : colors.textSecondary}
                                    />
                                    <Text style={[
                                        styles.menuLabel,
                                        isActive(item.path) && styles.menuLabelActive
                                    ]}>
                                        {item.label}
                                    </Text>
                                </View>
                            )}
                        </Pressable>
                    </Link>
                ))}
            </View>
        </Surface>
    );
}

const styles = StyleSheet.create({
    container: {
        width: 250,
        height: '100%',
        backgroundColor: colors.surface,
        borderRightWidth: 1,
        borderRightColor: colors.divider,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: spacing.lg,
        gap: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.divider,
    },
    title: {
        fontWeight: 'bold',
        color: colors.text,
    },
    menu: {
        padding: spacing.md,
        gap: spacing.xs,
    },
    menuItem: {
        borderRadius: spacing.sm,
    },
    menuContent: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: spacing.md,
        gap: spacing.md,
    },
    menuItemActive: {
        backgroundColor: colors.primary + '15', // 15% opacity
    },
    menuItemHovered: {
        backgroundColor: colors.surfaceVariant,
    },
    menuLabel: {
        fontSize: 14,
        color: colors.textSecondary,
        fontWeight: '500',
    },
    menuLabelActive: {
        color: colors.primary,
        fontWeight: 'bold',
    },
});
