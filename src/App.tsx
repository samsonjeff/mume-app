import { useEffect, useState } from 'react';
import Header from './components/Header';
import SettingsView from './components/SettingsView';
import Icon from './components/Icon';
import appleImg from './assets/apple.jpg';
import mangoImg from './assets/mango.jpg';
import bananaImg from './assets/banana.jpg';

type Tab = 'home' | 'inbox' | 'catalog' | 'settings';
type VoiceState = 'idle' | 'listening' | 'thinking';

function VoiceWave() {
  return (
    <span aria-hidden="true" className="voice-wave">
      {[0, 1, 2, 3, 4].map((bar) => (
        <i key={bar} style={{ animationDelay: `${bar * 80}ms` }} />
      ))}
    </span>
  );
}

function PendingAction({ onApproved }: { onApproved: () => void }) {
  const [editing, setEditing] = useState(false);
  const [price, setPrice] = useState('₱120 / kg');

  return (
    <section className="approval-card" aria-labelledby="approval-title">
      <div className="card-topline">
        <div className="eyebrow">
          <span className="status-dot" />
          Needs your approval
        </div>
        <span className="time-label">now</span>
      </div>

      <div className="customer-row">
        <div className="avatar" aria-hidden="true">
          MA
        </div>
        <div>
          <p className="customer-name">Maria A.</p>
          <p className="customer-context">Messenger · Price inquiry</p>
        </div>
      </div>

      <div className="message-bubble">
        <p>“Hi po, how much ang red apples?”</p>
      </div>

      <div className="draft-block">
        <div className="draft-label flex items-center gap-1.5">
          <Icon name="bot-svg" size={16} />
          <span>Mume’s suggested reply</span>
        </div>
        {editing ? (
          <label className="price-editor">
            <span>Update price</span>
            <input autoFocus onChange={(event) => setPrice(event.target.value)} value={price} />
          </label>
        ) : (
          <p id="approval-title">
            Hi po! Our red apples are <strong>{price}</strong>. Fresh delivery today.
          </p>
        )}
      </div>

      <div className="approval-actions">
        <button
          className="secondary-button min-h-[48px] flex items-center justify-center gap-1.5"
          onClick={() => setEditing((value) => !value)}
          type="button"
        >
          <Icon name="edit" size={16} />
          <span>{editing ? 'Done editing' : 'Edit'}</span>
        </button>

        <button
          className="primary-button min-h-[48px] flex items-center justify-center gap-1.5"
          onClick={onApproved}
          type="button"
        >
          <span>Approve & send</span>
          <Icon name="check" size={18} />
        </button>
      </div>
      <p className="safety-note">Nothing is sent without your approval.</p>
    </section>
  );
}

function HomeScreen({
  userName,
  onApproved,
  onOpenInbox,
  onOpenCatalog,
  onOpenSettings,
}: {
  userName: string;
  onApproved: () => void;
  onOpenInbox: () => void;
  onOpenCatalog: () => void;
  onOpenSettings: () => void;
}) {
  return (
    <>
      <div className="zero-state-hero">
        <div className="sparkle-badge" aria-hidden="true">
          ✨
        </div>
        <h1>Hello, {userName.trim().split(/\s+/)[0] || userName}</h1>
        <p>Where should we start with Santa Ana Sari-Sari Store?</p>
      </div>

      <div className="chips-container">
        <button type="button" className="action-chip" onClick={onOpenInbox}>
          <Icon name="bookmark" size={14} />
          <span>Maria's inquiry (₱120)</span>
        </button>
        <button type="button" className="action-chip" onClick={onOpenCatalog}>
          <Icon name="folder" size={14} />
          <span>Fruit catalog (3 items)</span>
        </button>
        <button type="button" className="action-chip" onClick={onOpenSettings}>
          <Icon name="check" size={14} />
          <span>Page live & encrypted</span>
        </button>
      </div>

      <div className="section-heading">
        <h2>Ready for you</h2>
        <span>1 action</span>
      </div>
      <PendingAction onApproved={onApproved} />
    </>
  );
}

function InboxScreen() {
  return (
    <section className="panel-screen">
      <div className="section-heading">
        <h1>Inbox</h1>
        <span>2 unread</span>
      </div>
      {[
        ['MA', 'Maria A.', 'Hi po, how much ang red apples?', 'now'],
        ['JL', 'Jun L.', 'Available pa po ang mango?', '8m'],
        ['RS', 'Rica S.', 'Thank you po!', '1h'],
      ].map(([initials, name, message, time], index) => (
        <button className="conversation min-h-[56px]" key={name} type="button">
          <span className={`avatar conversation-avatar tone-${index}`}>{initials}</span>
          <span className="conversation-copy">
            <strong>{name}</strong>
            <span>{message}</span>
          </span>
          <span className="conversation-meta">
            {time}
            {index < 2 && <i />}
          </span>
        </button>
      ))}
    </section>
  );
}

