const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Database setup
const db = new sqlite3.Database('chat.db');

// Initialize database tables
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
  
  db.run(`CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sender TEXT NOT NULL,
    recipient TEXT NOT NULL,
    message TEXT NOT NULL,
    message_id TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(sender) REFERENCES users(username),
    FOREIGN KEY(recipient) REFERENCES users(username)
  )`);
});

app.use(express.static('public'));
app.use(express.json());

// API Routes
app.post('/api/register', (req, res) => {
  const { username } = req.body;
  
  db.run('INSERT INTO users (username) VALUES (?)', [username], function(err) {
    if (err) {
      res.status(400).json({ error: 'Username already exists' });
    } else {
      res.json({ success: true, message: 'User registered successfully' });
    }
  });
});

app.get('/api/users/:username/exists', (req, res) => {
  const { username } = req.params;
  
  db.get('SELECT username FROM users WHERE username = ?', [username], (err, row) => {
    if (err) {
      res.status(500).json({ error: 'Database error' });
    } else {
      res.json({ exists: !!row });
    }
  });
});

app.get('/api/messages/:user1/:user2', (req, res) => {
  const { user1, user2 } = req.params;
  
  db.all(`SELECT * FROM messages 
          WHERE (sender = ? AND recipient = ?) 
             OR (sender = ? AND recipient = ?) 
          ORDER BY timestamp ASC`, 
          [user1, user2, user2, user1], (err, rows) => {
    if (err) {
      res.status(500).json({ error: 'Database error' });
    } else {
      res.json(rows);
    }
  });
});

// Socket.io connection handling
const activeUsers = new Map();

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('user_login', (username) => {
    activeUsers.set(socket.id, username);
    socket.username = username;
    socket.broadcast.emit('user_online', username);
    
    // Send list of online users to the newly connected user
    const onlineUsers = Array.from(activeUsers.values());
    socket.emit('online_users', onlineUsers);
  });

  socket.on('send_message', (data) => {
    const { recipient, message, messageId } = data;
    const sender = socket.username;

    // Save message to database
    db.run('INSERT INTO messages (sender, recipient, message, message_id) VALUES (?, ?, ?, ?)',
           [sender, recipient, message, messageId], function(err) {
      if (!err) {
        const messageData = {
          id: this.lastID,
          sender,
          recipient,
          message,
          messageId,
          timestamp: new Date().toISOString()
        };

        // Send to recipient if online
        for (let [socketId, username] of activeUsers.entries()) {
          if (username === recipient) {
            io.to(socketId).emit('receive_message', messageData);
            break;
          }
        }

        // Send back to sender
        socket.emit('message_sent', messageData);
      }
    });
  });

  socket.on('disconnect', () => {
    const username = activeUsers.get(socket.id);
    if (username) {
      activeUsers.delete(socket.id);
      socket.broadcast.emit('user_offline', username);
    }
    console.log('User disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
