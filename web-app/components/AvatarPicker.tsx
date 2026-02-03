import React, { useState } from 'react';
import { View, StyleSheet, Image, Platform, Alert } from 'react-native';
import { Avatar, Button, ActivityIndicator, Text, IconButton } from 'react-native-paper';
import * as ImagePicker from 'expo-image-picker';
import { colors, spacing } from '../lib/theme';

interface AvatarPickerProps {
    currentAvatarUrl: string | null;
    onAvatarSelected: (uri: string) => Promise<void>;
    onAvatarRemoved: () => Promise<void>;
    size?: number;
}

export default function AvatarPicker({
    currentAvatarUrl,
    onAvatarSelected,
    onAvatarRemoved,
    size = 120,
}: AvatarPickerProps) {
    const [loading, setLoading] = useState(false);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    async function pickImage() {
        console.log('🎯 pickImage called, Platform:', Platform.OS);

        try {
            if (Platform.OS === 'web') {
                // Use HTML input for web
                console.log('🌐 Using HTML file input for web');
                fileInputRef.current?.click();
                return;
            }

            // Mobile: Request permissions
            console.log('📱 Using expo-image-picker for mobile');
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert(
                    'Permissão necessária',
                    'Precisamos de permissão para acessar suas fotos.'
                );
                return;
            }

            // Launch image picker
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.8,
            });

            if (!result.canceled && result.assets[0]) {
                const asset = result.assets[0];

                // Validate file size (2MB max)
                if (asset.fileSize && asset.fileSize > 2 * 1024 * 1024) {
                    Alert.alert(
                        'Arquivo muito grande',
                        'Por favor, selecione uma imagem menor que 2MB.'
                    );
                    return;
                }

                setLoading(true);
                try {
                    await onAvatarSelected(asset.uri);
                } catch (error: any) {
                    console.error('❌ Failed to upload avatar:', error);
                    Alert.alert(
                        'Erro no Upload',
                        error?.message || 'Não foi possível fazer upload da imagem. Verifique sua conexão e tente novamente.'
                    );
                }
            }
        } catch (error) {
            console.error('Error picking image:', error);
            Alert.alert('Erro', 'Não foi possível selecionar a imagem.');
        } finally {
            setLoading(false);
        }
    }

    async function handleFileInputChange(event: any) {
        console.log('📁 File input change event triggered');
        const file = event.target.files?.[0];
        if (!file) {
            console.log('❌ No file selected');
            return;
        }

        console.log('📄 File selected:', file.name, 'size:', file.size, 'type:', file.type);

        // Validate file size (2MB max)
        if (file.size > 2 * 1024 * 1024) {
            const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
            console.log(`❌ File too large: ${sizeMB}MB (max 2MB)`);

            if (Platform.OS === 'web') {
                alert(`Arquivo muito grande (${sizeMB}MB).\nPor favor, selecione uma imagem menor que 2MB.`);
            } else {
                Alert.alert(
                    'Arquivo muito grande',
                    `O arquivo tem ${sizeMB}MB. Por favor, selecione uma imagem menor que 2MB.`
                );
            }
            return;
        }

        // Validate file type
        if (!file.type.startsWith('image/')) {
            console.log('❌ Invalid file type:', file.type);

            if (Platform.OS === 'web') {
                alert('Por favor, selecione uma imagem válida.');
            } else {
                Alert.alert('Erro', 'Por favor, selecione uma imagem válida.');
            }
            return;
        }

        console.log('✅ File validation passed, starting upload...');
        setLoading(true);
        try {
            // Convert file to data URL for preview and upload
            const reader = new FileReader();
            reader.onloadend = async () => {
                const dataUrl = reader.result as string;
                console.log('🖼️ File converted to data URL, length:', dataUrl.length);
                try {
                    await onAvatarSelected(dataUrl);
                    console.log('✅ Upload completed successfully');
                } catch (error: any) {
                    console.error('❌ Failed to upload avatar:', error);

                    if (Platform.OS === 'web') {
                        alert(`Erro no Upload: ${error?.message || 'Não foi possível fazer upload da imagem.'}`);
                    } else {
                        Alert.alert(
                            'Erro no Upload',
                            error?.message || 'Não foi possível fazer upload da imagem.'
                        );
                    }
                }
                setLoading(false);
            };
            reader.onerror = () => {
                console.error('❌ FileReader error');

                if (Platform.OS === 'web') {
                    alert('Erro: Não foi possível ler o arquivo.');
                } else {
                    Alert.alert('Erro', 'Não foi possível ler o arquivo.');
                }
                setLoading(false);
            };
            reader.readAsDataURL(file);
        } catch (error) {
            console.error('❌ Error processing file:', error);

            if (Platform.OS === 'web') {
                alert('Erro: Não foi possível processar o arquivo.');
            } else {
                Alert.alert('Erro', 'Não foi possível processar o arquivo.');
            }
            setLoading(false);
        }

        // Reset input
        event.target.value = '';
    }

    async function handleRemove() {
        Alert.alert(
            'Remover Avatar',
            'Tem certeza que deseja remover o avatar?',
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Remover',
                    style: 'destructive',
                    onPress: async () => {
                        setLoading(true);
                        try {
                            await onAvatarRemoved();
                        } finally {
                            setLoading(false);
                        }
                    },
                },
            ]
        );
    }

    return (
        <View style={styles.container}>
            {/* Hidden file input for web */}
            {Platform.OS === 'web' && (
                <input
                    ref={fileInputRef as any}
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={handleFileInputChange}
                />
            )}

            <View style={styles.avatarContainer}>
                {loading ? (
                    <View style={[styles.avatar, { width: size, height: size }]}>
                        <ActivityIndicator size="large" color={colors.primary} />
                    </View>
                ) : currentAvatarUrl ? (
                    <View>
                        <Image
                            source={{ uri: currentAvatarUrl }}
                            style={[styles.avatar, { width: size, height: size }]}
                            resizeMode="cover"
                            onError={(error) => {
                                console.error('❌ Image load error:', error.nativeEvent.error);
                                console.log('Current avatar URL:', currentAvatarUrl);
                            }}
                            onLoad={() => {
                                console.log('✅ Image loaded successfully:', currentAvatarUrl);
                            }}
                        />
                        <IconButton
                            icon="close-circle"
                            size={24}
                            iconColor={colors.error}
                            containerColor="#FFFFFF"
                            style={styles.removeButton}
                            onPress={handleRemove}
                        />
                    </View>
                ) : (
                    <Avatar.Icon
                        size={size}
                        icon="robot"
                        style={styles.placeholderAvatar}
                    />
                )}
            </View>

            <View style={styles.actions}>
                <Button
                    mode="outlined"
                    onPress={() => {
                        console.log('🔘 Button clicked!');
                        pickImage();
                    }}
                    disabled={loading}
                    icon="image"
                    style={styles.button}
                >
                    {currentAvatarUrl ? 'Alterar Avatar' : 'Adicionar Avatar'}
                </Button>

                {currentAvatarUrl && !loading && (
                    <Button
                        mode="text"
                        onPress={handleRemove}
                        textColor={colors.error}
                        style={styles.removeTextButton}
                    >
                        Remover
                    </Button>
                )}
            </View>

            <Text variant="bodySmall" style={styles.helperText}>
                Recomendado: imagem quadrada, máximo 2MB
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        paddingVertical: spacing.lg,
    },
    avatarContainer: {
        marginBottom: spacing.md,
    },
    avatar: {
        borderRadius: 1000,
        backgroundColor: colors.surface,
        borderWidth: 2,
        borderColor: colors.primary,
    },
    placeholderAvatar: {
        backgroundColor: colors.primaryLight,
    },
    removeButton: {
        position: 'absolute',
        top: -4,
        right: -4,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
    },
    actions: {
        alignItems: 'center',
        gap: spacing.sm,
    },
    button: {
        minWidth: 200,
    },
    removeTextButton: {
        marginTop: spacing.xs,
    },
    helperText: {
        marginTop: spacing.sm,
        color: colors.textSecondary,
        textAlign: 'center',
    },
});
