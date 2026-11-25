import React, { useState, useRef, useCallback, useEffect } from 'react';
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
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { useNetworkState } from 'expo-network';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { ActionTarget, AssistantMessage, AssistantSuggestion } from '../../types';
import { useRouter } from 'expo-router';
import { formatShortDate, generateId, now } from '../../utils/helpers';
import { getAssistantReply } from '../../features/assistant/assistantEngine';
import { CLOUD_AI_ENABLED } from '../../features/assistant/cloudModel';
import { loadSnapshot, syncKnowledge } from '../../features/assistant/knowledge';
import { clearHistory, loadHistory, saveMessage } from '../../features/assistant/history';
import { ASSISTANT_NAME, ASSISTANT_PURPOSE } from '../../features/assistant/identity';
import { MAX_INPUT_LENGTH } from '../../features/assistant/guard';
import { Icon } from '../common/Icon';
import { ActionCard, BudgetBreakdownCard, DestinationCard } from './AssistantCards';
import { Typography, Spacing, Radius } from '../../constants/tokens';
import { Kiko, KikoAvatar } from '../brand/Kiko';

const SUGGESTIONS: AssistantSuggestion[] = [
  { id: '8', label: '📝 Create my budget', query: 'Create a budget for Dahican Beach, 2 people, 3 days, food ₱300' },
  { id: '9', label: '🧾 Log an expense', query: 'Add ₱150 lunch to my expenses' },
  { id: '1', label: 'Budget for Dahican Beach', query: 'How much should I prepare for Dahican Beach?' },
  { id: '2', label: '3-day trip for 4', query: 'Plan a 3-day trip for 4 people.' },
  { id: '3', label: 'Where can I go with ₱2,000?', query: 'Where can I travel with ₱2,000?' },
  { id: '4', label: '💸 What is cheapest?', query: 'What is the cheapest trip for 2 people, 3 days?' },
  { id: '7', label: 'Cheapest place to stay', query: 'What is the cheapest place to stay?' },
  { id: '5', label: 'Activities in Mati', query: 'What activities can I try in Mati?' },
  { id: '6', label: 'Accommodations', query: 'Find accommodations within my budget.' },
];

const SYNC_EVERY_MS = 2 * 60 * 1000;

/** "5:42 PM" today, otherwise the short date. */
function syncLabel(iso: string | null): string {
  if (!iso) return 'not yet saved';
  const d = new Date(iso);
  return d.toDateString() === new Date().toDateString()
    ? d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    : formatShortDate(iso);
}

/** Renders **bold** segments from assistant templates. */
function RichText({ content, style }: { content: string; style: object }) {
  const parts = content.split(/(\*\*[^*]+\*\*)/g);
  return (
    <Text style={style}>
      {parts.map((p, i) =>
        p.startsWith('**') && p.endsWith('**')
          ? <Text key={i} style={{ fontWeight: Typography.weight.bold }}>{p.slice(2, -2)}</Text>
          : p
      )}
    </Text>
  );
}

