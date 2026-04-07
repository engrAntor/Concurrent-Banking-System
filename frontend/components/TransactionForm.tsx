"use client";
import React, { useState } from 'react';

type TransactionType = 'deposit' | 'withdraw' | 'transfer';

export default function TransactionForm({ accounts, onTransactionSuccess }: { accounts: any[], onTransactionSuccess: () => void }) {
  const [type, setType] = useState<TransactionType>('deposit');
  const [fromAccount, setFromAccount] = useState('');
  const [toAccount, setToAccount] = useState('');
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) {
      setError('Amount must be greater than 0');
      return;
    }

    if (type === 'transfer' && fromAccount === toAccount) {
      setError('Cannot transfer to the same account');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('http://localhost:3001/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, amount: amt, from_account: fromAccount, to_account: toAccount })
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Transaction failed');
      } else {
        setAmount('');
        onTransactionSuccess();
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 shadow-xl border border-white/20">
      <h2 className="text-xl font-semibold mb-4 text-white">New Transaction</h2>
      {error && <div className="bg-red-500/20 text-red-100 p-3 rounded mb-4 text-sm border border-red-500/50">{error}</div>}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-200 mb-1">Type</label>
          <select value={type} onChange={e => setType(e.target.value as TransactionType)} className="w-full bg-black/30 border border-white/10 rounded-lg p-2.5 text-white outline-none focus:ring-2 focus:ring-blue-500">
            <option value="deposit">Deposit</option>
            <option value="withdraw">Withdraw</option>
            <option value="transfer">Transfer</option>
          </select>
        </div>

        {(type === 'withdraw' || type === 'transfer') && (
          <div>
            <label className="block text-sm font-medium text-gray-200 mb-1">From Account</label>
            <select value={fromAccount} onChange={e => setFromAccount(e.target.value)} required className="w-full bg-black/30 border border-white/10 rounded-lg p-2.5 text-white outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Select Account</option>
              {accounts.map(acc => <option key={acc.account_id} value={acc.account_id}>{acc.account_id} ({acc.holder_name})</option>)}
            </select>
          </div>
        )}

        {(type === 'deposit' || type === 'transfer') && (
          <div>
            <label className="block text-sm font-medium text-gray-200 mb-1">To Account</label>
            <select value={toAccount} onChange={e => setToAccount(e.target.value)} required className="w-full bg-black/30 border border-white/10 rounded-lg p-2.5 text-white outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Select Account</option>
              {accounts.map(acc => <option key={acc.account_id} value={acc.account_id}>{acc.account_id} ({acc.holder_name})</option>)}
            </select>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-200 mb-1">Amount</label>
          <input type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} required className="w-full bg-black/30 border border-white/10 rounded-lg p-2.5 text-white outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400" placeholder="0.00" />
        </div>

        <button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-lg transition duration-200 disabled:opacity-50">
          {loading ? 'Processing...' : 'Submit Transaction'}
        </button>
      </form>
    </div>
  );
}
