import React from 'react';
import { Modal, View, StyleSheet, Pressable, Platform, ViewStyle, TextStyle, ImageStyle, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';

interface PreviewModalProps {
    visible: boolean;
    onClose: () => void;
    botConfig: any;
}

export default function PreviewModal({ visible, onClose, botConfig }: PreviewModalProps) {
    // Hardcoded for now as requested, but ideally this should come from config
    const TYPEBOT_BASE_URL = 'https://viewer-production-77fa.up.railway.app/kbot-tiwz4o9';

    // Pass configuration variables via URL params for Typebot to use
    const params = new URLSearchParams({
        'company_name': botConfig?.company_name || '',
        'bot_name': botConfig?.bot_name || '',
        'system_prompt': botConfig?.system_prompt || '',
        'tone_of_voice': botConfig?.tone_of_voice || 'professional',
        'contact.phone': botConfig?.whatsapp_number || '5521966087421',
    });

    const typebotUrl = `${TYPEBOT_BASE_URL}?${params.toString()}`;

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
                            src={typebotUrl}
                            style={{ border: 'none', flex: 1, width: '100%', height: '100%' }}
                            title="Typebot Preview"
                        />
                    ) : (
                        <WebView
                            source={{ uri: typebotUrl }}
                            style={{ flex: 1 }}
                            javaScriptEnabled={true}
                            domStorageEnabled={true}
                            startInLoadingState={true}
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
        height: Platform.OS === 'web' ? '667px' : '80%',
        backgroundColor: '#FFF',
        borderRadius: 20,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 10,
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
