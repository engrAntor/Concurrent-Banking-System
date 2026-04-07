import http from 'k6/http';
import { check } from 'k6';

export const options = {
  scenarios: {
    concurrent_transactions: {
      executor: 'constant-arrival-rate',
      rate: 1000, 
      timeUnit: '1s',
      duration: '5s',    
      preAllocatedVUs: 1000,
      maxVUs: 2000,
    },
  },
};

const OVERWRITE_ACCOUNTS = [
  'ACC1001', 'ACC1002', 'ACC1003'
];

export default function () {
  const url = 'http://localhost:3001/api/transactions';
  
  // Randomly pick a transaction type
  const types = ['deposit', 'withdraw', 'transfer'];
  const type = types[Math.floor(Math.random() * types.length)];
  
  // Random accounts
  const from_account = OVERWRITE_ACCOUNTS[Math.floor(Math.random() * OVERWRITE_ACCOUNTS.length)];
  let to_account = OVERWRITE_ACCOUNTS[Math.floor(Math.random() * OVERWRITE_ACCOUNTS.length)];
  while(to_account === from_account) {
    to_account = OVERWRITE_ACCOUNTS[Math.floor(Math.random() * OVERWRITE_ACCOUNTS.length)];
  }

  // Random amounts
  const amount = Math.floor(Math.random() * 50) + 1; // $1 to $50

  const payload = JSON.stringify({
    type: type,
    amount: amount,
    from_account: type === 'deposit' ? undefined : from_account,
    to_account: type === 'withdraw' ? undefined : to_account
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  const res = http.post(url, payload, params);

  check(res, {
    'status is 200 (Success)': (r) => r.status === 200,
    'status is 400 (Insufficient/Validation)': (r) => r.status === 400,
    'status is 409 (OCC / Concurrent Update Rejected)': (r) => r.status === 409,
    'status is not 500 (No internal crashes)': (r) => r.status !== 500,
  });
}
