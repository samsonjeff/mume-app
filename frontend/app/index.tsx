import React, { useEffect, useState, useCallback } from 'react';
import { StyleSheet, Text, View, Pressable, ScrollView, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { THEME } from '../constants/theme';
import { WakeWordButton } from '../components/WakeWordButton';
import { InboxBadge } from '../components/InboxBadge';
import { api, LinkedPage } from '../lib/api';
import { supabase } from '../lib/supabase';

export default function HomeScreen() {
  const router = useRouter();
  const [pages, setPages] = useState<LinkedPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [assistantState, setAssistantState] = useState<'IDLE' | 'LISTENING' | 'THINKING'>('IDLE');

  const loadLinkedPages = useCallback(async () => {
    try {
      const data = await api.getLinkedPages();
      setPages(data);
    } catch (err) {
      console.warn('Failed to load linked pages:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadLinkedPages();

    // Listen for incoming messages in real-time
    const channel = supabase
      .channel('realtime_inbox')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        () => {
          setUnreadCount((prev) => prev + 1);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadLinkedPages]);

  const onRefresh = () => {
    setRefreshing(true);
    loadLinkedPages();
  };

  const handleWakePress = () => {
    setAssistantState((prev) => (prev === 'IDLE' ? 'LISTENING' : 'IDLE'));
  };

  const linkedPage = pages[0];

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom', 'left', 'right']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3B82F6" />}
      >
        {/* Top Bar Status */}
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.brandTitle}>Mume</Text>
            <Text style={styles.brandSubtitle}>Voice-first Page OS</Text>
          </View>
          <InboxBadge count={unreadCount} onPress={() => loadLinkedPages()} />
        </View>

        {/* Page Connection Card */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>CONNECTED FACEBOOK PAGE</Text>
          {loading ? (
            <Text style={styles.cardValueMuted}>Loading page status...</Text>
          ) : linkedPage ? (
            <View>
              <View style={styles.pageBadgeRow}>
                <Text style={styles.statusDot}>●</Text>
                <Text style={styles.pageName}>{linkedPage.page_name}</Text>
              </View>
              <Text style={styles.pageDetails}>Page ID: {linkedPage.fb_page_id}</Text>
              <View style={styles.secureTag}>
                <Text style={styles.secureTagText}>🔒 AES-256 Encrypted Token</Text>
              </View>
            </View>
          ) : (
            <View>
              <Text style={styles.cardValueMuted}>No Business Page linked yet.</Text>
              <Text style={styles.cardHelp}>Link your Facebook Page to let Mume check messages and draft replies hands-free.</Text>
            </View>
          )}
        </View>

        {/* Quick Instructions / Demo Info */}
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Voice Assistant Ready</Text>
          <Text style={styles.infoBody}>
            Say <Text style={styles.highlight}>"Hey Mume..."</Text> or tap the mic button below to check your page, hear unread customer inquiries, and confirm replies.
          </Text>
        </View>
      </ScrollView>

      {/* Bottom 40% Thumb Zone (Directive CPMRED-001) */}
      <View style={styles.thumbZone}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Link or change Facebook Page"
          style={styles.secondaryButton}
          onPress={() => router.push('/link-page')}
        >
          <Text style={styles.secondaryButtonText}>
            {linkedPage ? 'Manage Page Link' : '🔗 Link Facebook Page'}
          </Text>
        </Pressable>

        <WakeWordButton
          isListening={assistantState === 'LISTENING'}
          isThinking={assistantState === 'THINKING'}
          onPress={handleWakePress}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: THEME.colors.bg,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 160,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  brandTitle: {
    color: THEME.colors.text,
    fontSize: 26,
    fontWeight: '800',
  },
  brandSubtitle: {
    color: THEME.colors.textMuted,
    fontSize: 13,
  },
  card: {
    backgroundColor: THEME.colors.card,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: THEME.colors.cardBorder,
  },
  cardLabel: {
    color: THEME.colors.primaryLight,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  pageBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  statusDot: {
    color: THEME.colors.speaking,
    fontSize: 14,
    marginRight: 6,
  },
  pageName: {
    color: THEME.colors.text,
    fontSize: 20,
    fontWeight: '700',
  },
  pageDetails: {
    color: THEME.colors.textMuted,
    fontSize: 13,
    marginTop: 2,
  },
  secureTag: {
    marginTop: 10,
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    borderRadius: 8,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  secureTagText: {
    color: THEME.colors.primaryLight,
    fontSize: 11,
    fontWeight: '600',
  },
  cardValueMuted: {
    color: THEME.colors.textMuted,
    fontSize: 15,
  },
  cardHelp: {
    color: THEME.colors.textMuted,
    fontSize: 13,
    marginTop: 6,
    lineHeight: 18,
  },
  infoCard: {
    backgroundColor: 'rgba(30, 41, 59, 0.5)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: THEME.colors.cardBorder,
  },
  infoTitle: {
    color: THEME.colors.text,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  infoBody: {
    color: THEME.colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
  },
  highlight: {
    color: THEME.colors.primaryLight,
    fontWeight: '700',
  },
  thumbZone: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 20,
    backgroundColor: 'transparent',
  },
  secondaryButton: {
    width: '100%',
    minHeight: THEME.ergonomics.minTapTarget,
    backgroundColor: THEME.colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: THEME.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  secondaryButtonText: {
    color: THEME.colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
});
