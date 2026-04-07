import { Request, Response } from 'express';
import { getDb } from '../db';
import { Mutex } from 'async-mutex';

const transferMutex = new Mutex();

export const processTransaction = async (req: Request, res: Response): Promise<void> => {
  const { type, amount, from_account, to_account } = req.body;

  if (!type || !amount || amount <= 0) {
    res.status(400).json({ error: 'Invalid transaction parameters.' });
    return;
  }

  const db = await getDb();
  let status = 'failed';
  let txReason = '';

  try {
    if (type === 'deposit') {
      if (!to_account) { res.status(400).json({ error: 'to_account is required' }); return; }
      const success = await handleDeposit(db, to_account, amount);
      if (success) {
        status = 'success';
        res.status(200).json({ message: 'Deposit successful' });
      } else {
        txReason = 'Concurrent update or missing account';
        res.status(409).json({ error: txReason });
      }

    } else if (type === 'withdraw') {
      if (!from_account) { res.status(400).json({ error: 'from_account is required' }); return; }
      const result = await handleWithdraw(db, from_account, amount);
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
        const result = await handleTransfer(db, from_account, to_account, amount);
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
      await db.run(
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

async function handleDeposit(db: any, account_id: string, amount: number): Promise<boolean> {
  const row = await db.get('SELECT balance, version FROM accounts WHERE account_id = ?', [account_id]);
  if (!row) return false;
  const result = await db.run(
    'UPDATE accounts SET balance = balance + ?, version = version + 1 WHERE account_id = ? AND version = ?',
    [amount, account_id, row.version]
  );
  return result.changes === 1;
}

async function handleWithdraw(db: any, account_id: string, amount: number): Promise<string> {
  const row = await db.get('SELECT balance, version FROM accounts WHERE account_id = ?', [account_id]);
  if (!row) return 'error';
  if (row.balance < amount) return 'insufficient_funds';
  const result = await db.run(
    'UPDATE accounts SET balance = balance - ?, version = version + 1 WHERE account_id = ? AND version = ?',
    [amount, account_id, row.version]
  );
  return result.changes === 1 ? 'success' : 'concurrent_error';
}

async function handleTransfer(db: any, from_account: string, to_account: string, amount: number): Promise<string> {
  const fromRow = await db.get('SELECT balance, version FROM accounts WHERE account_id = ?', [from_account]);
  const toRow = await db.get('SELECT balance, version FROM accounts WHERE account_id = ?', [to_account]);
  if (!fromRow || !toRow) return 'error';
  if (fromRow.balance < amount) return 'insufficient_funds';

  await db.exec('BEGIN IMMEDIATE');
  try {
    const fromResult = await db.run(
      'UPDATE accounts SET balance = balance - ?, version = version + 1 WHERE account_id = ? AND version = ?',
      [amount, from_account, fromRow.version]
    );
    if (fromResult.changes !== 1) {
      await db.exec('ROLLBACK');
      return 'concurrent_error';
    }
    const toResult = await db.run(
      'UPDATE accounts SET balance = balance + ?, version = version + 1 WHERE account_id = ? AND version = ?',
      [amount, to_account, toRow.version]
    );
    if (toResult.changes !== 1) {
      await db.exec('ROLLBACK');
      return 'concurrent_error';
    }
    await db.exec('COMMIT');
    return 'success';
  } catch (err) {
    await db.exec('ROLLBACK');
    throw err;
  }
}

export const getAccounts = async (req: Request, res: Response) => {
  const db = await getDb();
  const accounts = await db.all('SELECT account_id, holder_name, balance, version FROM accounts');
  res.json(accounts);
};

export const getTransactions = async (req: Request, res: Response) => {
  const db = await getDb();
  // Removed the tight LIMIT 50 so you can see all your load test results. 
  // Added a high limit of 5000 just as a safety net against browser crashes.
  const txs = await db.all('SELECT * FROM transactions ORDER BY created_at DESC LIMIT 5000');
  res.json(txs);
}
