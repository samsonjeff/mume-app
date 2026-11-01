import { useEffect, useState, useRef, useCallback } from 'react';
import Header from './components/Header';
import SettingsView from './components/SettingsView';
import Icon from './components/Icon';
import appleImg from './assets/apple.jpg';
import mangoImg from './assets/mango.jpg';
import bananaImg from './assets/banana.jpg';
import mumeBlackSvg from './assets/mume-black.svg';
import mumeWhiteSvg from './assets/mume-white.svg';

export interface Product {
  id: string;
  name: string;
  price: string;
  stock: 'In stock' | 'Low stock' | 'Out of stock';
  isStock?: boolean;
  imageKey: 'apple' | 'mango' | 'banana' | 'custom';
  imageUri?: string;
}

const FRUIT_IMAGE_MAP: Record<'apple' | 'mango' | 'banana', string> = {
  apple: appleImg,
  mango: mangoImg,
  banana: bananaImg,
};

const INITIAL_PRODUCTS: Product[] = [
  {
    id: 'prod-1',
    name: 'Red apples',
    price: '$2.50 / kg',
    stock: 'In stock',
    imageKey: 'apple',
  },
  {
    id: 'prod-2',
    name: 'Carabao mango',
    price: '$4.00 / kg',
    stock: 'In stock',
    imageKey: 'mango',
  },
  {
    id: 'prod-3',
    name: 'Lakatan banana',
    price: '$1.80 / kg',
    stock: 'Low stock',
    imageKey: 'banana',
  },
];

type Tab = 'home' | 'inbox' | 'catalog' | 'settings';
type VoiceState = 'idle' | 'listening' | 'thinking';

interface ChatMessage {
  id: string;
  sender: 'user' | 'mume';
  text: string;
  time: string;
}

function getMumeAiReply(query: string): string {
  const q = query.toLowerCase().trim();
  if (q.includes('apple') || q.includes('mansanas')) {
    return 'Red apples are $2.50 per kilo. In stock with 45 kg ready for delivery. Maria A. asked about this earlier!';
  }
  if (q.includes('mango') || q.includes('mangga')) {
    return 'Carabao mangoes are priced at $4.00 per kilo. We have 30 kg fresh Guimaras harvest in stock.';
  }
  if (q.includes('banana') || q.includes('saging')) {
    return 'Lakatan bananas are $1.80 per kilo. Notice: Stock is currently low (only 8 kg remaining).';
  }
  if (q.includes('order') || q.includes('maria') || q.includes('customer') || q.includes('inquiry')) {
    return "Maria A. wants to buy Red apples ($2.50). You can approve the pre-drafted reply with one tap on your Home screen!";
  }
  if (q.includes('price') || q.includes('catalog') || q.includes('inventory') || q.includes('stock')) {
    return 'Your catalog has 3 items: Red apples ($2.50/kg - In stock), Carabao mango ($4.00/kg - In stock), and Lakatan banana ($1.80/kg - Low stock).';
  }
  if (q.includes('magkano') || q.includes('kumusta') || q.includes('meron') || q.includes('salamat') || q.includes('po')) {
    return 'Hello! Your Facebook Page is synced. Reply ready for Maria A. regarding red apples ($2.50 / kg). Let me know if you want to make changes!';
  }
  if (q.includes('hi') || q.includes('hello') || q.includes('hey') || q.includes('mume')) {
    return "Hello! I'm Mume, your Page AI assistant. Ask me about your customer messages, fruit inventory, or tell me what to draft!";
  }
  return "Got it! I checked your store and Page inquiries. Maria A.'s inquiry for $2.50/kg apples is waiting for approval, and your 3 catalog items are synced. How else can I assist?";
}

function VoiceWave() {
  return (
    <span aria-hidden="true" className="voice-wave">
      {[0, 1, 2, 3, 4].map((bar) => (
        <i key={bar} style={{ animationDelay: `${bar * 80}ms` }} />
      ))}
    </span>
  );
}

