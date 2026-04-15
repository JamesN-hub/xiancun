import { useState, useEffect, useMemo, Component, ErrorInfo, ReactNode } from 'react';
import { 
  onAuthStateChanged, 
  User 
} from 'firebase/auth';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  deleteDoc, 
  doc, 
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
  orderBy,
  getDocFromServer
} from 'firebase/firestore';
import { 
  Plus, 
  Settings as SettingsIcon, 
  Refrigerator, 
  Snowflake, 
  LogOut, 
  ChevronRight, 
  Trash2, 
  Camera, 
  Share2,
  AlertTriangle,
  Clock,
  Home,
  AlertCircle,
  RefreshCcw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format, differenceInDays, addDays, isPast, isToday, parseISO } from 'date-fns';
import { auth, db, loginWithGoogle, logout, handleFirestoreError, OperationType } from './firebase';
import { cn } from './lib/utils';
import { FoodItem, Family } from './types';

// --- Error Boundary ---

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      let errorMessage = "發生了預期外的錯誤。";
      try {
        const parsed = JSON.parse(this.state.error?.message || "");
        if (parsed.error && parsed.error.includes("Missing or insufficient permissions")) {
          errorMessage = "存取權限不足，請確認您是否已加入家庭群組。";
        }
      } catch (e) {
        // Not a JSON error
      }

      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
          <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-100 max-w-sm w-full text-center space-y-6">
            <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto">
              <AlertCircle className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-slate-900">哎呀！出錯了</h2>
              <p className="text-slate-500 text-sm leading-relaxed">{errorMessage}</p>
            </div>
            <Button onClick={() => window.location.reload()} className="w-full gap-2">
              <RefreshCcw className="w-4 h-4" /> 重新整理
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// --- Components ---
// ... (rest of the components remain same)

