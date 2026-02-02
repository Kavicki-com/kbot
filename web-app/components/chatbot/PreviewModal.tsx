import React from 'react';
import { Modal, View, StyleSheet, Pressable, Platform, ViewStyle, TextStyle, ImageStyle, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import { TYPEBOT_BASE_URL } from '../../constants';

interface PreviewModalProps {
    visible: boolean;
    onClose: () => void;
    botConfig: any;
}

export default function PreviewModal({ visible, onClose, botConfig }: PreviewModalProps) {
    // Debug: Log the botConfig being received
    console.log('🔍 PreviewModal - botConfig received:', {
        bot_name: botConfig?.bot_name,
        company_name: botConfig?.company_name,
        system_prompt: botConfig?.system_prompt?.substring(0, 50) + '...',
        tone_of_voice: botConfig?.tone_of_voice,
        primary_color: botConfig?.primary_color,
    });



    // Pass configuration variables via URL params for Typebot to use
    // Sanitize system prompt for JSON injection (escape newlines/quotes) by stringifying and removing surrounding quotes
    const rawPrompt = botConfig?.system_prompt || '';
    const sanitizedPrompt = JSON.stringify(rawPrompt).slice(1, -1);

    const params = new URLSearchParams({
        // Database variables (data. prefix - stored in Typebot DB)
        'data.company_name': botConfig?.company_name || '',
        'data.bot_name': botConfig?.bot_name || '',
        'data.system_prompt': sanitizedPrompt,
        'data.tone_of_voice': botConfig?.tone_of_voice || 'professional',
        'data.primary_color': botConfig?.primary_color || '#25D366',
        'data.whatsapp_number': botConfig?.whatsapp_number || '',

        // Typebot flow variables (no prefix - for backward compatibility)
        'company_name': botConfig?.company_name || '',
        'bot_name': botConfig?.bot_name || '',
        'system_prompt': sanitizedPrompt,
        'tone_of_voice': botConfig?.tone_of_voice || 'professional',
        'primary_color': botConfig?.primary_color || '#25D366',
        'whatsapp_number': botConfig?.whatsapp_number || '',
        'bot_whatsapp_number': botConfig?.whatsapp_number || '', // For HTTP request
        'collect_name': String(botConfig?.collect_name ?? true),
        'collect_email': String(botConfig?.collect_email ?? true),
        'collect_phone': String(botConfig?.collect_phone ?? true),
        'knowledge_base_enabled': String(botConfig?.knowledge_base_enabled ?? false),
        'is_active': String(botConfig?.is_active ?? true),

        // Cache busting - force reload each time
        '_t': Date.now().toString(),
    });

    const typebotUrl = `${TYPEBOT_BASE_URL}?${params.toString()}`;

    console.log('🔗 PreviewModal - Generated URL:', typebotUrl);

    return (
        <Modal visible={visible} animationType="slide" transparent>
            <View style={styles.overlay}>
                <View style={styles.container}>
                    {/* Header */}
                    <View style={[styles.header, { backgroundColor: '#075E54' }]}>
                        <Pressable onPress={onClose} style={styles.backButton}>
                            <Ionicons name="close" size={24} color="#FFF" />
                        </Pressable>

                        <View style={styles.headerInfo}>
                            <Text style={styles.headerTitle}>
                                Preview: {botConfig?.bot_name || 'Chatbot'}
                            </Text>
                            <Text style={styles.headerSubtitle}>
                                {botConfig?.company_name || 'Carregando...'}
                            </Text>
                        </View>
                    </View>

                    {/* Webview Content */}
                    {Platform.OS === 'web' ? (
                        <iframe
                            key={typebotUrl} // Force reload on URL change
                            src={typebotUrl}
                            style={{ border: 'none', flex: 1, width: '100%', height: '100%' }}
                            title="Typebot Preview"
                            allow="camera; microphone; geolocation; clipboard-read; clipboard-write; encrypted-media; picture-in-picture; web-share"
                            loading="eager"
                        />
                    ) : (
                        <WebView
                            key={typebotUrl} // Force reload on URL change
                            source={{ uri: typebotUrl }}
                            style={{ flex: 1 }}
                            javaScriptEnabled={true}
                            domStorageEnabled={true}
                            startInLoadingState={true}
                            incognito={true} // Prevent caching
                            cacheEnabled={false} // Disable cache
                        />
                    )}
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        paddingTop: Platform.OS === 'ios' ? 40 : 0,
    } as ViewStyle,
    container: {
        width: Platform.OS === 'web' ? '375px' : '90%',
        height: Platform.OS === 'web' ? '600px' : '80%',
        backgroundColor: '#FFF',
        borderRadius: 20,
        overflow: 'hidden',
        ...Platform.select({
            web: {
                boxShadow: '0px 10px 20px rgba(0, 0, 0, 0.3)',
            },
            default: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 10 },
                shadowOpacity: 0.3,
                shadowRadius: 20,
                elevation: 10,
            },
        }),
    } as ViewStyle,
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 10,
        height: 60,
    } as ViewStyle,
    backButton: {
        padding: 5,
    } as ViewStyle,
    headerInfo: {
        marginLeft: 15,
    } as ViewStyle,
    headerTitle: {
        color: '#FFF',
        fontWeight: 'bold',
        fontSize: 16,
    } as TextStyle,
    headerSubtitle: {
        color: '#E0E0E0',
        fontSize: 12,
    } as TextStyle,
});
