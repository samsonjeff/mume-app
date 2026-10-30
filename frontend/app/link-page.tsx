import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, Pressable, ScrollView, Linking, TextInput, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { THEME } from '../constants/theme';
import { api, LinkedPage } from '../lib/api';

export default function LinkPageScreen() {
  const router = useRouter();
  const [pages, setPages] = useState<LinkedPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Direct manual linking form for hackathon dev/testing
  const [fbPageId, setFbPageId] = useState('2692011354590767');
  const [pageName, setPageName] = useState('Mume Fresh - Fruit Store');
  const [pageAccessToken, setPageAccessToken] = useState('');

  const loadPages = async () => {
    try {
      setLoading(true);
      const data = await api.getLinkedPages();
      setPages(data);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to load pages');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPages();
  }, []);

  const handleOAuthLogin = async () => {
    try {
      setSubmitting(true);
      const url = await api.getFacebookLoginUrl();
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Error', 'Unable to open browser on this device.');
      }
    } catch (err: any) {
      Alert.alert('Facebook Login Error', err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDirectLink = async () => {
    if (!fbPageId.trim() || !pageName.trim() || !pageAccessToken.trim()) {
      Alert.alert('Validation Error', 'Please enter Page ID, Page Name, and Page Access Token.');
      return;
    }

    try {
      setSubmitting(true);
      const page = await api.linkDirectPage({
        fbPageId: fbPageId.trim(),
        pageName: pageName.trim(),
        pageAccessToken: pageAccessToken.trim(),
      });
      Alert.alert('Success', `Page "${page.page_name}" linked successfully with encrypted token!`);
      await loadPages();
      router.back();
    } catch (err: any) {
      Alert.alert('Link Error', err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Connect Facebook Page</Text>
        <Text style={styles.subtitle}>
          Mume requires access to your Business Page Messenger to check inquiries and prepare voice-confirmed drafts.
        </Text>

        {/* Current Linked Status */}
        <View style={styles.card}>
          <Text style={styles.sectionHeader}>CURRENTLY LINKED PAGES</Text>
          {loading ? (
            <ActivityIndicator color={THEME.colors.primary} />
          ) : pages.length > 0 ? (
            pages.map((p) => (
              <View key={p.id} style={styles.pageItem}>
                <View>
                  <Text style={styles.pageItemName}>✓ {p.page_name}</Text>
                  <Text style={styles.pageItemId}>ID: {p.fb_page_id}</Text>
                </View>
                <Text style={styles.tag}>Active</Text>
              </View>
            ))
          ) : (
            <Text style={styles.mutedText}>No pages linked yet.</Text>
          )}
        </View>

        {/* Option 1: Facebook Login Dialog */}
        <View style={styles.card}>
          <Text style={styles.sectionHeader}>OPTION 1: FACEBOOK LOGIN (OAUTH)</Text>
          <Text style={styles.bodyText}>
            Sign in with Facebook and grant permissions (`pages_messaging`, `pages_read_engagement`).
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Login with Facebook"
            style={[styles.fbButton, submitting && styles.disabled]}
            onPress={handleOAuthLogin}
            disabled={submitting}
          >
            <Text style={styles.fbButtonText}>f  Log In with Facebook</Text>
          </Pressable>
        </View>

        {/* Option 2: Direct Page Token Linking (Hackathon Dev Mode) */}
        <View style={styles.card}>
          <Text style={styles.sectionHeader}>OPTION 2: DIRECT TOKEN LINK (DEV / DEMO)</Text>
          <Text style={styles.bodyText}>
            Directly link a test Page using a Page Access Token. Tokens are securely encrypted with AES-256-GCM.
          </Text>

          <Text style={styles.inputLabel}>Page Name</Text>
          <TextInput
            style={styles.input}
            value={pageName}
            onChangeText={setPageName}
            placeholder="e.g. Mume Fresh - Fruit Store"
            placeholderTextColor="#64748B"
          />

          <Text style={styles.inputLabel}>Page ID</Text>
          <TextInput
            style={styles.input}
            value={fbPageId}
            onChangeText={setFbPageId}
            placeholder="e.g. 2692011354590767"
            placeholderTextColor="#64748B"
            keyboardType="numeric"
          />

          <Text style={styles.inputLabel}>Page Access Token</Text>
          <TextInput
            style={[styles.input, styles.tokenInput]}
            value={pageAccessToken}
            onChangeText={setPageAccessToken}
            placeholder="Paste Page Access Token (EAA...)"
            placeholderTextColor="#64748B"
            multiline
            numberOfLines={3}
          />

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Save and Link Page"
            style={[styles.primaryButton, submitting && styles.disabled]}
            onPress={handleDirectLink}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryButtonText}>🔒 Encrypt & Link Page</Text>
            )}
          </Pressable>
        </View>
      </ScrollView>
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
    paddingBottom: 40,
  },
  title: {
    color: THEME.colors.text,
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 6,
  },
  subtitle: {
    color: THEME.colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 20,
  },
  card: {
    backgroundColor: THEME.colors.card,
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: THEME.colors.cardBorder,
  },
  sectionHeader: {
    color: THEME.colors.primaryLight,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  bodyText: {
    color: THEME.colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 14,
  },
  mutedText: {
    color: THEME.colors.textMuted,
    fontSize: 14,
  },
  pageItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  pageItemName: {
    color: THEME.colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  pageItemId: {
    color: THEME.colors.textMuted,
    fontSize: 12,
  },
  tag: {
    color: THEME.colors.speaking,
    fontSize: 12,
    fontWeight: '700',
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
    backgroundColor: '#0F172A',
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
  primaryButton: {
    backgroundColor: THEME.colors.primary,
    minHeight: THEME.ergonomics.minTapTarget,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  disabled: {
    opacity: 0.6,
  },
});
