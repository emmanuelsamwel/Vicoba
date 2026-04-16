import React, { useState, useEffect, Component, ErrorInfo, ReactNode } from 'react';
import { AuthProvider, useAuth } from './AuthContext';
import { 
  LayoutDashboard, 
  PiggyBank, 
  HandCoins, 
  Users, 
  LogOut, 
  Plus, 
  TrendingUp, 
  Wallet,
  X,
  Maximize2,
  Minimize2,
  ChevronRight,
  ChevronLeft,
  Menu,
  AlertCircle,
  CheckCircle2,
  Clock,
  MessageCircle,
  MessageSquare,
  Send,
  Settings,
  ShieldCheck,
  Lock,
  Mic,
  MicOff,
  Phone,
  Video as VideoIcon,
  VideoOff,
  PhoneOff,
  Volume2,
  VolumeX,
  Smartphone,
  Square,
  Play,
  Pause,
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  serverTimestamp, 
  orderBy,
  limit,
  getDocs,
  doc,
  setDoc,
  updateDoc
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';
import { format } from 'date-fns';
import { cn } from './lib/utils';

// --- Components ---

const Button = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' }>(
  ({ className, variant = 'primary', ...props }, ref) => {
    const variants = {
      primary: 'bg-emerald-700 text-white hover:bg-emerald-800 shadow-sm transition-all',
      secondary: 'bg-slate-700 text-white hover:bg-slate-800 shadow-sm',
      outline: 'border border-gray-300 bg-transparent hover:bg-gray-50 text-gray-700 font-semibold',
      ghost: 'bg-transparent hover:bg-gray-100 text-gray-600',
      danger: 'bg-rose-600 text-white hover:bg-rose-700 shadow-sm',
    };
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:pointer-events-none disabled:opacity-50',
          variants[variant],
          className
        )}
        {...props}
      />
    );
  }
);

const Card = ({ children, className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('rounded-xl border border-gray-200 bg-white p-6 shadow-sm', className)} {...props}>
    {children}
  </div>
);

// --- Error Boundary ---

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      let errorMessage = "Something went wrong.";
      try {
        const parsedError = JSON.parse(this.state.error?.message || "");
        if (parsedError.error) errorMessage = parsedError.error;
      } catch {
        errorMessage = this.state.error?.message || errorMessage;
      }

      return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-4 text-center">
          <div className="mb-4 rounded-full bg-rose-100 p-4 text-rose-600">
            <AlertCircle className="h-12 w-12" />
          </div>
          <h1 className="mb-2 text-2xl font-bold text-gray-900">Oops! An error occurred</h1>
          <p className="mb-6 max-w-md text-gray-600">{errorMessage}</p>
          <Button onClick={() => window.location.reload()}>
            Reload Application
          </Button>
        </div>
      );
    }

    const { children } = (this as any).props;
    return children;
  }
}

// --- Components ---

const StatCard = ({ title, value, icon: Icon, color }: { title: string; value: string; icon: any; color: string }) => (
  <Card className="flex items-center gap-4">
    <div className={cn('rounded-full p-3', color)}>
      <Icon className="h-6 w-6 text-white" />
    </div>
    <div>
      <p className="text-sm font-medium text-gray-500">{title}</p>
      <h3 className="text-2xl font-bold text-gray-900">{value}</h3>
    </div>
  </Card>
);

// --- Group Setup ---

const GroupSetup = ({ onComplete }: { onComplete: () => void }) => {
  const { user, refreshProfile } = useAuth();
  const [mode, setMode] = useState<'join' | 'create' | null>(null);
  const [joinCode, setJoinCode] = useState('');
  const [groupName, setGroupName] = useState('');
  const [groupPhone, setGroupPhone] = useState('');
  const [adminCount, setAdminCount] = useState(1);
  const [interestRate, setInterestRate] = useState(10);
  const [loanLimitPercentage, setLoanLimitPercentage] = useState(300);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string|null>(null);
  const [createdGroup, setCreatedGroup] = useState<{ name: string, code: string, phone: string } | null>(null);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const code = Math.random().toString(36).substring(2, 8).toUpperCase();
      const groupRef = await addDoc(collection(db, 'groups'), {
        name: groupName,
        joinCode: code,
        adminCount: adminCount,
        interestRate: interestRate,
        loanLimitPercentage: loanLimitPercentage,
        phoneNumber: groupPhone,
        createdBy: user.uid,
        createdAt: serverTimestamp()
      });
      
      await setDoc(doc(db, 'users', user.uid), {
        groupId: groupRef.id,
        role: 'admin',
        displayName: user.displayName,
        email: user.email,
        joinedAt: serverTimestamp()
      }, { merge: true });

      await refreshProfile();
      setCreatedGroup({ name: groupName, code: code, phone: groupPhone });
    } catch (err) {
      console.error(err);
      setError("Failed to create group. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const q = query(collection(db, 'groups'), where('joinCode', '==', joinCode.toUpperCase()));
      const snap = await getDocs(q);
      if (snap.empty) {
        setError("Invalid join code. Please check and try again.");
        return;
      }
      
      const groupId = snap.docs[0].id;
      await setDoc(doc(db, 'users', user.uid), {
        groupId: groupId,
        role: 'member',
        displayName: user.displayName,
        email: user.email,
        joinedAt: serverTimestamp()
      }, { merge: true });

      await refreshProfile();
      onComplete();
    } catch (err) {
      console.error(err);
      setError("Failed to join group. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-lg overflow-hidden">
        {createdGroup ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-6 text-center space-y-6"
          >
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-100 text-green-600">
              <CheckCircle2 className="h-12 w-12" />
            </div>
            <div>
              <h2 className="text-3xl font-bold text-gray-900">Group Created!</h2>
              <p className="mt-2 text-gray-600">Your group "<span className="font-semibold">{createdGroup.name}</span>" is ready.</p>
            </div>

            <div className="rounded-2xl border-2 border-dashed border-indigo-200 bg-indigo-50 p-6">
              <p className="text-sm font-medium text-indigo-600 uppercase tracking-wider mb-2">Group Join Code</p>
              <div className="text-5xl font-black tracking-[0.2em] text-indigo-900 font-mono mb-4">{createdGroup.code}</div>
              <p className="text-xs text-indigo-500">Share this code with your members to let them join.</p>
            </div>

            <div className="space-y-3">
              <p className="text-sm font-semibold text-gray-700">Invite Members via:</p>
              <div className="grid grid-cols-2 gap-4">
                <Button 
                  variant="outline" 
                  className="flex items-center gap-2 py-6 border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                  onClick={() => {
                    const msg = `Join our PamojaVault group "${createdGroup.name}"! Use code: ${createdGroup.code}`;
                    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
                  }}
                >
                  <MessageCircle className="h-5 w-5" />
                  WhatsApp
                </Button>
                <Button 
                  variant="outline" 
                  className="flex items-center gap-2 py-6 border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                  onClick={() => {
                    const msg = `Join our PamojaVault group "${createdGroup.name}"! Use code: ${createdGroup.code}`;
                    // Attempt SMS URI
                    window.location.href = `sms:${createdGroup.phone}?body=${encodeURIComponent(msg)}`;
                  }}
                >
                  <MessageSquare className="h-5 w-5" />
                  SMS
                </Button>
              </div>
              <p className="text-[10px] text-gray-400">Note: SMS will open your phone's messaging app with the group's phone number and join code pre-filled.</p>
            </div>

            <Button onClick={onComplete} className="w-full py-6 text-lg">
              Go to Dashboard
            </Button>
          </motion.div>
        ) : !mode ? (
          <div className="space-y-6 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
              <Users className="h-8 w-8" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Welcome to PamojaVault</h2>
              <p className="mt-2 text-gray-600">Join an existing group or create a new one to start saving together.</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Button onClick={() => setMode('join')} variant="outline" className="h-24 flex-col gap-2">
                <Plus className="h-6 w-6" />
                Join Group
              </Button>
              <Button onClick={() => setMode('create')} variant="primary" className="h-24 flex-col gap-2">
                <LayoutDashboard className="h-6 w-6" />
                Create Group
              </Button>
            </div>
          </div>
        ) : mode === 'join' ? (
          <form onSubmit={handleJoin} className="space-y-6">
            <div className="flex items-center gap-2">
              <Button onClick={() => setMode(null)} variant="ghost" className="p-2 h-auto">
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <h2 className="text-xl font-bold">Join a Group</h2>
            </div>
            {error && <div className="rounded-lg bg-rose-50 p-3 text-sm text-rose-600">{error}</div>}
            <div>
              <label className="block text-sm font-medium text-gray-700">Enter Join Code</label>
              <input 
                type="text" 
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                placeholder="e.g. AB1234"
                className="mt-1 w-full rounded-lg border border-gray-300 p-3 text-center text-2xl font-bold tracking-widest uppercase focus:border-indigo-500 focus:ring-indigo-500"
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Joining..." : "Join Group"}
            </Button>
          </form>
        ) : (
          <form onSubmit={handleCreate} className="space-y-6">
            <div className="flex items-center gap-2">
              <Button onClick={() => setMode(null)} variant="ghost" className="p-2 h-auto">
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <h2 className="text-xl font-bold">Create a Group</h2>
            </div>
            {error && <div className="rounded-lg bg-rose-50 p-3 text-sm text-rose-600">{error}</div>}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Group Name</label>
                <input 
                  type="text" 
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-300 p-3 focus:border-indigo-500 focus:ring-indigo-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Group Phone Number (for alerts)</label>
                <input 
                  type="tel" 
                  value={groupPhone}
                  onChange={(e) => setGroupPhone(e.target.value)}
                  placeholder="e.g. 255700000000"
                  className="mt-1 w-full rounded-lg border border-gray-300 p-3 focus:border-indigo-500 focus:ring-indigo-500"
                  required
                />
                <p className="mt-1 text-xs text-gray-500">This number will be used to send the join code and OTPs.</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Required Admin Approvals for Withdrawals</label>
                <div className="mt-1 flex items-center gap-3">
                  <input 
                    type="number" 
                    min={1}
                    max={5}
                    value={adminCount}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      if (val >= 1 && val <= 5) {
                        setAdminCount(val);
                      } else if (val < 1) {
                        setAdminCount(1);
                      } else if (val > 5) {
                        setAdminCount(5);
                      }
                    }}
                    className="w-20 rounded-lg border border-gray-300 p-3 text-center text-lg font-bold focus:border-emerald-500 focus:ring-emerald-500"
                    required
                  />
                  <span className="text-sm text-gray-500">Admins (Limit: 5)</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Interest Rate (%)</label>
                  <input 
                    type="number"
                    step="0.1"
                    min="0"
                    value={interestRate}
                    onChange={(e) => setInterestRate(parseFloat(e.target.value))}
                    className="w-full rounded-lg border border-gray-300 p-3 focus:border-emerald-500 focus:ring-emerald-500 font-bold"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Loan Limit (% of Savings)</label>
                  <input 
                    type="number"
                    min="0"
                    value={loanLimitPercentage}
                    onChange={(e) => setLoanLimitPercentage(parseInt(e.target.value))}
                    className="w-full rounded-lg border border-gray-300 p-3 focus:border-emerald-500 focus:ring-emerald-500 font-bold"
                    required
                  />
                </div>
              </div>
              <p className="text-[10px] text-slate-400 italic">Example: 300% means members can borrow up to 3x their total savings.</p>
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Creating..." : "Create Group"}
            </Button>
          </form>
        )}
      </Card>
    </div>
  );
};

