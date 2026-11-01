import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
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
  Easing,
  Linking,
  Image,
  Modal,
  Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as SplashScreen from 'expo-splash-screen';
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

interface Product {
  id: string;
  name: string;
  price: string;
  stock: 'In stock' | 'Low stock' | 'Out of stock';
  isStock: boolean;
  imageKey: 'apple' | 'mango' | 'banana' | 'custom';
  imageUri?: string;
}

const INITIAL_PRODUCTS: Product[] = [
  {
    id: 'prod-1',
    name: 'Red apples',
    price: '$2.50 / kg',
    stock: 'In stock',
    isStock: true,
    imageKey: 'apple',
  },
  {
    id: 'prod-2',
    name: 'Carabao mango',
    price: '$4.00 / kg',
    stock: 'In stock',
    isStock: true,
    imageKey: 'mango',
  },
  {
    id: 'prod-3',
    name: 'Lakatan banana',
    price: '$1.80 / kg',
    stock: 'Low stock',
    isStock: false,
    imageKey: 'banana',
  },
];

interface ChatMessage {
  id: string;
  sender: 'user' | 'mume';
  text: string;
  time: string;
}

function getMumeAiReply(query: string): string {
  const q = query.toLowerCase().trim();
  if (q.includes('apple') || q.includes('mansanas')) {
    return 'Red apples are currently $2.50 / kg (In stock). Maria A. asked about them earlier today on Messenger.';
  }
  if (q.includes('mango') || q.includes('manga')) {
    return 'Carabao mangoes are $4.00 / kg (In stock). Jun L. inquired about their availability.';
  }
  if (q.includes('banana') || q.includes('saging')) {
    return 'Lakatan bananas are $1.80 / kg (Low stock - only a few bunches left).';
  }
  if (q.includes('maria') || q.includes('approval') || q.includes('draft') || q.includes('approve')) {
    return 'Maria A. is waiting for a reply on red apples ($2.50 / kg). The suggested draft is ready in your Home tab for approval!';
  }
  if (q.includes('message') || q.includes('inbox') || q.includes('inquir') || q.includes('customer')) {
    return 'You have 2 customer inquiries on Messenger: Maria A. (price inquiry) and Jun L. (stock inquiry). Both are encrypted and synced with Facebook.';
  }
  if (q.includes('price') || q.includes('catalog') || q.includes('inventory') || q.includes('stock')) {
    return 'Your catalog has 3 items: Red apples ($2.50/kg - In stock), Carabao mango ($4.00/kg - In stock), and Lakatan banana ($1.80/kg - Low stock).';
  }
  if (q.includes('magkano') || q.includes('kumusta') || q.includes('meron') || q.includes('salamat') || q.includes('po')) {
    return 'Hello! Your Facebook Page is synced. Suggested reply ready for Maria A. on red apples ($2.50 / kg). Let me know if you want to change anything!';
  }
  if (q.includes('hi') || q.includes('hello') || q.includes('hey') || q.includes('mume')) {
    return "Hello Jefferson! I'm Mume, your Page AI assistant. Ask me about your customer messages, fruit inventory, or tell me what to draft!";
  }
  return "Got it! I checked your store and Page inquiries. Maria A.'s inquiry for $2.50/kg apples is waiting for approval, and your 3 catalog items are synced. How else can I assist?";
}

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
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-1',
      sender: 'mume',
      text: "Hi Jefferson! I'm Mume, your store assistant. You can write any message to me here or tap mic to talk.",
      time: 'Just now',
    },
  ]);
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef<any>(null);
  const chatScrollRef = useRef<any>(null);
  const mainScrollRef = useRef<any>(null);
  const chatCardY = useRef<number>(0);
  const actionCardY = useRef<number>(0);

  // Blue highlight triggers only when user is actively typing or dictating via voice
  const isChattingOrTyping = isTyping || voiceState === 'listening';

  const scrollToActionCard = useCallback((animated = true) => {
    if (mainScrollRef.current) {
      mainScrollRef.current.scrollTo({
        y: Math.max(0, actionCardY.current - 12),
        animated,
      });
    }
  }, []);

  const scrollToConversation = useCallback((animated = true) => {
    if (mainScrollRef.current && chatCardY.current > 0) {
      mainScrollRef.current.scrollTo({
        y: Math.max(0, chatCardY.current - 16),
        animated,
      });
    }
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollToEnd({ animated });
    }
  }, []);

  const handleTyping = (text: string) => {
    setChatInput(text);
    if (activeTab !== 'today') {
      setActiveTab('today');
    }
    if (text.length > 0) {
      setIsTyping(true);
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      // Blue highlight vanishes after user pauses/stops typing
      typingTimeoutRef.current = setTimeout(() => {
        setIsTyping(false);
      }, 1000);

      // Keep conversation in view and following while typing
      scrollToConversation(true);
    } else {
      setIsTyping(false);
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    }
  };

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      chatScrollRef.current?.scrollToEnd({ animated: true });
    }, 100);
    return () => clearTimeout(timer);
  }, [chatMessages, isAiThinking]);

  // Pending action state from Figma Make prototype
  const [isEditingDraft, setIsEditingDraft] = useState(false);
  const [draftReply, setDraftReply] = useState('Hi! Our red apples are $2.50 / kg. Fresh delivery today.');
  const [isApproved, setIsApproved] = useState(false);
  const [showApprovedCard, setShowApprovedCard] = useState(false);

  // Pro Subscription Upgrade modal state
  const [subscriptionModalOpen, setSubscriptionModalOpen] = useState(false);
  const [isProUser, setIsProUser] = useState(false);
  const [proToast, setProToast] = useState(false);
  const proAutoCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const closeSubscriptionModal = useCallback(() => {
    if (proAutoCloseTimerRef.current) {
      clearTimeout(proAutoCloseTimerRef.current);
      proAutoCloseTimerRef.current = null;
    }
    setSubscriptionModalOpen(false);
  }, []);

  // Manual page link state (Settings tab)
  const [fbPageId, setFbPageId] = useState('1447275391796820');
  const [pageName, setPageName] = useState('Mume Fresh - Fruit Store');
  const [pageAccessToken, setPageAccessToken] = useState('');
  const [submittingLink, setSubmittingLink] = useState(false);
  const [linkMessage, setLinkMessage] = useState('');

  // Opening splash screen animation (3s) using mume-black.svg and mume-white.svg
  const [showSplash, setShowSplash] = useState(true);
  const splashAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Dismiss native splash screen so the animated SVG logo transition takes over cleanly
    SplashScreen.hideAsync().catch(() => {});

    Animated.timing(splashAnim, {
      toValue: 1,
      duration: 3000,
      useNativeDriver: false,
      easing: Easing.bezier(0.4, 0, 0.2, 1),
    }).start(() => {
      setShowSplash(false);
      // Auto-show Pro upgrade modal on the home screen for 3 seconds right after splash
      setSubscriptionModalOpen(true);
      proAutoCloseTimerRef.current = setTimeout(() => {
        setSubscriptionModalOpen(false);
        proAutoCloseTimerRef.current = null;
      }, 3000);
    });

    return () => {
      if (proAutoCloseTimerRef.current) {
        clearTimeout(proAutoCloseTimerRef.current);
      }
    };
  }, [splashAnim]);

  const splashBg = splashAnim.interpolate({
    inputRange: [0, 0.38, 0.58, 1],
    outputRange: ['#FFFFFF', '#FFFFFF', '#121317', '#121317'],
  });

  const splashBlackOpacity = splashAnim.interpolate({
    inputRange: [0, 0.18, 0.4, 0.56, 1],
    outputRange: [0, 1, 1, 0, 0],
  });

  const splashWhiteOpacity = splashAnim.interpolate({
    inputRange: [0, 0.4, 0.56, 0.78, 1],
    outputRange: [0, 0, 1, 1, 0.95],
  });

  const splashScale = splashAnim.interpolate({
    inputRange: [0, 0.35, 0.7, 1],
    outputRange: [0.9, 1, 1.04, 1.08],
  });

  const splashContainerOpacity = splashAnim.interpolate({
    inputRange: [0, 0.74, 1],
    outputRange: [1, 1, 0],
  });

  // Products / Catalog state
  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [productForm, setProductForm] = useState<{
    name: string;
    price: string;
    stock: 'In stock' | 'Low stock' | 'Out of stock';
    imageKey: 'apple' | 'mango' | 'banana' | 'custom';
    imageUri?: string;
  }>({
    name: '',
    price: '',
    stock: 'In stock',
    imageKey: 'apple',
    imageUri: undefined,
  });

  const handlePickCustomImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const uri = result.assets[0].uri;
        setProductForm((prev) => ({
          ...prev,
          imageUri: uri,
          imageKey: 'custom',
        }));
        return;
      }
    } catch (err) {
      console.warn('ImagePicker launch failed, falling back to web file input:', err);
      if (typeof document !== 'undefined') {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.style.position = 'fixed';
        input.style.top = '-1000px';
        input.style.left = '-1000px';
        input.style.opacity = '0';
        document.body.appendChild(input);

        input.onchange = (e: any) => {
          const file = e.target?.files?.[0];
          if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
              const res = event.target?.result as string;
              if (res) {
                setProductForm((prev) => ({
                  ...prev,
                  imageUri: res,
                  imageKey: 'custom',
                }));
              }
            };
            reader.readAsDataURL(file);
          }
          try {
            document.body.removeChild(input);
          } catch {}
        };

        input.click();
      }
    }
  };

  const handleOpenEditProduct = (prod: Product) => {
    setSelectedProduct(prod);
    setProductForm({
      name: prod.name,
      price: prod.price,
      stock: prod.stock,
      imageKey: prod.imageKey || 'apple',
      imageUri: prod.imageUri,
    });
  };

  const handleSaveProductEdit = () => {
    if (!selectedProduct) return;
    const trimmedName = productForm.name.trim();
    if (!trimmedName) return;

    setProducts((prev) =>
      prev.map((item) =>
        item.id === selectedProduct.id
          ? {
              ...item,
              name: trimmedName,
              price: productForm.price.trim() || '$0 / kg',
              stock: productForm.stock,
              isStock: productForm.stock === 'In stock',
              imageKey: productForm.imageKey,
              imageUri: productForm.imageKey === 'custom' ? productForm.imageUri : undefined,
            }
          : item
      )
    );
    setSelectedProduct(null);
  };

  const handleDeleteProduct = () => {
    if (!selectedProduct) return;
    setProducts((prev) => prev.filter((item) => item.id !== selectedProduct.id));
    setSelectedProduct(null);
  };

  const handleOpenCreateProduct = () => {
    setProductForm({
      name: '',
      price: '$',
      stock: 'In stock',
      imageKey: 'apple',
      imageUri: undefined,
    });
    setIsCreateModalOpen(true);
  };

  const handleSaveCreateProduct = () => {
    const trimmedName = productForm.name.trim();
    if (!trimmedName) return;

    const newProd: Product = {
      id: `prod-${Date.now()}`,
      name: trimmedName,
      price: productForm.price.trim() || '$0 / kg',
      stock: productForm.stock,
      isStock: productForm.stock === 'In stock',
      imageKey: productForm.imageKey,
      imageUri: productForm.imageKey === 'custom' ? productForm.imageUri : undefined,
    };
    setProducts((prev) => [...prev, newProd]);
    setIsCreateModalOpen(false);
  };

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

  const handleSendMessage = () => {
    const trimmed = chatInput.trim();
    if (!trimmed || isAiThinking) return;

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    setIsTyping(false);

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: trimmed,
      time: 'Just now',
    };

    setChatMessages((prev) => [...prev, userMsg]);
    setChatInput('');
    setIsAiThinking(true);

    if (activeTab !== 'today') {
      setActiveTab('today');
    }
    setTimeout(() => scrollToConversation(true), 50);

    setTimeout(() => {
      const replyText = getMumeAiReply(trimmed);
      const aiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        sender: 'mume',
        text: replyText,
        time: 'Just now',
      };
      setChatMessages((prev) => [...prev, aiMsg]);
      setIsAiThinking(false);
      setTimeout(() => scrollToConversation(true), 50);
    }, 700);
  };

  const handleApprove = () => {
    setIsEditingDraft(false);
    setIsApproved(true);
    setShowApprovedCard(true);
    setSentToast(true);
    setTimeout(() => {
      setShowApprovedCard(false);
    }, 2000);
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
      setShowApprovedCard(false);
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
    setShowApprovedCard(false);
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
      {/* Opening Splash Animation (1.5s) using mume-black and mume-white */}
      {showSplash && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.splashOverlay,
            {
              backgroundColor: splashBg,
              opacity: splashContainerOpacity,
            },
          ]}
        >
          <Animated.View
            style={[
              styles.splashLogoContainer,
              { transform: [{ scale: splashScale }] },
            ]}
          >
            <Animated.View style={[styles.splashLogoAbsolute, { opacity: splashBlackOpacity }]}>
              <MumeLogo width={140} height={46} color="#000000" />
            </Animated.View>
            <Animated.View style={[styles.splashLogoAbsolute, { opacity: splashWhiteOpacity }]}>
              <MumeLogo width={140} height={46} color="#FFFFFF" />
            </Animated.View>
          </Animated.View>
        </Animated.View>
      )}

      {/* 1. Black Top App Bar */}
      <SafeAreaView edges={['top']} style={styles.headerSafeArea}>
        <View style={styles.headerRow} accessibilityRole="header">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Main menu"
            onPress={() => setMenuOpen(true)}
            style={styles.menuIconButton}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <AppIcon name="menu" size={20} color="#FFFFFF" />
          </Pressable>

          <View style={styles.headerLogoContainer}>
            <MumeLogo width={80} height={30} color="#FFFFFF" />
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Subscription upgrade"
            onPress={() => {
              if (proAutoCloseTimerRef.current) {
                clearTimeout(proAutoCloseTimerRef.current);
                proAutoCloseTimerRef.current = null;
              }
              setSubscriptionModalOpen(true);
            }}
            style={[styles.profileBadge, isProUser && styles.profileBadgePro]}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <AppIcon name="subscription-upgrade" size={20} color={isProUser ? '#FACC15' : '#FFFFFF'} strokeWidth={2} />
          </Pressable>
        </View>
      </SafeAreaView>

      {/* 2. Main Body Content */}
      <SafeAreaView edges={['left', 'right', 'bottom']} style={styles.bodySafeArea}>
        <ScrollView
          ref={mainScrollRef}
          contentContainerStyle={[
            styles.scrollContent,
            isApproved && !showApprovedCard && styles.scrollContentExpanded,
            activeTab === 'catalog' && styles.scrollContentCatalog,
            isEditingDraft && styles.scrollContentEditingDraft,
          ]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={THEME.colors.primary} />}
        >
        {activeTab === 'today' && (
          <View style={[styles.screenContainer, isApproved && !showApprovedCard && styles.screenContainerExpanded]}>
            {/* Zero-State Hero Section with Message Chip on the Right Side */}
            <View style={styles.geminiZeroStateContainer}>
              <View style={styles.geminiHeroCopy}>
                <Text style={styles.geminiHeroTitle}>
                  {isLoggedIn ? `Hello, ${userName.trim().split(/\s+/)[0] || userName}` : 'Welcome to Mume'}
                </Text>
                <Text style={styles.geminiHeroSubtitle}>
                  {isLoggedIn
                    ? 'Welcome to Mume!'
                    : 'Connect your Facebook Page to start managing inquiries.'}
                </Text>
              </View>

              {isLoggedIn ? (
                <Pressable
                  style={styles.geminiChip}
                  onPress={() => setActiveTab('inbox')}
                >
                  <AppIcon name="message-circle" size={14} color={THEME.colors.primary} />
                  <Text style={styles.geminiChipText}>{`Message (${unreadCount})`}</Text>
                </Pressable>
              ) : (
                <Pressable
                  style={styles.geminiChip}
                  onPress={handleLogin}
                >
                  <AppIcon name="baseline-facebook" size={14} color="#1877F2" />
                  <Text style={styles.geminiChipText}>Login using Facebook</Text>
                </Pressable>
              )}
            </View>

              {isLoggedIn ? (
                <>
                  {/* Section Heading & Action / Feedback Card */}
                  {!isApproved ? (
                    <>
                      <View style={styles.sectionHeaderRow}>
                        <Text style={styles.sectionHeading}>Ready for you</Text>
                        <View style={[styles.sectionBadgePill, styles.sectionBadgePending]}>
                          <View style={styles.statusDotAmber} />
                          <Text style={[styles.sectionBadgeText, styles.sectionBadgeTextPending]}>
                            1 action to approve
                          </Text>
                        </View>
                      </View>

                      {/* Pending Action Card */}
                      <View
                        onLayout={(e) => {
                          actionCardY.current = e.nativeEvent.layout.y;
                        }}
                        style={[styles.approvalCard, isEditingDraft && styles.approvalCardEditing]}
                      >
                        <View style={styles.customerRow}>
                          <View style={styles.avatar}>
                            <Text style={styles.avatarText}>MA</Text>
                          </View>
                          <View style={styles.customerInfoCol}>
                            <Text style={styles.customerName}>Maria A.</Text>
                            <Text style={styles.customerContext}>Messenger · Price inquiry</Text>
                          </View>
                          <Text style={styles.timeLabel}>now</Text>
                        </View>

                        <View style={styles.messageBubble}>
                          <Text style={styles.messageBubbleText}>“Hi, how much are the red apples?”</Text>
                        </View>

                        {/* Draft Block: Full text editable */}
                        <View style={[styles.draftBlock, isEditingDraft && styles.draftBlockEditing]}>
                          <View style={styles.draftLabelRow}>
                            <View style={styles.draftLabelLeft}>
                              <AppIcon name="bot" size={16} color={THEME.colors.primary} />
                              <Text style={styles.draftLabelText}>Mume’s suggested reply</Text>
                            </View>
                          </View>

                          {isEditingDraft ? (
                            <View style={styles.draftEditorWrapper}>
                              <Text style={styles.draftEditorHint}>Edit message to send to customer:</Text>
                              <TextInput
                                autoFocus
                                multiline
                                numberOfLines={3}
                                style={styles.draftTextInput}
                                value={draftReply}
                                onChangeText={setDraftReply}
                                placeholder="Type message to customer…"
                                placeholderTextColor={THEME.colors.textMuted}
                                onFocus={() => {
                                  scrollToActionCard(true);
                                }}
                              />
                            </View>
                          ) : (
                            <Pressable
                              style={styles.draftTextContainer}
                              onPress={() => {
                                setIsEditingDraft(true);
                                setTimeout(() => scrollToActionCard(true), 60);
                              }}
                              accessibilityRole="button"
                              accessibilityLabel="Tap to edit full message text"
                            >
                              <Text style={styles.draftText}>{draftReply}</Text>
                              <Text style={styles.tapToEditHint}>Tap to edit full message</Text>
                            </Pressable>
                          )}
                        </View>

                        <View style={styles.approvalActions}>
                          <Pressable
                            accessibilityRole="button"
                            style={[styles.secondaryButton, isEditingDraft && styles.secondaryButtonActive]}
                            onPress={() => {
                              setIsEditingDraft((v) => {
                                const next = !v;
                                if (next) {
                                  setTimeout(() => scrollToActionCard(true), 60);
                                }
                                return next;
                              });
                            }}
                          >
                            <View style={styles.buttonInnerRow}>
                              <AppIcon name={isEditingDraft ? 'check' : 'edit'} size={15} color={THEME.colors.text} />
                              <Text style={styles.secondaryButtonText}>
                                {isEditingDraft ? 'Done editing' : 'Edit message'}
                              </Text>
                            </View>
                          </Pressable>

                          <Pressable
                            accessibilityRole="button"
                            style={styles.primaryButton}
                            onPress={() => {
                              setIsEditingDraft(false);
                              handleApprove();
                            }}
                          >
                            <View style={styles.buttonInnerRow}>
                              <Text style={styles.primaryButtonText}>Approve & send</Text>
                              <AppIcon name="check" size={16} color="#FFFFFF" strokeWidth={2.5} />
                            </View>
                          </Pressable>
                        </View>
                      </View>
                    </>
                  ) : showApprovedCard ? (
                    <>
                      <View style={styles.sectionHeaderRow}>
                        <Text style={styles.sectionHeading}>Ready for you</Text>
                        <View style={[styles.sectionBadgePill, styles.sectionBadgeApproved]}>
                          <Text style={[styles.sectionBadgeText, styles.sectionBadgeTextApproved]}>
                            0 actions
                          </Text>
                        </View>
                      </View>

                      <View style={styles.emptyCard}>
                        <View style={styles.emptyCheckBadge}>
                          <AppIcon name="check" size={28} color={THEME.colors.speaking} strokeWidth={2.5} />
                        </View>
                        <Text style={styles.emptyCardTitle}>All Caught Up!</Text>
                        <Text style={styles.emptyCardSubtitle}>
                          Reply confirmed and dispatched to Maria via Meta Graph API.
                        </Text>
                      </View>
                    </>
                  ) : null}

                  {/* Mume AI Chat Stream (Positioned below Pending Action Card) */}
                  {chatMessages.length > 0 && (
                    <View
                      onLayout={(e) => {
                        chatCardY.current = e.nativeEvent.layout.y;
                      }}
                      style={[
                        styles.chatSectionCard,
                        isApproved && !showApprovedCard && styles.chatSectionCardExpanded,
                        isChattingOrTyping && styles.chatSectionCardHighlighted,
                      ]}
                    >
                      <View style={styles.chatSectionHeader}>
                        <View style={styles.chatHeaderLeft}>
                          <View style={[styles.chatHeaderBadge, isChattingOrTyping && styles.chatHeaderBadgeActive]}>
                            <AppIcon name="bot" size={16} color="#FFFFFF" />
                          </View>
                          <Text style={styles.chatHeaderTitle}>Mume AI Chat</Text>
                        </View>
                        {isChattingOrTyping ? (
                          <View style={styles.activeHighlightBadge}>
                            <View style={styles.activeHighlightDot} />
                            <Text style={styles.activeHighlightText}>
                              {voiceState === 'listening' ? 'Listening' : 'Typing…'}
                            </Text>
                          </View>
                        ) : (
                          <Text style={styles.chatHeaderSubtitle}>Talk to AI</Text>
                        )}
                      </View>

                      <ScrollView
                        ref={chatScrollRef}
                        style={[
                          styles.chatScrollView,
                          Platform.OS === 'web'
                            ? ({
                                scrollbarWidth: 'thin',
                                scrollbarColor: '#9CA3AF #F3F4F6',
                              } as any)
                            : null,
                        ]}
                        contentContainerStyle={styles.chatMessagesList}
                        nestedScrollEnabled={true}
                        showsVerticalScrollIndicator={true}
                        persistentScrollbar={true}
                        indicatorStyle="black"
                      >
                        {chatMessages.map((msg) => (
                          <View
                            key={msg.id}
                            style={[
                              styles.chatBubbleRow,
                              msg.sender === 'user' ? styles.chatBubbleRowUser : styles.chatBubbleRowAi,
                            ]}
                          >
                            {msg.sender === 'mume' && (
                              <View style={styles.chatAvatarAi}>
                                <AppIcon name="bot" size={15} color="#FFFFFF" />
                              </View>
                            )}
                            <View
                              style={[
                                styles.chatBubble,
                                msg.sender === 'user' ? styles.chatBubbleUser : styles.chatBubbleAi,
                              ]}
                            >
                              <Text
                                style={[
                                  styles.chatBubbleText,
                                  msg.sender === 'user'
                                    ? styles.chatBubbleTextUser
                                    : styles.chatBubbleTextAi,
                                ]}
                              >
                                {msg.text}
                              </Text>
                              <Text
                                style={[
                                  styles.chatBubbleTime,
                                  msg.sender === 'user'
                                    ? styles.chatBubbleTimeUser
                                    : styles.chatBubbleTimeAi,
                                ]}
                              >
                                {msg.time}
                              </Text>
                            </View>
                          </View>
                        ))}

                        {isAiThinking && (
                          <View style={[styles.chatBubbleRow, styles.chatBubbleRowAi]}>
                            <View style={styles.chatAvatarAi}>
                              <AppIcon name="bot" size={15} color="#FFFFFF" />
                            </View>
                            <View style={[styles.chatBubble, styles.chatBubbleAi, styles.chatThinkingBubble]}>
                              <ActivityIndicator size="small" color={THEME.colors.primary} />
                              <Text style={styles.chatThinkingText}>Mume is thinking…</Text>
                            </View>
                          </View>
                        )}
                      </ScrollView>
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
                    <AppIcon name="baseline-facebook" size={18} color="#FFFFFF" />
                    <Text style={styles.fbLoginPrimaryBtnText}>Login using Facebook</Text>
                  </Pressable>
                </View>
              )}
            </View>
          )}

          {activeTab === 'inbox' && (
            <View style={styles.screenContainer}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionHeading}>Message</Text>
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
                    <AppIcon name="baseline-facebook" size={18} color="#FFFFFF" />
                    <Text style={styles.fbLoginPrimaryBtnText}>Login using Facebook</Text>
                  </Pressable>
                </View>
              )}
            </View>
          )}

          {activeTab === 'catalog' && (
            <View style={styles.screenContainer}>
              <View style={styles.catalogHeaderRow}>
                <View>
                  <Text style={styles.sectionHeading}>Catalog</Text>
                  <Text style={styles.sectionBadgeText}>{isLoggedIn ? `${products.length} products` : '0 products'}</Text>
                </View>
              </View>

              {isLoggedIn ? (
                products.length === 0 ? (
                  <View style={styles.emptyCatalogCard}>
                    <Text style={styles.emptyCatalogTitle}>No products in catalog</Text>
                    <Text style={styles.emptyCatalogSubtitle}>
                      Tap the "+" button below to create your first fruit item.
                    </Text>
                  </View>
                ) : (
                  <View style={styles.catalogGrid}>
                    {products.map((item) => (
                      <Pressable
                        key={item.id}
                        accessibilityRole="button"
                        accessibilityLabel={`Edit ${item.name}`}
                        style={styles.productCard}
                        onPress={() => handleOpenEditProduct(item)}
                      >
                        <View style={styles.productImageContainer}>
                          <Image
                            source={
                              item.imageUri
                                ? { uri: item.imageUri }
                                : FRUIT_IMAGES[item.imageKey as 'apple' | 'mango' | 'banana'] || FRUIT_IMAGES.apple
                            }
                            style={styles.productImage as any}
                            resizeMode="cover"
                          />
                          <View
                            style={[
                              styles.stockPill,
                              item.stock === 'In stock'
                                ? styles.stockIn
                                : item.stock === 'Low stock'
                                ? styles.stockLow
                                : styles.stockOut,
                            ]}
                          >
                            <Text
                              style={[
                                styles.stockPillText,
                                item.stock === 'In stock'
                                  ? styles.stockInText
                                  : item.stock === 'Low stock'
                                  ? styles.stockLowText
                                  : styles.stockOutText,
                              ]}
                            >
                              {item.stock}
                            </Text>
                          </View>
                        </View>
                        <Text style={styles.productName}>{item.name}</Text>
                        <Text style={styles.productPrice}>{item.price}</Text>
                      </Pressable>
                    ))}
                  </View>
                )
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
                    <AppIcon name="baseline-facebook" size={18} color="#FFFFFF" />
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
                      <AppIcon name="baseline-facebook" size={18} color="#FFFFFF" />
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
                  style={[styles.primaryButton, styles.linkDirectButton]}
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

        {/* 3. Gemini-Style Floating Bottom Input Capsule Dock (Size x 2 with Multi-Line Text Input) */}
        {activeTab !== 'catalog' && activeTab !== 'settings' && !isEditingDraft && (
          <View
            style={styles.geminiInputDockContainer}
            pointerEvents="box-none"
          >
            <View style={styles.geminiInputCapsule}>
            {/* Top Row: Merchant can write a message to talk to AI */}
            <View style={styles.capsuleTextInputWrapper}>
              <TextInput
                style={styles.capsuleTextInput}
                placeholder="Ask Mume or write a message…"
                placeholderTextColor={THEME.colors.textMuted}
                value={chatInput}
                onChangeText={handleTyping}
                onFocus={() => {
                  setIsInputFocused(true);
                  if (activeTab !== 'today') setActiveTab('today');
                  scrollToConversation(true);
                }}
                onBlur={() => {
                  setIsInputFocused(false);
                  if (typingTimeoutRef.current) {
                    clearTimeout(typingTimeoutRef.current);
                  }
                  setIsTyping(false);
                }}
                multiline
                maxLength={400}
                returnKeyType="send"
                onSubmitEditing={handleSendMessage}
                blurOnSubmit={false}
              />
            </View>

            {/* Bottom Row: Actions & Dictate controls */}
            <View style={styles.capsuleControlsRow}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Quick tools & catalog"
                onPress={() => setActiveTab('catalog')}
                style={styles.geminiPlusButton}
              >
                <AppIcon name="plus" size={18} color={THEME.colors.text} strokeWidth={2.2} />
              </Pressable>

              {/* Voice state indicator / subtle status */}
              <View style={styles.capsuleStatusArea}>
                {voiceState === 'listening' && (
                  <View style={styles.voiceStateRow}>
                    <VoiceWave />
                    <Text style={styles.voiceStateListeningText}>Listening…</Text>
                  </View>
                )}
                {voiceState === 'thinking' && (
                  <View style={styles.voiceStateRow}>
                    <AppIcon name="bot" size={15} color={THEME.colors.primary} />
                    <Text style={styles.voiceStateThinkingText}>Checking your page…</Text>
                  </View>
                )}
                {voiceState === 'idle' && !chatInput && (
                  <Text style={styles.capsuleHintText}>Tap mic or write to AI</Text>
                )}
              </View>

              <View style={styles.capsuleActionsRight}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Dictate and talk to Mume"
                  onPress={handleVoice}
                  style={[
                    styles.geminiMicSmallButton,
                    voiceState === 'listening' && styles.geminiMicSmallButtonActive,
                  ]}
                >
                  <AppIcon
                    name={voiceState === 'thinking' ? 'bot' : voiceState === 'listening' ? 'mic-audio-lines' : 'mic'}
                    size={18}
                    color={voiceState === 'listening' ? '#FFFFFF' : THEME.colors.text}
                    strokeWidth={2}
                  />
                </Pressable>

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Send message to AI"
                  onPress={handleSendMessage}
                  disabled={!chatInput.trim() || isAiThinking}
                  style={[
                    styles.geminiSendButton,
                    chatInput.trim().length > 0 && styles.geminiSendButtonActive,
                  ]}
                >
                  <AppIcon
                    name="send"
                    size={15}
                    color={chatInput.trim().length > 0 ? '#FFFFFF' : THEME.colors.textMuted}
                    strokeWidth={2.2}
                  />
                </Pressable>
              </View>
            </View>
          </View>

          <Text style={styles.capabilitiesDisclaimer}>
            Nothing is sent to customers without your approval.
          </Text>
        </View>
        )}

        {/* Floating Add Product Button at Bottom for Catalog */}
        {activeTab === 'catalog' && isLoggedIn && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Add"
            style={styles.addProductFab}
            onPress={handleOpenCreateProduct}
          >
            <AppIcon name="round-plus" size={24} color="#FFFFFF" />
          </Pressable>
        )}
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

                  {/* 1. Home */}
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Home Tab"
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
                        Home
                      </Text>
                      <Text style={styles.drawerNavSubtitle}>Overview & action items</Text>
                    </View>
                    {activeTab === 'today' && (
                      <View style={styles.drawerActiveIndicator} />
                    )}
                  </Pressable>

                  {/* 2. Message */}
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Message Tab"
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
                        Message
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
                      <Text style={styles.drawerBadgeTextSecondary}>{isLoggedIn ? products.length : 0}</Text>
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
                    onPress={() => setLogoutConfirmOpen(true)}
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                  >
                    <AppIcon name="log-out" size={18} color="#676A72" strokeWidth={2} />
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
                    <AppIcon name="baseline-facebook" size={18} color="#FFFFFF" />
                    <Text style={styles.drawerLoginBtnText}>Login using Facebook</Text>
                  </Pressable>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* 5. Logout Confirmation Dialog Modal */}
      <Modal
        visible={logoutConfirmOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setLogoutConfirmOpen(false)}
      >
        <Pressable
          style={styles.confirmModalOverlay}
          onPress={() => setLogoutConfirmOpen(false)}
        >
          <Pressable style={styles.confirmModalCard} onPress={(e) => e.stopPropagation()}>
            <View style={styles.confirmModalIconCircle}>
              <AppIcon name="log-out" size={24} color="#676A72" strokeWidth={2} />
            </View>
            <Text style={styles.confirmModalTitle}>Log Out of Mume?</Text>
            <Text style={styles.confirmModalSubtitle}>
              Are you sure you want to log out? You will need to reconnect to manage your store inquiries.
            </Text>
            <View style={styles.confirmModalActionsRow}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Cancel"
                style={styles.confirmModalCancelBtn}
                onPress={() => setLogoutConfirmOpen(false)}
              >
                <Text style={styles.confirmModalCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Confirm Log Out"
                style={styles.confirmModalLogoutBtn}
                onPress={() => {
                  setLogoutConfirmOpen(false);
                  handleLogout();
                }}
              >
                <Text style={styles.confirmModalLogoutText}>Log Out</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* 6. Edit Product Modal */}
      <Modal
        visible={!!selectedProduct}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedProduct(null)}
      >
        <Pressable
          style={styles.productModalOverlay}
          onPress={() => setSelectedProduct(null)}
        >
          <Pressable style={styles.productModalCard} onPress={(e) => e.stopPropagation()}>
            <View style={styles.productModalHeader}>
              <View>
                <Text style={styles.productModalTitle}>Edit Product</Text>
                <Text style={styles.productModalSubtitle}>Update fruit details or delete item</Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close"
                style={styles.productModalCloseBtn}
                onPress={() => setSelectedProduct(null)}
              >
                <AppIcon name="x" size={20} color={THEME.colors.textMuted} strokeWidth={2} />
              </Pressable>
            </View>

            <ScrollView style={styles.productModalScroll} showsVerticalScrollIndicator={false}>
              {/* Product Photo */}
              <Text style={styles.productFieldLabel}>Product Photo</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Upload Custom Photo"
                style={[
                  styles.uploadPhotoBtn,
                  (productForm.imageUri || productForm.imageKey) && styles.uploadPhotoBtnActive,
                ]}
                onPress={handlePickCustomImage}
              >
                {productForm.imageUri || (productForm.imageKey && FRUIT_IMAGES[productForm.imageKey as 'apple' | 'mango' | 'banana']) ? (
                  <View style={styles.uploadPhotoPreviewRow}>
                    <Image
                      source={
                        productForm.imageUri
                          ? { uri: productForm.imageUri }
                          : FRUIT_IMAGES[productForm.imageKey as 'apple' | 'mango' | 'banana']
                      }
                      style={styles.uploadPhotoPreviewThumb as any}
                      resizeMode="cover"
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.uploadPhotoSuccessTitle}>
                        {productForm.imageUri ? 'Custom Photo Added' : 'Product Photo'}
                      </Text>
                      <Text style={styles.uploadPhotoSuccessSub}>Tap to change photo</Text>
                    </View>
                    <View style={styles.uploadPhotoChangeBadge}>
                      <AppIcon name="camera" size={13} color="#FFFFFF" strokeWidth={2} />
                      <Text style={styles.uploadPhotoChangeBadgeText}>Change</Text>
                    </View>
                  </View>
                ) : (
                  <View style={styles.uploadPhotoPlaceholderRow}>
                    <View style={styles.uploadPhotoIconCircle}>
                      <AppIcon name="camera" size={18} color="#121317" strokeWidth={2} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.uploadPhotoTitle}>Upload from Device / Camera</Text>
                      <Text style={styles.uploadPhotoSub}>Select any image or take a photo</Text>
                    </View>
                  </View>
                )}
              </Pressable>

              {/* Name Input */}
              <Text style={styles.productFieldLabel}>Product Name</Text>
              <TextInput
                style={styles.productInput}
                value={productForm.name}
                onChangeText={(text) => setProductForm((prev) => ({ ...prev, name: text }))}
                placeholder="e.g. Red apples"
                placeholderTextColor={THEME.colors.textMuted}
              />

              {/* Price Input */}
              <Text style={styles.productFieldLabel}>Price</Text>
              <TextInput
                style={styles.productInput}
                value={productForm.price}
                onChangeText={(text) => setProductForm((prev) => ({ ...prev, price: text }))}
                placeholder="e.g. $2.50 / kg"
                placeholderTextColor={THEME.colors.textMuted}
              />

              {/* Stock Status Picker */}
              <Text style={styles.productFieldLabel}>Stock Status</Text>
              <View style={styles.stockStatusRow}>
                {(['In stock', 'Low stock', 'Out of stock'] as const).map((st) => (
                  <Pressable
                    key={st}
                    accessibilityRole="button"
                    style={[
                      styles.stockStatusBtn,
                      productForm.stock === st && styles.stockStatusBtnActive,
                    ]}
                    onPress={() => setProductForm((prev) => ({ ...prev, stock: st }))}
                  >
                    <Text
                      style={[
                        styles.stockStatusText,
                        productForm.stock === st && styles.stockStatusTextActive,
                      ]}
                    >
                      {st}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>

            {/* Modal Actions */}
            <View style={styles.productModalActions}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Delete Product"
                style={styles.productDeleteBtn}
                onPress={handleDeleteProduct}
              >
                <AppIcon name="trash" size={16} color="#DC2626" strokeWidth={2} />
                <Text style={styles.productDeleteBtnText}>Delete</Text>
              </Pressable>

              <View style={styles.productModalRightBtns}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Cancel"
                  style={styles.productCancelBtn}
                  onPress={() => setSelectedProduct(null)}
                >
                  <Text style={styles.productCancelBtnText}>Cancel</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Save Changes"
                  style={styles.productSaveBtn}
                  onPress={handleSaveProductEdit}
                >
                  <Text style={styles.productSaveBtnText}>Save</Text>
                </Pressable>
              </View>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* 7. Create Product Modal */}
      <Modal
        visible={isCreateModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsCreateModalOpen(false)}
      >
        <Pressable
          style={styles.productModalOverlay}
          onPress={() => setIsCreateModalOpen(false)}
        >
          <Pressable style={styles.productModalCard} onPress={(e) => e.stopPropagation()}>
            <View style={styles.productModalHeader}>
              <View>
                <Text style={styles.productModalTitle}>Add New Product</Text>
                <Text style={styles.productModalSubtitle}>Create a new item in your catalog</Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close"
                style={styles.productModalCloseBtn}
                onPress={() => setIsCreateModalOpen(false)}
              >
                <AppIcon name="x" size={20} color={THEME.colors.textMuted} strokeWidth={2} />
              </Pressable>
            </View>

            <ScrollView style={styles.productModalScroll} showsVerticalScrollIndicator={false}>
              {/* Product Photo */}
              <Text style={styles.productFieldLabel}>Product Photo</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Upload Custom Photo"
                style={[
                  styles.uploadPhotoBtn,
                  productForm.imageUri && styles.uploadPhotoBtnActive,
                ]}
                onPress={handlePickCustomImage}
              >
                {productForm.imageUri ? (
                  <View style={styles.uploadPhotoPreviewRow}>
                    <Image
                      source={{ uri: productForm.imageUri }}
                      style={styles.uploadPhotoPreviewThumb as any}
                      resizeMode="cover"
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.uploadPhotoSuccessTitle}>Custom Photo Added</Text>
                      <Text style={styles.uploadPhotoSuccessSub}>Tap to change photo</Text>
                    </View>
                    <View style={styles.uploadPhotoChangeBadge}>
                      <AppIcon name="camera" size={13} color="#FFFFFF" strokeWidth={2} />
                      <Text style={styles.uploadPhotoChangeBadgeText}>Change</Text>
                    </View>
                  </View>
                ) : (
                  <View style={styles.uploadPhotoPlaceholderRow}>
                    <View style={styles.uploadPhotoIconCircle}>
                      <AppIcon name="camera" size={18} color="#121317" strokeWidth={2} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.uploadPhotoTitle}>Upload from Device / Camera</Text>
                      <Text style={styles.uploadPhotoSub}>Select any image or take a photo</Text>
                    </View>
                  </View>
                )}
              </Pressable>

              {/* Name Input */}
              <Text style={styles.productFieldLabel}>Product Name</Text>
              <TextInput
                style={styles.productInput}
                value={productForm.name}
                onChangeText={(text) => setProductForm((prev) => ({ ...prev, name: text }))}
                placeholder="e.g. Fuji Apple"
                placeholderTextColor={THEME.colors.textMuted}
                autoFocus
              />

              {/* Price Input */}
              <Text style={styles.productFieldLabel}>Price</Text>
              <TextInput
                style={styles.productInput}
                value={productForm.price}
                onChangeText={(text) => setProductForm((prev) => ({ ...prev, price: text }))}
                placeholder="e.g. $3.00 / kg"
                placeholderTextColor={THEME.colors.textMuted}
              />

              {/* Stock Status Picker */}
              <Text style={styles.productFieldLabel}>Stock Status</Text>
              <View style={styles.stockStatusRow}>
                {(['In stock', 'Low stock', 'Out of stock'] as const).map((st) => (
                  <Pressable
                    key={st}
                    accessibilityRole="button"
                    style={[
                      styles.stockStatusBtn,
                      productForm.stock === st && styles.stockStatusBtnActive,
                    ]}
                    onPress={() => setProductForm((prev) => ({ ...prev, stock: st }))}
                  >
                    <Text
                      style={[
                        styles.stockStatusText,
                        productForm.stock === st && styles.stockStatusTextActive,
                      ]}
                    >
                      {st}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>

            {/* Modal Actions */}
            <View style={styles.productModalActions}>
              <View style={{ flex: 1 }} />
              <View style={styles.productModalRightBtns}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Cancel"
                  style={styles.productCancelBtn}
                  onPress={() => setIsCreateModalOpen(false)}
                >
                  <Text style={styles.productCancelBtnText}>Cancel</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Add Product"
                  style={[styles.productSaveBtn, !productForm.name.trim() && { opacity: 0.5 }]}
                  disabled={!productForm.name.trim()}
                  onPress={handleSaveCreateProduct}
                >
                  <Text style={styles.productSaveBtnText}>Add Product</Text>
                </Pressable>
              </View>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* 8. Subscription Upgrade to Pro Modal */}
      <Modal
        visible={subscriptionModalOpen}
        transparent
        animationType="fade"
        onRequestClose={closeSubscriptionModal}
      >
        <Pressable
          style={styles.proModalOverlay}
          onPress={closeSubscriptionModal}
        >
          <Pressable style={styles.proModalCard} onPress={(e) => e.stopPropagation()}>
            {/* Top Bar with Badge & Close Button */}
            <View style={styles.proModalHeader}>
              <View style={styles.proPlanBadge}>
                <AppIcon name="sparkles" size={14} color="#FFFFFF" strokeWidth={2.5} />
                <Text style={styles.proPlanBadgeText}>MUME PRO</Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close"
                style={styles.proModalCloseBtn}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                onPress={closeSubscriptionModal}
              >
                <AppIcon name="x" size={18} color="#121317" strokeWidth={2.2} />
              </Pressable>
            </View>

            {/* Title & Value Proposition */}
            <Text style={styles.proModalTitle}>Upgrade to Pro</Text>
            <Text style={styles.proModalSubtitle}>
              Unlock unlimited capabilities to scale your store catalog and chat with AI effortlessly.
            </Text>

            {/* Pricing Banner */}
            <View style={styles.proPriceBox}>
              <View style={styles.proPriceHeader}>
                <Text style={styles.proPriceTier}>Pro Store Membership</Text>
                <View style={styles.proPriceTag}>
                  <Text style={styles.proPriceTagText}>Most Popular</Text>
                </View>
              </View>
              <View style={styles.proPriceAmountRow}>
                <Text style={styles.proPriceCurrency}>$</Text>
                <Text style={styles.proPriceNumber}>9.99</Text>
                <Text style={styles.proPricePeriod}>/ month</Text>
              </View>
              <Text style={styles.proPriceGuarantee}>7-day free trial · Cancel anytime with 1-tap</Text>
            </View>

            {/* Feature Highlights */}
            <View style={styles.proFeaturesList}>
              <View style={styles.proFeatureItem}>
                <View style={styles.proFeatureIconCircle}>
                  <AppIcon name="folder" size={18} color="#121317" strokeWidth={2.2} />
                </View>
                <View style={styles.proFeatureTextCol}>
                  <Text style={styles.proFeatureTitle}>Additional Product Space for Catalog</Text>
                  <Text style={styles.proFeatureDesc}>
                    Unlimited inventory items, high-res custom photo uploads, and variant management.
                  </Text>
                </View>
              </View>

              <View style={styles.proFeatureItem}>
                <View style={styles.proFeatureIconCircle}>
                  <AppIcon name="mic" size={18} color="#121317" strokeWidth={2.2} />
                </View>
                <View style={styles.proFeatureTextCol}>
                  <Text style={styles.proFeatureTitle}>Unlimited Voice Chat</Text>
                  <Text style={styles.proFeatureDesc}>
                    Dictate commands, inquire about stock, and draft replies with zero audio timeouts.
                  </Text>
                </View>
              </View>

              <View style={styles.proFeatureItem}>
                <View style={styles.proFeatureIconCircle}>
                  <AppIcon name="bot" size={18} color="#121317" strokeWidth={2.2} />
                </View>
                <View style={styles.proFeatureTextCol}>
                  <Text style={styles.proFeatureTitle}>24/7 Meta Messenger Auto-Sync</Text>
                  <Text style={styles.proFeatureDesc}>
                    Instant price inquiry detection and automated smart reply generation.
                  </Text>
                </View>
              </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.proModalActions}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={isProUser ? 'Pro Activated' : 'Start 7-Day Free Trial'}
                style={[styles.proUpgradeBtn, isProUser && styles.proUpgradeBtnActive]}
                onPress={() => {
                  if (proAutoCloseTimerRef.current) {
                    clearTimeout(proAutoCloseTimerRef.current);
                    proAutoCloseTimerRef.current = null;
                  }
                  setIsProUser(true);
                  setSubscriptionModalOpen(false);
                  setProToast(true);
                  setTimeout(() => setProToast(false), 3500);
                }}
              >
                <AppIcon name={isProUser ? 'check' : 'subscription-upgrade'} size={18} color="#FFFFFF" strokeWidth={2.2} />
                <Text style={styles.proUpgradeBtnText}>
                  {isProUser ? 'Pro Plan Active' : 'Start 7-Day Free Trial'}
                </Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Maybe Later"
                style={styles.proDismissBtn}
                onPress={closeSubscriptionModal}
              >
                <Text style={styles.proDismissBtnText}>Maybe Later</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* 5. Animated Success Toast */}
      {sentToast && (
        <View style={styles.toast}>
          <AppIcon name="check" size={18} color="#FFFFFF" strokeWidth={2.5} />
          <Text style={styles.toastText}>Reply sent to Maria A.</Text>
        </View>
      )}

      {/* Pro Subscription Toast */}
      {proToast && (
        <View style={styles.toast}>
          <AppIcon name="sparkles" size={18} color="#FACC15" strokeWidth={2.5} />
          <Text style={styles.toastText}>Welcome to Mume Pro! Unlimited features unlocked.</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
    backgroundColor: THEME.colors.bg,
    position: 'relative',
  },
  splashOverlay: {
    ...StyleSheet.absoluteFill,
    zIndex: 9999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  splashLogoContainer: {
    width: 150,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  splashLogoAbsolute: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
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
    borderBottomWidth: 0,
    backgroundColor: THEME.colors.obsidian,
  },
  bodySafeArea: {
    flex: 1,
    backgroundColor: THEME.colors.bg,
    position: 'relative',
  },
  headerLogoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuIconButton: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    borderWidth: 0,
  },
  profileBadge: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    borderWidth: 0,
  },
  profileBadgePro: {
    backgroundColor: 'rgba(250, 204, 21, 0.2)',
    borderRadius: 19,
    borderWidth: 1.5,
    borderColor: '#FACC15',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 175,
  },
  scrollContentExpanded: {
    flexGrow: 1,
  },
  scrollContentCatalog: {
    paddingBottom: 90,
  },
  scrollContentEditingDraft: {
    paddingBottom: 60,
  },
  screenContainer: {
    width: '100%',
  },
  screenContainerExpanded: {
    flex: 1,
  },
  geminiZeroStateContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 8,
    marginBottom: 16,
  },
  geminiHeroCopy: {
    flex: 1,
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
  sectionBadgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  sectionBadgePending: {
    backgroundColor: THEME.colors.cardElevated,
    borderWidth: 1,
    borderColor: THEME.colors.cardBorder,
  },
  sectionBadgeApproved: {
    backgroundColor: THEME.colors.cardElevated,
    borderWidth: 1,
    borderColor: THEME.colors.cardBorder,
  },
  sectionBadgeTextPending: {
    color: THEME.colors.text,
    fontSize: 12,
    fontWeight: '600',
  },
  sectionBadgeTextApproved: {
    color: THEME.colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  approvalCard: {
    backgroundColor: THEME.colors.card,
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: THEME.colors.cardBorder,
    marginBottom: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  approvalCardEditing: {
    borderColor: THEME.colors.obsidian,
    shadowOpacity: 0.08,
    shadowRadius: 12,
  },
  cardTopline: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginBottom: 10,
    width: '100%',
  },
  statusDotAmber: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: THEME.colors.obsidian,
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
  customerInfoCol: {
    flex: 1,
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
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: THEME.colors.cardBorder,
  },
  draftBlockEditing: {
    borderColor: THEME.colors.primary,
    backgroundColor: '#FFFFFF',
    shadowColor: THEME.colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  draftLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  draftLabelLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  draftIconText: {
    fontSize: 14,
  },
  draftLabelText: {
    color: THEME.colors.text,
    fontSize: 12,
    fontWeight: '700',
  },
  draftEditorWrapper: {
    marginTop: 4,
  },
  draftEditorHint: {
    color: THEME.colors.textMuted,
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 6,
  },
  draftTextInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: THEME.colors.primary,
    color: THEME.colors.text,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    lineHeight: 20,
    minHeight: 74,
    textAlignVertical: 'top',
  },
  draftTextContainer: {
    paddingVertical: 2,
  },
  draftText: {
    color: THEME.colors.text,
    fontSize: 14,
    lineHeight: 21,
  },
  tapToEditHint: {
    color: THEME.colors.primary,
    fontSize: 11,
    fontWeight: '600',
    marginTop: 6,
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
  secondaryButtonActive: {
    borderColor: THEME.colors.primary,
    backgroundColor: 'rgba(50, 121, 249, 0.08)',
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
  linkDirectButton: {
    marginTop: 16,
    width: '100%',
  },
  primaryButtonText: {
    color: THEME.colors.textInverted,
    fontSize: 14,
    fontWeight: '700',
  },
  emptyCard: {
    backgroundColor: THEME.colors.card,
    borderRadius: 18,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: THEME.colors.cardBorder,
    marginBottom: 18,
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
  productImageContainer: {
    width: '100%',
    height: 96,
    position: 'relative',
    borderRadius: 12,
    marginBottom: 8,
    overflow: 'hidden',
  },
  productImage: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
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
    position: 'absolute',
    top: 6,
    right: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    zIndex: 2,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2,
  },
  stockIn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.12)',
  },
  stockLow: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.12)',
  },
  stockOut: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.12)',
  },
  stockPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#121317',
  },
  stockInText: {
    color: '#121317',
  },
  stockLowText: {
    color: '#121317',
  },
  stockOutText: {
    color: '#121317',
  },
  catalogHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionBadgeText: {
    color: THEME.colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  addProductBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#121317',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#121317',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  addProductBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  addProductFab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#121317',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
    zIndex: 20,
    cursor: (Platform.OS === 'web' ? 'pointer' : 'auto') as any,
  },
  emptyCatalogCard: {
    backgroundColor: THEME.colors.card,
    borderRadius: 16,
    padding: 32,
    borderWidth: 1,
    borderColor: THEME.colors.cardBorder,
    alignItems: 'center',
  },
  emptyCatalogTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: THEME.colors.text,
    marginBottom: 6,
  },
  emptyCatalogSubtitle: {
    fontSize: 13,
    color: THEME.colors.textMuted,
    textAlign: 'center',
  },
  productModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  productModalCard: {
    width: '100%',
    maxWidth: 380,
    maxHeight: '90%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  productModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F4F4F5',
    paddingBottom: 12,
  },
  productModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: THEME.colors.text,
  },
  productModalSubtitle: {
    fontSize: 12,
    color: THEME.colors.textMuted,
    marginTop: 2,
  },
  productModalCloseBtn: {
    padding: 4,
  },
  productModalScroll: {
    maxHeight: 380,
  },
  productFieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.text,
    marginBottom: 6,
    marginTop: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  uploadPhotoBtn: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#D4D4D8',
    borderRadius: 14,
    padding: 12,
    backgroundColor: '#FAFAFA',
    marginBottom: 4,
  },
  uploadPhotoBtnActive: {
    borderColor: '#121317',
    borderStyle: 'solid',
    backgroundColor: '#F4F4F5',
  },
  uploadPhotoPlaceholderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  uploadPhotoIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E4E4E7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadPhotoTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#121317',
  },
  uploadPhotoSub: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    marginTop: 1,
  },
  uploadPhotoPreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  uploadPhotoPreviewThumb: {
    width: 48,
    height: 48,
    borderRadius: 10,
  },
  uploadPhotoSuccessTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#121317',
  },
  uploadPhotoSuccessSub: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    marginTop: 1,
  },
  uploadPhotoChangeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#121317',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  uploadPhotoChangeBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  productInput: {
    borderWidth: 1,
    borderColor: '#E4E4E7',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: THEME.colors.text,
    backgroundColor: '#F9FAFB',
  },
  stockStatusRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  stockStatusBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E4E4E7',
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
    backgroundColor: '#FAFAFA',
  },
  stockStatusBtnActive: {
    borderColor: THEME.colors.primary,
    backgroundColor: '#EFF6FF',
  },
  stockStatusText: {
    fontSize: 11,
    fontWeight: '600',
    color: THEME.colors.textMuted,
  },
  stockStatusTextActive: {
    color: THEME.colors.primary,
    fontWeight: '700',
  },
  productModalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 18,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#F4F4F5',
  },
  productDeleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  productDeleteBtnText: {
    color: '#DC2626',
    fontSize: 13,
    fontWeight: '700',
  },
  productModalRightBtns: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  productCancelBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  productCancelBtnText: {
    color: THEME.colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
  productSaveBtn: {
    backgroundColor: THEME.colors.primary,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  productSaveBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
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
    position: (Platform.OS === 'web' ? 'fixed' : 'absolute') as any,
    bottom: 12,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10,
    paddingHorizontal: 16,
    maxWidth: 480,
    width: '100%',
    alignSelf: 'center',
    marginHorizontal: 'auto' as any,
  },
  geminiInputCapsule: {
    flexDirection: 'column',
    justifyContent: 'space-between',
    backgroundColor: THEME.colors.card,
    borderRadius: 24,
    minHeight: 112,
    width: '100%',
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 8,
    borderWidth: 1,
    borderColor: THEME.colors.cardBorder,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 6,
  },
  capsuleTextInputWrapper: {
    width: '100%',
    minHeight: 46,
    maxHeight: 90,
    justifyContent: 'center',
  },
  capsuleTextInput: {
    fontSize: 14,
    color: THEME.colors.text,
    paddingHorizontal: 6,
    paddingVertical: 4,
    minHeight: 38,
    textAlignVertical: 'top',
  },
  capsuleControlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingTop: 4,
  },
  geminiPlusButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: THEME.colors.cardElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  capsuleStatusArea: {
    flex: 1,
    marginHorizontal: 10,
    justifyContent: 'center',
  },
  capsuleHintText: {
    fontSize: 12,
    color: THEME.colors.textMuted,
    fontWeight: '500',
  },
  capsuleActionsRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  geminiMicSmallButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: THEME.colors.cardElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  geminiMicSmallButtonActive: {
    backgroundColor: THEME.colors.obsidian,
    transform: [{ scale: 1.05 }],
  },
  geminiSendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: THEME.colors.cardElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  geminiSendButtonActive: {
    backgroundColor: THEME.colors.obsidian,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
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
  // Chat stream styles
  chatSectionCard: {
    backgroundColor: THEME.colors.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: THEME.colors.cardBorder,
    padding: 18,
    marginBottom: 18,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
    height: 220, // Constant container size with +10% height
  },
  chatSectionCardHighlighted: {
    borderColor: '#3279F9',
    borderWidth: 1.5,
    backgroundColor: '#FFFFFF',
    shadowColor: '#3279F9',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 4,
  },
  chatSectionCardExpanded: {
    flex: 1,
    minHeight: 460,
    height: undefined,
    marginBottom: 0,
  },
  chatSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 13,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.cardBorder,
    marginBottom: 12,
  },
  chatHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  chatHeaderBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: THEME.colors.obsidian,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatHeaderBadgeActive: {
    backgroundColor: '#3279F9',
  },
  chatHeaderTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME.colors.text,
  },
  chatHeaderSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    color: THEME.colors.textMuted,
  },
  activeHighlightBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(50, 121, 249, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(50, 121, 249, 0.28)',
  },
  activeHighlightDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#3279F9',
  },
  activeHighlightText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#1A73E8',
  },
  chatScrollView: {
    flex: 1,
  },
  chatMessagesList: {
    gap: 12,
    paddingBottom: 4,
  },
  chatBubbleRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
  },
  chatBubbleRowUser: {
    justifyContent: 'flex-end',
  },
  chatBubbleRowAi: {
    justifyContent: 'flex-start',
  },
  chatAvatarAi: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: THEME.colors.obsidian,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 3,
  },
  chatBubble: {
    maxWidth: '85%',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 18,
  },
  chatBubbleUser: {
    backgroundColor: THEME.colors.obsidian,
    borderBottomRightRadius: 4,
  },
  chatBubbleAi: {
    backgroundColor: THEME.colors.cardElevated,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: THEME.colors.cardBorder,
  },
  chatThinkingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  chatThinkingText: {
    fontSize: 13,
    color: THEME.colors.textMuted,
    fontWeight: '500',
  },
  chatBubbleText: {
    fontSize: 13.5,
    lineHeight: 18,
  },
  chatBubbleTextUser: {
    color: '#FFFFFF',
    fontWeight: '500',
  },
  chatBubbleTextAi: {
    color: THEME.colors.text,
    fontWeight: '400',
  },
  chatBubbleTime: {
    fontSize: 10,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  chatBubbleTimeUser: {
    color: 'rgba(255, 255, 255, 0.65)',
  },
  chatBubbleTimeAi: {
    color: THEME.colors.textMuted,
  },
  capabilitiesDisclaimer: {
    fontSize: 13,
    color: THEME.colors.textMuted,
    textAlign: 'center',
    marginTop: 6,
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
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    borderWidth: 0,
  },
  confirmModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  confirmModalCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  confirmModalIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(33, 34, 38, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(33, 34, 38, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  confirmModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#121317',
    marginBottom: 8,
    textAlign: 'center',
  },
  confirmModalSubtitle: {
    fontSize: 13,
    color: '#676A72',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  confirmModalActionsRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  confirmModalCancelBtn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#F0F1F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmModalCancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#45474D',
  },
  confirmModalLogoutBtn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#121317',
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmModalLogoutText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
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
  proModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  proModalCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 22,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.28,
    shadowRadius: 24,
    elevation: 12,
  },
  proModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  proPlanBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#121317',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  proPlanBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  proModalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F4F4F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  proModalTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#121317',
    marginBottom: 6,
    letterSpacing: -0.3,
  },
  proModalSubtitle: {
    fontSize: 13,
    color: THEME.colors.textMuted,
    lineHeight: 18,
    marginBottom: 18,
  },
  proPriceBox: {
    backgroundColor: '#FAFAFA',
    borderWidth: 1.5,
    borderColor: '#E4E4E7',
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
  },
  proPriceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  proPriceTier: {
    fontSize: 13,
    fontWeight: '700',
    color: '#121317',
  },
  proPriceTag: {
    backgroundColor: '#E0EAFF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  proPriceTagText: {
    color: '#2563EB',
    fontSize: 10.5,
    fontWeight: '700',
  },
  proPriceAmountRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 2,
    marginBottom: 4,
  },
  proPriceCurrency: {
    fontSize: 18,
    fontWeight: '700',
    color: '#121317',
  },
  proPriceNumber: {
    fontSize: 28,
    fontWeight: '800',
    color: '#121317',
    letterSpacing: -0.5,
  },
  proPricePeriod: {
    fontSize: 13,
    fontWeight: '500',
    color: THEME.colors.textMuted,
    marginLeft: 2,
  },
  proPriceGuarantee: {
    fontSize: 11.5,
    color: '#71717A',
    fontWeight: '500',
  },
  proFeaturesList: {
    gap: 12,
    marginBottom: 20,
  },
  proFeatureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  proFeatureIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F4F4F5',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  proFeatureTextCol: {
    flex: 1,
  },
  proFeatureTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#121317',
    marginBottom: 2,
  },
  proFeatureDesc: {
    fontSize: 11.5,
    color: THEME.colors.textMuted,
    lineHeight: 16,
  },
  proModalActions: {
    gap: 8,
  },
  proUpgradeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#121317',
    paddingVertical: 13,
    borderRadius: 14,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  proUpgradeBtnActive: {
    backgroundColor: '#16A34A',
  },
  proUpgradeBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  proDismissBtn: {
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  proDismissBtnText: {
    color: THEME.colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
});
