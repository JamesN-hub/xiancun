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
  getDocFromServer,
  arrayUnion,
  arrayRemove
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
import { Button, Card, Input, ConfirmModal } from './components/ui';
import { ItemCard, SkeletonItemCard } from './components/ItemCard';
import { LoginView } from './views/LoginView';
import { OnboardingView } from './views/OnboardingView';
import { AddItemView } from './views/AddItemView';
import { SettingsView } from './views/SettingsView';

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

// --- Main App ---

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [family, setFamily] = useState<Family | null>(null);
  const [items, setItems] = useState<FoodItem[]>([]);
  const [activeTab, setActiveTab] = useState<'fridge' | 'freezer'>('fridge');
  const [view, setView] = useState<'dashboard' | 'add' | 'settings'>('dashboard');
  const [apiKey, setApiKey] = useState<string>(localStorage.getItem('FRESH_TRACK_AI_KEY') || '');
  const [sortBy, setSortBy] = useState<'expiry' | 'purchase' | 'name'>('expiry');
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);

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
      // We use arrayUnion to bypass the need to read the document first,
      // since security rules might prevent non-members from reading.
      await updateDoc(familyRef, {
        members: arrayUnion(user.uid)
      });
    } catch (err: any) {
      if (err.code === 'not-found' || err.message?.includes('No document to update')) {
        alert('找不到該家庭 ID');
      } else {
        handleFirestoreError(err, OperationType.UPDATE, 'families');
      }
    }
  };

  const handleLeaveFamily = async () => {
    if (!user || !family) return;
    try {
      const familyRef = doc(db, 'families', family.id);
      if (family.members.length <= 1) {
        // Last member — delete the family entirely
        await deleteDoc(familyRef);
      } else {
        await updateDoc(familyRef, {
          members: arrayRemove(user.uid)
        });
      }
      setView('dashboard');
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

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    await handleDeleteItem(itemToDelete);
    setItemToDelete(null);
  };

  const saveApiKey = (key: string) => {
    setApiKey(key);
    localStorage.setItem('FRESH_TRACK_AI_KEY', key);
  };

  const displayedItems = useMemo(() => {
    const filtered = items.filter(i => i.category === activeTab);
    return filtered.sort((a, b) => {
      if (sortBy === 'expiry') {
        const aExpiry = addDays(parseISO(a.purchaseDate), a.expiryDays).getTime();
        const bExpiry = addDays(parseISO(b.purchaseDate), b.expiryDays).getTime();
        return aExpiry - bExpiry;
      } else if (sortBy === 'purchase') {
        return parseISO(b.purchaseDate).getTime() - parseISO(a.purchaseDate).getTime();
      } else {
        return a.name.localeCompare(b.name);
      }
    });
  }, [items, activeTab, sortBy]);

  const stats = useMemo(() => {
    let expiring = 0;
    let fridge = 0;
    let freezer = 0;
    const today = new Date();
    items.forEach(item => {
      if (item.category === 'fridge') fridge++;
      if (item.category === 'freezer') freezer++;
      const expiryDate = addDays(parseISO(item.purchaseDate), item.expiryDays);
      const daysLeft = differenceInDays(expiryDate, today);
      if (daysLeft <= 3 || (isPast(expiryDate) && !isToday(expiryDate))) {
        expiring++;
      }
    });
    return { expiring, fridge, freezer };
  }, [items]);

  if (loading) return (
    <div className="min-h-screen bg-warm-bg text-slate-800 font-hand pb-24">
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b-2 border-slate-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-slate-200 rounded-xl animate-pulse" style={{ borderRadius: '12px 24px 12px 24px/24px 12px 24px 12px' }} />
          <div className="w-16 h-6 bg-slate-200 rounded animate-pulse" />
        </div>
        <div className="w-8 h-8 bg-slate-200 rounded-full animate-pulse" />
      </header>
      <main className="max-w-md mx-auto px-6 pt-6 space-y-6">
        <div className="h-12 bg-slate-200 rounded-xl animate-pulse" style={{ borderRadius: '12px 24px 12px 24px/24px 12px 24px 12px' }} />
        <div className="space-y-3">
          <SkeletonItemCard />
          <SkeletonItemCard />
          <SkeletonItemCard />
        </div>
      </main>
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
              {/* Summary Bento Box */}
              <div className="grid grid-cols-3 gap-3">
                <Card className="p-3 bg-rose-50 border-rose-200 flex flex-col items-center justify-center text-center shadow-sm">
                  <AlertTriangle className="w-5 h-5 text-rose-500 mb-1" />
                  <span className="text-2xl font-bold text-rose-600">{stats.expiring}</span>
                  <span className="text-[10px] text-rose-600 font-bold mt-0.5">快過期/已過期</span>
                </Card>
                <Card className="p-3 bg-emerald-50 border-emerald-200 flex flex-col items-center justify-center text-center shadow-sm">
                  <Refrigerator className="w-5 h-5 text-emerald-500 mb-1" />
                  <span className="text-2xl font-bold text-emerald-600">{stats.fridge}</span>
                  <span className="text-[10px] text-emerald-600 font-bold mt-0.5">冷藏中</span>
                </Card>
                <Card className="p-3 bg-blue-50 border-blue-200 flex flex-col items-center justify-center text-center shadow-sm">
                  <Snowflake className="w-5 h-5 text-blue-500 mb-1" />
                  <span className="text-2xl font-bold text-blue-600">{stats.freezer}</span>
                  <span className="text-[10px] text-blue-600 font-bold mt-0.5">冷凍中</span>
                </Card>
              </div>

              {/* Tabs and Sort */}
              <div className="space-y-4">
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

                <div className="flex items-center justify-between px-1">
                  <span className="text-sm font-bold text-slate-500">共 {displayedItems.length} 項</span>
                  <select 
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="bg-transparent text-sm font-bold text-slate-700 outline-none cursor-pointer border-b-2 border-slate-300 pb-0.5"
                  >
                    <option value="expiry">快過期優先</option>
                    <option value="purchase">最新購入</option>
                    <option value="name">名稱排序</option>
                  </select>
                </div>
              </div>

              {/* List */}
              <div className="space-y-3">
                {displayedItems.length === 0 ? (
                  <div className="py-12 text-center space-y-3">
                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto">
                      <Clock className="w-8 h-8 text-slate-300" />
                    </div>
                    <p className="text-slate-400">目前沒有食材，快去採購吧！</p>
                  </div>
                ) : (
                  displayedItems.map(item => (
                    <ItemCard key={item.id} item={item} onDelete={() => setItemToDelete(item.id)} />
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
                onLeaveFamily={handleLeaveFamily}
                isOwner={user.uid === family.ownerUid}
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

      <ConfirmModal
        isOpen={!!itemToDelete}
        title="確定要刪除嗎？"
        description="刪除後將無法恢復，確定要把這個食材從冰箱移除嗎？"
        onConfirm={confirmDelete}
        onCancel={() => setItemToDelete(null)}
        confirmText="確定刪除"
        confirmVariant="danger"
      />
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
