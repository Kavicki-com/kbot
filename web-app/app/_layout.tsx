import { Stack } from 'expo-router';
import { PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { lightTheme } from '../lib/theme';

export default function RootLayout() {
    return (
        <SafeAreaProvider>
            <PaperProvider theme={lightTheme}>
                <Stack
                    screenOptions={{
                        headerShown: false,
                    }}
                >
                    <Stack.Screen name="(auth)" options={{ headerShown: false }} />
                    <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                </Stack>
            </PaperProvider>
        </SafeAreaProvider>
    );
}
