import { Stack } from 'expo-router';
import { colors } from '../../../lib/theme';

export default function ChatbotsLayout() {
    return (
        <Stack
            screenOptions={{
                headerStyle: { backgroundColor: colors.primary },
                headerTintColor: '#FFFFFF',
                headerTitleStyle: { fontWeight: 'bold' },
            }}
        >
            <Stack.Screen
                name="index"
                options={{
                    headerShown: false,
                    title: 'Meus Chatbots',
                }}
            />
            <Stack.Screen
                name="new"
                options={{
                    title: 'Novo Chatbot',
                    presentation: 'modal',
                }}
            />
            <Stack.Screen
                name="[id]/edit"
                options={{
                    title: 'Editar Chatbot',
                    headerBackTitle: 'Voltar',
                }}
            />
        </Stack>
    );
}