const Button = ({ 
  children, 
  className, 
  variant = 'primary', 
  size = 'md',
  ...props 
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { 
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
}) => {
  const variants = {
    primary: 'bg-emerald-600 text-white border-emerald-700 hover:bg-emerald-700 shadow-sm',
    secondary: 'bg-slate-100 text-slate-900 border-slate-200 hover:bg-slate-200',
    danger: 'bg-rose-50 text-rose-600 border-rose-100 hover:bg-rose-100',
    ghost: 'bg-transparent hover:bg-slate-100 text-slate-600 border-transparent',
    outline: 'border-2 border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
  };
  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2',
    lg: 'px-6 py-3 text-lg font-bold'
  };
  return (
    <button 
      className={cn(
        'hand-button inline-flex items-center justify-center transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none font-hand',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
};

const Card = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <div className={cn('hand-card overflow-hidden', className)}>
    {children}
  </div>
);

const Input = ({ label, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label?: string }) => (
  <div className="space-y-1.5">
    {label && <label className="text-sm font-bold text-slate-700 ml-1 font-hand">{label}</label>}
    <input 
      className="w-full px-4 py-2.5 bg-white border-2 border-slate-200 focus:border-emerald-500 focus:ring-0 outline-none transition-all font-hand"
      style={{ borderRadius: '8px 16px 8px 16px/16px 8px 16px 8px' }}
      {...props}
    />
  </div>
);

// --- Main App ---

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [family, setFamily] = useState<Family | null>(null);
  const [items, setItems] = useState<FoodItem[]>([]);
  const [activeTab, setActiveTab] = useState<'fridge' | 'freezer'>('fridge');
  const [view, setView] = useState<'dashboard' | 'add' | 'settings'>('dashboard');
  const [apiKey, setApiKey] = useState<string>(localStorage.getItem('FRESH_TRACK_AI_KEY') || '');

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        // Sync user profile
        try {
          await setDoc(doc(db, 'users', u.uid), {
            uid: u.uid,
            email: u.email,
            displayName: u.displayName,
            photoURL: u.photoURL,
            lastLogin: new Date().toISOString()
          }, { merge: true });
          
          // Test connection
          await getDocFromServer(doc(db, 'users', u.uid)).catch(err => {
            if (err.message.includes('offline')) {
              console.error("Firebase 離線或配置錯誤");
            }
          });
        } catch (err) {
          console.error("Failed to sync user profile:", err);
        }
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  // Family & Items Sync
  useEffect(() => {
    if (!user) {
      setFamily(null);
      setItems([]);
      return;
    }

    // First, find the family the user belongs to
    const familyQuery = query(collection(db, 'families'), where('members', 'array-contains', user.uid));
    const unsubFamily = onSnapshot(familyQuery, (snapshot) => {
      if (!snapshot.empty) {
        const familyDoc = snapshot.docs[0];
        setFamily({ id: familyDoc.id, ...familyDoc.data() } as Family);
      } else {
        setFamily(null);
      }
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'families'));

    return () => unsubFamily();
  }, [user]);

  useEffect(() => {
    if (!family) {
      setItems([]);
      return;
    }

    const itemsQuery = query(
      collection(db, 'items'), 
      where('familyId', '==', family.id),
      orderBy('createdAt', 'desc')
    );
    const unsubItems = onSnapshot(itemsQuery, (snapshot) => {
      const itemsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FoodItem));
      setItems(itemsData);
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'items'));

    return () => unsubItems();
  }, [family]);

  // Actions
  const handleCreateFamily = async (name: string) => {
    if (!user) return;
    try {
      const familyData = {
        name,
        ownerUid: user.uid,
        members: [user.uid]
      };
      await addDoc(collection(db, 'families'), familyData);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'families');
    }
  };

  const handleJoinFamily = async (familyId: string) => {
    if (!user) return;
    try {
      const familyRef = doc(db, 'families', familyId);
      const familySnap = await getDoc(familyRef);
      if (familySnap.exists()) {
        const data = familySnap.data();
        if (!data.members.includes(user.uid)) {
          await updateDoc(familyRef, {
            members: [...data.members, user.uid]
          });
        }
      } else {
        alert('找不到該家庭 ID');
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'families');
    }
  };

  const handleAddItem = async (item: Omit<FoodItem, 'id' | 'familyId' | 'addedBy' | 'addedByName' | 'createdAt'>) => {
    if (!user || !family) return;
    try {
      await addDoc(collection(db, 'items'), {
        ...item,
        familyId: family.id,
        addedBy: user.uid,
        addedByName: user.displayName || '未知用戶',
        createdAt: new Date().toISOString()
      });
      setView('dashboard');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'items');
    }
  };

  const handleDeleteItem = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'items', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, 'items');
    }
  };

  const saveApiKey = (key: string) => {
    setApiKey(key);
    localStorage.setItem('FRESH_TRACK_AI_KEY', key);
  };

  if (loading) return (
    <div className="min-h-screen bg-warm-bg flex items-center justify-center">
      <div className="animate-pulse flex flex-col items-center gap-4">
        <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center" style={{ borderRadius: '24px 48px 24px 48px/48px 24px 48px 24px' }}>
          <Refrigerator className="w-8 h-8 text-emerald-600" />
        </div>
        <p className="text-slate-500 font-bold font-hand">載入中...</p>
      </div>
    </div>
  );

  if (!user) return <LoginView onLogin={loginWithGoogle} />;

  if (!family) return <OnboardingView onCreate={handleCreateFamily} onJoin={handleJoinFamily} onLogout={logout} />;

  return (
    <div className="min-h-screen bg-warm-bg text-slate-800 font-hand pb-24">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b-2 border-slate-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-100" style={{ borderRadius: '12px 24px 12px 24px/24px 12px 24px 12px' }}>
            <Refrigerator className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight font-hand">鮮存</h1>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full border-2 border-emerald-100 font-hand">
            {family.name}
          </span>
          <img src={user.photoURL || ''} className="w-8 h-8 rounded-full border-2 border-slate-200" alt="Avatar" />
        </div>
      </header>

      <main className="max-w-md mx-auto px-6 pt-6">
        <AnimatePresence mode="wait">
          {view === 'dashboard' && (
            <motion.div 
              key="dashboard"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {/* Tabs */}
              <div className="flex p-1 bg-slate-100 rounded-xl border-2 border-slate-200" style={{ borderRadius: '12px 24px 12px 24px/24px 12px 24px 12px' }}>
                <button 
                  onClick={() => setActiveTab('fridge')}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-lg font-bold transition-all font-hand",
                    activeTab === 'fridge' ? "bg-white text-emerald-600 shadow-sm border-2 border-emerald-100" : "text-slate-500 hover:text-slate-700"
                  )}
                  style={{ borderRadius: '8px 16px 8px 16px/16px 8px 16px 8px' }}
                >
                  <Refrigerator className="w-5 h-5" /> 冷藏
                </button>
                <button 
                  onClick={() => setActiveTab('freezer')}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-lg font-bold transition-all font-hand",
                    activeTab === 'freezer' ? "bg-white text-blue-600 shadow-sm border-2 border-blue-100" : "text-slate-500 hover:text-slate-700"
                  )}
                  style={{ borderRadius: '8px 16px 8px 16px/16px 8px 16px 8px' }}
                >
                  <Snowflake className="w-5 h-5" /> 冷凍
                </button>
              </div>

              {/* List */}
              <div className="space-y-3">
                {items.filter(i => i.category === activeTab).length === 0 ? (
                  <div className="py-12 text-center space-y-3">
                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto">
                      <Clock className="w-8 h-8 text-slate-300" />
                    </div>
                    <p className="text-slate-400">目前沒有食材，快去採購吧！</p>
                  </div>
                ) : (
                  items.filter(i => i.category === activeTab).map(item => (
                    <ItemCard key={item.id} item={item} onDelete={() => handleDeleteItem(item.id)} />
                  ))
                )}
              </div>
            </motion.div>
          )}

          {view === 'add' && (
            <motion.div 
              key="add"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
            >
              <AddItemView onAdd={handleAddItem} onCancel={() => setView('dashboard')} hasApiKey={!!apiKey} />
            </motion.div>
          )}

          {view === 'settings' && (
            <motion.div 
              key="settings"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <SettingsView 
                family={family} 
                apiKey={apiKey} 
                onSaveApiKey={saveApiKey} 
                onLogout={logout} 
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-md border-t-2 border-slate-200 px-8 py-4 flex items-center justify-between z-40">
        <button onClick={() => setView('dashboard')} className={cn("p-2 rounded-xl transition-all", view === 'dashboard' ? "text-emerald-600 bg-emerald-50 border-2 border-emerald-200" : "text-slate-400 border-2 border-transparent")}>
          <Home className="w-6 h-6" />
        </button>
        <button 
          onClick={() => setView('add')}
          className="absolute -top-6 left-1/2 -translate-x-1/2 w-14 h-14 bg-emerald-600 rounded-full flex items-center justify-center text-white shadow-lg shadow-emerald-200 active:scale-90 transition-all border-4 border-white"
          style={{ borderRadius: '50% 50% 50% 50% / 50% 50% 50% 50%' }}
        >
          <Plus className="w-8 h-8" />
        </button>
        <button onClick={() => setView('settings')} className={cn("p-2 rounded-xl transition-all", view === 'settings' ? "text-emerald-600 bg-emerald-50 border-2 border-emerald-200" : "text-slate-400 border-2 border-transparent")}>
          <SettingsIcon className="w-6 h-6" />
        </button>
      </nav>
    </div>
  );
}

