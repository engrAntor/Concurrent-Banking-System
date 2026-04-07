"use client";
import { useEffect, useState } from 'react';
import { socket } from '../../lib/socket';
import TransactionForm from '../../components/TransactionForm';

interface Account {
  account_id: string;
  holder_name: string;
  balance: number;
  version: number;
}

interface Transaction {
  id: number;
  from_account: string | null;
  to_account: string | null;
  type: 'deposit' | 'withdraw' | 'transfer';
  amount: number;
  status: 'success' | 'failed';
  reason: string | null;
  created_at: string;
}

interface Notification {
  id: number;
  type: 'success' | 'error';
  message: string;
}

const avatarColors: Record<string, string> = {
  ACC1001: 'from-violet-500 to-indigo-600',
  ACC1002: 'from-blue-500 to-cyan-600',
  ACC1003: 'from-emerald-500 to-teal-600',
};

const getInitials = (name: string) =>
  name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

export default function Home() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [notifCounter, setNotifCounter] = useState(0);
  const [activeTab, setActiveTab] = useState<'all' | 'deposit' | 'withdraw' | 'transfer'>('all');

  const fetchAccounts = async () => {
    try {
      const res = await fetch('http://localhost:3001/api/accounts');
      setAccounts(await res.json());
    } catch {}
  };

  const fetchTransactions = async () => {
    try {
      const res = await fetch('http://localhost:3001/api/transactions');
      setTransactions(await res.json());
    } catch {}
  };

  const addNotification = (type: 'success' | 'error', message: string) => {
    const id = notifCounter + 1;
    setNotifCounter(id);
    setNotifications(prev => [{ id, type, message }, ...prev].slice(0, 4));
    setTimeout(() => setNotifications(prev => prev.filter(n => n.id !== id)), 5000);
  };

  useEffect(() => {
    fetchAccounts();
    fetchTransactions();
    socket.connect();

    socket.on('connect', () => setIsConnected(true));
    socket.on('disconnect', () => setIsConnected(false));
    socket.on('balance:updated', () => { fetchAccounts(); fetchTransactions(); });
    socket.on('transaction:created', (data) => {
      addNotification('success', `${data.type.charAt(0).toUpperCase() + data.type.slice(1)} of $${Number(data.amount).toFixed(2)} succeeded`);
    });
    socket.on('transaction:failed', (data) => {
      addNotification('error', `${data.type.charAt(0).toUpperCase() + data.type.slice(1)} failed — ${data.reason}`);
    });

    return () => {
      socket.off('connect'); socket.off('disconnect');
      socket.off('balance:updated'); socket.off('transaction:created'); socket.off('transaction:failed');
      socket.disconnect();
    };
  }, []);

  const totalBalance = accounts.reduce((sum, acc) => sum + acc.balance, 0);
  const successCount = transactions.filter(tx => tx.status === 'success').length;
  const filteredTx = activeTab === 'all' ? transactions : transactions.filter(tx => tx.type === activeTab);

  const txTypeStyle = (type: string) => {
    if (type === 'deposit') return 'text-emerald-400 bg-emerald-400/10';
    if (type === 'withdraw') return 'text-orange-400 bg-orange-400/10';
    return 'text-blue-400 bg-blue-400/10';
  };

  const txAmountStyle = (type: string) => {
    if (type === 'deposit') return 'text-emerald-400';
    if (type === 'withdraw') return 'text-orange-400';
    return 'text-blue-300';
  };

  const txAmountPrefix = (type: string) => {
    if (type === 'deposit') return '+';
    if (type === 'withdraw') return '-';
    return '↔';
  };

  return (
    <div className="min-h-screen mesh-bg text-white" style={{ fontFamily: "var(--font-inter, Inter, system-ui, sans-serif)" }}>
      
      {/* Toast Notifications */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
        {notifications.map(n => (
          <div key={n.id} className={`toast-enter flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl border text-sm font-medium backdrop-blur-sm max-w-xs pointer-events-auto
            ${n.type === 'success'
              ? 'bg-emerald-950/90 border-emerald-700/50 text-emerald-200'
              : 'bg-red-950/90 border-red-700/50 text-red-200'}`}
          >
            {n.type === 'success'
              ? <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center shrink-0">
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path d="M5 13l4 4L19 7"/></svg>
                </div>
              : <div className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center shrink-0">
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path d="M6 18L18 6M6 6l12 12"/></svg>
                </div>
            }
            <span className="truncate">{n.message}</span>
          </div>
        ))}
      </div>

      {/* Nav */}
      <nav className="sticky top-0 z-40 border-b border-white/[0.06] bg-black/30 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path d="M3 6h18M3 12h18M3 18h18"/><rect x="2" y="4" width="20" height="16" rx="2"/>
              </svg>
            </div>
            <span className="font-bold text-sm tracking-tight gradient-text">NexBank</span>
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full transition-colors duration-500 ${isConnected ? 'bg-emerald-400 animate-pulse-glow' : 'bg-red-400'}`} />
            <span className="text-xs font-medium text-gray-400">{isConnected ? 'Live Connected' : 'Disconnected'}</span>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-8">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold gradient-text tracking-tight mb-1">Transaction Dashboard</h1>
          <p className="text-sm text-gray-500">Real-time concurrent banking with Optimistic Concurrency Control</p>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Balance', value: `$${totalBalance.toFixed(2)}`, sub: 'Across all accounts', color: 'from-blue-500 to-indigo-600', icon: '💰' },
            { label: 'Active Accounts', value: String(accounts.length), sub: 'Seeded accounts', color: 'from-violet-500 to-purple-600', icon: '👤' },
            { label: 'Transactions', value: String(transactions.length), sub: 'Total logged', color: 'from-emerald-500 to-teal-600', icon: '📊' },
            { label: 'Success Rate', value: transactions.length ? `${Math.round((successCount / transactions.length) * 100)}%` : '–', sub: 'Completed safely', color: 'from-orange-500 to-amber-600', icon: '✅' },
          ].map((stat, i) => (
            <div key={i} className="glass-card rounded-2xl p-5 group hover:border-white/15 transition-all duration-300">
              <div className="flex items-start justify-between mb-3">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{stat.label}</p>
                <span className="text-lg">{stat.icon}</span>
              </div>
              <p className="text-2xl font-bold text-white mb-1">{stat.value}</p>
              <p className="text-xs text-gray-600">{stat.sub}</p>
            </div>
          ))}
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Left: Accounts + Activity */}
          <div className="lg:col-span-2 space-y-6">

            {/* Account Cards */}
            <div>
              <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Accounts</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {accounts.map(acc => (
                  <div key={acc.account_id} className="glass-card rounded-2xl p-5 group hover:border-white/15 transition-all duration-300 hover:-translate-y-0.5 relative overflow-hidden">
                    {/* Subtle hover gradient */}
                    <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br ${avatarColors[acc.account_id] || 'from-gray-600 to-gray-700'}`} style={{ opacity: 0 }} />
                    <div className="absolute inset-0 bg-gradient-to-br from-transparent to-transparent group-hover:from-blue-500/5 group-hover:to-indigo-500/5 transition-all duration-500 rounded-2xl" />

                    <div className="relative z-10">
                      <div className="flex items-center gap-3 mb-4">
                        <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${avatarColors[acc.account_id] || 'from-gray-600 to-gray-700'} flex items-center justify-center text-xs font-bold text-white shadow-lg`}>
                          {getInitials(acc.holder_name)}
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 font-mono">{acc.account_id}</p>
                          <p className="text-sm font-semibold text-white leading-tight">{acc.holder_name}</p>
                        </div>
                      </div>

                      <div className="border-t border-white/[0.06] pt-4">
                        <p className="text-xs text-gray-500 mb-1">Balance</p>
                        <p className="text-2xl font-bold font-mono text-white">
                          ${parseFloat(String(acc.balance)).toFixed(2)}
                        </p>
                        <p className="text-[10px] text-gray-600 mt-1">v{acc.version} · OCC enabled</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Activity Log */}
            <div className="glass-card rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-white/[0.06] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-400' : 'bg-gray-600'} ${isConnected ? 'animate-pulse' : ''}`} />
                  <h2 className="text-sm font-semibold text-white">Live Activity</h2>
                </div>
                {/* Tabs */}
                <div className="flex gap-1">
                  {(['all', 'deposit', 'withdraw', 'transfer'] as const).map(tab => (
                    <button key={tab} onClick={() => setActiveTab(tab)} className={`px-2.5 py-1 text-[10px] font-semibold rounded-lg transition-all capitalize cursor-pointer
                      ${activeTab === tab ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-gray-300'}`}>
                      {tab}
                    </button>
                  ))}
                </div>
              </div>

              <div className="custom-scrollbar overflow-y-auto max-h-80">
                {filteredTx.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-gray-600">
                    <svg className="w-10 h-10 mb-3 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                    </svg>
                    <p className="text-sm">No transactions yet</p>
                    <p className="text-xs mt-1">Use the form to get started</p>
                  </div>
                ) : (
                  filteredTx.map((tx, i) => (
                    <div key={tx.id} className="flex items-center gap-4 px-5 py-3.5 border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors group"
                      style={{ animationDelay: `${i * 30}ms` }}>
                      {/* Type icon */}
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${txTypeStyle(tx.type)}`}>
                        {tx.type === 'deposit' ? '↓' : tx.type === 'withdraw' ? '↑' : '↔'}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className={`text-xs font-semibold uppercase tracking-wide ${txTypeStyle(tx.type).split(' ')[0]}`}>{tx.type}</span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-semibold ${tx.status === 'success' ? 'status-success' : 'status-failed'}`}>
                            {tx.status}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 truncate font-mono">
                          {tx.type === 'transfer' ? `${tx.from_account} → ${tx.to_account}` :
                            tx.type === 'deposit' ? `→ ${tx.to_account}` : `${tx.from_account} →`}
                        </p>
                        {tx.status === 'failed' && tx.reason && (
                          <p className="text-[10px] text-red-400/70 truncate mt-0.5">{tx.reason}</p>
                        )}
                      </div>

                      <div className="text-right shrink-0">
                        <p className={`text-sm font-bold font-mono ${txAmountStyle(tx.type)}`}>
                          {txAmountPrefix(tx.type)} ${tx.amount.toFixed(2)}
                        </p>
                        <p className="text-[10px] text-gray-600">{new Date(tx.created_at).toLocaleTimeString()}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Right: Form */}
          <div className="lg:col-span-1">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">New Transaction</h2>
            <TransactionForm accounts={accounts} onTransactionSuccess={() => {}} />

            {/* Info card */}
            <div className="mt-4 glass-card rounded-2xl p-4">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">OCC Status</p>
              <div className="space-y-2">
                {[
                  { label: 'Version Control', status: 'Active', ok: true },
                  { label: 'WAL Mode', status: 'Enabled', ok: true },
                  { label: 'Mutex Guard', status: 'Transfers', ok: true },
                  { label: 'Balance Check', status: 'Enforced', ok: true },
                ].map(item => (
                  <div key={item.label} className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">{item.label}</span>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${item.ok ? 'status-success' : 'status-failed'}`}>{item.status}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
