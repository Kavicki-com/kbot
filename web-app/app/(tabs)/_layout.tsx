import { Tabs } from 'expo-router';
import { View, useWindowDimensions } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, breakpoints } from '../../lib/theme';
import Sidebar from '../../components/Sidebar';

export default function TabsLayout() {
    const { width } = useWindowDimensions();
    const isDesktop = width >= breakpoints.tablet;

    return (
        <View style={{ flex: 1, flexDirection: 'row' }}>
            {isDesktop && <Sidebar />}
            <View style={{ flex: 1 }}>
                <Tabs
                    screenOptions={{
                        tabBarActiveTintColor: colors.primary,
                        tabBarInactiveTintColor: colors.textSecondary,
                        tabBarStyle: {
                            backgroundColor: colors.surface,
                            borderTopColor: colors.divider,
                            display: isDesktop ? 'none' : 'flex',
                        },
                        headerStyle: {
                            backgroundColor: colors.primary,
                        },
                        headerTintColor: '#FFFFFF',
                        headerTitleStyle: {
                            fontWeight: 'bold',
                        },
                        headerShown: !isDesktop, // Hide header on desktop since we have sidebar context
                    }}
                >
                    <Tabs.Screen
                        name="index"
                        options={{
                            title: 'Dashboard',
                            headerTitle: 'Meus Chatbots',
                            tabBarIcon: ({ color, size }) => (
                                <MaterialCommunityIcons name="view-dashboard" size={size} color={color} />
                            ),
                        }}
                    />
                    <Tabs.Screen
                        name="chatbots"
                        options={{
                            title: 'Chatbots',
                            headerTitle: 'Gerenciar Chatbots',
                            tabBarIcon: ({ color, size }) => (
                                <MaterialCommunityIcons name="robot" size={size} color={color} />
                            ),
                        }}
                    />
                    <Tabs.Screen
                        name="settings"
                        options={{
                            title: 'Configurações',
                            headerTitle: 'Configurações',
                            tabBarIcon: ({ color, size }) => (
                                <MaterialCommunityIcons name="cog" size={size} color={color} />
                            ),
                        }}
                    />
                </Tabs>
            </View>
        </View>
    );
}
