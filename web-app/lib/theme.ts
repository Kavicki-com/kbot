import { MD3LightTheme, MD3DarkTheme } from 'react-native-paper';

// Paleta de cores inspirada no WhatsApp
export const colors = {
    // Verde WhatsApp e variações
    primary: '#25D366',
    primaryLight: '#34E677',
    primaryDark: '#1EBE56',

    // Tons de verde complementares
    secondary: '#128C7E',
    secondaryLight: '#1AA489',
    secondaryDark: '#075E54',

    // Neutros
    background: '#FFFFFF',
    surface: '#F7F8FA',
    surfaceVariant: '#E9EDEF',

    // Texto
    text: '#111B21',
    textSecondary: '#667781',
    textDisabled: '#8696A0',

    // Estados
    error: '#EA4335',
    success: '#00A884',
    warning: '#FFC107',
    info: '#2196F3',

    // WhatsApp específico
    chatBubbleSent: '#D9FDD3',
    chatBubbleReceived: '#FFFFFF',
    divider: '#E9EDEF',
};

export const breakpoints = {
    mobile: 0,
    tablet: 768,
    desktop: 1024,
};

export const lightTheme = {
    ...MD3LightTheme,
    colors: {
        ...MD3LightTheme.colors,
        primary: colors.primary,
        primaryContainer: colors.primaryLight,
        secondary: colors.secondary,
        secondaryContainer: colors.secondaryLight,
        background: colors.background,
        surface: colors.surface,
        surfaceVariant: colors.surfaceVariant,
        error: colors.error,
        onPrimary: '#FFFFFF',
        onSecondary: '#FFFFFF',
        onBackground: colors.text,
        onSurface: colors.text,
        outline: colors.divider,
    },
};

export const darkTheme = {
    ...MD3DarkTheme,
    colors: {
        ...MD3DarkTheme.colors,
        primary: colors.primary,
        primaryContainer: colors.secondaryDark,
        secondary: colors.secondary,
        secondaryContainer: colors.secondaryLight,
        background: '#0B141A',
        surface: '#111B21',
        surfaceVariant: '#202C33',
        error: colors.error,
        onPrimary: '#FFFFFF',
        onSecondary: '#FFFFFF',
        onBackground: '#E9EDEF',
        onSurface: '#E9EDEF',
        outline: '#2A3942',
    },
};

export const spacing = {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
};

export const borderRadius = {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    full: 9999,
};
