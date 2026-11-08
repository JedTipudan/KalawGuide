import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  FlatList,
  Modal,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { AssistantMessage, AssistantSuggestion } from '../../types';
import { generateId, now } from '../../utils/helpers';
import { getAssistantResponse } from '../../features/assistant/assistantEngine';
import { Typography, Spacing, Radius, TouchTarget, Shadows } from '../../constants/tokens';

const SUGGESTIONS: AssistantSuggestion[] = [
  { id: '1', label: '🏖 Best beaches in Mati', query: 'What are the best beaches in Mati City?' },
  { id: '2', label: '💰 Plan my budget', query: 'Help me plan a travel budget for Mati City.' },
  { id: '3', label: '🗺 Top destinations', query: 'What are the top destinations in Davao Oriental?' },
  { id: '4', label: '🍽 Local food', query: 'What local food should I try in Mati City?' },
  { id: '5', label: '🚌 Getting around', query: 'How do I get around Mati City?' },
];

export function KalawAssistanceFAB() {
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const listRef = useRef<FlatList>(null);

  const fabColor = isDark ? colors.fabDark : colors.fabLight;

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim()) return;

    const userMsg: AssistantMessage = {
      id: generateId(),
      role: 'user',
      content: text.trim(),
      timestamp: now(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    setTimeout(async () => {
      const response = await getAssistantResponse(text.trim(), user);
      const assistantMsg: AssistantMessage = {
        id: generateId(),
        role: 'assistant',
        content: response,
        timestamp: now(),
      };
      setMessages(prev => [...prev, assistantMsg]);
      setIsTyping(false);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    }, 600);
  }, [user]);

  const clearConversation = useCallback(() => {
    setMessages([]);
  }, []);

  return (
    <>
      {/* Floating Action Button */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: fabColor }]}
        onPress={() => setIsOpen(true)}
        accessibilityLabel="Open KalawAssistance"
        accessibilityRole="button"
      >
        <Text style={styles.fabIcon}>✦</Text>
      </TouchableOpacity>

      {/* Chat Modal */}
      <Modal
        visible={isOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setIsOpen(false)}
      >
        <SafeAreaView style={[styles.modal, { backgroundColor: colors.background }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <View style={styles.headerLeft}>
              <View style={[styles.headerIcon, { backgroundColor: fabColor }]}>
                <Text style={styles.headerIconText}>✦</Text>
              </View>
              <View>
                <Text style={[styles.headerTitle, { color: colors.text }]}>
                  KalawAssistance
                </Text>
                <Text style={[styles.headerSubtitle, { color: colors.muted }]}>
                  Your local travel guide
                </Text>
              </View>
            </View>
            <View style={styles.headerActions}>
              {messages.length > 0 && (
                <TouchableOpacity
                  onPress={clearConversation}
                  style={styles.clearButton}
                  accessibilityLabel="Clear conversation"
                >
                  <Text style={[styles.clearText, { color: colors.muted }]}>Clear</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                onPress={() => setIsOpen(false)}
                style={styles.closeButton}
                accessibilityLabel="Close assistant"
              >
                <Text style={[styles.closeText, { color: colors.text }]}>✕</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Messages */}
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.messageList}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Text style={[styles.emptyTitle, { color: colors.text }]}>
                  Hello{user ? `, ${user.displayName.split(' ')[0]}` : ''}! 👋
                </Text>
                <Text style={[styles.emptySubtitle, { color: colors.muted }]}>
                  I can help you discover Mati City and Davao Oriental. What would you like to know?
                </Text>
                <View style={styles.suggestions}>
                  {SUGGESTIONS.map(s => (
                    <TouchableOpacity
                      key={s.id}
                      style={[styles.suggestion, { backgroundColor: colors.subtle, borderColor: colors.border }]}
                      onPress={() => sendMessage(s.query)}
                    >
                      <Text style={[styles.suggestionText, { color: colors.text }]}>
                        {s.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            }
            renderItem={({ item }) => (
              <View
                style={[
                  styles.messageBubble,
                  item.role === 'user'
                    ? [styles.userBubble, { backgroundColor: colors.primary }]
                    : [styles.assistantBubble, { backgroundColor: colors.surface }],
                ]}
              >
                <Text
                  style={[
                    styles.messageText,
                    { color: item.role === 'user' ? colors.onPrimary : colors.text },
                  ]}
                >
                  {item.content}
                </Text>
              </View>
            )}
          />

          {isTyping && (
            <View style={[styles.typingIndicator, { backgroundColor: colors.surface }]}>
              <Text style={[styles.typingText, { color: colors.muted }]}>
                KalawAssistance is typing...
              </Text>
            </View>
          )}

          {/* Input */}
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          >
            <View style={[styles.inputRow, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
              <TextInput
                style={[styles.textInput, { color: colors.text, backgroundColor: colors.subtle }]}
                placeholder="Ask about Mati City..."
                placeholderTextColor={colors.muted}
                value={input}
                onChangeText={setInput}
                multiline
                maxLength={500}
                returnKeyType="send"
                onSubmitEditing={() => sendMessage(input)}
              />
              <TouchableOpacity
                style={[
                  styles.sendButton,
                  { backgroundColor: input.trim() ? fabColor : colors.border },
                ]}
                onPress={() => sendMessage(input)}
                disabled={!input.trim() || isTyping}
                accessibilityLabel="Send message"
              >
                <Text style={styles.sendIcon}>↑</Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    bottom: 90,
    right: 20,
    width: TouchTarget.fab,
    height: TouchTarget.fab,
    borderRadius: Radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  fabIcon: { fontSize: 22, color: '#FFFFFF' },
  modal: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.base,
    borderBottomWidth: 1,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerIconText: { fontSize: 18, color: '#FFFFFF' },
  headerTitle: {
    fontFamily: Typography.fontFamilyBody,
    fontSize: Typography.size.bodyLg,
    fontWeight: Typography.weight.semiBold,
  },
  headerSubtitle: {
    fontFamily: Typography.fontFamilyBody,
    fontSize: Typography.size.label,
  },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  clearButton: { padding: Spacing.sm },
  clearText: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body },
  closeButton: { padding: Spacing.sm },
  closeText: { fontSize: 18, fontWeight: '600' },
  messageList: { padding: Spacing.base, gap: Spacing.md, flexGrow: 1 },
  emptyState: { alignItems: 'center', paddingTop: Spacing.xl, gap: Spacing.base },
  emptyTitle: {
    fontFamily: Typography.fontFamilyBody,
    fontSize: Typography.size.h4,
    fontWeight: Typography.weight.bold,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontFamily: Typography.fontFamilyBody,
    fontSize: Typography.size.body,
    textAlign: 'center',
    lineHeight: Typography.size.body * Typography.lineHeight,
    maxWidth: 280,
  },
  suggestions: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, justifyContent: 'center' },
  suggestion: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.xl,
    borderWidth: 1,
  },
  suggestionText: {
    fontFamily: Typography.fontFamilyBody,
    fontSize: Typography.size.body,
  },
  messageBubble: {
    maxWidth: '80%',
    padding: Spacing.md,
    borderRadius: Radius.md,
    marginBottom: Spacing.sm,
  },
  userBubble: { alignSelf: 'flex-end', borderBottomRightRadius: 4 },
  assistantBubble: { alignSelf: 'flex-start', borderBottomLeftRadius: 4 },
  messageText: {
    fontFamily: Typography.fontFamilyBody,
    fontSize: Typography.size.body,
    lineHeight: Typography.size.body * Typography.lineHeight,
  },
  typingIndicator: {
    marginHorizontal: Spacing.base,
    marginBottom: Spacing.sm,
    padding: Spacing.md,
    borderRadius: Radius.md,
    alignSelf: 'flex-start',
  },
  typingText: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: Spacing.md,
    borderTopWidth: 1,
    gap: Spacing.sm,
  },
  textInput: {
    flex: 1,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    fontFamily: Typography.fontFamilyBody,
    fontSize: Typography.size.body,
    maxHeight: 100,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendIcon: { fontSize: 18, color: '#FFFFFF', fontWeight: '700' },
});