function CatalogScreen() {
  return (
    <section className="panel-screen">
      <div className="section-heading">
        <h1>Catalog & Inventory</h1>
        <span>3 products</span>
      </div>
      <div className="catalog-grid">
        {[
          [appleImg, 'Red apples', '₱120 / kg', 'In stock'],
          [mangoImg, 'Carabao mango', '₱180 / kg', 'In stock'],
          [bananaImg, 'Lakatan banana', '₱85 / kg', 'Low stock'],
        ].map(([imgSrc, name, price, stock]) => (
          <button className="product-card min-h-[140px]" key={name} type="button">
            <img src={imgSrc} alt={name} className="product-image" />
            <strong>{name}</strong>
            <span className="flex items-center justify-center gap-1 text-sm font-bold text-blue-600">
              <Icon name="dollar-sign" size={14} />
              {price}
            </span>
            <small>{stock}</small>
          </button>
        ))}
      </div>
    </section>
  );
}

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('home');
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [userName, setUserName] = useState<string>('Jefferson');
  const [sent, setSent] = useState(false);

  const userInitials = userName.trim().split(/\s+/).filter(Boolean).map(n => n[0]?.toUpperCase()).slice(0, 2).join('') || 'JS';

  useEffect(() => {
    if (voiceState !== 'thinking') return;
    const timeout = window.setTimeout(() => setVoiceState('idle'), 1800);
    return () => window.clearTimeout(timeout);
  }, [voiceState]);

  const handleVoice = () => {
    if (voiceState === 'idle') setVoiceState('listening');
    else if (voiceState === 'listening') setVoiceState('thinking');
    else setVoiceState('idle');
  };

  const handleApproved = () => {
    setSent(true);
    window.setTimeout(() => setSent(false), 3200);
  };

  return (
    <div className="app-shell">
      <main className="phone-stage max-w-[412px] min-w-[360px] mx-auto border-x border-[var(--line)] shadow-2xl">
        {/* Dynamic Top Header */}
        <Header
          title={activeTab === 'settings' ? 'Settings' : 'Mume'}
          subtitle="Santa Ana Sari-Sari Store"
          showBack={activeTab !== 'home'}
          userInitials={userInitials}
          onBack={() => setActiveTab('home')}
          onProfileClick={() => setActiveTab('settings')}
        />

        {/* Content Scroll View (Ergonomic layout for Android 360dp - 412dp) */}
        <div className="content-scroll">
          {activeTab === 'home' && (
            <HomeScreen
              userName={userName}
              onApproved={handleApproved}
              onOpenInbox={() => setActiveTab('inbox')}
              onOpenCatalog={() => setActiveTab('catalog')}
              onOpenSettings={() => setActiveTab('settings')}
            />
          )}
          {activeTab === 'inbox' && <InboxScreen />}
          {activeTab === 'catalog' && <CatalogScreen />}
          {activeTab === 'settings' && (
            <SettingsView
              onBack={() => setActiveTab('home')}
              userName={userName}
              onUserNameChange={setUserName}
            />
          )}
        </div>

        {/* Gemini-Style Floating Bottom Input Capsule Dock */}
        {activeTab !== 'settings' && (
          <div className="input-capsule-container">
            <div className="input-capsule">
              <button
                type="button"
                className="capsule-plus-button"
                onClick={() => setActiveTab('catalog')}
                aria-label="Upload and quick actions"
              >
                +
              </button>

              <button
                type="button"
                className="capsule-input-area"
                onClick={handleVoice}
                aria-label="Voice dictate or ask Mume"
              >
                {voiceState === 'idle' && (
                  <span className="capsule-placeholder">Ask Mume or tap mic…</span>
                )}
                {voiceState === 'listening' && (
                  <div className="capsule-voice-row">
                    <VoiceWave />
                    <span className="capsule-status">Listening…</span>
                  </div>
                )}
                {voiceState === 'thinking' && (
                  <div className="capsule-voice-row">
                    <Icon name="bot-svg" size={16} />
                    <span className="capsule-status">Checking your page…</span>
                  </div>
                )}
              </button>

              <button
                type="button"
                className={`capsule-mic-button ${voiceState === 'listening' ? 'active' : ''}`}
                onClick={handleVoice}
                aria-label="Dictate and talk to Mume"
              >
                {voiceState === 'thinking' ? (
                  <Icon name="bot-svg" size={20} />
                ) : voiceState === 'listening' ? (
                  <Icon name="audio-waveform" size={20} />
                ) : (
                  <span>🎙️</span>
                )}
              </button>
            </div>
            <p className="capsule-disclaimer">Nothing is sent without your approval.</p>
          </div>
        )}

        {/* Bottom Navigation with Exact Tab Mapping & Minimum 48x48dp Targets */}
        <nav className="bottom-nav" aria-label="Main navigation">
          <button
            type="button"
            aria-current={activeTab === 'home' ? 'page' : undefined}
            className={`tab-button min-h-[48px] min-w-[48px] ${activeTab === 'home' ? 'active' : ''}`}
            onClick={() => setActiveTab('home')}
          >
            <Icon name="home" size={20} />
            <span>Today</span>
          </button>

          <button
            type="button"
            aria-current={activeTab === 'inbox' ? 'page' : undefined}
            className={`tab-button min-h-[48px] min-w-[48px] ${activeTab === 'inbox' ? 'active' : ''}`}
            onClick={() => setActiveTab('inbox')}
          >
            <Icon name="bookmark" size={20} />
            <span>Inbox</span>
          </button>

          <div className="nav-spacer" aria-hidden="true" />

          <button
            type="button"
            aria-current={activeTab === 'catalog' ? 'page' : undefined}
            className={`tab-button min-h-[48px] min-w-[48px] ${activeTab === 'catalog' ? 'active' : ''}`}
            onClick={() => setActiveTab('catalog')}
          >
            <Icon name="folder" size={20} />
            <span>Catalog</span>
          </button>

          <button
            type="button"
            aria-current={activeTab === 'settings' ? 'page' : undefined}
            className={`tab-button min-h-[48px] min-w-[48px] ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            <Icon name="settings" size={20} />
            <span>Settings</span>
          </button>
        </nav>

        {/* Approval Confirmation Toast */}
        {sent && (
          <div className="toast" role="status">
            <span>
              <Icon name="check" size={18} />
            </span>
            <span>Reply sent to Maria</span>
          </div>
        )}
      </main>
    </div>
  );
}
