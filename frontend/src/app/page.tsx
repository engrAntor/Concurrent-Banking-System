"use client";
import { useEffect, useState } from 'react';
import { socket } from '../../lib/socket';
import TransactionForm from '../../components/TransactionForm';

export default function Home() {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<string[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  const fetchAccounts = async () => {
    try {
      const res = await fetch('http://localhost:3001/api/accounts');
      const data = await res.json();
      setAccounts(data);
    } catch (e) {}
  };

  const fetchTransactions = async () => {
    try {
      const res = await fetch('http://localhost:3001/api/transactions');
      const data = await res.json();
      setTransactions(data);
    } catch (e) {}
  };

  useEffect(() => {
    fetchAccounts();
    fetchTransactions();

    socket.connect();

    socket.on('connect', () => setIsConnected(true));
    socket.on('disconnect', () => setIsConnected(false));

    socket.on('balance:updated', () => {
      fetchAccounts();
      fetchTransactions();
    });

    socket.on('transaction:created', (data) => {
      setNotifications(prev => [`Success: ${data.type} of $${data.amount}`, ...prev].slice(0, 5));
    });

    socket.on('transaction:failed', (data) => {
      setNotifications(prev => [`Failed: ${data.type} of $${data.amount} - ${data.reason}`, ...prev].slice(0, 5));
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('balance:updated');
      socket.off('transaction:created');
      socket.off('transaction:failed');
      socket.disconnect();
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black text-white font-sans p-8">
      <header className="mb-10 text-center relative">
        <div className="absolute right-0 top-0 flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-emerald-500 shadow-[0_0_10px_#10b981]' : 'bg-red-500 shadow-[0_0_10px_#ef4444]'}`}></div>
          <span className="text-sm font-medium text-gray-400">{isConnected ? 'Live' : 'Disconnected'}</span>
        </div>
        <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400 mb-2">Concurrent Banking System</h1>
        <p className="text-gray-400 text-sm">Real-time distributed transaction engine</p>
      </header>

      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Col: Accounts */}
        <div className="lg:col-span-2 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {accounts.map(acc => (
              <div key={acc.account_id} className="bg-white/5 border border-white/10 rounded-2xl p-6 transition-transform hover:scale-105 duration-300 relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-emerald-600/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div className="relative z-10 flex flex-col h-full justify-between">
                  <div>
                    <p className="text-gray-400 text-sm font-medium">{acc.account_id}</p>
                    <h3 className="text-2xl font-bold mt-1 mb-4 text-white hover:text-blue-300 transition-colors">{acc.holder_name}</h3>
                  </div>
                  <div className="flex justify-between items-end mt-4 border-t border-white/10 pt-4">
                    <span className="text-sm text-gray-400">Balance</span>
                    <span className="text-3xl font-mono text-emerald-400">${parseFloat(acc.balance).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
             <h2 className="text-xl font-semibold mb-4 text-white/90">Live Activity Log</h2>
             <div className="space-y-4">
               {notifications.length > 0 && (
                 <div className="mb-4 space-y-2">
                   {notifications.map((msg, i) => (
                     <div key={i} className={`p-2 rounded text-sm font-medium rounded animate-pulse ${msg.startsWith('Success') ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'}`}>
                       {msg}
                     </div>
                   ))}
                 </div>
               )}
               <div className="max-h-64 overflow-y-auto pr-2 space-y-2 custom-scrollbar">
                  {transactions.map(tx => (
                    <div key={tx.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-black/40 p-3 rounded-xl border border-white/5 gap-2 sm:gap-0">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 w-full">
                        <span className={`px-2 py-1 text-xs rounded uppercase font-bold tracking-wider w-fit ${tx.status === 'success' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' : 'bg-red-500/20 text-red-300 border border-red-500/30'}`}>{tx.type}</span>
                        <div className="flex flex-col">
                           <span className="text-sm text-gray-300 font-mono">
                             {tx.type === 'transfer' ? `${tx.from_account} \u2192 ${tx.to_account}` : tx.type === 'deposit' ? `To: ${tx.to_account}` : `From: ${tx.from_account}`}
                           </span>
                           {tx.status === 'failed' && <span className="text-xs text-red-400 mt-0.5">{tx.reason}</span>}
                        </div>
                      </div>
                      <div className="text-left sm:text-right w-full sm:w-auto">
                         <span className={`font-mono font-medium ${tx.type === 'deposit' ? 'text-emerald-400' : tx.type === 'withdraw' ? 'text-orange-400' : 'text-gray-200'}`}>
                           {tx.type === 'deposit' ? '+' : tx.type === 'withdraw' ? '-' : ''}${tx.amount.toFixed(2)}
                         </span>
                         <div className="text-[10px] text-gray-500 mt-1">{new Date(tx.created_at).toLocaleTimeString()}</div>
                      </div>
                    </div>
                  ))}
                  {transactions.length === 0 && <div className="text-center text-gray-500 py-8">No transactions yet.</div>}
               </div>
             </div>
          </div>
        </div>

        {/* Right Col: Action Form */}
        <div className="lg:col-span-1">
           <TransactionForm accounts={accounts} onTransactionSuccess={() => {}} />
        </div>

      </div>
    </div>
  );
}
