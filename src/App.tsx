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
  Clock
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
  getDocs
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

// --- Pages ---

const Dashboard = ({ groupId }: { groupId: string }) => {
  const [stats, setStats] = useState({ totalSavings: 0, activeLoans: 0, memberCount: 0 });
  const [recentTransactions, setRecentTransactions] = useState<any[]>([]);

  useEffect(() => {
    if (!groupId) return;

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
      const contributionsSnap = await getDocs(query(collection(db, `groups/${groupId}/contributions`), where('status', '==', 'confirmed')));
      const loansSnap = await getDocs(query(collection(db, `groups/${groupId}/loans`), where('status', '==', 'active')));
      
      let total = 0;
      contributionsSnap.forEach(doc => total += doc.data().amount);
      
      setStats({
        totalSavings: total,
        activeLoans: loansSnap.size,
        memberCount: 0 // Fetch from groups/members if implemented
      });
    };
    fetchStats();

    return () => unsubscribe();
  }, [groupId]);

  return (
    <div className="space-y-6">
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
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !user || !phoneNumber) return;
    setLoading(true);
    setPaymentStatus('processing');

    try {
      // Simulate Payment Trigger (e.g. M-Pesa STK Push)
      console.log(`Triggering payment for ${phoneNumber} amount ${amount}`);
      
      // In a real app, you would call your backend API here to initiate the mobile money payment
      // const response = await fetch('/api/pay', { method: 'POST', body: JSON.stringify({ phoneNumber, amount }) });
      
      // Simulate a delay for the payment process
      await new Promise(resolve => setTimeout(resolve, 2000));

      await addDoc(collection(db, `groups/${groupId}/contributions`), {
        userId: user.uid,
        groupId,
        amount: parseFloat(amount),
        type,
        phoneNumber,
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
            <label className="mb-1 block text-sm font-medium text-gray-700">Phone Number (Mobile Money)</label>
            <input
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-indigo-500 focus:ring-indigo-500"
              placeholder="e.g. 255700000000"
              required
            />
          </div>
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
            <label className="mb-1 block text-sm font-medium text-gray-700">Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-indigo-500 focus:ring-indigo-500"
            >
              <option value="savings">Savings</option>
              <option value="social_fund">Social Fund</option>
            </select>
          </div>
          
          {paymentStatus === 'success' && (
            <div className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">
              Payment initiated! Please check your phone for the PIN prompt.
            </div>
          )}
          
          {paymentStatus === 'error' && (
            <div className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">
              There was an error initiating the payment. Please try again.
            </div>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            {paymentStatus === 'processing' ? 'Processing Payment...' : 'Pay & Submit Contribution'}
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
    });
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
    });
    return () => unsubscribe();
  }, [groupId]);

  const handleRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !user) return;
    try {
      await addDoc(collection(db, `groups/${groupId}/withdrawals`), {
        userId: user.uid,
        groupId,
        amount: parseFloat(amount),
        reason,
        status: 'requested',
        requestedAt: serverTimestamp()
      });
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

const Management = ({ groupId }: { groupId: string }) => {
  const [pendingContributions, setPendingContributions] = useState<any[]>([]);
  const [pendingLoans, setPendingLoans] = useState<any[]>([]);
  const [pendingWithdrawals, setPendingWithdrawals] = useState<any[]>([]);

  useEffect(() => {
    const qC = query(collection(db, `groups/${groupId}/contributions`), where('status', '==', 'pending'));
    const unsubscribeC = onSnapshot(qC, (snapshot) => {
      setPendingContributions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const qL = query(collection(db, `groups/${groupId}/loans`), where('status', '==', 'requested'));
    const unsubscribeL = onSnapshot(qL, (snapshot) => {
      setPendingLoans(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const qW = query(collection(db, `groups/${groupId}/withdrawals`), where('status', '==', 'requested'));
    const unsubscribeW = onSnapshot(qW, (snapshot) => {
      setPendingWithdrawals(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

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

  const handleApproveWithdrawal = async (id: string) => {
    try {
      const { doc, updateDoc } = await import('firebase/firestore');
      await updateDoc(doc(db, `groups/${groupId}/withdrawals`, id), { status: 'approved' });
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
                <p className="font-semibold">TSh {c.amount.toLocaleString()}</p>
                <p className="text-sm text-gray-500">{c.type} - Phone: {c.phoneNumber || 'N/A'}</p>
                <p className="text-xs text-gray-400">User: {c.userId.slice(0, 5)}...</p>
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
        <h3 className="mb-4 text-xl font-bold text-gray-900">Withdrawal Requests & Completion</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {pendingWithdrawals.map(w => (
            <Card key={w.id} className="flex items-center justify-between">
              <div>
                <p className="font-semibold">TSh {w.amount.toLocaleString()}</p>
                <p className="text-sm text-gray-500">Reason: {w.reason || 'N/A'} Status: {w.status}</p>
              </div>
              <div className="flex gap-2">
                {w.status === 'requested' && (
                  <>
                    <Button onClick={() => handleApproveWithdrawal(w.id)} variant="secondary">Approve</Button>
                    <Button variant="danger">Reject</Button>
                  </>
                )}
                {w.status === 'approved' && (
                  <Button onClick={() => handleCompleteWithdrawal(w.id)} variant="primary">Mark Completed</Button>
                )}
              </div>
            </Card>
          ))}
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
    });
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
  const { user, profile, loading, signIn, logout } = useAuth();
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

  useEffect(() => {
    const fetchGroup = async () => {
      if (!user) return;
      try {
        const groupsSnap = await getDocs(query(collection(db, 'groups'), limit(1)));
        if (!groupsSnap.empty) {
          setCurrentGroupId(groupsSnap.docs[0].id);
        } else {
          // Create a default group for the first user
          const newGroup = await addDoc(collection(db, 'groups'), {
            name: 'Main VICOBA Group',
            description: 'Our community savings group',
            createdBy: user.uid,
            createdAt: serverTimestamp()
          });
          setCurrentGroupId(newGroup.id);
        }
      } catch (err) {
        console.error("Error fetching group:", err);
        setInitError("Failed to initialize group data. Please check your permissions.");
      }
    };
    if (user) fetchGroup();
  }, [user]);

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
            <h1 className="text-3xl font-bold text-gray-900">VICOBA Manager</h1>
            <p className="mt-2 text-gray-600">Securely manage your group savings and loans</p>
          </div>
          <Button onClick={signIn} className="w-full py-6 text-lg">
            Sign in with Google
          </Button>
          <p className="mt-6 text-center text-xs text-gray-400">
            By signing in, you agree to our Terms and Privacy Policy.
          </p>
        </motion.div>
      </div>
    );
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
              {!isSidebarCollapsed && <span className="text-xl font-bold text-gray-900">VICOBA</span>}
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
              <span className="text-sm font-bold text-indigo-600">Main VICOBA</span>
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
                {activeTab === 'management' && <Management groupId={currentGroupId} />}
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
