import { Request, Response } from 'express';
import { runQuery, runGet, runUpdate, runExec } from '../db';
import { Mutex } from 'async-mutex';

const transferMutex = new Mutex();

export const processTransaction = async (req: Request, res: Response): Promise<void> => {
  const { type, amount, from_account, to_account } = req.body;

  if (!type || !amount || amount <= 0) {
    res.status(400).json({ error: 'Invalid transaction parameters.' });
    return;
  }

  let status = 'failed';
  let txReason = '';

  try {
    if (type === 'deposit') {
      if (!to_account) { res.status(400).json({ error: 'to_account is required' }); return; }
      const success = await handleDeposit(to_account, amount);
      if (success) {
        status = 'success';
        res.status(200).json({ message: 'Deposit successful' });
      } else {
        txReason = 'Concurrent update or missing account';
        res.status(409).json({ error: txReason });
      }

    } else if (type === 'withdraw') {
      if (!from_account) { res.status(400).json({ error: 'from_account is required' }); return; }
      const result = await handleWithdraw(from_account, amount);
      if (result === 'success') {
        status = 'success';
        res.status(200).json({ message: 'Withdraw successful' });
      } else if (result === 'insufficient_funds') {
        txReason = 'Insufficient balance';
        res.status(400).json({ error: txReason });
      } else {
        txReason = 'Concurrent update or missing account';
        res.status(409).json({ error: txReason });
      }

    } else if (type === 'transfer') {
      if (!from_account || !to_account) { res.status(400).json({ error: 'Both accounts required' }); return; }
      const release = await transferMutex.acquire();
      try {
        const result = await handleTransfer(from_account, to_account, amount);
        if (result === 'success') {
          status = 'success';
          res.status(200).json({ message: 'Transfer successful' });
        } else if (result === 'insufficient_funds') {
          txReason = 'Insufficient balance';
          res.status(400).json({ error: txReason });
        } else {
          txReason = 'Concurrent update or missing account';
          res.status(409).json({ error: txReason });
        }
      } finally {
        release();
      }
    } else {
      res.status(400).json({ error: 'Invalid type' }); return;
    }

    // Attempt to log transaction
    if (status !== 'failed' || txReason) {
      await runUpdate(
        'INSERT INTO transactions (from_account, to_account, type, amount, status, reason) VALUES (?, ?, ?, ?, ?, ?)',
        [from_account || null, to_account || null, type, amount, status, txReason || null]
      );


      // Emit websocket event
      const reqApp = req.app as any;
      if (reqApp.io) {
        const io = reqApp.io;
        if (status === 'success') {
          io.emit('transaction:created', { type, amount, from_account, to_account, status });
          // Notify listeners to fetch new balances
          io.emit('balance:updated', {});
        } else {
          io.emit('transaction:failed', { type, amount, from_account, to_account, status, reason: txReason });
        }
      }
    }

  } catch (error) {
    console.error('Error processing tx:', error);
    res.status(500).json({ error: 'Internal error' });
  }
};

async function handleDeposit(account_id: string, amount: number): Promise<boolean> {
  const row = await runGet('SELECT balance, version FROM accounts WHERE account_id = ?', [account_id]);
  if (!row) return false;
  const changes = await runUpdate(
    'UPDATE accounts SET balance = balance + ?, version = version + 1 WHERE account_id = ? AND version = ?',
    [amount, account_id, row.version]
  );
  return changes === 1;
}

async function handleWithdraw(account_id: string, amount: number): Promise<string> {
  const row = await runGet('SELECT balance, version FROM accounts WHERE account_id = ?', [account_id]);
  if (!row) return 'error';
  if (row.balance < amount) return 'insufficient_funds';
  const changes = await runUpdate(
    'UPDATE accounts SET balance = balance - ?, version = version + 1 WHERE account_id = ? AND version = ?',
    [amount, account_id, row.version]
  );
  return changes === 1 ? 'success' : 'concurrent_error';
}

async function handleTransfer(from_account: string, to_account: string, amount: number): Promise<string> {
  const fromRow = await runGet('SELECT balance, version FROM accounts WHERE account_id = ?', [from_account]);
  const toRow = await runGet('SELECT balance, version FROM accounts WHERE account_id = ?', [to_account]);
  if (!fromRow || !toRow) return 'error';
  if (fromRow.balance < amount) return 'insufficient_funds';

  await runExec(process.env.DATABASE_URL ? 'BEGIN' : 'BEGIN IMMEDIATE');
  try {
    const fromChanges = await runUpdate(
      'UPDATE accounts SET balance = balance - ?, version = version + 1 WHERE account_id = ? AND version = ?',
      [amount, from_account, fromRow.version]
    );
    if (fromChanges !== 1) {
      await runExec('ROLLBACK');
      return 'concurrent_error';
    }
    const toChanges = await runUpdate(
      'UPDATE accounts SET balance = balance + ?, version = version + 1 WHERE account_id = ? AND version = ?',
      [amount, to_account, toRow.version]
    );
    if (toChanges !== 1) {
      await runExec('ROLLBACK');
      return 'concurrent_error';
    }
    await runExec('COMMIT');
    return 'success';
  } catch (err) {
    await runExec('ROLLBACK');
    throw err;
  }
}

export const getAccounts = async (req: Request, res: Response) => {
  const accounts = await runQuery('SELECT account_id, holder_name, balance, version FROM accounts');
  res.json(accounts);
};

export const getTransactions = async (req: Request, res: Response) => {
  const txs = await runQuery('SELECT * FROM transactions ORDER BY created_at DESC LIMIT 5000');
  res.json(txs);
}
