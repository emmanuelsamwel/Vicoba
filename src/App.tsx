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
  MessageSquare
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
  setDoc
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';
import { format } from 'date-fns';
import { cn } from './lib/utils';

// --- Components ---

const Button = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' }>(
  ({ className, variant = 'primary', ...props }, ref) => {
    const variants = {
      primary: 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm',
      secondary: 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm',
      outline: 'border border-gray-300 bg-transparent hover:bg-gray-50 text-gray-700',
      ghost: 'bg-transparent hover:bg-gray-100 text-gray-600',
      danger: 'bg-rose-600 text-white hover:bg-rose-700 shadow-sm',
    };
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:pointer-events-none disabled:opacity-50',
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
        phoneNumber: groupPhone,
        createdBy: user.uid,
        createdAt: serverTimestamp()
      });
      
      await setDoc(doc(db, 'users', user.uid), {
        groupId: groupRef.id,
        role: 'admin'
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
        role: 'member'
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
                <select 
                  value={adminCount}
                  onChange={(e) => setAdminCount(Number(e.target.value))}
                  className="mt-1 w-full rounded-lg border border-gray-300 p-3 focus:border-indigo-500 focus:ring-indigo-500"
                >
                  <option value={1}>1 Admin</option>
                  <option value={2}>2 Admins</option>
                  <option value={3}>3 Admins</option>
                </select>
                <p className="mt-1 text-xs text-gray-500">Each admin must enter an OTP to authorize withdrawals.</p>
              </div>
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
  const [stats, setStats] = useState({ totalSavings: 0, activeLoans: 0, memberCount: 0 });
  const [recentTransactions, setRecentTransactions] = useState<any[]>([]);
  const [group, setGroup] = useState<any>(null);

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
        {group?.joinCode && (
          <div className="flex flex-wrap items-center gap-3">
            {group.phoneNumber && (
              <div className="flex items-center gap-2 rounded-xl bg-indigo-50 px-4 py-2 border border-indigo-100">
                <div className="text-xs font-medium text-indigo-600 uppercase">Group Phone</div>
                <div className="text-sm font-bold text-indigo-900">{group.phoneNumber}</div>
              </div>
            )}
            <div className="flex items-center gap-3 rounded-xl bg-indigo-50 px-4 py-2 border border-indigo-100">
              <div className="text-xs font-medium text-indigo-600 uppercase">Join Code</div>
              <div className="text-lg font-bold tracking-widest text-indigo-900">{group.joinCode}</div>
              <div className="flex items-center gap-1 border-l border-indigo-200 ml-2 pl-2">
                <Button 
                  variant="ghost" 
                  className="h-8 w-8 p-0 text-indigo-600 hover:bg-indigo-100"
                  title="Copy Code"
                  onClick={() => {
                    navigator.clipboard.writeText(group.joinCode);
                    // Use a temporary visual feedback if possible, but keeping it simple for now
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

      await addDoc(collection(db, `groups/${groupId}/contributions`), {
        userId: user.uid,
        groupId,
        amount: parseFloat(amount),
        type,
        paymentMethod,
        provider: paymentMethod === 'mobile_money' ? provider : null,
        phoneNumber: paymentMethod === 'mobile_money' ? phoneNumber : null,
        date: serverTimestamp(),
        status: 'pending'
      });
      
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

const Loans = ({ groupId }: { groupId: string }) => {
  const { user } = useAuth();
  const [loans, setLoans] = useState<any[]>([]);
  const [showRequest, setShowRequest] = useState(false);
  const [amount, setAmount] = useState('');

  useEffect(() => {
    const q = query(collection(db, `groups/${groupId}/loans`), orderBy('requestedAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setLoans(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => handleFirestoreError(err, OperationType.LIST, `groups/${groupId}/loans`));
    return () => unsubscribe();
  }, [groupId]);

  const handleRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !user) return;
    try {
      await addDoc(collection(db, `groups/${groupId}/loans`), {
        userId: user.uid,
        groupId,
        amount: parseFloat(amount),
        interestRate: 10, // Default 10%
        status: 'requested',
        requestedAt: serverTimestamp()
      });
      setAmount('');
      setShowRequest(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `groups/${groupId}/loans`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Loan Management</h2>
        <Button onClick={() => setShowRequest(true)}>Request New Loan</Button>
      </div>

      {showRequest && (
        <Card className="max-w-md">
          <h3 className="mb-4 text-lg font-semibold">Request Loan</h3>
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
            <div className="flex gap-3">
              <Button type="submit" className="flex-1">Submit</Button>
              <Button type="button" variant="outline" onClick={() => setShowRequest(false)}>Cancel</Button>
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

  useEffect(() => {
    const qC = query(collection(db, `groups/${groupId}/contributions`), where('status', '==', 'pending'));
    const unsubscribeC = onSnapshot(qC, (snapshot) => {
      setPendingContributions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => handleFirestoreError(err, OperationType.LIST, `groups/${groupId}/contributions`));

    const qL = query(collection(db, `groups/${groupId}/loans`), where('status', '==', 'requested'));
    const unsubscribeL = onSnapshot(qL, (snapshot) => {
      setPendingLoans(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => handleFirestoreError(err, OperationType.LIST, `groups/${groupId}/loans`));

    const qW = query(collection(db, `groups/${groupId}/withdrawals`), where('status', 'in', ['requested', 'pending_approval', 'approved']));
    const unsubscribeW = onSnapshot(qW, (snapshot) => {
      setPendingWithdrawals(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => handleFirestoreError(err, OperationType.LIST, `groups/${groupId}/withdrawals`));

    return () => {
      unsubscribeC();
      unsubscribeL();
      unsubscribeW();
    };
  }, [groupId]);

  const handleConfirmContribution = async (id: string) => {
    try {
      const { doc, updateDoc } = await import('firebase/firestore');
      await updateDoc(doc(db, `groups/${groupId}/contributions`, id), { status: 'confirmed' });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `groups/${groupId}/contributions`);
    }
  };

  const handleApproveLoan = async (id: string) => {
    try {
      const { doc, updateDoc } = await import('firebase/firestore');
      await updateDoc(doc(db, `groups/${groupId}/loans`, id), { status: 'approved' });
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
        <h3 className="mb-4 text-xl font-bold text-gray-900">Pending Contributions</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {pendingContributions.map(c => (
            <Card key={c.id} className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-lg">TSh {c.amount.toLocaleString()}</p>
                <div className="mt-1 space-y-0.5">
                  <p className="text-sm font-medium text-indigo-600 capitalize">{c.type.replace('_', ' ')}</p>
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
          {pendingLoans.map(l => (
            <Card key={l.id} className="flex items-center justify-between">
              <div>
                <p className="font-semibold">TSh {l.amount.toLocaleString()}</p>
                <p className="text-sm text-gray-500">User: {l.userId.slice(0, 5)}... Status: {l.status}</p>
              </div>
              <div className="flex gap-2">
                {l.status === 'requested' && (
                  <>
                    <Button onClick={() => handleApproveLoan(l.id)} variant="secondary">Approve</Button>
                    <Button variant="danger">Reject</Button>
                  </>
                )}
                {l.status === 'approved' && (
                  <Button onClick={() => handleDisburseLoan(l.id)} variant="primary">Disburse</Button>
                )}
              </div>
            </Card>
          ))}
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

const Members = () => {
  const [members, setMembers] = useState<any[]>([]);

  useEffect(() => {
    const q = query(collection(db, 'users'), orderBy('joinedAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMembers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'users'));
    return () => unsubscribe();
  }, []);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Group Members</h2>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {members.map(member => (
          <Card key={member.id} className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-xl">
              {member.displayName?.[0] || 'U'}
            </div>
            <div>
              <h4 className="font-bold text-gray-900">{member.displayName}</h4>
              <p className="text-sm text-gray-500">{member.email}</p>
              <p className="text-xs font-medium text-indigo-600 uppercase mt-1">{member.role}</p>
            </div>
          </Card>
        ))}
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
      <div className="flex min-h-screen items-center justify-center bg-indigo-600 p-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl"
        >
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600">
              <Wallet className="h-10 w-10" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900">PamojaVault</h1>
            <p className="mt-2 text-gray-600">Securely manage your group savings and loans</p>
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
            className="w-full py-6 text-lg"
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
          <p className="mt-6 text-center text-xs text-gray-400">
            By signing in, you agree to our Terms and Privacy Policy.
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
              <Wallet className="h-8 w-8 shrink-0 text-indigo-600" />
              {!isSidebarCollapsed && <span className="text-xl font-bold text-gray-900">PamojaVault</span>}
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
                    ? "bg-indigo-50 text-indigo-600" 
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900",
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
                  <div className="h-10 w-10 shrink-0 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold">
                    {user.displayName?.[0] || 'U'}
                  </div>
                  <div className="overflow-hidden">
                    <p className="truncate text-sm font-semibold text-gray-900">{user.displayName}</p>
                    <p className="truncate text-xs text-gray-500">{profile?.role || 'Member'}</p>
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
            <div className="hidden rounded-full bg-white px-4 py-2 shadow-sm md:block">
              <span className="text-sm font-medium text-gray-600">Group: </span>
              <span className="text-sm font-bold text-indigo-600">{group?.name || 'PamojaVault'}</span>
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
                {activeTab === 'loans' && <Loans groupId={currentGroupId} />}
                {activeTab === 'withdrawals' && <Withdrawals groupId={currentGroupId} />}
                {activeTab === 'management' && <Management groupId={currentGroupId} adminCount={group?.adminCount || 1} />}
                {activeTab === 'members' && <Members />}
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
