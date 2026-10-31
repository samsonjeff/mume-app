import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { StatusBar } from 'expo-status-bar';
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  ScrollView,
  RefreshControl,
  TextInput,
  ActivityIndicator,
  Animated,
  Linking,
  Image,
  Modal,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { THEME } from '../constants/theme';
import { VoiceWave } from '../components/VoiceWave';
import { AppIcon } from '../components/AppIcon';
import { MumeLogo } from '../components/MumeLogo';
import { api, LinkedPage } from '../lib/api';
import { supabase } from '../lib/supabase';

const FRUIT_IMAGES = {
  apple: require('../assets/apple.jpg'),
  mango: require('../assets/mango.jpg'),
  banana: require('../assets/banana.jpg'),
};

type Tab = 'today' | 'inbox' | 'catalog' | 'settings';
type VoiceState = 'idle' | 'listening' | 'thinking';

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<Tab>('today');
  const [menuOpen, setMenuOpen] = useState(false);
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [userName, setUserName] = useState<string>('Jefferson');
  const [isLoggedIn, setIsLoggedIn] = useState(true);
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

  // Dynamically compute user initials from real user name
  const userInitials = useMemo(() => {
    if (!isLoggedIn) return '?';
    const parts = userName.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return 'JS';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }, [isLoggedIn, userName]);

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
      setIsLoggedIn(true);
      setUserName('Jefferson');
      setUnreadCount(2);
      setIsApproved(false);
      setSubmittingLink(false);
      setMenuOpen(false);
      loadLinkedPages();
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setUserName('');
    setPages([]);
    setUnreadCount(0);
    setIsApproved(false);
    setMenuOpen(false);
  };

  const handleLogin = async () => {
    await handleOAuthLogin();
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
  const activePageTitle = isLoggedIn
    ? (linkedPage?.page_name || 'Mume Fresh - Fruit Store')
    : 'No Store Linked';

  return (
    <View style={styles.rootContainer}>
      <StatusBar style="light" />
      {/* 1. Black Top App Bar */}
      <SafeAreaView edges={['top']} style={styles.headerSafeArea}>
        <View style={styles.headerRow} accessibilityRole="header">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Main menu"
            onPress={() => setMenuOpen(true)}
            style={styles.menuIconButton}
          >
            <AppIcon name="menu" size={20} color="#FFFFFF" />
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open settings profile"
            onPress={() => setActiveTab(activeTab === 'settings' ? 'today' : 'settings')}
            style={styles.profileBadge}
          >
            <Text style={styles.profileBadgeText}>{userInitials}</Text>
          </Pressable>
        </View>
      </SafeAreaView>

      {/* 2. Main Body Content */}
      <SafeAreaView edges={['left', 'right', 'bottom']} style={styles.bodySafeArea}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={THEME.colors.primary} />}
        >
        {activeTab === 'today' && (
          <View style={styles.screenContainer}>
            {/* Zero-State Hero Section (Gemini Layout Style) */}
            <View style={styles.geminiZeroStateContainer}>
              <Text style={styles.geminiHeroTitle}>
                {isLoggedIn ? `Hello, ${userName.trim().split(/\s+/)[0] || userName}` : 'Welcome to Mume'}
              </Text>
              <Text style={styles.geminiHeroSubtitle}>
                {isLoggedIn
                  ? `Where should we start with ${activePageTitle}?`
                  : 'Connect your Facebook Page to start managing inquiries.'}
              </Text>
            </View>

            {/* Quick Action Suggestion Chips (Gemini Prompt Starters) */}
            {isLoggedIn ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.geminiChipsScroll}
              >
                <Pressable
                  style={styles.geminiChip}
                  onPress={() => setActiveTab('inbox')}
                >
                  <AppIcon name="message-circle" size={14} color={THEME.colors.primary} />
                  <Text style={styles.geminiChipText}>Maria's inquiry (₱120)</Text>
                </Pressable>

                <Pressable
                  style={styles.geminiChip}
                  onPress={() => setActiveTab('catalog')}
                >
                  <AppIcon name="folder" size={14} color={THEME.colors.primary} />
                  <Text style={styles.geminiChipText}>Fruit catalog (3 items)</Text>
                </Pressable>

                <Pressable
                  style={styles.geminiChip}
                  onPress={() => setActiveTab('settings')}
                >
                  <AppIcon name="check" size={14} color={THEME.colors.speaking} />
                  <Text style={styles.geminiChipText}>Page live & encrypted</Text>
                </Pressable>
              </ScrollView>
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.geminiChipsScroll}
              >
                <Pressable
                  style={styles.geminiChip}
                  onPress={handleLogin}
                >
                  <AppIcon name="log-in" size={14} color={THEME.colors.primary} />
                  <Text style={styles.geminiChipText}>Login using Facebook</Text>
                </Pressable>
              </ScrollView>
            )}

            {isLoggedIn ? (
              <>
                {/* Summary Card */}
                <Pressable style={styles.summaryCard} onPress={() => setActiveTab('inbox')}>
                  <View style={styles.summaryIconContainer}>
                    <AppIcon name="message-circle" size={22} color={THEME.colors.primary} />
                  </View>
                  <View style={styles.summaryCopy}>
                    <Text style={styles.summaryTitle}>2 new messages</Text>
                    <Text style={styles.summarySubtitle}>
                      {isApproved ? 'All inquiries handled' : '1 needs your approval'}
                    </Text>
                  </View>
                  <AppIcon name="chevron-right" size={20} color={THEME.colors.textMuted} />
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
                        <AppIcon name="bot" size={16} color={THEME.colors.primary} />
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
                        <View style={styles.buttonInnerRow}>
                          <AppIcon name="edit" size={15} color={THEME.colors.text} />
                          <Text style={styles.secondaryButtonText}>
                            {editingPrice ? 'Done' : 'Edit'}
                          </Text>
                        </View>
                      </Pressable>

                      <Pressable
                        accessibilityRole="button"
                        style={styles.primaryButton}
                        onPress={handleApprove}
                      >
                        <View style={styles.buttonInnerRow}>
                          <Text style={styles.primaryButtonText}>Approve & send</Text>
                          <AppIcon name="check" size={16} color="#FFFFFF" strokeWidth={2.5} />
                        </View>
                      </Pressable>
                    </View>

                    <Text style={styles.safetyNote}>Nothing is sent without your approval.</Text>
                  </View>
                ) : (
                  <View style={styles.emptyCard}>
                    <View style={styles.emptyCheckBadge}>
                      <AppIcon name="check" size={28} color={THEME.colors.speaking} strokeWidth={2.5} />
                    </View>
                    <Text style={styles.emptyCardTitle}>All Caught Up!</Text>
                    <Text style={styles.emptyCardSubtitle}>
                      Reply confirmed and dispatched to Maria via Meta Graph API.
                    </Text>
                  </View>
                )}
              </>
            ) : (
              <View style={styles.emptyStateCard}>
                <View style={styles.emptyStateIconCircle}>
                  <AppIcon name="log-in" size={30} color={THEME.colors.primary} strokeWidth={2} />
                </View>
                <Text style={styles.emptyStateTitle}>No Active Store Connected</Text>
                <Text style={styles.emptyStateSubtitle}>
                  You are currently logged out. Connect your Facebook account to view customer messages, approve drafts, and manage store catalog.
                </Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Login using Facebook"
                  style={styles.fbLoginPrimaryBtn}
                  onPress={handleLogin}
                >
                  <AppIcon name="log-in" size={18} color="#FFFFFF" strokeWidth={2.2} />
                  <Text style={styles.fbLoginPrimaryBtnText}>Login using Facebook</Text>
                </Pressable>
              </View>
            )}
          </View>
        )}

        {activeTab === 'inbox' && (
          <View style={styles.screenContainer}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionHeading}>Inbox</Text>
              <Text style={styles.sectionBadge}>{isLoggedIn ? '2 unread' : '0 unread'}</Text>
            </View>

            {isLoggedIn ? (
              [
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
              ))
            ) : (
              <View style={styles.emptyStateCard}>
                <View style={styles.emptyStateIconCircle}>
                  <AppIcon name="message-circle" size={30} color={THEME.colors.textMuted} strokeWidth={1.8} />
                </View>
                <Text style={styles.emptyStateTitle}>No Conversations</Text>
                <Text style={styles.emptyStateSubtitle}>
                  No customer messages to show. Log in using your Facebook account to synchronize inquiries.
                </Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Login using Facebook"
                  style={styles.fbLoginPrimaryBtn}
                  onPress={handleLogin}
                >
                  <AppIcon name="log-in" size={18} color="#FFFFFF" strokeWidth={2.2} />
                  <Text style={styles.fbLoginPrimaryBtnText}>Login using Facebook</Text>
                </Pressable>
              </View>
            )}
          </View>
        )}

        {activeTab === 'catalog' && (
          <View style={styles.screenContainer}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionHeading}>Catalog</Text>
              <Text style={styles.sectionBadge}>{isLoggedIn ? '3 products' : '0 products'}</Text>
            </View>

            {isLoggedIn ? (
              <View style={styles.catalogGrid}>
                {[
                  { name: 'Red apples', price: '₱120 / kg', stock: 'In stock', isStock: true, image: FRUIT_IMAGES.apple },
                  { name: 'Carabao mango', price: '₱180 / kg', stock: 'In stock', isStock: true, image: FRUIT_IMAGES.mango },
                  { name: 'Lakatan banana', price: '₱85 / kg', stock: 'Low stock', isStock: false, image: FRUIT_IMAGES.banana },
                ].map((item) => (
                  <View key={item.name} style={styles.productCard}>
                    <Image source={item.image} style={styles.productImage} resizeMode="cover" />
                    <Text style={styles.productName}>{item.name}</Text>
                    <Text style={styles.productPrice}>{item.price}</Text>
                    <View style={[styles.stockPill, item.isStock ? styles.stockIn : styles.stockLow]}>
                      <Text style={styles.stockPillText}>{item.stock}</Text>
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              <View style={styles.emptyStateCard}>
                <View style={styles.emptyStateIconCircle}>
                  <AppIcon name="folder" size={30} color={THEME.colors.textMuted} strokeWidth={1.8} />
                </View>
                <Text style={styles.emptyStateTitle}>Catalog is Empty</Text>
                <Text style={styles.emptyStateSubtitle}>
                  No products found. Log in using your Facebook account to link and manage your store inventory.
                </Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Login using Facebook"
                  style={styles.fbLoginPrimaryBtn}
                  onPress={handleLogin}
                >
                  <AppIcon name="log-in" size={18} color="#FFFFFF" strokeWidth={2.2} />
                  <Text style={styles.fbLoginPrimaryBtnText}>Login using Facebook</Text>
                </Pressable>
              </View>
            )}
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
              ) : isLoggedIn && linkedPage ? (
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
                onPress={handleLogin}
                disabled={submittingLink}
              >
                {submittingLink ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <View style={styles.buttonInnerRow}>
                    <AppIcon name="log-in" size={18} color="#FFFFFF" strokeWidth={2.2} />
                    <Text style={styles.fbButtonText}>
                      {isLoggedIn ? 'Re-authenticate with Facebook' : 'Login using Facebook'}
                    </Text>
                  </View>
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

      {/* 3. Gemini-Style Floating Bottom Input Capsule Dock */}
      <View style={styles.geminiInputDockContainer} pointerEvents="box-none">
        <View style={styles.geminiInputCapsule}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Quick tools & catalog"
            onPress={() => setActiveTab('catalog')}
            style={styles.geminiPlusButton}
          >
            <AppIcon name="plus" size={20} color={THEME.colors.text} strokeWidth={2.2} />
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Voice dictate or ask Mume"
            onPress={handleVoice}
            style={styles.geminiInputArea}
          >
            {voiceState === 'idle' && (
              <Text style={styles.geminiInputPlaceholder}>Ask Mume or tap mic…</Text>
            )}
            {voiceState === 'listening' && (
              <View style={styles.voiceStateRow}>
                <VoiceWave />
                <Text style={styles.voiceStateListeningText}>Listening…</Text>
              </View>
            )}
            {voiceState === 'thinking' && (
              <View style={styles.voiceStateRow}>
                <AppIcon name="bot" size={16} color={THEME.colors.primary} />
                <Text style={styles.voiceStateThinkingText}>Checking your page…</Text>
              </View>
            )}
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Dictate and talk to Mume"
            onPress={handleVoice}
            style={[
              styles.geminiMicButton,
              voiceState === 'listening' && styles.geminiMicButtonActive,
            ]}
          >
            <AppIcon
              name={voiceState === 'thinking' ? 'bot' : voiceState === 'listening' ? 'mic-audio-lines' : 'mic'}
              size={22}
              color="#FFFFFF"
              strokeWidth={2.2}
            />
          </Pressable>
        </View>

        <Text style={styles.capabilitiesDisclaimer}>
          Nothing is sent to customers without your approval.
        </Text>
      </View>
    </SafeAreaView>

      {/* 4. Slide-Out Side Navigation Drawer (Responsive Full-Height Modal) */}
      <Modal
        visible={menuOpen}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setMenuOpen(false)}
        statusBarTranslucent={true}
      >
        <View style={styles.drawerModalOverlay}>
          <Pressable
            style={styles.drawerBackdrop}
            accessibilityRole="button"
            accessibilityLabel="Close navigation menu"
            onPress={() => setMenuOpen(false)}
          />
          <View
            style={[
              styles.drawerPanel,
              {
                paddingTop: Math.max(insets.top, 16),
                paddingBottom: Math.max(insets.bottom, 16),
              },
            ]}
          >
            <ScrollView
              contentContainerStyle={styles.drawerScrollContent}
              showsVerticalScrollIndicator={false}
              bounces={false}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.drawerTopSection}>
                {/* Drawer Header */}
                <View style={styles.drawerHeader}>
                  <View style={styles.drawerBrandRow}>
                    <MumeLogo width={80} height={30} color={THEME.colors.obsidian} />
                  </View>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Close menu"
                    onPress={() => setMenuOpen(false)}
                    style={styles.drawerCloseButton}
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                  >
                    <AppIcon name="x" size={20} color={THEME.colors.text} />
                  </Pressable>
                </View>

                {/* Store Card in Drawer */}
                <View style={styles.drawerStoreCard}>
                  <Text style={styles.drawerStoreName} numberOfLines={1}>
                    {activePageTitle}
                  </Text>
                  <Text style={styles.drawerStoreMeta}>
                    {isLoggedIn ? 'Messenger AI Assistant · Meta Synced' : 'Log in with Facebook to sync store'}
                  </Text>
                </View>

                {/* Navigation Options List */}
                <View style={styles.drawerNavSection}>
                  <Text style={styles.drawerSectionLabel}>NAVIGATION</Text>

                  {/* 1. Today */}
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Today Tab"
                    style={[
                      styles.drawerNavItem,
                      activeTab === 'today' && styles.drawerNavItemActive,
                    ]}
                    onPress={() => {
                      setActiveTab('today');
                      setMenuOpen(false);
                    }}
                  >
                    <View
                      style={[
                        styles.drawerNavIconWrap,
                        activeTab === 'today' && styles.drawerNavIconWrapActive,
                      ]}
                    >
                      <AppIcon
                        name="home"
                        size={20}
                        color={activeTab === 'today' ? THEME.colors.primary : THEME.colors.text}
                        strokeWidth={activeTab === 'today' ? 2.3 : 1.8}
                      />
                    </View>
                    <View style={styles.drawerNavCopy}>
                      <Text
                        style={[
                          styles.drawerNavTitle,
                          activeTab === 'today' && styles.drawerNavTitleActive,
                        ]}
                      >
                        Today
                      </Text>
                      <Text style={styles.drawerNavSubtitle}>Overview & action items</Text>
                    </View>
                    {activeTab === 'today' && (
                      <View style={styles.drawerActiveIndicator} />
                    )}
                  </Pressable>

                  {/* 2. Inbox */}
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Inbox Tab"
                    style={[
                      styles.drawerNavItem,
                      activeTab === 'inbox' && styles.drawerNavItemActive,
                    ]}
                    onPress={() => {
                      setActiveTab('inbox');
                      setMenuOpen(false);
                    }}
                  >
                    <View
                      style={[
                        styles.drawerNavIconWrap,
                        activeTab === 'inbox' && styles.drawerNavIconWrapActive,
                      ]}
                    >
                      <AppIcon
                        name="message-circle"
                        size={20}
                        color={activeTab === 'inbox' ? THEME.colors.primary : THEME.colors.text}
                        strokeWidth={activeTab === 'inbox' ? 2.3 : 1.8}
                      />
                    </View>
                    <View style={styles.drawerNavCopy}>
                      <Text
                        style={[
                          styles.drawerNavTitle,
                          activeTab === 'inbox' && styles.drawerNavTitleActive,
                        ]}
                      >
                        Inbox
                      </Text>
                      <Text style={styles.drawerNavSubtitle}>Customer inquiries</Text>
                    </View>
                    <View style={styles.drawerBadge}>
                      <Text style={styles.drawerBadgeText}>{isLoggedIn ? unreadCount : 0}</Text>
                    </View>
                  </Pressable>

                  {/* 3. Catalog */}
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Catalog Tab"
                    style={[
                      styles.drawerNavItem,
                      activeTab === 'catalog' && styles.drawerNavItemActive,
                    ]}
                    onPress={() => {
                      setActiveTab('catalog');
                      setMenuOpen(false);
                    }}
                  >
                    <View
                      style={[
                        styles.drawerNavIconWrap,
                        activeTab === 'catalog' && styles.drawerNavIconWrapActive,
                      ]}
                    >
                      <AppIcon
                        name="folder"
                        size={20}
                        color={activeTab === 'catalog' ? THEME.colors.primary : THEME.colors.text}
                        strokeWidth={activeTab === 'catalog' ? 2.3 : 1.8}
                      />
                    </View>
                    <View style={styles.drawerNavCopy}>
                      <Text
                        style={[
                          styles.drawerNavTitle,
                          activeTab === 'catalog' && styles.drawerNavTitleActive,
                        ]}
                      >
                        Catalog
                      </Text>
                      <Text style={styles.drawerNavSubtitle}>Products & prices</Text>
                    </View>
                    <View style={styles.drawerBadgeSecondary}>
                      <Text style={styles.drawerBadgeTextSecondary}>{isLoggedIn ? 3 : 0}</Text>
                    </View>
                  </Pressable>

                  {/* 4. Settings */}
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Settings Tab"
                    style={[
                      styles.drawerNavItem,
                      activeTab === 'settings' && styles.drawerNavItemActive,
                    ]}
                    onPress={() => {
                      setActiveTab('settings');
                      setMenuOpen(false);
                    }}
                  >
                    <View
                      style={[
                        styles.drawerNavIconWrap,
                        activeTab === 'settings' && styles.drawerNavIconWrapActive,
                      ]}
                    >
                      <AppIcon
                        name="wrench"
                        size={20}
                        color={activeTab === 'settings' ? THEME.colors.primary : THEME.colors.text}
                        strokeWidth={activeTab === 'settings' ? 2.3 : 1.8}
                      />
                    </View>
                    <View style={styles.drawerNavCopy}>
                      <Text
                        style={[
                          styles.drawerNavTitle,
                          activeTab === 'settings' && styles.drawerNavTitleActive,
                        ]}
                      >
                        Settings
                      </Text>
                      <Text style={styles.drawerNavSubtitle}>Meta token & OAuth</Text>
                    </View>
                    {activeTab === 'settings' && (
                      <View style={styles.drawerActiveIndicator} />
                    )}
                  </Pressable>
                </View>
              </View>

              {/* Drawer Footer User Profile or Login */}
              {isLoggedIn ? (
                <View style={styles.drawerUserFooter}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="User profile and settings"
                    style={styles.drawerUserClickArea}
                    onPress={() => {
                      setActiveTab('settings');
                      setMenuOpen(false);
                    }}
                  >
                    <View style={styles.drawerUserAvatar}>
                      <Text style={styles.drawerUserAvatarText}>{userInitials}</Text>
                    </View>
                    <View style={styles.drawerUserCopy}>
                      <Text style={styles.drawerUserName}>{userName}</Text>
                      <Text style={styles.drawerUserRole}>Store Owner · Admin</Text>
                    </View>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Log out"
                    style={styles.drawerLogoutBtn}
                    onPress={handleLogout}
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                  >
                    <AppIcon name="log-out" size={18} color={THEME.palette.red} strokeWidth={2} />
                  </Pressable>
                </View>
              ) : (
                <View style={styles.drawerUserFooter}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Login using Facebook"
                    style={styles.drawerLoginBtn}
                    onPress={handleLogin}
                  >
                    <AppIcon name="log-in" size={18} color="#FFFFFF" strokeWidth={2.2} />
                    <Text style={styles.drawerLoginBtnText}>Login using Facebook</Text>
                  </Pressable>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* 5. Animated Success Toast */}
      {sentToast && (
        <View style={styles.toast}>
          <AppIcon name="check" size={18} color="#FFFFFF" strokeWidth={2.5} />
          <Text style={styles.toastText}>Reply sent to Maria A.</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
    backgroundColor: THEME.colors.bg,
  },
  headerSafeArea: {
    backgroundColor: THEME.colors.obsidian,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#22242B',
    backgroundColor: THEME.colors.obsidian,
  },
  bodySafeArea: {
    flex: 1,
    backgroundColor: THEME.colors.bg,
    position: 'relative',
  },
  menuIconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1E2026',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  profileBadge: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#1E2026',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileBadgeText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 110,
  },
  screenContainer: {
    width: '100%',
  },
  geminiZeroStateContainer: {
    alignItems: 'flex-start',
    marginTop: 8,
    marginBottom: 16,
  },
  geminiSparkleBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: THEME.colors.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  geminiHeroTitle: {
    color: THEME.colors.text,
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  geminiHeroSubtitle: {
    color: THEME.colors.textMuted,
    fontSize: 13,
    fontWeight: '500',
    marginTop: 4,
  },
  geminiChipsScroll: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 4,
    marginBottom: 20,
  },
  geminiChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: THEME.colors.card,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: THEME.colors.cardBorder,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  geminiChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: THEME.colors.text,
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
    backgroundColor: THEME.colors.pending,
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
    backgroundColor: THEME.colors.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: THEME.colors.primaryDark,
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
    backgroundColor: THEME.colors.bg,
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
    backgroundColor: THEME.colors.cardElevated,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: THEME.colors.cardBorder,
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
    color: THEME.colors.primaryDark,
    backgroundColor: THEME.colors.primaryTint,
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
    backgroundColor: THEME.colors.cardElevated,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: THEME.colors.cardBorder,
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
    backgroundColor: THEME.colors.obsidian,
    borderRadius: 999,
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
    borderWidth: 1,
    borderColor: THEME.colors.cardBorder,
  },
  buttonInnerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  emptyCheckBadge: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(0, 185, 92, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
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
    borderWidth: 1,
    borderColor: THEME.colors.cardBorder,
  },
  conversationAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: THEME.colors.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  conversationAvatarText: {
    color: THEME.colors.primaryDark,
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
    padding: 12,
    borderWidth: 1,
    borderColor: THEME.colors.cardBorder,
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  productImage: {
    width: '100%',
    height: 96,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: THEME.colors.cardElevated,
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
    backgroundColor: 'rgba(0, 185, 92, 0.12)',
  },
  stockLow: {
    backgroundColor: 'rgba(252, 65, 61, 0.12)',
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
    borderWidth: 1,
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
    backgroundColor: THEME.colors.primaryTint,
    borderRadius: 8,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  secureTagText: {
    color: THEME.colors.primaryDark,
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
  geminiInputDockContainer: {
    position: 'absolute',
    bottom: 12,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10,
    paddingHorizontal: 16,
  },
  geminiInputCapsule: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: THEME.colors.card,
    borderRadius: 28,
    height: 56,
    width: '100%',
    paddingLeft: 8,
    paddingRight: 6,
    borderWidth: 1,
    borderColor: THEME.colors.cardBorder,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 6,
  },
  geminiPlusButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: THEME.colors.cardElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  geminiInputArea: {
    flex: 1,
    marginHorizontal: 12,
    justifyContent: 'center',
  },
  geminiInputPlaceholder: {
    fontSize: 14,
    color: THEME.colors.textMuted,
    fontWeight: '500',
  },
  voiceStateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  voiceStateListeningText: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.text,
  },
  voiceStateThinkingText: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.text,
  },
  geminiMicButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: THEME.colors.obsidian,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  geminiMicButtonActive: {
    transform: [{ scale: 1.05 }],
  },
  capabilitiesDisclaimer: {
    fontSize: 10.5,
    color: THEME.colors.textMuted,
    textAlign: 'center',
    marginTop: 5,
    fontWeight: '500',
  },
  // Side Menu Drawer Styles (Responsive Mobile First)
  drawerModalOverlay: {
    flex: 1,
    flexDirection: 'row',
  },
  drawerBackdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(18, 19, 23, 0.55)',
    zIndex: 1,
  },
  drawerPanel: {
    width: 300,
    maxWidth: '82%',
    height: '100%',
    backgroundColor: THEME.colors.surface,
    paddingHorizontal: 16,
    borderRightWidth: 1,
    borderRightColor: THEME.colors.cardBorder,
    shadowColor: '#000000',
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 25,
    zIndex: 10,
  },
  drawerScrollContent: {
    flexGrow: 1,
    justifyContent: 'space-between',
    paddingBottom: 10,
  },
  drawerTopSection: {
    flex: 1,
  },
  drawerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.cardBorder,
  },
  drawerBrandRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  drawerCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: THEME.colors.cardElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  drawerStoreCard: {
    marginTop: 14,
    padding: 12,
    backgroundColor: THEME.colors.cardElevated,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: THEME.colors.cardBorder,
  },
  drawerStoreName: {
    fontSize: 13,
    fontWeight: '800',
    color: THEME.colors.text,
  },
  drawerStoreMeta: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    marginTop: 2,
    fontWeight: '500',
  },
  drawerNavSection: {
    marginTop: 18,
    gap: 6,
  },
  drawerSectionLabel: {
    fontSize: 10.5,
    fontWeight: '700',
    color: THEME.colors.textMuted,
    letterSpacing: 0.8,
    marginBottom: 4,
    paddingHorizontal: 4,
  },
  drawerNavItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: 'transparent',
    minHeight: 48,
  },
  drawerNavItemActive: {
    backgroundColor: THEME.colors.cardElevated,
  },
  drawerNavIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: THEME.colors.cardElevated,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  drawerNavIconWrapActive: {
    backgroundColor: THEME.colors.primaryTint,
  },
  drawerNavCopy: {
    flex: 1,
  },
  drawerNavTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: THEME.colors.text,
  },
  drawerNavTitleActive: {
    fontWeight: '800',
    color: THEME.colors.primary,
  },
  drawerNavSubtitle: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    marginTop: 1,
  },
  drawerActiveIndicator: {
    width: 4,
    height: 16,
    borderRadius: 2,
    backgroundColor: THEME.colors.primary,
  },
  drawerBadge: {
    backgroundColor: THEME.colors.primary,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
  },
  drawerBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  drawerBadgeSecondary: {
    backgroundColor: THEME.colors.cardBorder,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
  },
  drawerBadgeTextSecondary: {
    color: THEME.colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
  },
  drawerUserFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 14,
    marginTop: 14,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.cardBorder,
    gap: 10,
    minHeight: 52,
  },
  drawerUserClickArea: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  drawerLogoutBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(252, 65, 61, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(252, 65, 61, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  drawerLoginBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1877F2',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 8,
    shadowColor: '#1877F2',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  drawerLoginBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  emptyStateCard: {
    backgroundColor: THEME.colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: THEME.colors.cardBorder,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  emptyStateIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: THEME.colors.cardElevated,
    borderWidth: 1,
    borderColor: THEME.colors.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: THEME.colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyStateSubtitle: {
    fontSize: 13,
    color: THEME.colors.textMuted,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  fbLoginPrimaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1877F2',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 8,
    width: '100%',
    shadowColor: '#1877F2',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  fbLoginPrimaryBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  drawerUserAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: THEME.colors.cardElevated,
    borderWidth: 1,
    borderColor: THEME.colors.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  drawerUserAvatarText: {
    fontSize: 13,
    fontWeight: '800',
    color: THEME.colors.text,
  },
  drawerUserCopy: {
    flex: 1,
  },
  drawerUserName: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.text,
  },
  drawerUserRole: {
    fontSize: 11,
    color: THEME.colors.textMuted,
  },
  toast: {
    position: 'absolute',
    bottom: 80,
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
