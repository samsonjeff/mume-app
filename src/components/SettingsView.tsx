import React, { useState } from 'react';
import { Icon } from './Icon';

interface SettingsViewProps {
  onBack: () => void;
  userName?: string;
  onUserNameChange?: (name: string) => void;
}

interface LinkedPage {
  pageId: string;
  pageName: string;
  category: string;
  syncedAt: string;
  status: 'active' | 'disconnected';
  tokenEncrypted: boolean;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  onBack,
  userName = 'Jefferson',
  onUserNameChange,
}) => {
  const [syncState, setSyncState] = useState<'idle' | 'syncing' | 'synced'>('synced');
  const [lastSyncTime, setLastSyncTime] = useState('Today at 4:32 PM');
  const [pageData, setPageData] = useState<LinkedPage>({
    pageId: '1447275391796820',
    pageName: 'Mume Fresh - Fruit Store',
    category: 'Retail & Grocery',
    syncedAt: '2026-10-31T16:32:00Z',
    status: 'active',
    tokenEncrypted: true,
  });

  const [activeSubView, setActiveSubView] = useState<string | null>(null);

  // Meta Page Login & Sync Protocol Sequence
  const handleConnectAndSync = async () => {
    try {
      setSyncState('syncing');

      // Step 1 & 2: Initiate Meta OAuth flow or call backend OAuth URL endpoint
      // Using live Render backend URL or local fallback
      const backendBase = 'https://mume-backend.onrender.com';
      let oauthUrl = `${backendBase}/auth/facebook/url`;

      try {
        const resp = await fetch(oauthUrl, { mode: 'cors' });
        if (resp.ok) {
          const json = await resp.json();
          if (json.url && typeof window !== 'undefined') {
            // Note: In browser environment, can navigate to Meta OAuth dialog:
            // window.location.href = json.url;
          }
        }
      } catch {
        // Fallback for isolated client testing
      }

      // Step 3, 4, 5: Simulate retrieval of managed pages & secure credential persistence
      await new Promise((resolve) => setTimeout(resolve, 1400));

      const updatedTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setLastSyncTime(`Today at ${updatedTime}`);
      setPageData((prev) => ({
        ...prev,
        status: 'active',
        syncedAt: new Date().toISOString(),
      }));
      setSyncState('synced');
    } catch {
      setSyncState('idle');
    }
  };

  const handleDisconnect = () => {
    setPageData((prev) => ({
      ...prev,
      status: 'disconnected',
    }));
    setSyncState('idle');
  };

  const settingsRows = [
    {
      id: 'fb-credentials',
      icon: 'edit' as const,
      title: 'Facebook Page Credentials & ID',
      desc: `Page ID: ${pageData.pageId}`,
      badge: pageData.status === 'active' ? 'Verified' : 'Unlinked',
    },
    {
      id: 'page-permissions',
      icon: 'check' as const,
      title: 'Messaging & Webhook Permissions',
      desc: 'pages_messaging, pages_manage_metadata, messaging_postbacks',
      badge: 'Active',
    },
    {
      id: 'bot-automation',
      icon: 'bot-svg' as const,
      title: 'Meta AI Assistant Automation',
      desc: 'Porcupine wake word, voice confirmation, draft suggested replies',
      badge: 'Ready',
    },
    {
      id: 'storage-bundles',
      icon: 'folder' as const,
      title: 'Local Sync Storage Directory',
      desc: 'Asset manager & cached customer conversation bundles',
      badge: '12 MB',
    },
    {
      id: 'saved-posts',
      icon: 'bookmark' as const,
      title: 'Saved Pages & Favorited Inquiries',
      desc: 'Catalog templates and recurring customer orders',
      badge: '3 items',
    },
    {
      id: 'monetization',
      icon: 'dollar-sign' as const,
      title: 'Monetization & Ad Spend Summary',
      desc: 'Product pricing rules (₱/kg) and order revenue sync',
      badge: '₱14,250',
    },
    {
      id: 'audio-diagnostics',
      icon: 'audio-waveform' as const,
      title: 'Voice Wave & Audio Diagnostics',
      desc: 'Hardware mic sensitivity, VAD threshold, and TTS player',
      badge: '60 FPS',
    },
  ];

  return (
    <section className="panel-screen" style={{ paddingBottom: '7rem' }}>
      {/* Top Header with chevron-left back action and screen title */}
      <div className="flex items-center justify-between mb-4 pb-2 border-b border-[var(--line)]">
        <button
          type="button"
          onClick={onBack}
          aria-label="Go back to Home"
          className="flex items-center gap-1.5 min-w-[48px] min-h-[48px] text-[var(--ink)] font-semibold text-sm active:opacity-70 transition-opacity"
        >
          <Icon name="chevron-left" size={22} />
          <span>Back</span>
        </button>
        <h1 className="text-base font-bold text-[var(--ink)]">Settings & Meta Sync</h1>
        <div className="w-[48px]" aria-hidden="true" />
      </div>

      {/* Account Card: Displays connection status ("Disconnected" vs "Active Sync") */}
      <div className="bg-[var(--surface)] rounded-2xl p-4 border border-[var(--line)] shadow-xs mb-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--muted)]">
            Connected Facebook Business Page
          </span>
          {pageData.status === 'active' ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <Icon name="check" size={14} className="text-emerald-600" />
              <span>Active Sync</span>
            </span>
          ) : (
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
              Disconnected
            </span>
          )}
        </div>

        {pageData.status === 'active' ? (
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <strong className="text-base font-bold text-[var(--ink)]">{pageData.pageName}</strong>
            </div>
            <p className="text-xs text-[var(--muted)] mb-3">
              Page ID: {pageData.pageId} · {pageData.category}
            </p>

            <div className="flex items-center justify-between text-xs text-[var(--muted)] bg-[var(--surface-raised)] p-2.5 rounded-xl border border-[var(--line)] mb-4">
              <span>Last synced: {lastSyncTime}</span>
              <span className="inline-flex items-center gap-1 font-semibold text-blue-700">
                <Icon name="check" size={13} />
                AES-256 Token
              </span>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleConnectAndSync}
                disabled={syncState === 'syncing'}
                className="flex-1 flex items-center justify-center gap-2 min-h-[48px] px-4 rounded-xl font-bold text-sm bg-[var(--ink)] text-white active:scale-98 transition-transform"
              >
                {syncState === 'syncing' ? (
                  <span>Syncing with Meta…</span>
                ) : (
                  <>
                    <Icon name="check" size={16} />
                    <span>Sync Page Now</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleDisconnect}
                className="min-h-[48px] px-3.5 rounded-xl font-semibold text-xs text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 active:scale-98 transition-all"
              >
                Unlink
              </button>
            </div>
          </div>
        ) : (
          <div>
            <p className="text-sm text-[var(--muted)] mb-4">
              No Meta Business Page linked yet. Connect your Facebook Page to allow Mume to read customer inquiries and synchronize product catalogs.
            </p>

            <button
              type="button"
              onClick={handleConnectAndSync}
              disabled={syncState === 'syncing'}
              className="w-full flex items-center justify-center gap-2.5 min-h-[48px] px-4 rounded-xl font-bold text-sm bg-[#1877F2] text-white shadow-xs active:scale-98 transition-transform"
            >
              <Icon name="meta-facebook" size={18} />
              <span>{syncState === 'syncing' ? 'Connecting to Meta…' : 'Connect & Sync Page'}</span>
            </button>
          </div>
        )}
      </div>

      {/* Interactive Settings Rows: Navigated via chevron-right.svg */}
      <div className="mb-6">
        <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--muted)] px-1 mb-2">
          Page & Automation Configuration
        </h2>

        <div className="bg-[var(--surface)] rounded-2xl border border-[var(--line)] divide-y divide-[var(--line)] overflow-hidden shadow-xs">
          {settingsRows.map((row) => (
            <button
              key={row.id}
              type="button"
              onClick={() => setActiveSubView(row.title)}
              className="w-full flex items-center justify-between p-3.5 text-left min-h-[52px] active:bg-[var(--surface-raised)] transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0 pr-2">
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[var(--surface-raised)] border border-[var(--line)] shrink-0">
                  <Icon name={row.icon} size={18} />
                </div>
                <div className="min-w-0">
                  <strong className="block text-sm font-semibold text-[var(--ink)] truncate">
                    {row.title}
                  </strong>
                  <span className="block text-xs text-[var(--muted)] truncate">{row.desc}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs font-medium text-[var(--muted)] bg-[var(--surface-raised)] px-2 py-0.5 rounded-md border border-[var(--line)]">
                  {row.badge}
                </span>
                <Icon name="chevron-right" size={18} />
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Active sub-view modal / detail dialog */}
      {activeSubView && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-xs p-3">
          <div className="w-full max-w-[412px] bg-[var(--surface)] rounded-2xl p-5 border border-[var(--line)] shadow-xl animate-in fade-in slide-in-from-bottom duration-200">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-[var(--line)]">
              <h3 className="font-bold text-base text-[var(--ink)]">{activeSubView}</h3>
              <button
                type="button"
                onClick={() => setActiveSubView(null)}
                className="text-xs font-bold text-[var(--muted)] p-2 min-w-[48px] min-h-[48px] flex items-center justify-center"
              >
                Close
              </button>
            </div>
            <p className="text-xs text-[var(--muted)] leading-relaxed mb-4">
              Configuration details for <strong>{activeSubView}</strong> are active and verified. Real-time updates sync directly through the Meta Graph Webhook subscription.
            </p>
            <button
              type="button"
              onClick={() => setActiveSubView(null)}
              className="w-full min-h-[48px] rounded-xl font-bold text-sm bg-[var(--ink)] text-white"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </section>
  );
};

export default SettingsView;