export function KalawAssistanceFAB() {
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const network = useNetworkState();
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();
  const isWeb = Platform.OS === 'web';

  /** Opens what an assistant action saved. Null when that screen doesn't exist on this platform. */
  const routeFor = useCallback((t: ActionTarget): Parameters<ReturnType<typeof useRouter>['push']>[0] | null => {
    switch (t.screen) {
      case 'budget-results':
        return { pathname: isWeb ? '/(web)/budget-results' : '/(tourist)/budget-results', params: { id: t.id } } as never;
      case 'expenses':
        return (isWeb ? '/(web)/expenses' : '/(tourist)/expenses') as never;
      case 'favorites':
        return isWeb ? null : ('/(tourist)/favorites' as never);
      case 'itinerary':
        return (isWeb ? '/(web)/trips' : { pathname: '/(tourist)/itinerary/[id]', params: { id: t.id } }) as never;
    }
  }, [isWeb]);
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const listRef = useRef<FlatList>(null);

  const fabColor = isDark ? colors.fabDark : colors.fabLight;
  const onFab = isDark ? colors.onPrimary : '#FFFFFF';
  // Unknown reachability (e.g. first render) is treated as online; the engine never needs the network anyway.
  const offline = network.isConnected === false || network.isInternetReachable === false;

  // Keep a local copy of the latest KalawGuide data: refreshed while online (on start, when the
  // connection comes back, when the chat opens, and every 2 minutes), used when offline.
  const [syncedAt, setSyncedAt] = useState<string | null>(null);
  const lastSync = useRef(0);
  const refreshKnowledge = useCallback((force = false) => {
    if (offline || (!force && Date.now() - lastSync.current < SYNC_EVERY_MS)) return;
    lastSync.current = Date.now();
    syncKnowledge().then(s => setSyncedAt(s.syncedAt)).catch(() => { lastSync.current = 0; });
  }, [offline]);
  useEffect(() => {
    loadSnapshot().then(s => { if (s) setSyncedAt(prev => prev ?? s.syncedAt); }).catch(() => {});
  }, []);
  useEffect(() => {
    refreshKnowledge(true);
    if (offline) return;
    const t = setInterval(() => refreshKnowledge(), SYNC_EVERY_MS);
    return () => clearInterval(t);
  }, [offline, refreshKnowledge]);
  useEffect(() => { if (isOpen) refreshKnowledge(); }, [isOpen, refreshKnowledge]);

  // Signed-in users get persisted history; guests keep a session-only conversation.
  // Reset during render when the account changes so one user never sees another's chat.
  const userId = user?.id ?? null;
  const [historyOwner, setHistoryOwner] = useState<string | null>(userId);
  if (historyOwner !== userId) {
    setHistoryOwner(userId);
    setMessages([]);
  }
  useEffect(() => {
    if (!userId) return;
    let live = true;
    loadHistory(userId).then(m => { if (live) setMessages(m); }).catch(() => {});
    return () => { live = false; };
  }, [userId]);

  const append = useCallback((m: AssistantMessage) => {
    setMessages(prev => [...prev, m]);
    if (user) saveMessage(user.id, m).catch(() => { /* chat still works if saving fails */ });
  }, [user]);

  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isTyping) return;

    append({ id: generateId(), role: 'user', content: trimmed, timestamp: now() });
    setInput('');
    setIsTyping(true);
    try {
      const history = messages.slice(-6).map(m => ({ role: m.role, content: m.content }));
      const reply = await getAssistantReply(trimmed, user, { offline, history });
      append({ id: generateId(), role: 'assistant', content: reply.content, timestamp: now(), metadata: reply.meta });
    } catch {
      // Never leave the user without an answer (e.g. the browser database failed to open).
      append({
        id: generateId(),
        role: 'assistant',
        content: "Sorry, I couldn't answer that just now. Please reload the page and try again.",
        timestamp: now(),
      });
    } finally {
      setIsTyping(false);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [user, offline, isTyping, append, messages]);

  // Web: Enter sends, Shift+Enter adds a new line. (react-native-web ignores submitBehavior on
  // multiline inputs, so Enter would otherwise just insert a newline.) Native uses submitBehavior="submit".
  const handleWebEnter = useCallback((e: unknown) => {
    if (Platform.OS !== 'web') return;
    const ev = e as { key?: string; shiftKey?: boolean; preventDefault?: () => void; nativeEvent?: { isComposing?: boolean } };
    if (ev.key === 'Enter' && !ev.shiftKey && !ev.nativeEvent?.isComposing) {
      ev.preventDefault?.();
      sendMessage(input);
    }
  }, [input, sendMessage]);

  const clearConversation = useCallback(() => {
    const doClear = () => {
      setMessages([]);
      if (user) clearHistory(user.id).catch(() => {});
    };
    if (Platform.OS === 'web') {
      if (window.confirm('Clear this conversation? This cannot be undone.')) doClear();
      return;
    }
    Alert.alert('Clear conversation?', 'This removes your chat history with Kalaw Assistance.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear', style: 'destructive', onPress: doClear },
    ]);
  }, [user]);

  const statusColor = offline ? colors.warning : colors.success;
  const statusLabel = offline
    ? `Offline · Local AI · data from ${syncLabel(syncedAt)}`
    : CLOUD_AI_ENABLED ? 'Online · Cloud AI' : 'Online · On-device answers';

  return (
    <>
      {/* Floating Action Button */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: fabColor, borderColor: fabColor }]}
        onPress={() => setIsOpen(true)}
        accessibilityLabel={`Open ${ASSISTANT_NAME} — chat with Kiko`}
        accessibilityRole="button"
      >
        <KikoAvatar size={52} />
      </TouchableOpacity>

      {/* Chat Modal */}
      <Modal
        visible={isOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        // Android: draw the modal edge-to-edge so the keyboard's position lines up with the
        // layout; SafeAreaView below keeps content clear of the status and navigation bars.
        statusBarTranslucent
        navigationBarTranslucent
        onRequestClose={() => setIsOpen(false)}
      >
        <SafeAreaProvider>
          <SafeAreaView style={[styles.modal, { backgroundColor: colors.background }]}>
            {/* Wrap the whole chat so the list shrinks and the input rides above the keyboard.
                Android is edge-to-edge (the window no longer resizes), so 'padding' is needed there too. */}
            <KeyboardAvoidingView style={styles.container} behavior="padding">
              {/* Header */}
              <View style={[styles.header, { borderBottomColor: colors.border }]}>
                <View style={styles.headerLeft}>
                  <KikoAvatar size={44} />
                  <View style={styles.headerText}>
                    <Text style={[styles.headerTitle, { color: colors.text }]} accessibilityRole="header">
                      {ASSISTANT_NAME}
                    </Text>
                    <Text style={[styles.headerSubtitle, { color: colors.muted }]} numberOfLines={1}>
                      {ASSISTANT_PURPOSE}
                    </Text>
                    <View
                      style={[styles.statusPill, { borderColor: statusColor }]}
                      accessible
                      accessibilityLabel={statusLabel}
                    >
                      <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                      <Text style={[styles.statusText, { color: colors.text }]}>
                        {statusLabel}
                      </Text>
                    </View>
                  </View>
                </View>
                <View style={styles.headerActions}>
                  {messages.length > 0 && (
                    <TouchableOpacity
                      onPress={clearConversation}
                      style={styles.headerButton}
                      accessibilityRole="button"
                      accessibilityLabel="Clear conversation"
                    >
                      <Text style={[styles.clearText, { color: colors.muted }]}>Clear</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    onPress={() => setIsOpen(false)}
                    style={styles.headerButton}
                    accessibilityRole="button"
                    accessibilityLabel="Close assistant"
                  >
                    <Icon name="close" size={20} color={colors.text} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Messages */}
              <FlatList
                ref={listRef}
                data={messages}
                keyExtractor={item => item.id}
                contentContainerStyle={styles.messageList}
                onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
                // Keep the latest message in view when the keyboard opens and the list shrinks.
                onLayout={() => { if (messages.length) listRef.current?.scrollToEnd({ animated: false }); }}
                keyboardShouldPersistTaps="handled"
                ListEmptyComponent={
                  <View style={styles.emptyState}>
                    <Kiko pose="presenting" height={150} />
                    <Text style={[styles.emptyTitle, { color: colors.text }]}>
                      {`Hello${user ? `, ${user.displayName.split(' ')[0]}` : ''}! I'm Kiko.`}
                    </Text>
                    <Text style={[styles.emptySubtitle, { color: colors.muted }]}>
                      Your Mati travel buddy. Ask me about the best places to visit, verified businesses, itineraries and travel budgets. Online I use cloud AI with the latest updates; offline I answer from the copy saved on your device.
                    </Text>
                    <View style={styles.suggestions}>
                      {SUGGESTIONS.map(s => (
                        <TouchableOpacity
                          key={s.id}
                          style={[styles.suggestion, { backgroundColor: colors.subtle, borderColor: colors.border }]}
                          onPress={() => sendMessage(s.query)}
                          accessibilityRole="button"
                          accessibilityLabel={`Ask: ${s.query}`}
                        >
                          <Text style={[styles.suggestionText, { color: colors.text }]}>{s.label}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                }
                renderItem={({ item }: { item: AssistantMessage }) => {
                  const isUser = item.role === 'user';
                  const cards = item.metadata?.cards ?? [];
                  return (
                    <View style={[styles.messageRow, isUser && styles.messageRowUser]}>
                    {!isUser && <KikoAvatar size={30} style={styles.bubbleAvatar} />}
                    <View
                      style={[
                        styles.messageBubble,
                        isUser
                          ? [styles.userBubble, { backgroundColor: colors.primary }]
                          : [styles.assistantBubble, { backgroundColor: colors.surface, borderColor: colors.border }],
                      ]}
                    >
                      <RichText
                        content={item.content}
                        style={[styles.messageText, { color: isUser ? colors.onPrimary : colors.text }]}
                      />
                      {cards.map((c, i) => {
                        if (c.type === 'budget') return <BudgetBreakdownCard key={i} data={c.data} />;
                        if (c.type === 'destination') return <DestinationCard key={i} data={c.data} />;
                        const href = routeFor(c.data.target);
                        return href
                          ? <ActionCard key={i} label={c.data.label} onPress={() => { setIsOpen(false); router.push(href); }} />
                          : null;
                      })}
                      {!isUser && item.metadata?.dataSyncedAt && (
                        <Text style={[styles.estimateNote, { color: colors.muted }]}>
                          Offline answer · KalawGuide data saved {syncLabel(item.metadata.dataSyncedAt)}
                        </Text>
                      )}
                      {!isUser && item.metadata?.hasEstimates && (
                        <Text style={[styles.estimateNote, { color: colors.warning }]}>
                          Includes estimates — confirm before you travel
                        </Text>
                      )}
                    </View>
                    </View>
                  );
                }}
              />

              {isTyping && (
                <View
                  style={[styles.typingIndicator, { backgroundColor: colors.surface }]}
                  accessibilityLiveRegion="polite"
                >
                  <ActivityIndicator size="small" color={colors.primary} />
                  <Text style={[styles.typingText, { color: colors.muted }]}>Looking it up in KalawGuide…</Text>
                </View>
              )}

              {/* Input */}
              <View style={[styles.inputRow, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
                <TextInput
                  style={[styles.textInput, { color: colors.text, backgroundColor: colors.subtle }]}
                  placeholder="Ask about destinations, budgets, trips…"
                  placeholderTextColor={colors.muted}
                  value={input}
                  onChangeText={setInput}
                  multiline
                  maxLength={MAX_INPUT_LENGTH}
                  returnKeyType="send"
                  submitBehavior="submit"
                  onSubmitEditing={() => sendMessage(input)}
                  onKeyPress={handleWebEnter}
                  accessibilityLabel="Message Kalaw Assistance"
                />
                <TouchableOpacity
                  style={[styles.sendButton, { backgroundColor: input.trim() && !isTyping ? fabColor : colors.border }]}
                  onPress={() => sendMessage(input)}
                  disabled={!input.trim() || isTyping}
                  accessibilityRole="button"
                  accessibilityLabel="Send message"
                  accessibilityState={{ disabled: !input.trim() || isTyping }}
                >
                  <Icon name="send" size={20} color={onFab} />
                  </TouchableOpacity>
              </View>
            </KeyboardAvoidingView>
          </SafeAreaView>
        </SafeAreaProvider>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    bottom: 75,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 3,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  modal: { flex: 1 },
  // Readable column on wide web screens; full width on phones.
  container: { flex: 1, width: '100%', maxWidth: 760, alignSelf: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.base,
    borderBottomWidth: 1,
    gap: Spacing.sm,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, flex: 1 },
  headerText: { flex: 1, gap: 2 },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: Typography.fontFamilyBody,
    fontSize: Typography.size.bodyLg,
    fontWeight: Typography.weight.semiBold,
  },
  headerSubtitle: {
    fontFamily: Typography.fontFamilyBody,
    fontSize: Typography.size.label,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: Spacing.xs,
    borderWidth: 1,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    marginTop: 2,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.caption },
  headerActions: { flexDirection: 'row', alignItems: 'center' },
  headerButton: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.sm },
  clearText: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body },
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
    maxWidth: 320,
  },
  suggestions: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, justifyContent: 'center' },
  suggestion: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.xl,
    borderWidth: 1,
  },
  suggestionText: {
    fontFamily: Typography.fontFamilyBody,
    fontSize: Typography.size.body,
  },
  messageRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 6 },
  messageRowUser: { justifyContent: 'flex-end' },
  bubbleAvatar: { marginBottom: Spacing.sm },
  messageBubble: {
    maxWidth: '82%',
    padding: Spacing.md,
    borderRadius: Radius.md,
    marginBottom: Spacing.sm,
  },
  userBubble: { alignSelf: 'flex-end', borderBottomRightRadius: 4 },
  assistantBubble: { alignSelf: 'flex-start', borderBottomLeftRadius: 4, borderWidth: 1 },
  messageText: {
    fontFamily: Typography.fontFamilyBody,
    fontSize: Typography.size.body,
    lineHeight: Typography.size.body * Typography.lineHeight,
  },
  estimateNote: {
    fontFamily: Typography.fontFamilyBody,
    fontSize: Typography.size.label,
    marginTop: Spacing.sm,
  },
  typingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
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
    fontSize: Typography.size.bodyLg,
    maxHeight: 100,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
