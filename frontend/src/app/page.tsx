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

const AVATAR_STYLES: Record<string, React.CSSProperties> = {
  ACC1001: { background: 'linear-gradient(135deg, #7c3aed, #4f46e5)' },
  ACC1002: { background: 'linear-gradient(135deg, #2563eb, #0891b2)' },
  ACC1003: { background: 'linear-gradient(135deg, #059669, #0d9488)' },
};

const DEFAULT_AVATAR: React.CSSProperties = { background: 'linear-gradient(135deg, #374151, #1f2937)' };

const getInitials = (name: string) =>
  name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

const TX_TYPE_STYLES: Record<string, { color: string; bg: string; prefix: string }> = {
  deposit:  { color: '#34d399', bg: 'rgba(52,211,153,0.12)',  prefix: '+' },
  withdraw: { color: '#fb923c', bg: 'rgba(251,146,60,0.12)',  prefix: '-' },
  transfer: { color: '#818cf8', bg: 'rgba(129,140,248,0.12)', prefix: '↔' },
};

const STAT_CARDS = (totalBalance: number, accountCount: number, txCount: number, successRate: string) => [
  { label: 'Total Balance',    value: `$${totalBalance.toFixed(2)}`, sub: 'Across all accounts', icon: '💰', accent: '#3b82f6' },
  { label: 'Active Accounts',  value: String(accountCount),          sub: 'Seeded accounts',    icon: '👤', accent: '#8b5cf6' },
  { label: 'Transactions',     value: String(txCount),               sub: 'Total logged',       icon: '📊', accent: '#10b981' },
  { label: 'Success Rate',     value: txCount ? successRate : '–',   sub: 'Completed safely',   icon: '✅', accent: '#f97316' },
];

