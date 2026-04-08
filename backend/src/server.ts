import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { initDb } from './db';
import { processTransaction, getAccounts, getTransactions } from './controllers/transactionController';

const app = express();
const server = http.createServer(app);

// Setup Socket.io for Real-time Notifications
const io = new Server(server, {
  cors: {
    origin: '*', // For development purposes
    methods: ['GET', 'POST']
  }
});

// Attach io to app so controllers can access it
(app as any).io = io;

app.use(cors());
app.use(express.json());

// Routes
app.post('/api/transactions', processTransaction);
app.get('/api/accounts', getAccounts);
app.get('/api/transactions', getTransactions);

io.on('connection', (socket) => {
  console.log('A client connected:', socket.id);
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3001;

// Initialize DB and start server
initDb().then(() => {
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}).catch(err => {
  console.error('Failed to initialize database:', err);
});