const Dashboard = ({ groupId }: { groupId: string }) => {
  const { profile } = useAuth();
  const [stats, setStats] = useState({ totalSavings: 0, activeLoans: 0, memberCount: 0 });
  const [recentTransactions, setRecentTransactions] = useState<any[]>([]);
  const [group, setGroup] = useState<any>(null);
  const [showCode, setShowCode] = useState(false);

  useEffect(() => {
    if (!groupId) return;

    const unsubscribeGroup = onSnapshot(doc(db, 'groups', groupId), (snapshot) => {
      setGroup({ id: snapshot.id, ...snapshot.data() });
    }, (err) => handleFirestoreError(err, OperationType.GET, `groups/${groupId}`));

    const q = query(
      collection(db, `groups/${groupId}/contributions`),
      where('status', '==', 'confirmed'),
      orderBy('date', 'desc'),
      limit(5)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const txs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setRecentTransactions(txs);
    }, (err) => handleFirestoreError(err, OperationType.LIST, `groups/${groupId}/contributions`));

    // Simple stats aggregation (in a real app, use Cloud Functions or a summary doc)
    const fetchStats = async () => {
      try {
        const contributionsSnap = await getDocs(query(collection(db, `groups/${groupId}/contributions`), where('status', '==', 'confirmed')));
        const loansSnap = await getDocs(query(collection(db, `groups/${groupId}/loans`), where('status', '==', 'active')));
        
        let total = 0;
        contributionsSnap.forEach(doc => total += doc.data().amount);
        
        setStats({
          totalSavings: total,
          activeLoans: loansSnap.size,
          memberCount: 0 // Fetch from groups/members if implemented
        });
      } catch (err) {
        console.error("Error fetching stats:", err);
      }
    };
    fetchStats();

    return () => {
      unsubscribe();
      unsubscribeGroup();
    };
  }, [groupId]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{group?.name || 'Dashboard'}</h2>
          <p className="text-sm text-gray-500">Welcome back to your group savings portal.</p>
        </div>
        {group?.joinCode && profile?.role === 'admin' && (
          <div className="flex flex-wrap items-center gap-3">
            {group.phoneNumber && (
              <div className="flex items-center gap-2 rounded-xl bg-indigo-50 px-4 py-2 border border-indigo-100">
                <div className="text-xs font-medium text-indigo-600 uppercase">Group Phone</div>
                <div className="text-sm font-bold text-indigo-900">{group.phoneNumber}</div>
              </div>
            )}
            <div className="flex items-center gap-3 rounded-xl bg-indigo-50 px-4 py-2 border border-indigo-100">
              <div className="text-xs font-medium text-indigo-600 uppercase">Join Code</div>
              <div className="text-lg font-bold tracking-widest text-indigo-900 font-mono">
                {showCode ? group.joinCode : '••••••'}
              </div>
              <div className="flex items-center gap-1 border-l border-indigo-200 ml-2 pl-2">
                <Button 
                  variant="ghost" 
                  className="h-8 w-8 p-0 text-indigo-600 hover:bg-indigo-100"
                  title={showCode ? "Hide Code" : "Show Code"}
                  onClick={() => setShowCode(!showCode)}
                >
                  <Plus className={cn("h-4 w-4 transition-transform", showCode ? "rotate-45" : "rotate-0")} />
                </Button>
                {showCode && (
                  <>
                    <Button 
                      variant="ghost" 
                      className="h-8 w-8 p-0 text-indigo-600 hover:bg-indigo-100"
                      title="Copy Code"
                      onClick={() => {
                        navigator.clipboard.writeText(group.joinCode);
                      }}
                    >
                      <Plus className="h-4 w-4 rotate-45" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      className="h-8 w-8 p-0 text-green-600 hover:bg-green-50"
                      title="Share via WhatsApp"
                      onClick={() => {
                        const msg = `Join our PamojaVault group "${group.name}"! Use code: ${group.joinCode}`;
                        window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
                      }}
                    >
                      <MessageCircle className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      className="h-8 w-8 p-0 text-blue-600 hover:bg-blue-50"
                      title="Share via SMS"
                      onClick={() => {
                        const msg = `Join our PamojaVault group "${group.name}"! Use code: ${group.joinCode}`;
                        window.location.href = `sms:${group.phoneNumber || ''}?body=${encodeURIComponent(msg)}`;
                      }}
                    >
                      <MessageSquare className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <StatCard 
          title="Total Savings" 
          value={`TSh ${stats.totalSavings.toLocaleString()}`} 
          icon={Wallet} 
          color="bg-indigo-500" 
        />
        <StatCard 
          title="Active Loans" 
          value={stats.activeLoans.toString()} 
          icon={HandCoins} 
          color="bg-emerald-500" 
        />
        <StatCard 
          title="Growth" 
          value="+12.5%" 
          icon={TrendingUp} 
          color="bg-amber-500" 
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Recent Contributions</h3>
            <Button variant="ghost" className="text-indigo-600">View All</Button>
          </div>
          <div className="space-y-4">
            {recentTransactions.map((tx) => (
              <div key={tx.id} className="flex items-center justify-between border-b border-gray-100 pb-4 last:border-0 last:pb-0">
                <div className="flex items-center gap-3">
                  <div className="rounded-full bg-indigo-50 p-2">
                    <PiggyBank className="h-5 w-5 text-indigo-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{tx.type === 'savings' ? 'Savings' : 'Social Fund'}</p>
                    <p className="text-xs text-gray-500">{tx.date?.toDate ? format(tx.date.toDate(), 'MMM d, yyyy') : 'Recently'}</p>
                  </div>
                </div>
                <p className="font-semibold text-indigo-600">+TSh {tx.amount.toLocaleString()}</p>
              </div>
            ))}
            {recentTransactions.length === 0 && (
              <p className="py-8 text-center text-gray-500">No recent contributions found.</p>
            )}
          </div>
        </Card>

        <Card>
          <h3 className="mb-4 text-lg font-semibold text-gray-900">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-4">
            <Button variant="outline" className="h-24 flex-col gap-2">
              <Plus className="h-6 w-6" />
              Add Contribution
            </Button>
            <Button variant="outline" className="h-24 flex-col gap-2">
              <HandCoins className="h-6 w-6" />
              Request Loan
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};

const Contributions = ({ groupId }: { groupId: string }) => {
  const { user } = useAuth();
  const [amount, setAmount] = useState('');
  const [type, setType] = useState('savings');
  const [paymentMethod, setPaymentMethod] = useState('mobile_money');
  const [provider, setProvider] = useState('M-Pesa');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !user) return;
    if (paymentMethod === 'mobile_money' && !phoneNumber) return;
    
    setLoading(true);
    setPaymentStatus('processing');

    try {
      if (paymentMethod === 'mobile_money') {
        // Simulate Payment Trigger (e.g. M-Pesa STK Push)
        console.log(`Triggering payment for ${provider} ${phoneNumber} amount ${amount}`);
        // Simulate a delay for the payment process
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      const contributionData: any = {
        userId: user.uid,
        groupId,
        amount: parseFloat(amount),
        type,
        paymentMethod,
        date: serverTimestamp(),
        status: 'pending'
      };

      if (paymentMethod === 'mobile_money') {
        contributionData.provider = provider;
        contributionData.phoneNumber = phoneNumber;
      }

      await addDoc(collection(db, `groups/${groupId}/contributions`), contributionData);
      
      setAmount('');
      setPhoneNumber('');
      setPaymentStatus('success');
      setTimeout(() => setPaymentStatus('idle'), 3000);
    } catch (err) {
      setPaymentStatus('error');
      handleFirestoreError(err, OperationType.CREATE, `groups/${groupId}/contributions`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      <Card>
        <h3 className="mb-6 text-xl font-bold text-gray-900">New Contribution</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Amount (TSh)</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-indigo-500 focus:ring-indigo-500"
              placeholder="e.g. 50000"
              required
            />
          </div>
          
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Contribution Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-indigo-500 focus:ring-indigo-500"
            >
              <option value="savings">Savings</option>
              <option value="social_fund">Social Fund</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Payment Method</label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-indigo-500 focus:ring-indigo-500"
            >
              <option value="mobile_money">Mobile Money</option>
              <option value="bank_transfer">Bank Transfer</option>
              <option value="cash">Cash</option>
            </select>
          </div>

          {paymentMethod === 'mobile_money' && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="space-y-4"
            >
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Mobile Provider</label>
                <select
                  value={provider}
                  onChange={(e) => setProvider(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-indigo-500 focus:ring-indigo-500"
                >
                  <option value="M-Pesa">M-Pesa</option>
                  <option value="Tigo Pesa">Tigo Pesa</option>
                  <option value="Airtel Money">Airtel Money</option>
                  <option value="HaloPesa">HaloPesa</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Phone Number</label>
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-indigo-500 focus:ring-indigo-500"
                  placeholder="e.g. 255700000000"
                  required
                />
              </div>
            </motion.div>
          )}
          
          {paymentMethod === 'bank_transfer' && (
            <div className="rounded-lg bg-blue-50 p-4 border border-blue-100">
              <p className="text-xs font-bold text-blue-700 uppercase mb-1">Bank Instructions</p>
              <p className="text-sm text-blue-600">Please transfer to our group account and upload the reference or contact an admin to confirm.</p>
            </div>
          )}

          {paymentMethod === 'cash' && (
            <div className="rounded-lg bg-amber-50 p-4 border border-amber-100">
              <p className="text-xs font-bold text-amber-700 uppercase mb-1">Cash Instructions</p>
              <p className="text-sm text-amber-600">Please hand the cash to your group treasurer. Your contribution will remain "Pending" until an admin confirms receipt.</p>
            </div>
          )}
          
          {paymentStatus === 'success' && (
            <div className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">
              {paymentMethod === 'mobile_money' 
                ? 'Payment initiated! Please check your phone for the PIN prompt.'
                : 'Contribution submitted successfully!'}
            </div>
          )}
          
          {paymentStatus === 'error' && (
            <div className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">
              There was an error processing your request. Please try again.
            </div>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            {paymentStatus === 'processing' 
              ? 'Processing...' 
              : paymentMethod === 'mobile_money' ? 'Pay & Submit' : 'Submit Contribution'}
          </Button>
        </form>
      </Card>
    </div>
  );
};

const Loans = ({ groupId, adminCount }: { groupId: string, adminCount: number }) => {
  const { user } = useAuth();
  const [loans, setLoans] = useState<any[]>([]);
  const [group, setGroup] = useState<any>(null);
  const [userSavings, setUserSavings] = useState(0);
  const [showRequest, setShowRequest] = useState(false);
  const [amount, setAmount] = useState('');

  useEffect(() => {
    const q = query(collection(db, `groups/${groupId}/loans`), orderBy('requestedAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setLoans(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => handleFirestoreError(err, OperationType.LIST, `groups/${groupId}/loans`));

    const unsubscribeGroup = onSnapshot(doc(db, 'groups', groupId), (snapshot) => {
      setGroup({ id: snapshot.id, ...snapshot.data() });
    }, (err) => handleFirestoreError(err, OperationType.GET, `groups/${groupId}`));

    const qC = query(
      collection(db, `groups/${groupId}/contributions`),
      where('userId', '==', user?.uid),
      where('status', '==', 'confirmed')
    );
    const unsubscribeC = onSnapshot(qC, (snapshot) => {
      let total = 0;
      snapshot.forEach(doc => total += doc.data().amount);
      setUserSavings(total);
    }, (err) => handleFirestoreError(err, OperationType.LIST, `groups/${groupId}/contributions`));

    return () => {
      unsubscribe();
      unsubscribeGroup();
      unsubscribeC();
    };
  }, [groupId, user?.uid]);

  const handleRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !user || !group) return;
    
    const requestedAmount = parseFloat(amount);
    const maxLoan = userSavings * ((group.loanLimitPercentage || 300) / 100);
    
    if (requestedAmount > maxLoan) {
      alert(`Your loan request of TSh ${requestedAmount.toLocaleString()} exceeds your current credit limit of TSh ${maxLoan.toLocaleString()} (${group.loanLimitPercentage}% of your savings).`);
      return;
    }

    try {
      // Generate a 6-digit OTP code for multi-admin approval
      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
      
      await addDoc(collection(db, `groups/${groupId}/loans`), {
        userId: user.uid,
        userName: user.displayName || 'Anonymous',
        groupId,
        amount: requestedAmount,
        interestRate: group.interestRate || 10,
        status: 'requested',
        otpCode,
        approvals: {},
        requestedAt: serverTimestamp()
      });
      
      alert(`Loan request submitted! share this code with your admins to authorize: ${otpCode}`);
      setAmount('');
      setShowRequest(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `groups/${groupId}/loans`);
    }
  };

  const loanLimit = userSavings * ((group?.loanLimitPercentage || 300) / 100);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Loan Management</h2>
        <Button onClick={() => setShowRequest(true)}>Request New Loan</Button>
      </div>

      {showRequest && (
        <Card className="max-w-md">
          <div className="mb-6 rounded-xl bg-slate-50 p-4 border border-slate-100">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Your Borrowing Power</p>
            <div className="flex justify-between items-end">
               <div>
                  <p className="text-xs text-slate-500">Savings: TSh {userSavings.toLocaleString()}</p>
                  <p className="text-sm font-bold text-slate-900">Limit: TSh {loanLimit.toLocaleString()}</p>
               </div>
               <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold">
                 {group?.loanLimitPercentage || 300}% of savings
               </span>
            </div>
          </div>
          <h3 className="mb-4 text-lg font-bold text-slate-900">Request Loan</h3>
          <form onSubmit={handleRequest} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 tracking-tight">Amount (TSh)</label>
              <div className="relative">
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 pl-12 pr-4 py-3 font-bold text-lg focus:ring-emerald-500 focus:border-emerald-500"
                  placeholder="0"
                  max={loanLimit}
                  required
                />
                <span className="absolute left-4 top-3.5 text-slate-400 font-bold">TSh</span>
              </div>
              <p className="mt-1 text-[10px] text-slate-400">Interest rate for this group: {group?.interestRate || 10}%</p>
            </div>
            <div className="flex gap-3 pt-2">
              <Button type="submit" className="flex-1 py-3">Submit Request</Button>
              <Button type="button" variant="outline" onClick={() => setShowRequest(false)} className="flex-1 py-3">Cancel</Button>
            </div>
          </form>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {loans.map(loan => (
          <Card key={loan.id} className="relative overflow-hidden">
            <div className={cn(
              "absolute top-0 right-0 px-3 py-1 text-xs font-bold uppercase tracking-wider text-white",
              loan.status === 'active' ? 'bg-emerald-500' : 
              loan.status === 'requested' ? 'bg-amber-500' : 'bg-gray-500'
            )}>
              {loan.status}
            </div>
            <div className="mb-4">
              <p className="text-sm text-gray-500">Requested Amount</p>
              <h4 className="text-xl font-bold">TSh {loan.amount.toLocaleString()}</h4>
            </div>
            <div className="space-y-2 text-sm text-gray-600">
              <div className="flex justify-between">
                <span>Interest Rate</span>
                <span className="font-medium">{loan.interestRate}%</span>
              </div>
              <div className="flex justify-between">
                <span>Requested On</span>
                <span className="font-medium">{loan.requestedAt?.toDate ? format(loan.requestedAt.toDate(), 'MMM d, yyyy') : 'Pending'}</span>
              </div>
              {loan.status !== 'active' && loan.status !== 'repaid' && (
                <div className="mt-4 rounded-lg bg-gray-50 p-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Approval Progress</span>
                    <span className="text-[10px] font-bold text-emerald-700">
                      {Object.keys(loan.approvals || {}).length} Admins
                    </span>
                  </div>
                  <div className="h-1 w-full bg-gray-200 rounded-full">
                    <div 
                      className="h-full bg-emerald-500 rounded-full transition-all" 
                      style={{ width: `${(Object.keys(loan.approvals || {}).length / (adminCount || 1)) * 100}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

const Withdrawals = ({ groupId }: { groupId: string }) => {
  const { user } = useAuth();
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [showRequest, setShowRequest] = useState(false);
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');

  useEffect(() => {
    const q = query(collection(db, `groups/${groupId}/withdrawals`), orderBy('requestedAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setWithdrawals(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => handleFirestoreError(err, OperationType.LIST, `groups/${groupId}/withdrawals`));
    return () => unsubscribe();
  }, [groupId]);

  const handleRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !user) return;
    try {
      // Generate a 6-digit OTP code
      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
      
      await addDoc(collection(db, `groups/${groupId}/withdrawals`), {
        userId: user.uid,
        groupId,
        amount: parseFloat(amount),
        reason,
        status: 'requested',
        otpCode,
        approvals: {},
        requestedAt: serverTimestamp()
      });
      
      // In a real app, we'd send this OTP via SMS/Email to admins.
      // For this demo, we'll just show it to the requester so they can share it with admins.
      alert(`Withdrawal request submitted! Share this OTP with your admins to authorize: ${otpCode}`);
      
      setAmount('');
      setReason('');
      setShowRequest(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `groups/${groupId}/withdrawals`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Withdrawals</h2>
        <Button onClick={() => setShowRequest(true)}>Request Withdrawal</Button>
      </div>

      {showRequest && (
        <Card className="max-w-md">
          <h3 className="mb-4 text-lg font-semibold">Request Withdrawal</h3>
          <form onSubmit={handleRequest} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Amount (TSh)</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-4 py-2"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Reason</label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-4 py-2"
                rows={3}
                placeholder="e.g. Medical emergency"
              />
            </div>
            <div className="flex gap-3">
              <Button type="submit" className="flex-1">Submit</Button>
              <Button type="button" variant="outline" onClick={() => setShowRequest(false)}>Cancel</Button>
            </div>
          </form>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {withdrawals.map(w => (
          <Card key={w.id} className="relative overflow-hidden">
            <div className={cn(
              "absolute top-0 right-0 px-3 py-1 text-xs font-bold uppercase tracking-wider text-white",
              w.status === 'completed' ? 'bg-emerald-500' : 
              w.status === 'requested' ? 'bg-amber-500' : 'bg-gray-500'
            )}>
              {w.status}
            </div>
            <div className="mb-4">
              <p className="text-sm text-gray-500">Amount</p>
              <h4 className="text-xl font-bold">TSh {w.amount.toLocaleString()}</h4>
            </div>
            <div className="space-y-2 text-sm text-gray-600">
              <p className="italic">"{w.reason || 'No reason provided'}"</p>
              <div className="flex justify-between">
                <span>Requested On</span>
                <span className="font-medium">{w.requestedAt?.toDate ? format(w.requestedAt.toDate(), 'MMM d, yyyy') : 'Pending'}</span>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

const Management = ({ groupId, adminCount }: { groupId: string, adminCount: number }) => {
  const { user } = useAuth();
  const [pendingContributions, setPendingContributions] = useState<any[]>([]);
  const [pendingLoans, setPendingLoans] = useState<any[]>([]);
  const [pendingWithdrawals, setPendingWithdrawals] = useState<any[]>([]);
  const [groupMembers, setGroupMembers] = useState<any[]>([]);
  const [groupSettings, setGroupSettings] = useState<any>(null);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [isUpdatingSettings, setIsUpdatingSettings] = useState(false);

  // Editable settings state
  const [editInterest, setEditInterest] = useState('');
  const [editLoanLimit, setEditLoanLimit] = useState('');

  useEffect(() => {
    const qC = query(collection(db, `groups/${groupId}/contributions`), where('status', '==', 'pending'));
    const unsubscribeC = onSnapshot(qC, (snapshot) => {
      setPendingContributions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => handleFirestoreError(err, OperationType.LIST, `groups/${groupId}/contributions`));

    const qL = query(collection(db, `groups/${groupId}/loans`), where('status', 'in', ['requested', 'pending_approval', 'approved']));
    const unsubscribeL = onSnapshot(qL, (snapshot) => {
      setPendingLoans(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => handleFirestoreError(err, OperationType.LIST, `groups/${groupId}/loans`));

    const qW = query(collection(db, `groups/${groupId}/withdrawals`), where('status', 'in', ['requested', 'pending_approval', 'approved']));
    const unsubscribeW = onSnapshot(qW, (snapshot) => {
      setPendingWithdrawals(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => handleFirestoreError(err, OperationType.LIST, `groups/${groupId}/withdrawals`));

    const qMembers = query(collection(db, 'users'), where('groupId', '==', groupId));
    const unsubscribeMembers = onSnapshot(qMembers, (snapshot) => {
      setGroupMembers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'users'));

    const unsubscribeGroup = onSnapshot(doc(db, 'groups', groupId), (snapshot) => {
      const data = snapshot.data();
      setGroupSettings(data);
      setEditInterest(data?.interestRate?.toString() || '10');
      setEditLoanLimit(data?.loanLimitPercentage?.toString() || '300');
    }, (err) => handleFirestoreError(err, OperationType.GET, `groups/${groupId}`));

    return () => {
      unsubscribeC();
      unsubscribeL();
      unsubscribeW();
      unsubscribeMembers();
      unsubscribeGroup();
    };
  }, [groupId]);

  const handleUpdateGroupSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdatingSettings(true);
    try {
      await updateDoc(doc(db, 'groups', groupId), {
        interestRate: parseFloat(editInterest),
        loanLimitPercentage: parseInt(editLoanLimit)
      });
      alert("Group loan settings updated successfully!");
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `groups/${groupId}`);
    } finally {
      setIsUpdatingSettings(false);
    }
  };

  const handleToggleAdmin = async (memberId: string, currentRole: string) => {
    const isDemoting = currentRole === 'admin';
    const activeAdmins = groupMembers.filter(m => m.role === 'admin').length;
    
    if (!isDemoting && activeAdmins >= adminCount) {
      alert(`The group limit of ${adminCount} admins has been reached. Please remove an admin first.`);
      return;
    }

    if (isDemoting && activeAdmins <= 1) {
      alert("At least one admin is required for the group.");
      return;
    }

    setLoadingAction(memberId);
    try {
      await updateDoc(doc(db, 'users', memberId), {
        role: isDemoting ? 'member' : 'admin'
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${memberId}`);
    } finally {
      setLoadingAction(null);
    }
  };

  const handleConfirmContribution = async (id: string) => {
    try {
      const { doc, updateDoc } = await import('firebase/firestore');
      await updateDoc(doc(db, `groups/${groupId}/contributions`, id), { status: 'confirmed' });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `groups/${groupId}/contributions`);
    }
  };

  const handleApproveLoan = async (loan: any) => {
    const otp = otpInput[loan.id];
    if (otp !== loan.otpCode) {
      alert("Invalid OTP code. Please check and try again.");
      return;
    }

    try {
      const { doc, updateDoc } = await import('firebase/firestore');
      const newApprovals = { ...(loan.approvals || {}), [user!.uid]: serverTimestamp() };
      
      const updateData: any = { approvals: newApprovals };
      
      const approvalCount = Object.keys(newApprovals).length;
      if (approvalCount >= (adminCount || 1)) {
        updateData.status = 'approved';
      } else {
        updateData.status = 'pending_approval';
      }

      await updateDoc(doc(db, `groups/${groupId}/loans`, loan.id), updateData);
      setOtpInput(prev => ({ ...prev, [loan.id]: '' }));
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `groups/${groupId}/loans`);
    }
  };

  const handleDisburseLoan = async (id: string) => {
    try {
      const { doc, updateDoc } = await import('firebase/firestore');
      await updateDoc(doc(db, `groups/${groupId}/loans`, id), { status: 'active' });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `groups/${groupId}/loans`);
    }
  };

  const [otpInput, setOtpInput] = useState<{ [key: string]: string }>({});
  const [showOtp, setShowOtp] = useState<{ [key: string]: boolean }>({});

  const handleApproveWithdrawal = async (withdrawal: any) => {
    const otp = otpInput[withdrawal.id];
    if (otp !== withdrawal.otpCode) {
      alert("Invalid OTP code. Please check and try again.");
      return;
    }

    try {
      const { doc, updateDoc } = await import('firebase/firestore');
      const newApprovals = { ...(withdrawal.approvals || {}), [user!.uid]: serverTimestamp() };
      
      const updateData: any = { approvals: newApprovals };
      
      // If we have enough approvals, move to approved status
      const approvalCount = Object.keys(newApprovals).length;
      if (approvalCount >= (adminCount || 1)) {
        updateData.status = 'approved';
      } else {
        updateData.status = 'pending_approval';
      }

      await updateDoc(doc(db, `groups/${groupId}/withdrawals`, withdrawal.id), updateData);
      setOtpInput(prev => ({ ...prev, [withdrawal.id]: '' }));
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `groups/${groupId}/withdrawals`);
    }
  };

  const handleCompleteWithdrawal = async (id: string) => {
    try {
      const { doc, updateDoc } = await import('firebase/firestore');
      await updateDoc(doc(db, `groups/${groupId}/withdrawals`, id), { status: 'completed' });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `groups/${groupId}/withdrawals`);
    }
  };

  return (
    <div className="space-y-8">
      <section>
        <div className="flex items-center gap-3 mb-4">
          <Settings className="h-6 w-6 text-emerald-700" />
          <h3 className="text-xl font-bold text-gray-900">Loan & Interest Configuration</h3>
        </div>
        <Card>
          <form onSubmit={handleUpdateGroupSettings} className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-gray-500">Interest Rate (%)</label>
              <div className="relative">
                <input
                  type="number"
                  step="0.1"
                  value={editInterest}
                  onChange={(e) => setEditInterest(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 font-bold focus:border-emerald-500 focus:ring-emerald-500"
                />
                <span className="absolute right-4 top-2.5 text-gray-400 font-bold">%</span>
              </div>
            </div>
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-gray-500">Loan Limit (% of Savings)</label>
              <div className="relative">
                <input
                  type="number"
                  value={editLoanLimit}
                  onChange={(e) => setEditLoanLimit(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 font-bold focus:border-emerald-500 focus:ring-emerald-500"
                />
                <span className="absolute right-4 top-2.5 text-gray-400 font-bold">%</span>
              </div>
            </div>
            <Button 
              type="submit" 
              disabled={isUpdatingSettings}
              className="py-3"
            >
              {isUpdatingSettings ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Update Configuration'}
            </Button>
          </form>
          <p className="mt-4 text-xs text-slate-400 italic">
            * These settings determine the interest charged on new loans and the maximum amount members can borrow relative to their total savings.
          </p>
        </Card>
      </section>

      <section>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-gray-900">Member Role Management</h3>
          <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full uppercase tracking-wider">
            Admins: {groupMembers.filter(m => m.role === 'admin').length} / {adminCount}
          </span>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {groupMembers.map(member => (
            <Card key={member.id} className="flex flex-col gap-4 border-slate-100">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-700 font-bold">
                  {member.displayName?.[0] || 'U'}
                </div>
                <div className="flex-1 overflow-hidden">
                  <p className="font-bold text-slate-900 truncate tracking-tight">{member.displayName}</p>
                  <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">{member.role}</p>
                </div>
                {member.role === 'admin' ? (
                  <ShieldCheck className="h-5 w-5 text-emerald-600 shrink-0" />
                ) : (
                  <Users className="h-5 w-5 text-slate-400 shrink-0" />
                )}
              </div>
              <Button 
                onClick={() => handleToggleAdmin(member.id, member.role)}
                disabled={loadingAction === member.id || (member.id === user?.uid)}
                variant={member.role === 'admin' ? 'danger' : 'outline'}
                className="w-full text-xs font-bold uppercase py-2 h-auto"
              >
                {loadingAction === member.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : member.role === 'admin' ? (
                  'Remove Admin Role'
                ) : (
                  'Promote to Admin'
                )}
              </Button>
            </Card>
          ))}
        </div>
      </section>

      <section>
        <h3 className="mb-4 text-xl font-bold text-gray-900">Pending Contributions</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {pendingContributions.map(c => (
            <Card key={c.id} className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-lg">TSh {c.amount.toLocaleString()}</p>
                <div className="mt-1 space-y-0.5">
                  <p className="text-sm font-medium text-emerald-700 capitalize">{c.type.replace('_', ' ')}</p>
                  <p className="text-sm text-gray-600">
                    Method: <span className="font-medium capitalize">{c.paymentMethod.replace('_', ' ')}</span>
                    {c.provider && <span> ({c.provider})</span>}
                  </p>
                  {c.phoneNumber && <p className="text-xs text-gray-500">Phone: {c.phoneNumber}</p>}
                  <p className="text-xs text-gray-400">User: {c.userId.slice(0, 5)}...</p>
                </div>
              </div>
              <Button onClick={() => handleConfirmContribution(c.id)} variant="secondary">Confirm</Button>
            </Card>
          ))}
          {pendingContributions.length === 0 && <p className="text-gray-500">No pending contributions.</p>}
        </div>
      </section>

      <section>
        <h3 className="mb-4 text-xl font-bold text-gray-900">Loan Requests & Disbursements</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {pendingLoans.map(l => {
            const hasApproved = l.approvals?.[user!.uid];
            const approvalCount = Object.keys(l.approvals || {}).length;
            const requiredCount = adminCount || 1;

            return (
              <Card key={l.id} className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-lg">TSh {l.amount.toLocaleString()}</p>
                    <p className="text-sm text-gray-500">User: {l.userId.slice(0, 5)}...</p>
                    <p className="text-xs text-emerald-700 font-bold uppercase tracking-wide">
                      Approvals: {approvalCount}/{requiredCount}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className={cn(
                      "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase",
                      l.status === 'approved' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                    )}>
                      {l.status.replace('_', ' ')}
                    </span>
                  </div>
                </div>

                {l.status !== 'approved' && l.status !== 'active' && (
                  <>
                    {!hasApproved ? (
                      <div className="space-y-3">
                        <div className="flex gap-2">
                          <input 
                            type="text" 
                            placeholder="Enter OTP"
                            value={otpInput[l.id] || ''}
                            onChange={(e) => setOtpInput(prev => ({ ...prev, [l.id]: e.target.value }))}
                            className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500"
                          />
                          <Button onClick={() => handleApproveLoan(l)} variant="secondary" className="px-4">
                            Approve
                          </Button>
                        </div>
                        <div className="flex items-center justify-between px-1">
                          <p className="text-[10px] text-gray-400 font-mono">
                            {showOtp[l.id] ? `Admin Code: ${l.otpCode}` : '••••••'}
                          </p>
                          <button 
                            onClick={() => setShowOtp(prev => ({ ...prev, [l.id]: !prev[l.id] }))}
                            className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 uppercase"
                          >
                            {showOtp[l.id] ? 'Hide Code' : 'Show admin code'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center gap-2 rounded-lg bg-emerald-50 py-2 text-sm font-medium text-emerald-600">
                        <CheckCircle2 className="h-4 w-4" />
                        You have approved this
                      </div>
                    )}
                  </>
                )}

                {l.status === 'approved' && (
                  <Button onClick={() => handleDisburseLoan(l.id)} variant="primary" className="w-full py-2.5">
                    Disburse Loan
                  </Button>
                )}
              </Card>
            );
          })}
          {pendingLoans.length === 0 && <p className="text-gray-500">No pending loan actions.</p>}
        </div>
      </section>

      <section>
        <h3 className="mb-4 text-xl font-bold text-gray-900">Withdrawal Requests (Multi-Admin OTP)</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {pendingWithdrawals.map(w => {
            const hasApproved = w.approvals?.[user!.uid];
            const approvalCount = Object.keys(w.approvals || {}).length;
            const requiredCount = adminCount || 1;

            return (
              <Card key={w.id} className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-lg">TSh {w.amount.toLocaleString()}</p>
                    <p className="text-sm text-gray-500">Reason: {w.reason || 'N/A'}</p>
                    <p className="text-xs text-gray-400">User: {w.userId.slice(0, 5)}...</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-indigo-600 uppercase">
                      Approvals: {approvalCount}/{requiredCount}
                    </p>
                    <p className="text-[10px] text-gray-400">Status: {w.status.replace('_', ' ')}</p>
                  </div>
                </div>

                {w.status !== 'completed' && (
                  <>
                    {!hasApproved ? (
                      <div className="space-y-3">
                        <div className="flex gap-2">
                          <input 
                            type="text" 
                            placeholder="Enter OTP"
                            value={otpInput[w.id] || ''}
                            onChange={(e) => setOtpInput(prev => ({ ...prev, [w.id]: e.target.value }))}
                            className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500"
                          />
                          <Button onClick={() => handleApproveWithdrawal(w)} variant="secondary" className="px-4">
                            Approve
                          </Button>
                        </div>
                        <div className="flex items-center justify-between px-1">
                          <p className="text-[10px] text-gray-400 font-mono">
                            {showOtp[w.id] ? `Admin Code: ${w.otpCode}` : '••••••'}
                          </p>
                          <button 
                            onClick={() => setShowOtp(prev => ({ ...prev, [w.id]: !prev[w.id] }))}
                            className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 uppercase"
                          >
                            {showOtp[w.id] ? 'Hide Code' : 'Show admin code'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center gap-2 rounded-lg bg-emerald-50 py-2 text-sm font-medium text-emerald-600">
                        <CheckCircle2 className="h-4 w-4" />
                        You have approved this
                      </div>
                    )}
                  </>
                )}
                
                {approvalCount >= requiredCount && w.status === 'approved' && (
                  <Button onClick={() => handleCompleteWithdrawal(w.id)} className="w-full">
                    Complete Disbursement
                  </Button>
                )}
              </Card>
            );
          })}
          {pendingWithdrawals.length === 0 && <p className="text-gray-500">No pending withdrawal actions.</p>}
        </div>
      </section>
    </div>
  );
};

const VoiceNotePlayer = ({ audioUrl }: { audioUrl: string }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  const [progress, setProgress] = useState(0);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  useEffect(() => {
    if (!audioRef.current) return;
    const updateProgress = () => {
      const p = (audioRef.current!.currentTime / audioRef.current!.duration) * 100;
      setProgress(p || 0);
    };
    audioRef.current.addEventListener('timeupdate', updateProgress);
    return () => audioRef.current?.removeEventListener('timeupdate', updateProgress);
  }, []);

  return (
    <div className="flex items-center gap-3 bg-indigo-50/50 rounded-xl p-2 min-w-[160px] border border-indigo-100/30">
      <button 
        onClick={togglePlay}
        className="h-8 w-8 flex items-center justify-center rounded-full bg-white text-indigo-600 shadow-sm border border-indigo-100"
      >
        {isPlaying ? <Pause className="h-4 w-4 fill-current" /> : <Play className="h-4 w-4 fill-current" />}
      </button>
      <div className="flex-1 h-1.5 bg-gray-200/50 rounded-full overflow-hidden relative">
        <div 
          className="h-full bg-indigo-500 rounded-full transition-all duration-100"
          style={{ width: `${progress}%` }}
        />
      </div>
      <Volume2 className="h-3 w-3 text-indigo-400" />
      <audio 
        ref={audioRef} 
        src={audioUrl} 
        onEnded={() => { setIsPlaying(false); setProgress(0); }}
        className="hidden"
      />
    </div>
  );
};

const CallRoom = ({ type, onClose, userName }: { type: 'voice' | 'video', onClose: () => void, userName: string }) => {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(type === 'voice');
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);

  useEffect(() => {
    const startMedia = async () => {
      try {
        const constraints = {
          audio: true,
          video: type === 'video'
        };
        const s = await navigator.mediaDevices.getUserMedia(constraints);
        setStream(s);
        if (videoRef.current) videoRef.current.srcObject = s;
      } catch (err) {
        alert("Could not access camera/microphone. Please check permissions.");
        onClose();
      }
    };
    startMedia();
    return () => {
      if (stream) {
        stream.getTracks().forEach(t => t.stop());
      }
    };
  }, [type]);

  const toggleMute = () => {
    if (stream) {
      stream.getAudioTracks().forEach(t => t.enabled = !t.enabled);
      setIsMuted(!isMuted);
    }
  };

  const toggleVideo = () => {
    if (stream && type === 'video') {
      stream.getVideoTracks().forEach(t => t.enabled = !t.enabled);
      setIsVideoOff(!isVideoOff);
    }
  };

  const toggleSpeaker = () => {
    setIsSpeakerOn(!isSpeakerOn);
    // In a real mobile app/advanced web setup, we would use setSinkId here
    // For now, we simulate the mode switch visually
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/95 backdrop-blur-xl p-4"
    >
      <Card className="relative w-full max-w-2xl aspect-video bg-gray-900 border-gray-800 rounded-[2rem] overflow-hidden shadow-2xl flex flex-col p-0">
        <div className="absolute top-6 left-6 z-10 flex items-center gap-3 bg-black/20 backdrop-blur-md px-4 py-2 rounded-full border border-white/10">
          <div className="h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
          <span className="text-white text-xs font-bold uppercase tracking-wider">Live {type === 'video' ? 'Video' : 'Voice'} Call</span>
        </div>

        <div className="flex-1 relative flex items-center justify-center">
          {type === 'video' && !isVideoOff ? (
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              muted 
              className="w-full h-full object-cover scale-x-[-1]"
            />
          ) : (
            <div className="flex flex-col items-center gap-4">
              <div className="w-32 h-32 rounded-full bg-indigo-600/20 border-4 border-indigo-500/30 flex items-center justify-center relative">
                <div className="absolute inset-0 rounded-full border border-indigo-500 animate-ping opacity-20" />
                <Users className="h-12 w-12 text-indigo-400" />
              </div>
              <div className="text-center">
                <h4 className="text-white text-xl font-bold">{userName}</h4>
                <p className="text-indigo-400 text-sm">Connecting to group vault...</p>
              </div>
            </div>
          )}
        </div>

        <div className="absolute inset-x-0 bottom-0 p-6 md:p-10 bg-gradient-to-t from-black/90 via-black/40 to-transparent">
          <div className="flex justify-center items-end gap-4 md:gap-8">
            <div className="flex flex-col items-center gap-2">
              <button 
                onClick={toggleMute}
                className={cn(
                  "h-12 w-12 md:h-16 md:w-16 rounded-full flex items-center justify-center transition-all shadow-lg",
                  isMuted ? "bg-rose-500 text-white" : "bg-white/10 text-white hover:bg-white/20 backdrop-blur-md border border-white/10"
                )}
              >
                {isMuted ? <MicOff className="h-5 w-5 md:h-6 md:w-6" /> : <Mic className="h-5 w-5 md:h-6 md:w-6" />}
              </button>
              <span className="text-[10px] text-white/80 font-bold uppercase tracking-wider">Mute</span>
            </div>

            {type === 'video' && (
              <div className="flex flex-col items-center gap-2">
                <button 
                  onClick={toggleVideo}
                  className={cn(
                    "h-12 w-12 md:h-16 md:w-16 rounded-full flex items-center justify-center transition-all shadow-lg",
                    isVideoOff ? "bg-rose-500 text-white" : "bg-white/10 text-white hover:bg-white/20 backdrop-blur-md border border-white/10"
                  )}
                >
                  {isVideoOff ? <VideoOff className="h-5 w-5 md:h-6 md:w-6" /> : <VideoIcon className="h-5 w-5 md:h-6 md:w-6" />}
                </button>
                <span className="text-[10px] text-white/80 font-bold uppercase tracking-wider">{isVideoOff ? 'Cam On' : 'Cam Off'}</span>
              </div>
            )}

            <div className="flex flex-col items-center gap-2">
              <button 
                onClick={toggleSpeaker}
                className={cn(
                  "h-12 w-12 md:h-16 md:w-16 rounded-full flex items-center justify-center transition-all shadow-lg",
                  isSpeakerOn ? "bg-indigo-500 text-white" : "bg-white/10 text-white hover:bg-white/20 backdrop-blur-md border border-white/10"
                )}
              >
                {isSpeakerOn ? <Volume2 className="h-5 w-5 md:h-6 md:w-6" /> : <Smartphone className="h-5 w-5 md:h-6 md:w-6" />}
              </button>
              <span className="text-[10px] text-white/80 font-bold uppercase tracking-wider">Speaker</span>
            </div>

            <div className="flex flex-col items-center gap-2">
              <button 
                onClick={onClose}
                className="h-14 w-14 md:h-20 md:w-20 rounded-full bg-rose-600 text-white flex items-center justify-center hover:bg-rose-700 transition-all shadow-2xl hover:scale-105 active:scale-95 border-4 border-black/20"
              >
                <PhoneOff className="h-6 w-6 md:h-8 md:w-8" />
              </button>
              <span className="text-[10px] text-white/80 font-bold uppercase tracking-wider">End</span>
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  );
};

const Chat = ({ groupId }: { groupId: string }) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [activeCall, setActiveCall] = useState<'voice' | 'video' | null>(null);
  const mediaRecorderRef = React.useRef<MediaRecorder | null>(null);
  const audioChunksRef = React.useRef<Blob[]>([]);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!groupId) return;
    const q = query(
      collection(db, `groups/${groupId}/messages`),
      orderBy('timestamp', 'asc'),
      limit(100)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => handleFirestoreError(err, OperationType.LIST, `groups/${groupId}/messages`));

    return () => unsubscribe();
  }, [groupId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!newMessage.trim() || !user) return;

    try {
      await addDoc(collection(db, `groups/${groupId}/messages`), {
        userId: user.uid,
        userName: user.displayName || 'Anonymous',
        content: newMessage.trim(),
        timestamp: serverTimestamp()
      });
      setNewMessage('');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `groups/${groupId}/messages`);
    }
  };

  const handleStartRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const base64Audio = reader.result as string;
          try {
            await addDoc(collection(db, `groups/${groupId}/messages`), {
              userId: user?.uid,
              userName: user?.displayName || 'Anonymous',
              content: 'Voice Note',
              voiceUrl: base64Audio,
              type: 'voice',
              timestamp: serverTimestamp()
            });
          } catch (err) {
            handleFirestoreError(err, OperationType.CREATE, `groups/${groupId}/messages`);
          }
        };
        stream.getTracks().forEach(t => t.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      alert("Microphone access denied or error accessing microphone.");
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const startCall = async (type: 'voice' | 'video') => {
    setActiveCall(type);
    try {
      await addDoc(collection(db, `groups/${groupId}/messages`), {
        userId: user?.uid,
        userName: user?.displayName || 'Anonymous',
        content: `Started a group ${type} call. Click the icon above to join!`,
        type: 'call_notification',
        timestamp: serverTimestamp()
      });
    } catch (err) {
      console.error("Failed to send call notification", err);
    }
  };

  return (
    <div className="flex h-[calc(100vh-12rem)] flex-col bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
      <AnimatePresence>
        {activeCall && (
          <CallRoom 
            type={activeCall} 
            userName={user?.displayName || 'You'} 
            onClose={() => setActiveCall(null)} 
          />
        )}
      </AnimatePresence>

      <div className="border-b border-gray-100 bg-white p-4 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-gray-900">Group Chat</h3>
          <p className="text-xs text-gray-500">Coordinate and plan together</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => startCall('voice')}
            className="h-10 w-10 flex items-center justify-center rounded-full bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors"
          >
            <Phone className="h-5 w-5" />
          </button>
          <button 
            onClick={() => startCall('video')}
            className="h-10 w-10 flex items-center justify-center rounded-full bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors"
          >
            <VideoIcon className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/30"
      >
        {messages.map((msg) => {
          const isOwn = msg.userId === user?.uid;
          return (
            <div 
              key={msg.id} 
              className={cn(
                "flex flex-col max-w-[80%]",
                isOwn ? "ml-auto items-end" : "items-start"
              )}
            >
              <div className="flex items-center gap-2 mb-1">
                {!isOwn && <span className="text-[10px] font-bold text-indigo-600 uppercase">{msg.userName}</span>}
                <span className="text-[10px] text-gray-400">
                  {msg.timestamp?.toDate ? format(msg.timestamp.toDate(), 'HH:mm') : '...'}
                </span>
                {isOwn && <span className="text-[10px] font-bold text-gray-400 uppercase">You</span>}
              </div>
              <div 
                className={cn(
                  "rounded-2xl px-4 py-2 text-sm shadow-sm",
                  isOwn 
                    ? "bg-indigo-600 text-white rounded-tr-none" 
                    : "bg-white text-gray-900 border border-gray-100 rounded-tl-none"
                )}
              >
                {msg.type === 'voice' ? (
                  <VoiceNotePlayer audioUrl={msg.voiceUrl} />
                ) : msg.type === 'call_notification' ? (
                  <div className="flex items-center gap-2 py-1 px-2">
                    <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
                      <Phone className="h-4 w-4" />
                    </div>
                    <span className="italic font-medium">{msg.content}</span>
                  </div>
                ) : (
                  msg.content
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="border-t border-gray-100 bg-white p-4">
        {isRecording ? (
          <div className="flex items-center justify-between bg-rose-50 p-2 rounded-xl">
            <div className="flex items-center gap-3 px-2">
              <div className="h-3 w-3 rounded-full bg-rose-500 animate-pulse" />
              <span className="text-sm font-bold text-rose-600 uppercase tracking-wider">Recording...</span>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={() => setIsRecording(false)} 
                className="h-10 w-10 flex items-center justify-center rounded-full bg-white text-gray-400 border border-gray-200"
              >
                <X className="h-5 w-5" />
              </button>
              <button 
                onClick={handleStopRecording}
                className="h-10 w-10 flex items-center justify-center rounded-full bg-rose-600 text-white shadow-md animate-bounce"
              >
                <Square className="h-5 w-5" />
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSendMessage} className="flex gap-2">
            <button 
              type="button"
              onClick={handleStartRecording}
              className="h-10 w-10 shrink-0 flex items-center justify-center rounded-full bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors"
            >
              <Mic className="h-5 w-5" />
            </button>
            <input 
              type="text" 
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 rounded-full border border-gray-200 bg-gray-50 px-6 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            <button 
              type="submit" 
              disabled={!newMessage.trim()}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-white shadow-md transition-all hover:bg-indigo-700 disabled:opacity-50 disabled:bg-gray-400"
            >
              <Send className="h-5 w-5" />
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

const Members = ({ groupId, adminCount }: { groupId: string, adminCount: number }) => {
  const { user, profile } = useAuth();
  const [members, setMembers] = useState<any[]>([]);
  const [contributions, setContributions] = useState<any[]>([]);
  const [timeframe, setTimeframe] = useState<'weekly' | 'monthly' | 'annual'>('monthly');
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  useEffect(() => {
    if (!groupId) return;
    const q = query(
      collection(db, 'users'), 
      where('groupId', '==', groupId),
      orderBy('joinedAt', 'desc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMembers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'users'));

    const qC = query(
      collection(db, `groups/${groupId}/contributions`),
      where('status', '==', 'confirmed')
    );
    const unsubscribeC = onSnapshot(qC, (snapshot) => {
      setContributions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => handleFirestoreError(err, OperationType.LIST, `groups/${groupId}/contributions`));

    return () => {
      unsubscribe();
      unsubscribeC();
    };
  }, [groupId]);

  const getMemberTotal = (userId: string) => {
    const now = new Date();
    let startDate: Date;

    if (timeframe === 'weekly') {
      startDate = new Date(now.setDate(now.getDate() - now.getDay())); 
      startDate.setHours(0, 0, 0, 0);
    } else if (timeframe === 'monthly') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    } else {
      startDate = new Date(now.getFullYear(), 0, 1);
    }

    return contributions
      .filter(c => {
        if (c.userId !== userId) return false;
        const cDate = c.date?.toDate ? c.date.toDate() : new Date(c.date);
        return cDate >= startDate;
      })
      .reduce((sum, c) => sum + c.amount, 0);
  };

  const handleMakeAdmin = async (memberId: string) => {
    const currentAdmins = members.filter(m => m.role === 'admin').length;
    if (currentAdmins >= adminCount) {
      alert(`The group limit of ${adminCount} admins has been reached. Please remove an admin first if you wish to swap roles.`);
      return;
    }

    setLoadingAction(memberId);
    try {
      await updateDoc(doc(db, 'users', memberId), {
        role: 'admin'
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${memberId}`);
    } finally {
      setLoadingAction(null);
    }
  };

  const currentAdmins = members.filter(m => m.role === 'admin').length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Group Members</h2>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-500 font-medium">Group Admins:</span>
            <span className={cn(
              "font-bold px-2 py-0.5 rounded-full text-xs",
              currentAdmins < adminCount ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700"
            )}>
              {currentAdmins}/{adminCount}
            </span>
          </div>
        </div>
        
        <div className="flex rounded-lg bg-gray-100 p-1">
          {(['weekly', 'monthly', 'annual'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTimeframe(t)}
              className={cn(
                "rounded-md px-4 py-1.5 text-xs font-bold uppercase tracking-wider transition-all",
                timeframe === t 
                  ? "bg-white text-indigo-600 shadow-sm" 
                  : "text-gray-500 hover:text-gray-700"
              )}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {members.map(member => {
          const total = getMemberTotal(member.id);
          return (
            <Card key={member.id} className="group relative overflow-hidden p-0">
              <div className="absolute left-0 top-0 h-full w-1 bg-indigo-600 opacity-0 transition-opacity group-hover:opacity-100" />
              <div className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100 text-indigo-600 font-bold text-xl ring-2 ring-indigo-50">
                        {member.displayName?.[0] || 'U'}
                      </div>
                      {member.role === 'admin' && (
                        <div className="absolute -bottom-1 -right-1 rounded-full bg-indigo-600 p-1 text-white ring-2 ring-white">
                          <ShieldCheck className="h-3 w-3" />
                        </div>
                      )}
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900">{member.displayName}</h4>
                      <p className="text-xs text-gray-400 font-mono tracking-tighter">{member.email}</p>
                      <span className="mt-1 inline-block rounded-full bg-indigo-50 px-2.5 py-0.5 text-[10px] font-bold uppercase text-indigo-600">
                        {member.role}
                      </span>
                    </div>
                  </div>
                  {profile?.role === 'admin' && member.role !== 'admin' && (
                    <Button 
                      onClick={() => handleMakeAdmin(member.id)}
                      disabled={loadingAction === member.id}
                      variant="outline"
                      className="text-[10px] h-auto py-1.5 px-3 font-bold uppercase tracking-tight"
                    >
                      {loadingAction === member.id ? '...' : 'Promote Admin'}
                    </Button>
                  )}
                </div>

                <div className="mt-6 space-y-1 rounded-xl bg-gray-50 p-4">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                    {timeframe} savings
                  </p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-xs font-semibold text-gray-500">TSh</span>
                    <span className="text-2xl font-black text-gray-900">
                      {total.toLocaleString()}
                    </span>
                  </div>
                  <div className="mt-2 h-1.5 w-full rounded-full bg-gray-200">
                    <div 
                      className="h-full rounded-full bg-indigo-600 transition-all duration-500" 
                      style={{ width: `${Math.min(100, (total / 500000) * 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

// --- Main App Logic ---

const AppContent = () => {
  const { user, profile, loading, isSigningIn, error, signIn, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [currentGroupId, setCurrentGroupId] = useState<string | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isSidebarHidden, setIsSidebarHidden] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const [showLoadingHelp, setShowLoadingHelp] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (loading) setShowLoadingHelp(true);
    }, 10000);
    return () => clearTimeout(timer);
  }, [loading]);

  const [group, setGroup] = useState<any>(null);

  useEffect(() => {
    if (!profile?.groupId) return;
    const unsubscribe = onSnapshot(doc(db, 'groups', profile.groupId), (snapshot) => {
      setGroup({ id: snapshot.id, ...snapshot.data() });
    }, (err) => handleFirestoreError(err, OperationType.GET, `groups/${profile.groupId}`));
    return () => unsubscribe();
  }, [profile?.groupId]);

  useEffect(() => {
    if (!profile?.groupId) {
      setCurrentGroupId(null);
      return;
    }
    setCurrentGroupId(profile.groupId);
  }, [profile]);

  if (loading) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-gray-50 p-4 text-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
        <p className="mt-4 text-gray-500 font-medium">Loading your profile...</p>
        {showLoadingHelp && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-8 max-w-sm rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800"
          >
            <p className="mb-2 font-bold">Taking longer than expected?</p>
            <p className="mb-4">This can happen if the connection to Firebase is blocked or if you're in a restricted network.</p>
            <Button variant="outline" onClick={() => window.location.reload()} className="w-full bg-white">
              Reload Page
            </Button>
          </motion.div>
        )}
      </div>
    );
  }

  if (initError) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-4 text-center">
        <div className="mb-4 rounded-full bg-amber-100 p-4 text-amber-600">
          <AlertCircle className="h-12 w-12" />
        </div>
        <h1 className="mb-2 text-2xl font-bold text-gray-900">Initialization Error</h1>
        <p className="mb-6 max-w-md text-gray-600">{initError}</p>
        <Button onClick={() => window.location.reload()}>
          Try Again
        </Button>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-900 p-4 relative overflow-hidden">
        {/* Abstract background elements */}
        <div className="absolute top-0 left-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl relative z-10"
        >
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
              <Wallet className="h-10 w-10" />
            </div>
            <h1 className="text-3xl font-bold text-slate-900">PamojaVault</h1>
            <p className="mt-2 text-slate-600 tracking-tight">Professional Group Savings & Micro-Finance</p>
          </div>
          
          {error && (
            <div className="mb-6 rounded-lg bg-rose-50 p-4 text-sm text-rose-600 flex flex-col gap-2">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 shrink-0" />
                <p className="font-medium">Authentication Error</p>
              </div>
              <div className="ml-8 text-xs opacity-80">
                {(() => {
                  try {
                    const parsed = JSON.parse(error);
                    return (
                      <div className="space-y-1">
                        <p>{parsed.error}</p>
                        <p className="font-mono">Op: {parsed.operationType} | Path: {parsed.path}</p>
                      </div>
                    );
                  } catch {
                    return <p>{error}</p>;
                  }
                })()}
              </div>
            </div>
          )}

          <Button 
            onClick={signIn} 
            className="w-full py-6 text-lg bg-emerald-700 hover:bg-emerald-800"
            disabled={isSigningIn}
          >
            {isSigningIn ? (
              <div className="flex items-center justify-center gap-2">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                <span>Signing in...</span>
              </div>
            ) : (
              "Sign in with Google"
            )}
          </Button>
          <div className="mt-8 pt-6 border-t border-slate-100 flex justify-center gap-4 text-slate-400">
             <ShieldCheck className="h-5 w-5" />
             <CheckCircle2 className="h-5 w-5" />
             <Lock className="h-5 w-5" />
          </div>
          <p className="mt-6 text-center text-xs text-slate-400">
            Secure enterprise-grade encryption enabled.
          </p>
        </motion.div>
      </div>
    );
  }

  if (!profile?.groupId) {
    return <GroupSetup onComplete={() => {}} />;
  }

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'contributions', label: 'Savings', icon: PiggyBank },
    { id: 'loans', label: 'Loans', icon: HandCoins },
    { id: 'withdrawals', label: 'Withdrawals', icon: Wallet },
    { id: 'chat', label: 'Group Chat', icon: MessageSquare },
    { id: 'members', label: 'Members', icon: Users },
  ];

  if (profile?.role === 'admin') {
    navItems.push({ id: 'management', label: 'Management', icon: CheckCircle2 });
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 z-40 bg-gray-900/50 backdrop-blur-sm lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 border-r border-gray-200 bg-white transition-all duration-300 lg:static",
        isSidebarCollapsed ? "w-20" : "w-64",
        isMobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        isSidebarHidden && "lg:hidden"
      )}>
        <div className="flex h-full flex-col">
          <div className={cn(
            "flex h-16 items-center border-b border-gray-100 px-6",
            isSidebarCollapsed ? "justify-center px-0" : "justify-between"
          )}>
            <div className="flex items-center gap-3">
              <Wallet className="h-8 w-8 shrink-0 text-emerald-700" />
              {!isSidebarCollapsed && <span className="text-xl font-bold text-slate-900">PamojaVault</span>}
            </div>
            {!isSidebarCollapsed && (
              <button 
                onClick={() => setIsMobileMenuOpen(false)}
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-50 lg:hidden"
              >
                <X className="h-6 w-6" />
              </button>
            )}
          </div>
          
          <nav className="flex-1 space-y-1 p-4">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setIsMobileMenuOpen(false);
                }}
                title={isSidebarCollapsed ? item.label : ""}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-all",
                  activeTab === item.id 
                    ? "bg-emerald-50 text-emerald-700" 
                    : "text-slate-600 hover:bg-gray-50 hover:text-slate-900",
                  isSidebarCollapsed && "justify-center px-0"
                )}
              >
                <item.icon className="h-5 w-5 shrink-0" />
                {!isSidebarCollapsed && <span>{item.label}</span>}
              </button>
            ))}
          </nav>

          <div className="border-t border-gray-100 p-4">
            {!isSidebarCollapsed ? (
              <>
                <div className="mb-4 flex items-center gap-3 px-2">
                  <div className="h-10 w-10 shrink-0 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                    {user.displayName?.[0] || 'U'}
                  </div>
                  <div className="overflow-hidden">
                    <p className="truncate text-sm font-semibold text-slate-900">{user.displayName}</p>
                    <p className="truncate text-xs text-slate-500">{profile?.role || 'Member'}</p>
                  </div>
                </div>
                <Button variant="ghost" onClick={logout} className="w-full justify-start gap-3 text-rose-600 hover:bg-rose-50 hover:text-rose-700">
                  <LogOut className="h-5 w-5" />
                  Sign Out
                </Button>
              </>
            ) : (
              <div className="flex flex-col items-center gap-4">
                <div className="h-10 w-10 shrink-0 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold">
                  {user.displayName?.[0] || 'U'}
                </div>
                <button 
                  onClick={logout}
                  className="rounded-lg p-2 text-rose-600 hover:bg-rose-50"
                  title="Sign Out"
                >
                  <LogOut className="h-5 w-5" />
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-4 md:p-8">
        <header className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsMobileMenuOpen(true)}
              className="rounded-lg border border-gray-200 bg-white p-2 text-gray-600 shadow-sm hover:bg-gray-50 lg:hidden"
            >
              <Menu className="h-6 w-6" />
            </button>
            <button 
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className={cn(
                "hidden rounded-lg border border-gray-200 bg-white p-2 text-gray-600 shadow-sm hover:bg-gray-50 lg:block",
                isSidebarHidden && "hidden"
              )}
              title={isSidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
            >
              {isSidebarCollapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
            </button>
            <button 
              onClick={() => setIsSidebarHidden(!isSidebarHidden)}
              className="hidden rounded-lg border border-gray-200 bg-white p-2 text-gray-600 shadow-sm hover:bg-gray-50 lg:block"
              title={isSidebarHidden ? "Show Sidebar" : "Full Screen View"}
            >
              {isSidebarHidden ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
            </button>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 capitalize md:text-3xl">{activeTab}</h2>
              <p className="text-sm text-gray-500 md:text-base">Welcome back, {user.displayName?.split(' ')[0]}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden rounded-full bg-white px-4 py-2 shadow-sm md:block border border-slate-100">
              <span className="text-sm font-medium text-slate-600">Group: </span>
              <span className="text-sm font-bold text-emerald-700">{group?.name || 'PamojaVault'}</span>
            </div>
          </div>
        </header>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.2 }}
          >
            {currentGroupId ? (
              <>
                {activeTab === 'dashboard' && <Dashboard groupId={currentGroupId} />}
                {activeTab === 'contributions' && <Contributions groupId={currentGroupId} />}
                {activeTab === 'loans' && <Loans groupId={currentGroupId} adminCount={group?.adminCount || 1} />}
                {activeTab === 'withdrawals' && <Withdrawals groupId={currentGroupId} />}
                {activeTab === 'chat' && <Chat groupId={currentGroupId} />}
                {activeTab === 'management' && <Management groupId={currentGroupId} adminCount={group?.adminCount || 1} />}
                {activeTab === 'members' && <Members groupId={currentGroupId} adminCount={group?.adminCount || 1} />}
              </>
            ) : (
              <div className="flex h-64 items-center justify-center">
                <p className="text-gray-500">Initializing group data...</p>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
};

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ErrorBoundary>
  );
}
