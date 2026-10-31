import React, { useEffect, useState, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  ScrollView,
  RefreshControl,
  Image,
  TextInput,
  ActivityIndicator,
  Animated,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { THEME } from '../constants/theme';
import { WakeWordButton } from '../components/WakeWordButton';
import { VoiceWave } from '../components/VoiceWave';
import { api, LinkedPage } from '../lib/api';
import { supabase } from '../lib/supabase';

type Tab = 'today' | 'inbox' | 'catalog' | 'settings';
type VoiceState = 'idle' | 'listening' | 'thinking';

export default function HomeScreen() {
  const [activeTab, setActiveTab] = useState<Tab>('today');
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [pages, setPages] = useState<LinkedPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [unreadCount, setUnreadCount] = useState(2);
  const [sentToast, setSentToast] = useState(false);

  // Pending action state from Figma Make prototype
  const [editingPrice, setEditingPrice] = useState(false);
  const [price, setPrice] = useState('₱120 / kg');
  const [isApproved, setIsApproved] = useState(false);

  // Manual page link state (Settings tab)
  const [fbPageId, setFbPageId] = useState('1447275391796820');
  const [pageName, setPageName] = useState('Mume Fresh - Fruit Store');
  const [pageAccessToken, setPageAccessToken] = useState('');
  const [submittingLink, setSubmittingLink] = useState(false);
  const [linkMessage, setLinkMessage] = useState('');

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

  useEffect(() => {
    if (voiceState !== 'thinking') return;
    const t = setTimeout(() => {
      setVoiceState('idle');
    }, 2200);
    return () => clearTimeout(t);
  }, [voiceState]);

  const onRefresh = () => {
    setRefreshing(true);
    loadLinkedPages();
  };

  const handleVoice = () => {
    if (voiceState === 'idle') setVoiceState('listening');
    else if (voiceState === 'listening') setVoiceState('thinking');
    else setVoiceState('idle');
  };

  const handleApprove = () => {
    setIsApproved(true);
    setSentToast(true);
    setTimeout(() => {
      setSentToast(false);
    }, 3500);
  };

  const handleOAuthLogin = async () => {
    try {
      setSubmittingLink(true);
      const url = await api.getFacebookLoginUrl();
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      }
    } catch (err: any) {
      setLinkMessage(err.message || 'OAuth error');
    } finally {
      setSubmittingLink(false);
    }
  };

  const handleDirectLink = async () => {
    if (!fbPageId.trim() || !pageName.trim() || !pageAccessToken.trim()) {
      setLinkMessage('Please enter Page ID, Name, and Page Token.');
      return;
    }
    try {
      setSubmittingLink(true);
      const page = await api.linkDirectPage({
        fbPageId: fbPageId.trim(),
        pageName: pageName.trim(),
        pageAccessToken: pageAccessToken.trim(),
      });
      setLinkMessage(`Page "${page.page_name}" linked successfully!`);
      await loadLinkedPages();
    } catch (err: any) {
      setLinkMessage(err.message || 'Direct link failed');
    } finally {
      setSubmittingLink(false);
    }
  };

  const linkedPage = pages[0];
  const activePageTitle = linkedPage?.page_name || 'Mume Fresh - Fruit Store';

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right', 'bottom']}>
      {/* 1. App Header */}
      <header style={styles.headerRow}>
        <View style={styles.brandRow}>
          <Image
            source={require('../assets/mume-logo.png')}
            style={styles.brandLogo}
            resizeMode="contain"
            accessibilityRole="image"
            accessibilityLabel="Mume"
          />
          <View style={styles.brandCopy}>
            <Text style={styles.brandTitle}>Mume</Text>
            <Text style={styles.brandSubtitle} numberOfLines={1}>
              {activePageTitle}
            </Text>
          </View>
        </View>
        <View style={styles.profileBadge}>
          <Text style={styles.profileBadgeText}>AN</Text>
        </View>
      </header>

      {/* 2. Main Content Scroll Area */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={THEME.colors.primary} />}
      >
        {activeTab === 'today' && (
          <View style={styles.screenContainer}>
            {/* Greeting & Status */}
            <View style={styles.greetingRow}>
              <View>
                <Text style={styles.dateLabel}>TUESDAY, NOVEMBER 5</Text>
                <Text style={styles.greetingTitle}>Magandang umaga, Ana</Text>
                <Text style={styles.greetingSubtitle}>Mume is watching your page.</Text>
              </View>
              <View style={styles.onlinePill}>
                <View style={styles.onlineDot} />
                <Text style={styles.onlinePillText}>Page live</Text>
              </View>
            </View>

            {/* Summary Card */}
            <Pressable style={styles.summaryCard} onPress={() => setActiveTab('inbox')}>
              <View style={styles.summaryIconContainer}>
                <Text style={styles.summaryIconText}>💬</Text>
              </View>
              <View style={styles.summaryCopy}>
                <Text style={styles.summaryTitle}>2 new messages</Text>
                <Text style={styles.summarySubtitle}>
                  {isApproved ? 'All inquiries handled' : '1 needs your approval'}
                </Text>
              </View>
              <Text style={styles.chevronText}>›</Text>
            </Pressable>

            {/* Section Heading */}
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionHeading}>Ready for you</Text>
              <Text style={styles.sectionBadge}>{isApproved ? '0 actions' : '1 action'}</Text>
            </View>

            {/* Pending Action Card */}
            {!isApproved ? (
              <View style={styles.approvalCard}>
                <View style={styles.cardTopline}>
                  <View style={styles.eyebrow}>
                    <View style={styles.statusDotAmber} />
                    <Text style={styles.eyebrowText}>Needs your approval</Text>
                  </View>
                  <Text style={styles.timeLabel}>now</Text>
                </View>

                <View style={styles.customerRow}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>MA</Text>
                  </View>
                  <View>
                    <Text style={styles.customerName}>Maria A.</Text>
                    <Text style={styles.customerContext}>Messenger · Price inquiry</Text>
                  </View>
                </View>

                <View style={styles.messageBubble}>
                  <Text style={styles.messageBubbleText}>“Hi po, how much ang red apples?”</Text>
                </View>

                <View style={styles.draftBlock}>
                  <View style={styles.draftLabelRow}>
                    <Text style={styles.draftIconText}>✨</Text>
                    <Text style={styles.draftLabelText}>Mume’s suggested reply</Text>
                  </View>

                  {editingPrice ? (
                    <View style={styles.priceEditor}>
                      <Text style={styles.priceEditorLabel}>Update price</Text>
                      <TextInput
                        autoFocus
                        style={styles.priceInput}
                        value={price}
                        onChangeText={setPrice}
                      />
                    </View>
                  ) : (
                    <Text style={styles.draftText}>
                      Hi po! Our red apples are{' '}
                      <Text style={styles.draftPriceHighlight}>{price}</Text>. Fresh delivery today.
                    </Text>
                  )}
                </View>

                <View style={styles.approvalActions}>
                  <Pressable
                    accessibilityRole="button"
                    style={styles.secondaryButton}
                    onPress={() => setEditingPrice((v) => !v)}
                  >
                    <Text style={styles.secondaryButtonText}>
                      {editingPrice ? 'Done editing' : 'Edit'}
                    </Text>
                  </Pressable>

                  <Pressable
                    accessibilityRole="button"
                    style={styles.primaryButton}
                    onPress={handleApprove}
                  >
                    <Text style={styles.primaryButtonText}>Approve & send ✓</Text>
                  </Pressable>
                </View>

                <Text style={styles.safetyNote}>🔒 Nothing is sent without your approval.</Text>
              </View>
            ) : (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyCardIcon}>✓</Text>
                <Text style={styles.emptyCardTitle}>All Caught Up!</Text>
                <Text style={styles.emptyCardSubtitle}>
                  Reply confirmed and dispatched to Maria via Meta Graph API.
                </Text>
              </View>
            )}
          </View>
        )}

        {activeTab === 'inbox' && (
          <View style={styles.screenContainer}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionHeading}>Inbox</Text>
              <Text style={styles.sectionBadge}>2 unread</Text>
            </View>

            {[
              { id: '1', initials: 'MA', name: 'Maria A.', message: 'Hi po, how much ang red apples?', time: 'now', unread: true },
              { id: '2', initials: 'JL', name: 'Jun L.', message: 'Available pa po ang mango?', time: '8m', unread: true },
              { id: '3', initials: 'RS', name: 'Rica S.', message: 'Thank you po!', time: '1h', unread: false },
            ].map((convo) => (
              <Pressable key={convo.id} style={styles.conversationCard}>
                <View style={styles.conversationAvatar}>
                  <Text style={styles.conversationAvatarText}>{convo.initials}</Text>
                </View>
                <View style={styles.conversationCopy}>
                  <Text style={styles.conversationName}>{convo.name}</Text>
                  <Text style={styles.conversationMessage} numberOfLines={1}>
                    {convo.message}
                  </Text>
                </View>
                <View style={styles.conversationMeta}>
                  <Text style={styles.conversationTime}>{convo.time}</Text>
                  {convo.unread && <View style={styles.unreadDot} />}
                </View>
              </Pressable>
            ))}
          </View>
        )}

        {activeTab === 'catalog' && (
          <View style={styles.screenContainer}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionHeading}>Catalog</Text>
              <Text style={styles.sectionBadge}>3 products</Text>
            </View>

            <View style={styles.catalogGrid}>
              {[
                { emoji: '🍎', name: 'Red apples', price: '₱120 / kg', stock: 'In stock', isStock: true },
                { emoji: '🥭', name: 'Carabao mango', price: '₱180 / kg', stock: 'In stock', isStock: true },
                { emoji: '🍌', name: 'Lakatan banana', price: '₱85 / kg', stock: 'Low stock', isStock: false },
              ].map((item) => (
                <View key={item.name} style={styles.productCard}>
                  <Text style={styles.productEmoji}>{item.emoji}</Text>
                  <Text style={styles.productName}>{item.name}</Text>
                  <Text style={styles.productPrice}>{item.price}</Text>
                  <View style={[styles.stockPill, item.isStock ? styles.stockIn : styles.stockLow]}>
                    <Text style={styles.stockPillText}>{item.stock}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {activeTab === 'settings' && (
          <View style={styles.screenContainer}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionHeading}>Settings & Linking</Text>
              <Text style={styles.sectionBadge}>v1.0.0</Text>
            </View>

            {/* Connected Facebook Page Status */}
            <View style={styles.settingsCard}>
              <Text style={styles.settingsCardTitle}>CONNECTED FACEBOOK PAGE</Text>
              {loading ? (
                <ActivityIndicator color={THEME.colors.primary} />
              ) : linkedPage ? (
                <View>
                  <View style={styles.pageBadgeRow}>
                    <Text style={styles.statusDotGreen}>●</Text>
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
                  <Text style={styles.cardHelp}>
                    Connect your Facebook Page to allow Mume to read inquiries and draft replies.
                  </Text>
                </View>
              )}
            </View>

            {/* Method 1: Facebook Login OAuth */}
            <View style={styles.settingsCard}>
              <Text style={styles.settingsCardTitle}>METHOD 1: OFFICIAL FACEBOOK LOGIN</Text>
              <Pressable
                accessibilityRole="button"
                style={styles.fbButton}
                onPress={handleOAuthLogin}
                disabled={submittingLink}
              >
                {submittingLink ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.fbButtonText}>Connect via Facebook OAuth</Text>
                )}
              </Pressable>
            </View>

            {/* Method 2: Direct Page Token (Dev) */}
            <View style={styles.settingsCard}>
              <Text style={styles.settingsCardTitle}>METHOD 2: DIRECT PAGE TOKEN (DEV)</Text>
              <Text style={styles.inputLabel}>Page ID</Text>
              <TextInput
                style={styles.input}
                value={fbPageId}
                onChangeText={setFbPageId}
                placeholder="1447275391796820"
                placeholderTextColor={THEME.colors.textMuted}
              />
              <Text style={styles.inputLabel}>Page Name</Text>
              <TextInput
                style={styles.input}
                value={pageName}
                onChangeText={setPageName}
                placeholder="Mume Fresh - Fruit Store"
                placeholderTextColor={THEME.colors.textMuted}
              />
              <Text style={styles.inputLabel}>Page Access Token</Text>
              <TextInput
                style={[styles.input, styles.tokenInput]}
                value={pageAccessToken}
                onChangeText={setPageAccessToken}
                placeholder="Paste EAAG... token"
                placeholderTextColor={THEME.colors.textMuted}
                secureTextEntry
                multiline
              />
              <Pressable
                accessibilityRole="button"
                style={styles.primaryButton}
                onPress={handleDirectLink}
                disabled={submittingLink}
              >
                {submittingLink ? (
                  <ActivityIndicator color={THEME.colors.textInverted} />
                ) : (
                  <Text style={styles.primaryButtonText}>Link Page Directly</Text>
                )}
              </Pressable>

              {linkMessage ? <Text style={styles.linkMessageText}>{linkMessage}</Text> : null}
            </View>
          </View>
        )}
      </ScrollView>

      {/* 3. Floating Voice Dock + Wake Word Center Action */}
      <View style={styles.voiceDockWrapper} pointerEvents="box-none">
        <View style={styles.voiceStatusPill}>
          {voiceState === 'idle' && (
            <View style={styles.voiceStatusContent}>
              <Text style={styles.voiceStatusTitle}>Say “Hey Mume”</Text>
              <Text style={styles.voiceStatusSubtitle}>or tap to speak</Text>
            </View>
          )}
          {voiceState === 'listening' && (
            <View style={styles.voiceStatusContentRow}>
              <Text style={styles.voiceStatusTitle}>Listening…</Text>
              <VoiceWave />
            </View>
          )}
          {voiceState === 'thinking' && (
            <View style={styles.voiceStatusContentRow}>
              <Text style={styles.voiceStatusTitle}>Checking your page…</Text>
              <Text style={styles.sparkEmoji}>✨</Text>
            </View>
          )}
        </View>

        <WakeWordButton
          isListening={voiceState === 'listening'}
          isThinking={voiceState === 'thinking'}
          onPress={handleVoice}
        />
      </View>

      {/* 4. Bottom 4-Tab Navigation */}
      <nav style={styles.bottomNav}>
        <Pressable
          accessibilityRole="button"
          style={[styles.tabButton, activeTab === 'today' && styles.tabButtonActive]}
          onPress={() => setActiveTab('today')}
        >
          <Text style={styles.tabIcon}>🏠</Text>
          <Text style={[styles.tabLabel, activeTab === 'today' && styles.tabLabelActive]}>Today</Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          style={[styles.tabButton, activeTab === 'inbox' && styles.tabButtonActive]}
          onPress={() => setActiveTab('inbox')}
        >
          <Text style={styles.tabIcon}>💬</Text>
          <Text style={[styles.tabLabel, activeTab === 'inbox' && styles.tabLabelActive]}>Inbox</Text>
        </Pressable>

        {/* Center Spacer for Floating 72dp Wake Button */}
        <View style={styles.tabCenterSpacer} />

        <Pressable
          accessibilityRole="button"
          style={[styles.tabButton, activeTab === 'catalog' && styles.tabButtonActive]}
          onPress={() => setActiveTab('catalog')}
        >
          <Text style={styles.tabIcon}>📦</Text>
          <Text style={[styles.tabLabel, activeTab === 'catalog' && styles.tabLabelActive]}>Catalog</Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          style={[styles.tabButton, activeTab === 'settings' && styles.tabButtonActive]}
          onPress={() => setActiveTab('settings')}
        >
          <Text style={styles.tabIcon}>⚙️</Text>
          <Text style={[styles.tabLabel, activeTab === 'settings' && styles.tabLabelActive]}>Settings</Text>
        </Pressable>
      </nav>

      {/* 5. Animated Success Toast */}
      {sentToast && (
        <View style={styles.toast}>
          <Text style={styles.toastIcon}>✓</Text>
          <Text style={styles.toastText}>Reply sent to Maria A.</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: THEME.colors.bg,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(130, 200, 229, 0.3)',
    backgroundColor: THEME.colors.bg,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  brandLogo: {
    width: 44,
    height: 44,
  },
  brandCopy: {
    flex: 1,
  },
  brandTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: THEME.colors.text,
  },
  brandSubtitle: {
    fontSize: 12,
    color: THEME.colors.textMuted,
    fontWeight: '500',
  },
  profileBadge: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: THEME.colors.primaryLight,
    borderWidth: 1.5,
    borderColor: THEME.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileBadgeText: {
    color: THEME.colors.textInverted,
    fontSize: 13,
    fontWeight: '700',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 220,
  },
  screenContainer: {
    width: '100%',
  },
  greetingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  dateLabel: {
    color: THEME.colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  greetingTitle: {
    color: THEME.colors.text,
    fontSize: 22,
    fontWeight: '800',
  },
  greetingSubtitle: {
    color: THEME.colors.textMuted,
    fontSize: 13,
    marginTop: 2,
  },
  onlinePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    gap: 6,
  },
  onlineDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: THEME.colors.speaking,
  },
  onlinePillText: {
    color: THEME.colors.text,
    fontSize: 11,
    fontWeight: '700',
  },
  summaryCard: {
    backgroundColor: THEME.colors.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
    borderColor: THEME.colors.cardBorder,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  summaryIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: THEME.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  summaryIconText: {
    fontSize: 20,
  },
  summaryCopy: {
    flex: 1,
  },
  summaryTitle: {
    color: THEME.colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  summarySubtitle: {
    color: THEME.colors.textMuted,
    fontSize: 13,
    marginTop: 2,
  },
  chevronText: {
    color: THEME.colors.textMuted,
    fontSize: 22,
    fontWeight: '600',
    paddingHorizontal: 6,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionHeading: {
    color: THEME.colors.text,
    fontSize: 18,
    fontWeight: '800',
  },
  sectionBadge: {
    color: THEME.colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  approvalCard: {
    backgroundColor: THEME.colors.card,
    borderRadius: 18,
    padding: 18,
    borderWidth: 1.5,
    borderColor: THEME.colors.cardBorder,
    marginBottom: 16,
  },
  cardTopline: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  eyebrow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDotAmber: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#F59E0B',
  },
  eyebrowText: {
    color: THEME.colors.text,
    fontSize: 12,
    fontWeight: '700',
  },
  timeLabel: {
    color: THEME.colors.textMuted,
    fontSize: 11,
  },
  customerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: THEME.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: THEME.colors.textInverted,
    fontSize: 14,
    fontWeight: '700',
  },
  customerName: {
    color: THEME.colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  customerContext: {
    color: THEME.colors.textMuted,
    fontSize: 12,
  },
  messageBubble: {
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
    borderLeftWidth: 3,
    borderLeftColor: THEME.colors.primary,
  },
  messageBubbleText: {
    color: THEME.colors.text,
    fontSize: 14,
    fontStyle: 'italic',
  },
  draftBlock: {
    backgroundColor: 'rgba(152, 207, 240, 0.25)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: THEME.colors.primaryLight,
  },
  draftLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  draftIconText: {
    fontSize: 14,
  },
  draftLabelText: {
    color: THEME.colors.text,
    fontSize: 12,
    fontWeight: '700',
  },
  draftText: {
    color: THEME.colors.text,
    fontSize: 14,
    lineHeight: 20,
  },
  draftPriceHighlight: {
    fontWeight: '800',
    color: THEME.colors.textInverted,
    backgroundColor: THEME.colors.primaryLight,
    paddingHorizontal: 4,
    borderRadius: 4,
  },
  priceEditor: {
    marginTop: 4,
  },
  priceEditorLabel: {
    color: THEME.colors.textMuted,
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 4,
  },
  priceInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: THEME.colors.primary,
    color: THEME.colors.text,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 15,
    fontWeight: '700',
  },
  approvalActions: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  secondaryButton: {
    flex: 1,
    minHeight: THEME.ergonomics.minTapTarget,
    backgroundColor: THEME.colors.bg,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: THEME.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    color: THEME.colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  primaryButton: {
    flex: 1.4,
    minHeight: THEME.ergonomics.minTapTarget,
    backgroundColor: THEME.colors.primary,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: THEME.colors.textInverted,
    fontSize: 14,
    fontWeight: '700',
  },
  safetyNote: {
    color: THEME.colors.textMuted,
    fontSize: 11,
    textAlign: 'center',
  },
  emptyCard: {
    backgroundColor: THEME.colors.card,
    borderRadius: 18,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: THEME.colors.cardBorder,
  },
  emptyCardIcon: {
    fontSize: 36,
    color: THEME.colors.speaking,
    marginBottom: 10,
  },
  emptyCardTitle: {
    color: THEME.colors.text,
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 4,
  },
  emptyCardSubtitle: {
    color: THEME.colors.textMuted,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  conversationCard: {
    backgroundColor: THEME.colors.card,
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
    borderWidth: 1.5,
    borderColor: THEME.colors.cardBorder,
  },
  conversationAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: THEME.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  conversationAvatarText: {
    color: THEME.colors.textInverted,
    fontSize: 14,
    fontWeight: '700',
  },
  conversationCopy: {
    flex: 1,
  },
  conversationName: {
    color: THEME.colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  conversationMessage: {
    color: THEME.colors.textMuted,
    fontSize: 13,
    marginTop: 2,
  },
  conversationMeta: {
    alignItems: 'flex-end',
    gap: 4,
  },
  conversationTime: {
    color: THEME.colors.textMuted,
    fontSize: 11,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: THEME.colors.primary,
  },
  catalogGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  productCard: {
    width: '47%',
    backgroundColor: THEME.colors.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
    borderColor: THEME.colors.cardBorder,
    alignItems: 'center',
  },
  productEmoji: {
    fontSize: 40,
    marginBottom: 8,
  },
  productName: {
    color: THEME.colors.text,
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  productPrice: {
    color: THEME.colors.text,
    fontSize: 13,
    fontWeight: '800',
    marginTop: 4,
  },
  stockPill: {
    marginTop: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  stockIn: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  stockLow: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
  },
  stockPillText: {
    color: THEME.colors.text,
    fontSize: 10,
    fontWeight: '700',
  },
  settingsCard: {
    backgroundColor: THEME.colors.card,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1.5,
    borderColor: THEME.colors.cardBorder,
    marginBottom: 16,
  },
  settingsCardTitle: {
    color: THEME.colors.text,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  pageBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  statusDotGreen: {
    color: THEME.colors.speaking,
    fontSize: 14,
  },
  pageName: {
    color: THEME.colors.text,
    fontSize: 18,
    fontWeight: '700',
  },
  pageDetails: {
    color: THEME.colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  secureTag: {
    marginTop: 8,
    backgroundColor: 'rgba(130, 200, 229, 0.3)',
    borderRadius: 8,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  secureTagText: {
    color: THEME.colors.text,
    fontSize: 11,
    fontWeight: '600',
  },
  cardValueMuted: {
    color: THEME.colors.textMuted,
    fontSize: 14,
  },
  cardHelp: {
    color: THEME.colors.textMuted,
    fontSize: 12,
    marginTop: 4,
    lineHeight: 16,
  },
  fbButton: {
    backgroundColor: '#1877F2',
    minHeight: THEME.ergonomics.minTapTarget,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fbButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  inputLabel: {
    color: THEME.colors.text,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
    marginTop: 8,
  },
  input: {
    backgroundColor: THEME.colors.bg,
    borderWidth: 1,
    borderColor: THEME.colors.cardBorder,
    borderRadius: 10,
    color: THEME.colors.text,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  tokenInput: {
    minHeight: 60,
    textAlignVertical: 'top',
  },
  linkMessageText: {
    color: THEME.colors.text,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 8,
    textAlign: 'center',
  },
  voiceDockWrapper: {
    position: 'absolute',
    bottom: 60,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10,
  },
  voiceStatusPill: {
    backgroundColor: THEME.colors.card,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderWidth: 1.5,
    borderColor: THEME.colors.cardBorder,
    marginBottom: 8,
    shadowColor: THEME.colors.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  voiceStatusContent: {
    alignItems: 'center',
  },
  voiceStatusContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  voiceStatusTitle: {
    color: THEME.colors.text,
    fontSize: 12,
    fontWeight: '700',
  },
  voiceStatusSubtitle: {
    color: THEME.colors.textMuted,
    fontSize: 10,
  },
  sparkEmoji: {
    fontSize: 14,
  },
  bottomNav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 64,
    backgroundColor: THEME.colors.card,
    borderTopWidth: 1.5,
    borderTopColor: THEME.colors.cardBorder,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 8,
  },
  tabButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 54,
    minHeight: 48,
  },
  tabButtonActive: {
    opacity: 1,
  },
  tabIcon: {
    fontSize: 18,
  },
  tabLabel: {
    color: THEME.colors.textMuted,
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  tabLabelActive: {
    color: THEME.colors.text,
    fontWeight: '800',
  },
  tabCenterSpacer: {
    width: 64,
  },
  toast: {
    position: 'absolute',
    bottom: 120,
    alignSelf: 'center',
    backgroundColor: THEME.colors.text,
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 10,
    gap: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 10,
    zIndex: 99,
  },
  toastIcon: {
    color: THEME.colors.speaking,
    fontSize: 16,
    fontWeight: '900',
  },
  toastText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
});