function PendingAction({
  onApproved,
  isApproved = false,
  onEditingChange,
}: {
  onApproved: () => void;
  isApproved?: boolean;
  onEditingChange?: (isEditing: boolean) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draftReply, setDraftReply] = useState('Hi! Our red apples are $2.50 / kg. Fresh delivery today.');
  const cardRef = useRef<HTMLDivElement>(null);

  const toggleEditing = () => {
    setEditing((prev) => {
      const next = !prev;
      onEditingChange?.(next);
      if (next) {
        setTimeout(() => {
          cardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 50);
      }
      return next;
    });
  };

  const startEditing = () => {
    setEditing(true);
    onEditingChange?.(true);
    setTimeout(() => {
      cardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  };

  if (isApproved) {
    return (
      <div className="empty-card-approved">
        <div className="empty-check-badge">
          <Icon name="check" size={26} />
        </div>
        <h3 className="empty-card-approved-title">All Caught Up!</h3>
        <p className="empty-card-approved-subtitle">
          Reply confirmed and dispatched to Maria via Meta Graph API.
        </p>
      </div>
    );
  }

  return (
    <section
      ref={cardRef}
      className={`approval-card action-needed-card ${editing ? 'is-editing' : ''}`}
      aria-labelledby="approval-title"
    >
      <div className="customer-row">
        <div className="avatar" aria-hidden="true">
          MA
        </div>
        <div className="flex-1">
          <p className="customer-name">Maria A.</p>
          <p className="customer-context">Messenger · Price inquiry</p>
        </div>
        <span className="time-label">now</span>
      </div>

      <div className="message-bubble">
        <p>“Hi, how much are the red apples?”</p>
      </div>

      {/* Draft block: Entire text is editable */}
      <div className={`draft-block ${editing ? 'draft-block-editing' : ''}`}>
        <div className="draft-label flex items-center gap-1.5">
          <Icon name="bot-svg" size={16} />
          <span>Mume’s suggested reply</span>
        </div>

        {editing ? (
          <div className="draft-editor-wrapper">
            <label htmlFor="draft-reply-input" className="draft-editor-hint">
              Edit message to send to customer:
            </label>
            <textarea
              id="draft-reply-input"
              className="draft-textarea-input"
              value={draftReply}
              onChange={(e) => setDraftReply(e.target.value)}
              onFocus={() => {
                cardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
              rows={3}
              autoFocus
            />
          </div>
        ) : (
          <div
            className="draft-message-display-box"
            onClick={startEditing}
            title="Click to edit full message text"
          >
            <p id="approval-title" className="draft-message-display">
              {draftReply}
            </p>
            <span className="tap-to-edit-hint">Tap to edit full message</span>
          </div>
        )}
      </div>

      <div className="approval-actions">
        <button
          className={`secondary-button min-h-[48px] flex items-center justify-center gap-1.5 ${editing ? 'active' : ''}`}
          onClick={toggleEditing}
          type="button"
        >
          <Icon name={editing ? 'check' : 'edit'} size={16} />
          <span>{editing ? 'Done editing' : 'Edit message'}</span>
        </button>

        <button
          className="primary-button min-h-[48px] flex items-center justify-center gap-1.5"
          onClick={() => {
            setEditing(false);
            onEditingChange?.(false);
            onApproved();
          }}
          type="button"
        >
          <span>Approve & send</span>
          <Icon name="check" size={18} />
        </button>
      </div>
    </section>
  );
}

function HomeScreen({
  userName,
  isLoggedIn,
  onLogin,
  onApproved,
  onOpenInbox,
  onOpenCatalog,
  onOpenSettings,
  chatMessages,
  isAiThinking,
  isChattingOrTyping = false,
  voiceState = 'idle',
  chatCardRef,
  chatScrollRef,
  isApproved = false,
  showApprovedCard = false,
  onEditingChange,
}: {
  userName: string;
  isLoggedIn: boolean;
  onLogin: () => void;
  onApproved: () => void;
  onOpenInbox: () => void;
  onOpenCatalog: () => void;
  onOpenSettings: () => void;
  chatMessages: ChatMessage[];
  isAiThinking: boolean;
  isChattingOrTyping?: boolean;
  voiceState?: VoiceState;
  chatCardRef?: React.RefObject<HTMLDivElement | null>;
  chatScrollRef?: React.RefObject<HTMLDivElement | null>;
  isApproved?: boolean;
  showApprovedCard?: boolean;
  onEditingChange?: (isEditing: boolean) => void;
}) {
  const localChatScrollRef = useRef<HTMLDivElement>(null);
  const activeChatScrollRef = chatScrollRef || localChatScrollRef;

  useEffect(() => {
    if (activeChatScrollRef.current) {
      activeChatScrollRef.current.scrollTop = activeChatScrollRef.current.scrollHeight;
    }
  }, [chatMessages, isAiThinking, activeChatScrollRef]);

  return (
    <>
      <div className="zero-state-hero">
        <div className="hero-copy">
          <h1>{isLoggedIn ? `Hello, ${userName.trim().split(/\s+/)[0] || userName}` : 'Welcome to Mume'}</h1>
          <p>
            {isLoggedIn
              ? 'Welcome to Mume!'
              : 'Connect your Facebook Page to start managing inquiries.'}
          </p>
        </div>

        {isLoggedIn ? (
          <button type="button" className="action-chip" onClick={onOpenInbox}>
            <Icon name="bookmark" size={14} />
            <span>Message (2)</span>
          </button>
        ) : (
          <button type="button" className="action-chip" onClick={onLogin}>
            <Icon name="baseline-facebook" size={14} className="text-[#1877F2]" />
            <span>Login using Facebook</span>
          </button>
        )}
      </div>

      {isLoggedIn ? (
        <>
          {(!isApproved || showApprovedCard) && (
            <>
              <div className="section-heading">
                <h2>Ready for you</h2>
                <span className={isApproved ? 'badge-approved' : 'badge-pending'}>
                  {!isApproved && <span className="status-dot-amber-inline" />}
                  {isApproved ? '0 actions' : '1 action to approve'}
                </span>
              </div>
              <PendingAction
                onApproved={onApproved}
                isApproved={isApproved}
                onEditingChange={onEditingChange}
              />
            </>
          )}

          {/* Mume AI Chat Thread Stream (Positioned below Pending Action Card) */}
          {chatMessages.length > 0 && (
            <div
              ref={chatCardRef}
              className={`chat-section-card ${isChattingOrTyping ? 'highlighted-active' : ''} ${isApproved && !showApprovedCard ? 'expanded' : ''}`}
            >
              <div className="chat-section-header">
                <div className="chat-header-left">
                  <span className={`chat-header-badge ${isChattingOrTyping ? 'active' : ''}`}>
                    <Icon name="bot-svg" size={18} />
                  </span>
                  <strong>Mume AI Chat</strong>
                </div>
                {isChattingOrTyping ? (
                  <span className="active-highlight-badge">
                    <span className="active-highlight-dot" />
                    <span>{voiceState === 'listening' ? 'Listening' : 'Typing…'}</span>
                  </span>
                ) : (
                  <span className="chat-header-subtitle">Talk to AI</span>
                )}
              </div>

              <div className="chat-messages-list" ref={activeChatScrollRef}>
                {chatMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`chat-bubble-row ${msg.sender === 'user' ? 'user-row' : 'mume-row'}`}
                  >
                    {msg.sender === 'mume' && (
                      <span className="chat-avatar-ai">
                        <Icon name="bot-svg" size={15} />
                      </span>
                    )}
                    <div className={`chat-bubble ${msg.sender === 'user' ? 'user-bubble' : 'mume-bubble'}`}>
                      <p className="chat-bubble-text">{msg.text}</p>
                      <span className="chat-bubble-time">{msg.time}</span>
                    </div>
                  </div>
                ))}

                {isAiThinking && (
                  <div className="chat-bubble-row mume-row">
                    <span className="chat-avatar-ai">
                      <Icon name="bot-svg" size={15} />
                    </span>
                    <div className="chat-bubble mume-bubble thinking-bubble">
                      <span className="thinking-dot" />
                      <span className="thinking-text">Mume is thinking…</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="empty-state-card">
          <div className="empty-icon-circle">
            <Icon name="log-in" size={28} />
          </div>
          <h3>No Active Store Connected</h3>
          <p>
            You are currently logged out. Connect your Facebook account to view customer messages, approve drafts, and manage store catalog.
          </p>
          <button type="button" className="fb-login-btn" onClick={onLogin}>
            <Icon name="baseline-facebook" size={18} />
            <span>Login using Facebook</span>
          </button>
        </div>
      )}
    </>
  );
}

function InboxScreen({
  isLoggedIn,
  onLogin,
}: {
  isLoggedIn: boolean;
  onLogin: () => void;
}) {
  return (
    <section className="panel-screen">
      <div className="section-heading">
        <h1>Message</h1>
        <span>{isLoggedIn ? '2 unread' : '0 unread'}</span>
      </div>
      {isLoggedIn ? (
        [
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
        ))
      ) : (
        <div className="empty-state-card">
          <div className="empty-icon-circle">
            <Icon name="message-circle" size={28} />
          </div>
          <h3>No Conversations</h3>
          <p>No customer messages to show. Log in using your Facebook account to synchronize inquiries.</p>
          <button type="button" className="fb-login-btn" onClick={onLogin}>
            <Icon name="baseline-facebook" size={18} />
            <span>Login using Facebook</span>
          </button>
        </div>
      )}
    </section>
  );
}

function CatalogScreen({
  isLoggedIn,
  onLogin,
  products,
  onOpenEditProduct,
  onOpenCreateProduct,
}: {
  isLoggedIn: boolean;
  onLogin: () => void;
  products: Product[];
  onOpenEditProduct: (product: Product) => void;
  onOpenCreateProduct: () => void;
}) {
  return (
    <section className="panel-screen">
      <div className="section-heading flex items-center justify-between">
        <div>
          <h1>Catalog & Inventory</h1>
          <span>{isLoggedIn ? `${products.length} products` : '0 products'}</span>
        </div>
      </div>
      {isLoggedIn ? (
        products.length === 0 ? (
          <div className="empty-catalog-box">
            <p className="font-semibold text-gray-800">No products in catalog</p>
            <p className="text-xs text-gray-500 mt-1">Click the "+" button below to create an item.</p>
          </div>
        ) : (
          <div className="catalog-grid">
            {products.map((item) => (
              <button
                className="product-card min-h-[140px]"
                key={item.id}
                type="button"
                onClick={() => onOpenEditProduct(item)}
              >
                <div className="product-image-container relative w-full">
                  <img
                    src={
                      item.imageUri ||
                      FRUIT_IMAGE_MAP[item.imageKey as 'apple' | 'mango' | 'banana'] ||
                      appleImg
                    }
                    alt={item.name}
                    className="product-image"
                  />
                  <span
                    className={`stock-badge ${
                      item.stock === 'In stock'
                        ? 'stock-in'
                        : item.stock === 'Low stock'
                        ? 'stock-low'
                        : 'stock-out'
                    }`}
                  >
                    {item.stock}
                  </span>
                </div>
                <strong>{item.name}</strong>
                <span className="flex items-center justify-center gap-1 text-sm font-bold text-blue-600">
                  <Icon name="dollar-sign" size={14} />
                  {item.price}
                </span>
              </button>
            ))}
          </div>
        )
      ) : (
        <div className="empty-state-card">
          <div className="empty-icon-circle">
            <Icon name="folder" size={28} />
          </div>
          <h3>Catalog is Empty</h3>
          <p>No products found. Log in using your Facebook account to link and manage your store inventory.</p>
          <button type="button" className="fb-login-btn" onClick={onLogin}>
            <Icon name="baseline-facebook" size={18} />
            <span>Login using Facebook</span>
          </button>
        </div>
      )}
    </section>
  );
}

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('home');
  const [menuOpen, setMenuOpen] = useState(false);
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [userName, setUserName] = useState<string>('Jefferson');
  const [isLoggedIn, setIsLoggedIn] = useState(true);
  const [sent, setSent] = useState(false);
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
  const chatCardRef = useRef<HTMLDivElement | null>(null);
  const chatScrollRef = useRef<HTMLDivElement | null>(null);
  const contentScrollRef = useRef<HTMLDivElement | null>(null);
  const [isEditingActionDraft, setIsEditingActionDraft] = useState(false);

  // Blue highlight triggers only when user is actively typing or dictating via voice
  const isChattingOrTyping = isTyping || voiceState === 'listening';

  const adjustConversationPosition = useCallback((smooth = true) => {
    if (chatCardRef.current && contentScrollRef.current) {
      const container = contentScrollRef.current;
      const card = chatCardRef.current;
      const containerRect = container.getBoundingClientRect();
      const cardRect = card.getBoundingClientRect();

      // Measure relative top distance from container's visible top to the conversation card
      const relativeTop = cardRect.top - containerRect.top;
      const targetOffset = 16; // 16px below header
      const diff = relativeTop - targetOffset;

      // Adjust scroll position smoothly so the conversation card stays directly in view
      if (Math.abs(diff) > 20) {
        container.scrollBy({
          top: diff,
          behavior: smooth ? 'smooth' : 'auto',
        });
      }
    }

    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTo({
        top: chatScrollRef.current.scrollHeight,
        behavior: smooth ? 'smooth' : 'auto',
      });
    }
  }, []);

  const handleTyping = (text: string) => {
    setChatInput(text);
    if (activeTab !== 'home') {
      setActiveTab('home');
    }
    if (text.length > 0) {
      setIsTyping(true);
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      // Highlight vanishes after user pauses/stops typing
      typingTimeoutRef.current = setTimeout(() => {
        setIsTyping(false);
      }, 1000);

      // Keep conversation in view and following while typing
      adjustConversationPosition(true);
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

  // Pro Subscription Upgrade modal state
  const [subscriptionModalOpen, setSubscriptionModalOpen] = useState(false);
  const [isProUser, setIsProUser] = useState(false);
  const [proToast, setProToast] = useState(false);
  const proAutoCloseTimerRef = useRef<number | null>(null);

  const closeSubscriptionModal = useCallback(() => {
    if (proAutoCloseTimerRef.current !== null) {
      window.clearTimeout(proAutoCloseTimerRef.current);
      proAutoCloseTimerRef.current = null;
    }
    setSubscriptionModalOpen(false);
  }, []);

  useEffect(() => {
    const splashTimer = window.setTimeout(() => {
      setShowSplash(false);
      // Auto-show Pro upgrade modal on the home screen for 3 seconds right after the 3s splash
      setSubscriptionModalOpen(true);
      proAutoCloseTimerRef.current = window.setTimeout(() => {
        setSubscriptionModalOpen(false);
        proAutoCloseTimerRef.current = null;
      }, 3000);
    }, 3000);

    return () => {
      window.clearTimeout(splashTimer);
      if (proAutoCloseTimerRef.current !== null) {
        window.clearTimeout(proAutoCloseTimerRef.current);
      }
    };
  }, []);

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

  const handlePickCustomImage = () => {
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
          const result = event.target?.result as string;
          if (result) {
            setProductForm((prev) => ({
              ...prev,
              imageUri: result,
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
    const trimmed = productForm.name.trim();
    if (!trimmed) return;

    setProducts((prev) =>
      prev.map((item) =>
        item.id === selectedProduct.id
          ? {
              ...item,
              name: trimmed,
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
    const trimmed = productForm.name.trim();
    if (!trimmed) return;

    const newProd: Product = {
      id: `prod-${Date.now()}`,
      name: trimmed,
      price: productForm.price.trim() || '$0 / kg',
      stock: productForm.stock,
      isStock: productForm.stock === 'In stock',
      imageKey: productForm.imageKey,
      imageUri: productForm.imageKey === 'custom' ? productForm.imageUri : undefined,
    };
    setProducts((prev) => [...prev, newProd]);
    setIsCreateModalOpen(false);
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

    if (activeTab !== 'home') {
      setActiveTab('home');
    }
    setTimeout(() => adjustConversationPosition(true), 50);

    window.setTimeout(() => {
      const reply = getMumeAiReply(trimmed);
      const aiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        sender: 'mume',
        text: reply,
        time: 'Just now',
      };
      setChatMessages((prev) => [...prev, aiMsg]);
      setIsAiThinking(false);
      setTimeout(() => adjustConversationPosition(true), 50);
    }, 700);
  };

  const userInitials = isLoggedIn
    ? userName.trim().split(/\s+/).filter(Boolean).map(n => n[0]?.toUpperCase()).slice(0, 2).join('') || 'JS'
    : '?';

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

  const [isApproved, setIsApproved] = useState(false);
  const [showApprovedCard, setShowApprovedCard] = useState(false);
  const handleApproved = () => {
    setIsApproved(true);
    setShowApprovedCard(true);
    setSent(true);
    window.setTimeout(() => setShowApprovedCard(false), 2000);
    window.setTimeout(() => setSent(false), 3500);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setUserName('');
    setIsApproved(false);
    setShowApprovedCard(false);
    setMenuOpen(false);
  };

  const handleLogin = () => {
    setIsLoggedIn(true);
    setUserName('Jefferson');
    setIsApproved(false);
    setShowApprovedCard(false);
    setMenuOpen(false);
  };

  return (
    <div className="app-shell">
      <main className="phone-stage max-w-[412px] min-w-[360px] mx-auto border-x border-[var(--line)] shadow-2xl relative">
        {/* Opening Splash Animation (0.8s) */}
        {showSplash && (
          <div className="mume-splash-screen" aria-label="Mume">
            <div className="mume-splash-backdrop" />
            <div className="mume-splash-logo-container">
              <img
                src={mumeBlackSvg}
                alt="Mume"
                className="mume-splash-logo mume-splash-logo-black"
              />
              <img
                src={mumeWhiteSvg}
                alt="Mume"
                className="mume-splash-logo mume-splash-logo-white"
              />
            </div>
          </div>
        )}

        {/* Dynamic Top Header */}
        <Header
          title={activeTab === 'settings' ? 'Settings' : activeTab === 'inbox' ? 'Message' : activeTab === 'catalog' ? 'Catalog' : 'Mume'}
          subtitle={isLoggedIn ? 'Mume Fresh - Fruit Store' : 'No Store Linked'}
          showBack={activeTab !== 'home'}
          userInitials={userInitials}
          onBack={() => setActiveTab('home')}
          onMenuClick={() => setMenuOpen(true)}
          onProfileClick={() => {
            if (proAutoCloseTimerRef.current !== null) {
              window.clearTimeout(proAutoCloseTimerRef.current);
              proAutoCloseTimerRef.current = null;
            }
            setSubscriptionModalOpen(true);
          }}
        />

        {/* Content Scroll View (Ergonomic layout for Android 360dp - 412dp) */}
        <div
          className={`content-scroll ${isEditingActionDraft ? 'editing-draft' : ''} ${activeTab === 'catalog' ? 'catalog-view-scroll' : ''} ${isApproved && !showApprovedCard ? 'chat-expanded-scroll' : ''}`}
          ref={contentScrollRef}
        >
          {activeTab === 'home' && (
            <HomeScreen
              userName={userName}
              isLoggedIn={isLoggedIn}
              onLogin={handleLogin}
              onApproved={handleApproved}
              onOpenInbox={() => setActiveTab('inbox')}
              onOpenCatalog={() => setActiveTab('catalog')}
              onOpenSettings={() => setActiveTab('settings')}
              chatMessages={chatMessages}
              isAiThinking={isAiThinking}
              isChattingOrTyping={isChattingOrTyping}
              voiceState={voiceState}
              chatCardRef={chatCardRef}
              chatScrollRef={chatScrollRef}
              isApproved={isApproved}
              showApprovedCard={showApprovedCard}
              onEditingChange={setIsEditingActionDraft}
            />
          )}
          {activeTab === 'inbox' && (
            <InboxScreen
              isLoggedIn={isLoggedIn}
              onLogin={handleLogin}
            />
          )}
          {activeTab === 'catalog' && (
            <CatalogScreen
              isLoggedIn={isLoggedIn}
              onLogin={handleLogin}
              products={products}
              onOpenEditProduct={handleOpenEditProduct}
              onOpenCreateProduct={handleOpenCreateProduct}
            />
          )}
          {activeTab === 'settings' && (
            <SettingsView
              onBack={() => setActiveTab('home')}
              userName={userName}
              onUserNameChange={setUserName}
            />
          )}
        </div>

        {/* Gemini-Style Floating Bottom Input Capsule Dock (Size x 2 with Multi-Line Text Input & Send) */}
        {activeTab !== 'settings' && activeTab !== 'catalog' && !isEditingActionDraft && (
          <div className="input-capsule-container">
            <div className="input-capsule size-x2">
              {/* Top Row: Merchant can write a message to talk to AI */}
              <div className="capsule-text-container">
                <textarea
                  className="capsule-text-input"
                  placeholder="Ask Mume or write a message…"
                  value={chatInput}
                  onChange={(e) => handleTyping(e.target.value)}
                  onFocus={() => {
                    setIsInputFocused(true);
                    if (activeTab !== 'home') setActiveTab('home');
                    adjustConversationPosition(true);
                  }}
                  onBlur={() => {
                    setIsInputFocused(false);
                    if (typingTimeoutRef.current) {
                      clearTimeout(typingTimeoutRef.current);
                    }
                    setIsTyping(false);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  rows={2}
                />
              </div>

              {/* Bottom Row: Quick Tools, Status & Controls */}
              <div className="capsule-controls-row">
                <button
                  type="button"
                  className="capsule-plus-button"
                  onClick={() => setActiveTab('catalog')}
                  aria-label="Upload and quick actions"
                >
                  +
                </button>

                <div className="capsule-status-area">
                  {voiceState === 'listening' && (
                    <div className="capsule-voice-row">
                      <VoiceWave />
                      <span className="capsule-status">Listening…</span>
                    </div>
                  )}
                  {voiceState === 'thinking' && (
                    <div className="capsule-voice-row">
                      <Icon name="bot-svg" size={15} />
                      <span className="capsule-status">Checking your page…</span>
                    </div>
                  )}
                  {voiceState === 'idle' && !chatInput && (
                    <span className="capsule-hint">Tap mic or write to AI</span>
                  )}
                </div>

                <div className="capsule-actions-right">
                  <button
                    type="button"
                    className={`capsule-mic-button-small ${voiceState === 'listening' ? 'active' : ''}`}
                    onClick={handleVoice}
                    aria-label="Dictate and talk to Mume"
                  >
                    {voiceState === 'thinking' ? (
                      <Icon name="bot-svg" size={17} />
                    ) : voiceState === 'listening' ? (
                      <Icon name="audio-waveform" size={17} />
                    ) : (
                      <span>🎙️</span>
                    )}
                  </button>

                  <button
                    type="button"
                    className={`capsule-send-button ${chatInput.trim() ? 'active' : ''}`}
                    onClick={handleSendMessage}
                    disabled={!chatInput.trim() || isAiThinking}
                    aria-label="Send message to AI"
                  >
                    <Icon name="send" size={15} />
                  </button>
                </div>
              </div>
            </div>
            <p className="capsule-disclaimer">Nothing is sent without your approval.</p>
          </div>
        )}

        {/* Floating Add Product Button at Bottom for Catalog */}
        {activeTab === 'catalog' && isLoggedIn && (
          <button
            type="button"
            className="add-product-fab"
            aria-label="Add"
            onClick={handleOpenCreateProduct}
          >
            <Icon name="round-plus" size={24} />
          </button>
        )}

        {/* Slide-out Menu Drawer containing all navigation options */}
        {menuOpen && (
          <div className="drawer-overlay" role="dialog" aria-modal="true" aria-label="Main menu">
            <div
              className="drawer-backdrop"
              onClick={() => setMenuOpen(false)}
              aria-hidden="true"
            />
            <div className="drawer-panel">
              {/* Drawer Header */}
              <div className="drawer-header">
                <div className="drawer-brand">
                  <Icon name="mume-black" size={24} />
                </div>
                <button
                  type="button"
                  className="drawer-close-btn"
                  onClick={() => setMenuOpen(false)}
                  aria-label="Close menu"
                >
                  <Icon name="x" size={18} />
                </button>
              </div>

              {/* Store details */}
              <div className="drawer-store-card">
                <strong>{isLoggedIn ? 'Mume Fresh - Fruit Store' : 'No Store Linked'}</strong>
                <span>{isLoggedIn ? 'Messenger AI Assistant · Meta Synced' : 'Log in with Facebook to sync store'}</span>
              </div>

              {/* Options Navigation */}
              <div className="drawer-nav">
                <span className="drawer-section-heading">NAVIGATION</span>

                <button
                  type="button"
                  className={`drawer-nav-item ${activeTab === 'home' ? 'active' : ''}`}
                  onClick={() => {
                    setActiveTab('home');
                    setMenuOpen(false);
                  }}
                >
                  <span className="drawer-icon-wrap">
                    <Icon name="home" size={18} />
                  </span>
                  <div className="drawer-nav-copy">
                    <strong>Home</strong>
                    <span>Overview & action items</span>
                  </div>
                  {activeTab === 'home' && <i className="drawer-active-bar" />}
                </button>

                <button
                  type="button"
                  className={`drawer-nav-item ${activeTab === 'inbox' ? 'active' : ''}`}
                  onClick={() => {
                    setActiveTab('inbox');
                    setMenuOpen(false);
                  }}
                >
                  <span className="drawer-icon-wrap">
                    <Icon name="bookmark" size={18} />
                  </span>
                  <div className="drawer-nav-copy">
                    <strong>Message</strong>
                    <span>Customer inquiries</span>
                  </div>
                  <span className="drawer-badge">{isLoggedIn ? 2 : 0}</span>
                </button>

                <button
                  type="button"
                  className={`drawer-nav-item ${activeTab === 'catalog' ? 'active' : ''}`}
                  onClick={() => {
                    setActiveTab('catalog');
                    setMenuOpen(false);
                  }}
                >
                  <span className="drawer-icon-wrap">
                    <Icon name="folder" size={18} />
                  </span>
                  <div className="drawer-nav-copy">
                    <strong>Catalog</strong>
                    <span>Products & prices</span>
                  </div>
                  <span className="drawer-badge-secondary">{isLoggedIn ? products.length : 0}</span>
                </button>

                <button
                  type="button"
                  className={`drawer-nav-item ${activeTab === 'settings' ? 'active' : ''}`}
                  onClick={() => {
                    setActiveTab('settings');
                    setMenuOpen(false);
                  }}
                >
                  <span className="drawer-icon-wrap">
                    <Icon name="wrench" size={18} />
                  </span>
                  <div className="drawer-nav-copy">
                    <strong>Settings</strong>
                    <span>Meta token & configuration</span>
                  </div>
                  {activeTab === 'settings' && <i className="drawer-active-bar" />}
                </button>
              </div>

              <div className="flex-1" />

              {/* User Profile Footer or Login */}
              {isLoggedIn ? (
                <div className="drawer-user-footer">
                  <button
                    type="button"
                    className="drawer-user-info"
                    onClick={() => {
                      setActiveTab('settings');
                      setMenuOpen(false);
                    }}
                  >
                    <span className="avatar drawer-avatar">{userInitials}</span>
                    <div className="drawer-user-copy">
                      <strong>{userName}</strong>
                      <span>Store Owner · Admin</span>
                    </div>
                  </button>
                  <button
                    type="button"
                    className="drawer-logout-btn"
                    onClick={() => setLogoutConfirmOpen(true)}
                    aria-label="Log out"
                    title="Log out"
                  >
                    <Icon name="log-out" size={18} />
                  </button>
                </div>
              ) : (
                <div className="drawer-user-footer">
                  <button
                    type="button"
                    className="drawer-login-btn"
                    onClick={handleLogin}
                  >
                    <Icon name="baseline-facebook" size={18} />
                    <span>Login using Facebook</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Logout Confirmation Dialog Modal */}
        {logoutConfirmOpen && (
          <div className="confirm-modal-overlay" onClick={() => setLogoutConfirmOpen(false)}>
            <div className="confirm-modal-card" onClick={(e) => e.stopPropagation()}>
              <div className="confirm-modal-icon-circle">
                <Icon name="log-out" size={24} />
              </div>
              <h3>Log Out of Mume?</h3>
              <p>Are you sure you want to log out? You will need to reconnect to manage your store inquiries.</p>
              <div className="confirm-modal-actions-row">
                <button
                  type="button"
                  className="confirm-modal-cancel-btn"
                  onClick={() => setLogoutConfirmOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="confirm-modal-logout-btn"
                  onClick={() => {
                    setLogoutConfirmOpen(false);
                    handleLogout();
                  }}
                >
                  Log Out
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Product Modal */}
        {selectedProduct && (
          <div className="product-modal-overlay" onClick={() => setSelectedProduct(null)}>
            <div className="product-modal-card" onClick={(e) => e.stopPropagation()}>
              <div className="product-modal-header">
                <div>
                  <h3>Edit Product</h3>
                  <p>Update fruit details or delete item</p>
                </div>
                <button
                  type="button"
                  className="product-modal-close-btn"
                  onClick={() => setSelectedProduct(null)}
                  aria-label="Close"
                >
                  <Icon name="x" size={20} />
                </button>
              </div>

              <div className="product-modal-body">
                <label className="product-field-label">Product Photo</label>
                <button
                  type="button"
                  className={`upload-photo-btn ${(productForm.imageUri || productForm.imageKey) ? 'active' : ''}`}
                  onClick={handlePickCustomImage}
                >
                  {(productForm.imageUri || (productForm.imageKey && FRUIT_IMAGE_MAP[productForm.imageKey as 'apple' | 'mango' | 'banana'])) ? (
                    <div className="upload-photo-preview-row">
                      <img
                        src={productForm.imageUri || FRUIT_IMAGE_MAP[productForm.imageKey as 'apple' | 'mango' | 'banana']}
                        alt="Product preview"
                        className="upload-photo-preview-thumb"
                      />
                      <div className="text-left flex-1">
                        <strong className="text-xs text-gray-900 block">
                          {productForm.imageUri ? 'Custom Photo Added' : 'Product Photo'}
                        </strong>
                        <span className="text-[11px] text-gray-500">Click to change photo</span>
                      </div>
                      <span className="upload-photo-badge">
                        <Icon name="camera" size={13} />
                        Change
                      </span>
                    </div>
                  ) : (
                    <div className="upload-photo-placeholder-row">
                      <div className="upload-photo-icon-circle">
                        <Icon name="camera" size={18} />
                      </div>
                      <div className="text-left flex-1">
                        <strong className="text-xs text-gray-900 block">Upload from Device / Camera</strong>
                        <span className="text-[11px] text-gray-500">Select any image or take a photo</span>
                      </div>
                    </div>
                  )}
                </button>

                <label className="product-field-label">Product Name</label>
                <input
                  type="text"
                  className="product-modal-input"
                  value={productForm.name}
                  onChange={(e) => setProductForm((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g. Red apples"
                />

                <label className="product-field-label">Price</label>
                <input
                  type="text"
                  className="product-modal-input"
                  value={productForm.price}
                  onChange={(e) => setProductForm((prev) => ({ ...prev, price: e.target.value }))}
                  placeholder="e.g. $2.50 / kg"
                />

                <label className="product-field-label">Stock Status</label>
                <div className="stock-status-row">
                  {(['In stock', 'Low stock', 'Out of stock'] as const).map((st) => (
                    <button
                      key={st}
                      type="button"
                      className={`stock-status-btn ${productForm.stock === st ? 'active' : ''}`}
                      onClick={() => setProductForm((prev) => ({ ...prev, stock: st }))}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              <div className="product-modal-actions">
                <button
                  type="button"
                  className="product-delete-btn"
                  onClick={handleDeleteProduct}
                >
                  <Icon name="trash" size={16} />
                  <span>Delete</span>
                </button>

                <div className="product-modal-right-btns">
                  <button
                    type="button"
                    className="product-cancel-btn"
                    onClick={() => setSelectedProduct(null)}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="product-save-btn"
                    onClick={handleSaveProductEdit}
                  >
                    Save
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Create Product Modal */}
        {isCreateModalOpen && (
          <div className="product-modal-overlay" onClick={() => setIsCreateModalOpen(false)}>
            <div className="product-modal-card" onClick={(e) => e.stopPropagation()}>
              <div className="product-modal-header">
                <div>
                  <h3>Add New Product</h3>
                  <p>Create a new item in your catalog</p>
                </div>
                <button
                  type="button"
                  className="product-modal-close-btn"
                  onClick={() => setIsCreateModalOpen(false)}
                  aria-label="Close"
                >
                  <Icon name="x" size={20} />
                </button>
              </div>

              <div className="product-modal-body">
                <label className="product-field-label">Product Photo</label>
                <button
                  type="button"
                  className={`upload-photo-btn ${productForm.imageUri ? 'active' : ''}`}
                  onClick={handlePickCustomImage}
                >
                  {productForm.imageUri ? (
                    <div className="upload-photo-preview-row">
                      <img
                        src={productForm.imageUri}
                        alt="Product preview"
                        className="upload-photo-preview-thumb"
                      />
                      <div className="text-left flex-1">
                        <strong className="text-xs text-gray-900 block">
                          Custom Photo Added
                        </strong>
                        <span className="text-[11px] text-gray-500">Click to change photo</span>
                      </div>
                      <span className="upload-photo-badge">
                        <Icon name="camera" size={13} />
                        Change
                      </span>
                    </div>
                  ) : (
                    <div className="upload-photo-placeholder-row">
                      <div className="upload-photo-icon-circle">
                        <Icon name="camera" size={18} />
                      </div>
                      <div className="text-left flex-1">
                        <strong className="text-xs text-gray-900 block">Upload from Device / Camera</strong>
                        <span className="text-[11px] text-gray-500">Select any image or take a photo</span>
                      </div>
                    </div>
                  )}
                </button>

                <label className="product-field-label">Product Name</label>
                <input
                  type="text"
                  autoFocus
                  className="product-modal-input"
                  value={productForm.name}
                  onChange={(e) => setProductForm((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g. Fuji Apple"
                />

                <label className="product-field-label">Price</label>
                <input
                  type="text"
                  className="product-modal-input"
                  value={productForm.price}
                  onChange={(e) => setProductForm((prev) => ({ ...prev, price: e.target.value }))}
                  placeholder="e.g. $3.00 / kg"
                />

                <label className="product-field-label">Stock Status</label>
                <div className="stock-status-row">
                  {(['In stock', 'Low stock', 'Out of stock'] as const).map((st) => (
                    <button
                      key={st}
                      type="button"
                      className={`stock-status-btn ${productForm.stock === st ? 'active' : ''}`}
                      onClick={() => setProductForm((prev) => ({ ...prev, stock: st }))}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              <div className="product-modal-actions">
                <div className="flex-1" />
                <div className="product-modal-right-btns">
                  <button
                    type="button"
                    className="product-cancel-btn"
                    onClick={() => setIsCreateModalOpen(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="product-save-btn"
                    disabled={!productForm.name.trim()}
                    style={!productForm.name.trim() ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
                    onClick={handleSaveCreateProduct}
                  >
                    Add Product
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Subscription Upgrade to Pro Modal */}
        {subscriptionModalOpen && (
          <div className="product-modal-overlay" onClick={closeSubscriptionModal}>
            <div className="pro-modal-card" onClick={(e) => e.stopPropagation()}>
              {/* Header with badge and close button */}
              <div className="pro-modal-header">
                <div className="pro-plan-badge">
                  <Icon name="subscription-upgrade" size={14} className="text-white" />
                  <span>MUME PRO</span>
                </div>
                <button
                  type="button"
                  className="pro-modal-close-btn"
                  onClick={closeSubscriptionModal}
                  aria-label="Close"
                >
                  <Icon name="x" size={18} />
                </button>
              </div>

              <h2 className="pro-modal-title">Upgrade to Pro</h2>
              <p className="pro-modal-subtitle">
                Unlock unlimited capabilities to scale your store catalog and chat with AI effortlessly.
              </p>

              {/* Price card */}
              <div className="pro-price-box">
                <div className="pro-price-header">
                  <span className="pro-price-tier">Pro Store Membership</span>
                  <span className="pro-price-tag">Most Popular</span>
                </div>
                <div className="pro-price-amount-row">
                  <span className="pro-price-currency">$</span>
                  <span className="pro-price-number">9.99</span>
                  <span className="pro-price-period">/ month</span>
                </div>
                <p className="pro-price-guarantee">7-day free trial · Cancel anytime with 1-click</p>
              </div>

              {/* Feature Highlights */}
              <div className="pro-features-list">
                <div className="pro-feature-item">
                  <div className="pro-feature-icon-circle">
                    <Icon name="folder" size={18} />
                  </div>
                  <div className="pro-feature-text-col">
                    <h4>Additional Product Space for Catalog</h4>
                    <p>Unlimited inventory items, custom photos, and high-res variants without restrictions.</p>
                  </div>
                </div>

                <div className="pro-feature-item">
                  <div className="pro-feature-icon-circle">
                    <Icon name="audio-waveform" size={18} />
                  </div>
                  <div className="pro-feature-text-col">
                    <h4>Unlimited Voice Chat</h4>
                    <p>Dictate commands, inquire about stock, and draft replies with zero audio limits.</p>
                  </div>
                </div>

                <div className="pro-feature-item">
                  <div className="pro-feature-icon-circle">
                    <Icon name="bot-svg" size={18} />
                  </div>
                  <div className="pro-feature-text-col">
                    <h4>24/7 Meta Messenger Auto-Sync</h4>
                    <p>Instant price inquiry detection and automated smart reply generation.</p>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="pro-modal-actions">
                <button
                  type="button"
                  className={`pro-upgrade-btn ${isProUser ? 'active' : ''}`}
                  onClick={() => {
                    if (proAutoCloseTimerRef.current !== null) {
                      window.clearTimeout(proAutoCloseTimerRef.current);
                      proAutoCloseTimerRef.current = null;
                    }
                    setIsProUser(true);
                    setSubscriptionModalOpen(false);
                    setProToast(true);
                    window.setTimeout(() => setProToast(false), 3500);
                  }}
                >
                  <Icon name={isProUser ? 'check' : 'subscription-upgrade'} size={18} />
                  <span>{isProUser ? 'Pro Plan Active' : 'Start 7-Day Free Trial'}</span>
                </button>

                <button
                  type="button"
                  className="pro-dismiss-btn"
                  onClick={closeSubscriptionModal}
                >
                  Maybe Later
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Approval Confirmation Toast */}
        {sent && (
          <div className="toast" role="status">
            <span>
              <Icon name="check" size={18} />
            </span>
            <span>Reply sent to Maria</span>
          </div>
        )}

        {/* Pro Subscription Toast */}
        {proToast && (
          <div className="toast" role="status">
            <span>
              <Icon name="subscription-upgrade" size={18} className="text-yellow-400" />
            </span>
            <span>Welcome to Mume Pro! Unlimited features unlocked.</span>
          </div>
        )}
      </main>
    </div>
  );
}
