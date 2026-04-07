"use client";
import React, { useState } from 'react';

type TransactionType = 'deposit' | 'withdraw' | 'transfer';

const typeConfig = {
  deposit: {
    color: 'from-emerald-500 to-teal-500',
    hoverBorder: 'hover:border-emerald-500/40',
    activeBg: 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <path d="M12 5v14M5 12l7 7 7-7"/>
      </svg>
    ),
    label: 'Deposit',
    desc: 'Add funds to account',
    btnColor: 'from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500',
  },
  withdraw: {
    color: 'from-orange-500 to-amber-500',
    hoverBorder: 'hover:border-orange-500/40',
    activeBg: 'bg-orange-500/10 border-orange-500/40 text-orange-400',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <path d="M12 19V5M5 12l7-7 7 7"/>
      </svg>
    ),
    label: 'Withdraw',
    desc: 'Remove funds from account',
    btnColor: 'from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500',
  },
  transfer: {
    color: 'from-blue-500 to-indigo-500',
    hoverBorder: 'hover:border-blue-500/40',
    activeBg: 'bg-blue-500/10 border-blue-500/40 text-blue-400',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <path d="M8 7h12m0 0l-4-4m4 4l-4 4M4 17h12M4 17l4-4M4 17l4 4"/>
      </svg>
    ),
    label: 'Transfer',
    desc: 'Move funds between accounts',
    btnColor: 'from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500',
  },
};

interface Account {
  account_id: string;
  holder_name: string;
  balance: number;
}

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
    setError('');
    setSuccess('');
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
        setSuccess(`${cfg.label} of $${amt.toFixed(2)} successful!`);
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
    <div className="glass-card rounded-2xl overflow-hidden">
      {/* Header gradient bar */}
      <div className={`h-1 w-full bg-gradient-to-r ${cfg.color} transition-all duration-500`} />

      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-bold text-white">New Transaction</h2>
            <p className="text-xs text-gray-500 mt-0.5">{cfg.desc}</p>
          </div>
          <div className={`p-2.5 rounded-xl bg-gradient-to-br ${cfg.color} bg-opacity-10`}>
            <div className="text-white">{cfg.icon}</div>
          </div>
        </div>

        {/* Type Selector */}
        <div className="grid grid-cols-3 gap-2 mb-6 p-1 bg-white/[0.03] rounded-xl border border-white/[0.06]">
          {(Object.keys(typeConfig) as TransactionType[]).map((t) => {
            const c = typeConfig[t];
            const isActive = type === t;
            return (
              <button
                key={t}
                type="button"
                onClick={() => { setType(t); setError(''); setSuccess(''); }}
                className={`flex flex-col items-center gap-1.5 py-2.5 px-1 rounded-lg border text-xs font-semibold transition-all duration-200 cursor-pointer ${
                  isActive ? c.activeBg : `border-transparent text-gray-500 hover:text-gray-300 ${c.hoverBorder}`
                }`}
              >
                {c.icon}
                {c.label}
              </button>
            );
          })}
        </div>

        {/* Alerts */}
        {error && (
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-red-500/10 border border-red-500/30 mb-4 toast-enter">
            <svg className="w-4 h-4 text-red-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <p className="text-red-300 text-xs leading-relaxed">{error}</p>
          </div>
        )}
        {success && (
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 mb-4 toast-enter">
            <svg className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            <p className="text-emerald-300 text-xs leading-relaxed">{success}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {(type === 'withdraw' || type === 'transfer') && (
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wider">From Account</label>
              <div className="relative">
                <select
                  value={fromAccount}
                  onChange={e => setFromAccount(e.target.value)}
                  required
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-sm text-white outline-none focus:border-white/20 focus:bg-white/[0.06] transition-all appearance-none cursor-pointer"
                >
                  <option value="">Choose account...</option>
                  {accounts.map(acc => (
                    <option key={acc.account_id} value={acc.account_id}>
                      {acc.account_id} — {acc.holder_name} (${parseFloat(String(acc.balance)).toFixed(2)})
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M19 9l-7 7-7-7"/></svg>
                </div>
              </div>
            </div>
          )}

          {(type === 'deposit' || type === 'transfer') && (
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wider">To Account</label>
              <div className="relative">
                <select
                  value={toAccount}
                  onChange={e => setToAccount(e.target.value)}
                  required
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-sm text-white outline-none focus:border-white/20 focus:bg-white/[0.06] transition-all appearance-none cursor-pointer"
                >
                  <option value="">Choose account...</option>
                  {accounts.map(acc => (
                    <option key={acc.account_id} value={acc.account_id}>
                      {acc.account_id} — {acc.holder_name} (${parseFloat(String(acc.balance)).toFixed(2)})
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M19 9l-7 7-7-7"/></svg>
                </div>
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wider">Amount (USD)</label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 font-semibold text-sm">$</span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                required
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl pl-7 pr-3.5 py-2.5 text-sm text-white outline-none focus:border-white/20 focus:bg-white/[0.06] transition-all placeholder-gray-600"
                placeholder="0.00"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full bg-gradient-to-r ${cfg.btnColor} text-white text-sm font-semibold py-3 rounded-xl transition-all duration-200 shadow-lg disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2 cursor-pointer`}
          >
            {loading ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                Processing...
              </>
            ) : (
              <>
                {cfg.icon}
                {cfg.label} Funds
              </>
            )}
          </button>
        </form>

        <p className="text-center text-[10px] text-gray-600 mt-4">
          Protected by Optimistic Concurrency Control
        </p>
      </div>
    </div>
  );
}
