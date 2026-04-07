"use client";
import React, { useState } from 'react';

type TransactionType = 'deposit' | 'withdraw' | 'transfer';

interface Account {
  account_id: string;
  holder_name: string;
  balance: number;
}

const typeConfig = {
  deposit: {
    label: 'Deposit',
    desc: 'Add funds to account',
    barColor: '#10b981',
    btnStyle: { background: 'linear-gradient(135deg, #059669, #0d9488)' },
    activeStyle: { background: 'rgba(16,185,129,0.12)', borderColor: 'rgba(16,185,129,0.5)', color: '#34d399' },
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <path d="M12 5v14M5 12l7 7 7-7"/>
      </svg>
    ),
    iconBg: { background: 'linear-gradient(135deg, #059669, #0d9488)' },
  },
  withdraw: {
    label: 'Withdraw',
    desc: 'Remove funds from account',
    barColor: '#f97316',
    btnStyle: { background: 'linear-gradient(135deg, #ea580c, #d97706)' },
    activeStyle: { background: 'rgba(249,115,22,0.12)', borderColor: 'rgba(249,115,22,0.5)', color: '#fb923c' },
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <path d="M12 19V5M5 12l7-7 7 7"/>
      </svg>
    ),
    iconBg: { background: 'linear-gradient(135deg, #ea580c, #d97706)' },
  },
  transfer: {
    label: 'Transfer',
    desc: 'Move funds between accounts',
    barColor: '#6366f1',
    btnStyle: { background: 'linear-gradient(135deg, #4f46e5, #6366f1)' },
    activeStyle: { background: 'rgba(99,102,241,0.12)', borderColor: 'rgba(99,102,241,0.5)', color: '#818cf8' },
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <path d="M8 7h12m0 0l-4-4m4 4l-4 4M4 17h12M4 17l4-4M4 17l4 4"/>
      </svg>
    ),
    iconBg: { background: 'linear-gradient(135deg, #4f46e5, #6366f1)' },
  },
};

export default function TransactionForm({ accounts, onTransactionSuccess }: { accounts: Account[], onTransactionSuccess: () => void }) {
  const [type, setType] = useState<TransactionType>('deposit');
  const [fromAccount, setFromAccount] = useState('');
  const [toAccount, setToAccount] = useState('');
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const cfg = typeConfig[type];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setSuccess('');
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) { setError('Amount must be greater than 0'); return; }
    if (type === 'transfer' && fromAccount === toAccount) { setError('Cannot transfer to the same account'); return; }

    setLoading(true);
    try {
      const res = await fetch('http://localhost:3001/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, amount: amt, from_account: fromAccount, to_account: toAccount }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Transaction failed');
      } else {
        setSuccess(`${cfg.label} of $${amt.toFixed(2)} processed successfully!`);
        setAmount('');
        onTransactionSuccess();
        setTimeout(() => setSuccess(''), 4000);
      }
    } catch {
      setError('Network error — Is the backend running?');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', overflow: 'hidden' }}>
      {/* Animated top bar */}
      <div style={{ height: '3px', background: `linear-gradient(90deg, ${cfg.barColor}, transparent)`, transition: 'background 0.4s ease' }} />

      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-base font-bold text-white">New Transaction</h2>
            <p className="text-xs mt-0.5" style={{ color: '#6b7280' }}>{cfg.desc}</p>
          </div>
          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white shadow-lg" style={cfg.iconBg}>
            {cfg.icon}
          </div>
        </div>

        {/* Type Selector */}
        <div className="grid grid-cols-3 gap-2 mb-5 p-1 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
          {(Object.keys(typeConfig) as TransactionType[]).map((t) => {
            const c = typeConfig[t];
            const isActive = type === t;
            return (
              <button
                key={t}
                type="button"
                onClick={() => { setType(t); setError(''); setSuccess(''); }}
                className="flex flex-col items-center gap-1.5 py-2.5 px-1 rounded-lg text-xs font-semibold transition-all duration-200 cursor-pointer"
                style={isActive
                  ? { ...c.activeStyle, border: '1px solid', transition: 'all 0.2s' }
                  : { color: '#6b7280', border: '1px solid transparent', transition: 'all 0.2s' }
                }
              >
                {c.icon}
                {c.label}
              </button>
            );
          })}
        </div>

        {/* Alerts */}
        {error && (
          <div className="flex items-start gap-2.5 p-3 rounded-xl mb-4 text-xs" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5' }}>
            <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <p>{error}</p>
          </div>
        )}
        {success && (
          <div className="flex items-start gap-2.5 p-3 rounded-xl mb-4 text-xs" style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', color: '#6ee7b7' }}>
            <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            <p>{success}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {(type === 'withdraw' || type === 'transfer') && (
            <div>
              <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: '#9ca3af' }}>From Account</label>
              <div className="relative">
                <select value={fromAccount} onChange={e => setFromAccount(e.target.value)} required
                  className="w-full rounded-xl px-3.5 py-2.5 text-sm text-white outline-none transition-all appearance-none cursor-pointer"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <option value="">Choose account...</option>
                  {accounts.map(acc => <option key={acc.account_id} value={acc.account_id}>{acc.account_id} — {acc.holder_name} (${parseFloat(String(acc.balance)).toFixed(2)})</option>)}
                </select>
                <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2" style={{ color: '#6b7280' }}>
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M19 9l-7 7-7-7"/></svg>
                </div>
              </div>
            </div>
          )}

          {(type === 'deposit' || type === 'transfer') && (
            <div>
              <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: '#9ca3af' }}>To Account</label>
              <div className="relative">
                <select value={toAccount} onChange={e => setToAccount(e.target.value)} required
                  className="w-full rounded-xl px-3.5 py-2.5 text-sm text-white outline-none transition-all appearance-none cursor-pointer"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <option value="">Choose account...</option>
                  {accounts.map(acc => <option key={acc.account_id} value={acc.account_id}>{acc.account_id} — {acc.holder_name} (${parseFloat(String(acc.balance)).toFixed(2)})</option>)}
                </select>
                <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2" style={{ color: '#6b7280' }}>
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M19 9l-7 7-7-7"/></svg>
                </div>
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: '#9ca3af' }}>Amount (USD)</label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold" style={{ color: '#6b7280' }}>$</span>
              <input type="number" step="0.01" min="0.01" value={amount} onChange={e => setAmount(e.target.value)} required
                className="w-full rounded-xl pl-7 pr-3.5 py-2.5 text-sm text-white outline-none transition-all"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
                placeholder="0.00" />
            </div>
          </div>

          <button type="submit" disabled={loading}
            className="w-full text-white text-sm font-semibold py-3 rounded-xl transition-all duration-200 shadow-lg disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2 cursor-pointer"
            style={cfg.btnStyle}>
            {loading ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                Processing...
              </>
            ) : (<>{cfg.icon} {cfg.label} Funds</>)}
          </button>
        </form>

        <p className="text-center text-xs mt-4" style={{ color: '#374151' }}>Protected by Optimistic Concurrency Control</p>
      </div>
    </div>
  );
}