export default function Home() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [notifCounter, setNotifCounter] = useState(0);
  const [activeTab, setActiveTab] = useState<'all' | 'deposit' | 'withdraw' | 'transfer'>('all');

  const fetchAccounts = async () => {
    try { const r = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/accounts`); setAccounts(await r.json()); } catch {}
  };
  const fetchTransactions = async () => {
    try { const r = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/transactions`); setTransactions(await r.json()); } catch {}
  };

  const addNotification = (type: 'success' | 'error', message: string) => {
    const id = Date.now() + notifCounter;
    setNotifCounter(c => c + 1);
    setNotifications(prev => [{ id, type, message }, ...prev].slice(0, 4));
    setTimeout(() => setNotifications(prev => prev.filter(n => n.id !== id)), 5000);
  };

  useEffect(() => {
    fetchAccounts(); fetchTransactions();
    socket.connect();
    socket.on('connect', () => setIsConnected(true));
    socket.on('disconnect', () => setIsConnected(false));
    socket.on('balance:updated', () => { fetchAccounts(); fetchTransactions(); });
    socket.on('transaction:created', (d) => addNotification('success', `${d.type.charAt(0).toUpperCase() + d.type.slice(1)} of $${Number(d.amount).toFixed(2)} succeeded`));
    socket.on('transaction:failed',  (d) => addNotification('error',   `${d.type.charAt(0).toUpperCase() + d.type.slice(1)} failed — ${d.reason}`));
    return () => {
      ['connect','disconnect','balance:updated','transaction:created','transaction:failed'].forEach(e => socket.off(e));
      socket.disconnect();
    };
  }, []);

  const totalBalance = accounts.reduce((s, a) => s + a.balance, 0);
  const successCount = transactions.filter(t => t.status === 'success').length;
  const successRate  = `${Math.round((successCount / transactions.length) * 100)}%`;
  const filteredTx   = activeTab === 'all' ? transactions : transactions.filter(t => t.type === activeTab);
  const tabs = ['all', 'deposit', 'withdraw', 'transfer'] as const;

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#030712', fontFamily: 'var(--font-inter, Inter, system-ui, sans-serif)' }}>

      {/* Subtle mesh glow */}
      <div className="fixed inset-0 pointer-events-none" style={{
        background: `
          radial-gradient(ellipse 70% 50% at 10% 15%, rgba(59,130,246,0.07) 0%, transparent 55%),
          radial-gradient(ellipse 55% 70% at 85% 80%, rgba(52,211,153,0.05) 0%, transparent 55%)
        `
      }} />

      {/* Toast Notifications */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
        {notifications.map(n => (
          <div key={n.id} className="toast-enter flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl text-sm font-medium pointer-events-auto max-w-xs"
            style={n.type === 'success'
              ? { background: 'rgba(6,78,59,0.95)', border: '1px solid rgba(16,185,129,0.4)', color: '#a7f3d0', backdropFilter: 'blur(12px)' }
              : { background: 'rgba(69,10,10,0.95)', border: '1px solid rgba(239,68,68,0.4)',  color: '#fecaca', backdropFilter: 'blur(12px)' }
            }>
            {n.type === 'success'
              ? <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0" style={{ background: '#10b981' }}>
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path d="M5 13l4 4L19 7"/></svg>
                </div>
              : <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0" style={{ background: '#ef4444' }}>
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path d="M6 18L18 6M6 6l12 12"/></svg>
                </div>
            }
            <span className="truncate">{n.message}</span>
          </div>
        ))}
      </div>

      {/* Navbar */}
      <nav className="sticky top-0 z-40" style={{ background: 'rgba(3,7,18,0.85)', borderBottom: '1px solid rgba(255,255,255,0.06)', backdropFilter: 'blur(20px)' }}>
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shadow-lg" style={{ background: 'linear-gradient(135deg, #3b82f6, #6366f1)' }}>
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <rect x="2" y="4" width="20" height="16" rx="2"/><path d="M2 10h20"/>
              </svg>
            </div>
            <span className="font-bold text-sm" style={{ background: 'linear-gradient(135deg, #60a5fa, #34d399)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              NexBank
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: isConnected ? '#34d399' : '#ef4444', boxShadow: isConnected ? '0 0 8px #34d399' : 'none' }} />
            <span className="text-xs font-medium" style={{ color: '#6b7280' }}>{isConnected ? 'Live Connected' : 'Disconnected'}</span>
          </div>
        </div>
      </nav>

      <div className="relative max-w-7xl mx-auto px-6 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold tracking-tight mb-1" style={{ background: 'linear-gradient(135deg, #60a5fa, #34d399, #818cf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Transaction Dashboard
          </h1>
          <p className="text-sm" style={{ color: '#6b7280' }}>Real-time concurrent banking with Optimistic Concurrency Control</p>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {STAT_CARDS(totalBalance, accounts.length, transactions.length, successRate).map((stat, i) => (
            <div key={i} className="rounded-2xl p-5 transition-all duration-300" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <div className="flex items-start justify-between mb-3">
                <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#6b7280' }}>{stat.label}</p>
                <span className="text-lg">{stat.icon}</span>
              </div>
              <p className="text-2xl font-bold text-white mb-1">{stat.value}</p>
              <p className="text-xs" style={{ color: '#374151' }}>{stat.sub}</p>
            </div>
          ))}
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Left Col */}
          <div className="lg:col-span-2 space-y-6">

            {/* Accounts */}
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: '#6b7280' }}>Accounts</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {accounts.map(acc => (
                  <div key={acc.account_id} className="rounded-2xl p-5 transition-all duration-300 hover:-translate-y-0.5" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', cursor: 'default' }}>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold text-white shadow-lg"
                        style={AVATAR_STYLES[acc.account_id] || DEFAULT_AVATAR}>
                        {getInitials(acc.holder_name)}
                      </div>
                      <div>
                        <p className="text-xs font-mono" style={{ color: '#6b7280' }}>{acc.account_id}</p>
                        <p className="text-sm font-semibold text-white leading-tight">{acc.holder_name}</p>
                      </div>
                    </div>
                    <div className="pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                      <p className="text-xs mb-1" style={{ color: '#6b7280' }}>Balance</p>
                      <p className="text-2xl font-bold font-mono text-white">${parseFloat(String(acc.balance)).toFixed(2)}</p>
                      <p className="text-xs mt-1" style={{ color: '#374151' }}>v{acc.version} · OCC enabled</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Activity Log */}
            <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: isConnected ? '#34d399' : '#6b7280' }} />
                  <h2 className="text-sm font-semibold text-white">Live Activity</h2>
                </div>
                <div className="flex gap-1">
                  {tabs.map(tab => (
                    <button key={tab} onClick={() => setActiveTab(tab)}
                      className="px-2.5 py-1 text-xs font-semibold rounded-lg transition-all capitalize cursor-pointer"
                      style={activeTab === tab
                        ? { background: 'rgba(255,255,255,0.1)', color: 'white' }
                        : { color: '#6b7280', background: 'transparent' }}>
                      {tab}
                    </button>
                  ))}
                </div>
              </div>

              <div className="custom-scrollbar overflow-y-auto" style={{ maxHeight: '320px' }}>
                {filteredTx.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16" style={{ color: '#374151' }}>
                    <svg className="w-10 h-10 mb-3 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                    </svg>
                    <p className="text-sm">No transactions yet</p>
                  </div>
                ) : filteredTx.map(tx => {
                  const ts = TX_TYPE_STYLES[tx.type];
                  return (
                    <div key={tx.id} className="flex items-center gap-4 px-5 py-3.5 transition-colors"
                      style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.02)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0"
                        style={{ color: ts.color, background: ts.bg }}>
                        {ts.prefix}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: ts.color }}>{tx.type}</span>
                          <span className="text-xs px-1.5 py-0.5 rounded-md font-semibold"
                            style={tx.status === 'success'
                              ? { background: 'rgba(16,185,129,0.15)', color: '#34d399', border: '1px solid rgba(16,185,129,0.3)' }
                              : { background: 'rgba(239,68,68,0.15)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)' }}>
                            {tx.status}
                          </span>
                        </div>
                        <p className="text-xs truncate font-mono" style={{ color: '#6b7280' }}>
                          {tx.type === 'transfer' ? `${tx.from_account} → ${tx.to_account}` :
                           tx.type === 'deposit'  ? `→ ${tx.to_account}` : `${tx.from_account} →`}
                        </p>
                        {tx.status === 'failed' && tx.reason && (
                          <p className="text-xs truncate mt-0.5" style={{ color: 'rgba(248,113,113,0.7)' }}>{tx.reason}</p>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-bold font-mono" style={{ color: ts.color }}>
                          {ts.prefix} ${tx.amount.toFixed(2)}
                        </p>
                        <p className="text-xs mt-1" style={{ color: '#374151' }}>{new Date(tx.created_at).toLocaleTimeString()}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Col */}
          <div className="lg:col-span-1">
            <h2 className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: '#6b7280' }}>New Transaction</h2>
            <TransactionForm accounts={accounts} onTransactionSuccess={() => {}} />

            {/* OCC Status Panel */}
            <div className="mt-4 rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: '#6b7280' }}>OCC Status</p>
              <div className="space-y-2.5">
                {[
                  { label: 'Version Control',  status: 'Active' },
                  { label: 'WAL Mode',         status: 'Enabled' },
                  { label: 'Mutex Guard',      status: 'Transfers' },
                  { label: 'Balance Floor',    status: 'Enforced' },
                ].map(item => (
                  <div key={item.label} className="flex items-center justify-between">
                    <span className="text-xs" style={{ color: '#6b7280' }}>{item.label}</span>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-md"
                      style={{ background: 'rgba(16,185,129,0.15)', color: '#34d399', border: '1px solid rgba(16,185,129,0.3)' }}>
                      {item.status}
                    </span>
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