export default function AppWithErrorBoundary() {
  return (
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
}

// --- Sub-Views ---

function LoginView({ onLogin }: { onLogin: () => void }) {
  return (
    <div className="min-h-screen bg-warm-bg flex flex-col items-center justify-center px-8 text-center">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-8 max-w-xs"
      >
        <div className="w-24 h-24 bg-emerald-600 rounded-3xl flex items-center justify-center mx-auto shadow-xl shadow-emerald-100" style={{ borderRadius: '24px 48px 24px 48px/48px 24px 48px 24px' }}>
          <Refrigerator className="w-12 h-12 text-white" />
        </div>
        <div className="space-y-2">
          <h1 className="text-4xl font-bold text-slate-900 font-hand">鮮存 FreshTrack</h1>
          <p className="text-slate-500 font-hand text-lg">模組化冰箱管理，讓食材不再過期。</p>
        </div>
        <Button onClick={onLogin} size="lg" className="w-full gap-3 py-4">
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/action/google.svg" className="w-5 h-5" alt="Google" />
          使用 Google 登入
        </Button>
      </motion.div>
    </div>
  );
}

function OnboardingView({ onCreate, onJoin, onLogout }: { 
  onCreate: (name: string) => void; 
  onJoin: (id: string) => void;
  onLogout: () => void;
}) {
  const [mode, setMode] = useState<'select' | 'create' | 'join'>('select');
  const [value, setValue] = useState('');

  return (
    <div className="min-h-screen bg-warm-bg flex items-center justify-center px-6">
      <Card className="w-full max-w-sm p-8 space-y-6">
        <div className="text-center space-y-2">
          <h2 className="text-3xl font-bold text-slate-900 font-hand">歡迎使用鮮存</h2>
          <p className="text-slate-500 font-hand text-lg">請先建立或加入一個家庭群組</p>
        </div>

        {mode === 'select' && (
          <div className="space-y-4">
            <Button onClick={() => setMode('create')} className="w-full py-4 text-xl" variant="primary">建立新家庭</Button>
            <Button onClick={() => setMode('join')} className="w-full py-4 text-xl" variant="outline">加入現有家庭</Button>
            <Button onClick={onLogout} className="w-full font-hand" variant="ghost">登出</Button>
          </div>
        )}

        {mode === 'create' && (
          <div className="space-y-4">
            <Input label="家庭名稱" placeholder="例如：王小明的家" value={value} onChange={e => setValue(e.target.value)} />
            <div className="flex gap-2">
              <Button onClick={() => setMode('select')} variant="ghost" className="flex-1">返回</Button>
              <Button onClick={() => onCreate(value)} className="flex-1" disabled={!value.trim()}>建立</Button>
            </div>
          </div>
        )}

        {mode === 'join' && (
          <div className="space-y-4">
            <Input label="家庭 ID" placeholder="貼上邀請碼" value={value} onChange={e => setValue(e.target.value)} />
            <div className="flex gap-2">
              <Button onClick={() => setMode('select')} variant="ghost" className="flex-1">返回</Button>
              <Button onClick={() => onJoin(value)} className="flex-1" disabled={!value.trim()}>加入</Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

function ItemCard({ item, onDelete }: { item: FoodItem; onDelete: () => void }) {
  const purchaseDate = parseISO(item.purchaseDate);
  const expiryDate = addDays(purchaseDate, item.expiryDays);
  const daysLeft = differenceInDays(expiryDate, new Date());
  const daysSinceAdded = differenceInDays(new Date(), parseISO(item.createdAt));

  const isExpired = isPast(expiryDate) && !isToday(expiryDate);
  const isExpiringSoon = daysLeft <= 3 && daysLeft >= 0;

  return (
    <Card className={cn(
      "p-4 flex items-center justify-between group transition-all border-2",
      isExpired ? "border-rose-300 bg-rose-50/50" : isExpiringSoon ? "border-amber-300 bg-amber-50/50" : "border-slate-200"
    )}>
      <div className="flex items-center gap-4">
        <div className={cn(
          "w-12 h-12 rounded-xl flex items-center justify-center border-2",
          isExpired ? "bg-rose-100 text-rose-600 border-rose-200" : isExpiringSoon ? "bg-amber-100 text-amber-600 border-amber-200" : "bg-emerald-50 text-emerald-600 border-emerald-100"
        )} style={{ borderRadius: '12px 24px 12px 24px/24px 12px 24px 12px' }}>
          {item.category === 'fridge' ? <Refrigerator className="w-6 h-6" /> : <Snowflake className="w-6 h-6" />}
        </div>
        <div className="space-y-0.5">
          <h3 className="font-bold text-slate-900 font-hand text-lg">{item.name}</h3>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm text-slate-500 font-hand">
            <span className="flex items-center gap-1 text-emerald-600 font-bold bg-emerald-50 px-1.5 rounded-md border border-emerald-100">
              {item.addedByName || '未知'}
            </span>
            <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> 已入庫 {daysSinceAdded} 天</span>
            <span>•</span>
            <span className={cn(
              "font-bold",
              isExpired ? "text-rose-600" : isExpiringSoon ? "text-amber-600" : "text-emerald-600"
            )}>
              {isExpired ? '已過期' : isExpiringSoon ? `剩餘 ${daysLeft} 天` : `剩餘 ${daysLeft} 天`}
            </span>
          </div>
        </div>
      </div>
      <Button onClick={onDelete} variant="danger" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
        <Trash2 className="w-4 h-4" />
      </Button>
    </Card>
  );
}

function AddItemView({ onAdd, onCancel, hasApiKey }: { 
  onAdd: (item: any) => void; 
  onCancel: () => void;
  hasApiKey: boolean;
}) {
  const [form, setForm] = useState({
    name: '',
    category: 'fridge' as 'fridge' | 'freezer',
    purchaseDate: format(new Date(), 'yyyy-MM-dd'),
    expiryDays: 7
  });

  const [error, setError] = useState<string | null>(null);

  const handleSubmit = () => {
    if (form.expiryDays < 0) {
      setError('天數不可為負數');
      return;
    }
    setError(null);
    onAdd(form);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-900">新增食材</h2>
        <Button onClick={onCancel} variant="ghost" size="sm">取消</Button>
      </div>

      {error && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3 bg-rose-50 border border-rose-100 text-rose-600 text-sm rounded-xl flex items-center gap-2"
        >
          <AlertCircle className="w-4 h-4" />
          {error}
        </motion.div>
      )}

      {/* AI Module Placeholder */}
      <Card className={cn(
        "p-6 border-dashed border-2 flex flex-col items-center gap-3 text-center transition-all",
        hasApiKey ? "border-emerald-200 bg-emerald-50/50" : "border-slate-200 bg-slate-50 opacity-60"
      )}>
        <div className={cn(
          "w-12 h-12 rounded-full flex items-center justify-center",
          hasApiKey ? "bg-emerald-100 text-emerald-600" : "bg-slate-200 text-slate-400"
        )}>
          <Camera className="w-6 h-6" />
        </div>
        <div className="space-y-1">
          <p className={cn("font-bold", hasApiKey ? "text-emerald-900" : "text-slate-500")}>
            {hasApiKey ? "AI 拍照辨識" : "AI 辨識已停用"}
          </p>
          <p className="text-xs text-slate-400">
            {hasApiKey ? "自動辨識食材名稱與存放建議" : "請至設定頁面輸入 API Key 以解鎖"}
          </p>
        </div>
        {hasApiKey && <Button size="sm" className="mt-2">開始掃描</Button>}
      </Card>

      <div className="space-y-4">
        <Input label="食材名稱" placeholder="例如：牛奶、雞蛋..." value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
        
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-bold text-slate-700 ml-1 font-hand">存放位置</label>
            <div className="flex p-1 bg-slate-100 rounded-xl border-2 border-slate-200" style={{ borderRadius: '8px 16px 8px 16px/16px 8px 16px 8px' }}>
              <button 
                onClick={() => setForm({...form, category: 'fridge'})}
                className={cn("flex-1 py-2 rounded-lg text-lg font-bold transition-all font-hand", form.category === 'fridge' ? "bg-white shadow-sm text-emerald-600 border-2 border-emerald-100" : "text-slate-500")}
                style={{ borderRadius: '6px 12px 6px 12px/12px 6px 12px 6px' }}
              >冷藏</button>
              <button 
                onClick={() => setForm({...form, category: 'freezer'})}
                className={cn("flex-1 py-2 rounded-lg text-lg font-bold transition-all font-hand", form.category === 'freezer' ? "bg-white shadow-sm text-blue-600 border-2 border-blue-100" : "text-slate-500")}
                style={{ borderRadius: '6px 12px 6px 12px/12px 6px 12px 6px' }}
              >冷凍</button>
            </div>
          </div>
          <Input 
            label="過期天數" 
            type="number" 
            value={form.expiryDays} 
            onChange={e => {
              const val = parseInt(e.target.value) || 0;
              setForm({...form, expiryDays: val});
              if (val >= 0) setError(null);
            }} 
          />
        </div>

        <Input label="購入日期" type="date" value={form.purchaseDate} onChange={e => setForm({...form, purchaseDate: e.target.value})} />

        <Button 
          onClick={handleSubmit} 
          className="w-full py-4 text-xl mt-4" 
          disabled={!form.name.trim()}
        >加入清單</Button>
      </div>
    </div>
  );
}

function SettingsView({ family, apiKey, onSaveApiKey, onLogout }: { 
  family: Family; 
  apiKey: string; 
  onSaveApiKey: (key: string) => void;
  onLogout: () => void;
}) {
  const [tempKey, setTempKey] = useState(apiKey);
  const [copied, setCopied] = useState(false);

  return (
    <div className="space-y-8 pb-12">
      <h2 className="text-3xl font-bold text-slate-900 font-hand">設定</h2>

      <section className="space-y-4">
        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider font-hand">家庭資訊</h3>
        <Card className="p-6 space-y-4 border-2 border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500 font-hand">家庭名稱</p>
              <p className="text-xl font-bold text-slate-900 font-hand">{family.name}</p>
            </div>
            <Share2 className="w-6 h-6 text-slate-400" />
          </div>
          <div className="pt-4 border-t-2 border-slate-100">
            <p className="text-sm text-slate-500 mb-2 font-hand">家庭邀請碼 (點擊複製)</p>
            <code 
              onClick={() => {
                navigator.clipboard.writeText(family.id);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
              className="block w-full p-4 bg-slate-50 rounded-xl text-xs font-mono text-slate-600 break-all cursor-pointer hover:bg-slate-100 transition-colors border-2 border-slate-200"
              style={{ borderRadius: '8px 16px 8px 16px/16px 8px 16px 8px' }}
            >
              {family.id}
            </code>
            {copied && <p className="text-xs text-emerald-600 mt-2 font-bold font-hand">已複製到剪貼簿！</p>}
          </div>
        </Card>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider font-hand">AI 模組設定</h3>
          <span className={cn(
            "text-[10px] px-2 py-0.5 rounded-full font-bold uppercase border-2",
            apiKey ? "bg-emerald-100 text-emerald-700 border-emerald-200" : "bg-slate-100 text-slate-400 border-slate-200"
          )}>
            {apiKey ? "已啟用" : "未設定"}
          </span>
        </div>
        <Card className="p-6 space-y-4 border-2 border-slate-200">
          <div className="flex items-start gap-3 p-4 bg-amber-50 rounded-xl border-2 border-amber-100" style={{ borderRadius: '12px 24px 12px 24px/24px 12px 24px 12px' }}>
            <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-sm text-amber-700 leading-relaxed font-hand">
              請輸入您的 Claude 或 OpenAI API Key。此金鑰將僅儲存於您的瀏覽器本地，不會上傳至我們的伺服器。
            </p>
          </div>
          <div className="space-y-4">
            <Input 
              type="password" 
              placeholder="sk-..." 
              value={tempKey} 
              onChange={e => setTempKey(e.target.value)} 
              label="API Key"
            />
            <Button 
              onClick={() => onSaveApiKey(tempKey)} 
              className="w-full py-3 text-lg" 
              variant={tempKey === apiKey ? 'outline' : 'primary'}
              disabled={tempKey === apiKey}
            >
              {tempKey === apiKey ? '已儲存' : '儲存設定'}
            </Button>
          </div>
        </Card>
      </section>

      <section className="pt-4">
        <Button onClick={onLogout} variant="danger" className="w-full gap-2 py-4 text-xl">
          <LogOut className="w-6 h-6" /> 登出帳號
        </Button>
      </section>
    </div>
  );
}
