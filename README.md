# Simple Chat App

A lightweight, real-time chat application built with Node.js, Socket.io, and SQLite. Perfect for small teams or personal use.

## Features

- 🔐 Simple username-based authentication
- 💬 Real-time messaging with Socket.io
- 👥 Add friends by username
- 📱 Responsive design
- 💾 Message history persistence with SQLite
- 🟢 Online/offline user status
- 🐳 Docker containerized for easy deployment

## Quick Start

### Using Docker (Recommended)

1. Clone this repository:
```bash
git clone <your-repo-url>
cd simple-chat-app
```

2. Make the setup script executable and run it:
```bash
chmod +x setup.sh
./setup.sh
```

3. Open your browser and navigate to `http://localhost:3000`

### Manual Setup

1. Install Node.js (v18 or higher)
2. Install dependencies:
```bash
npm install
```

3. Start the application:
```bash
npm start
```

4. Open `http://localhost:3000` in your browser

## Usage

1. **Sign Up**: Enter a unique username to join the chat
2. **Add Friends**: Click the "+ Add Friend" button and enter a friend's username
3. **Start Chatting**: Click on a friend's name in the sidebar to open a chat
4. **Real-time Messaging**: Messages appear instantly for online users
5. **Message History**: All conversations are saved automatically

## Project Structure

```
simple-chat-app/
├── public/
│   ├── index.html      # Main HTML file
│   ├── style.css       # Styles
│   └── app.js          # Frontend JavaScript
├── server.js           # Backend server
├── package.json        # Node.js dependencies
├── Dockerfile          # Docker image configuration
├── docker-compose.yml  # Docker Compose setup
├── setup.sh           # Quick setup script
└── README.md          # This file
```

## API Endpoints

- `POST /api/register` - Register a new user
- `GET /api/users/:username/exists` - Check if user exists
- `GET /api/messages/:user1/:user2` - Get chat history between two users

## Socket Events

### Client → Server
- `user_login` - User joins the chat
- `send_message` - Send a message to another user

### Server → Client
- `receive_message` - Receive a message from another user
- `message_sent` - Confirmation that message was sent
- `online_users` - List of currently online users
- `user_online` - Someone came online
- `user_offline` - Someone went offline

## Docker Commands

```bash
# Build and start
docker-compose up -d

# View logs
docker-compose logs -f

# Stop the application
docker-compose down

# Rebuild after changes
docker-compose build && docker-compose up -d

# Access database (if needed)
docker-compose exec chat-app sqlite3 chat.db
```

## Development

### Local Development
```bash
# Install nodemon for auto-reload
npm install -g nodemon

# Start in development mode
npm run dev
```

### Environment Variables
- `PORT` - Server port (default: 3000)
- `NODE_ENV` - Environment (development/production)

## Database Schema

The app uses SQLite with two main tables:

**Users Table**
- `id` - Auto-incrementing primary key
- `username` - Unique username
- `created_at` - Registration timestamp

**Messages Table**
- `id` - Auto-incrementing primary key
- `sender` - Username of sender
- `recipient` - Username of recipient
- `message` - Message content
- `timestamp` - When message was sent

## Security Notes

⚠️ **This is a simple demo application. For production use, consider adding:**

- Proper authentication (passwords, JWT tokens)
- Input validation and sanitization
- Rate limiting
- HTTPS/TLS encryption
- User roles and permissions
- Message encryption
- File upload restrictions

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## Troubleshooting

### Port Already in Use
```bash
# Check what's using port 3000
lsof -i :3000

# Kill the process
kill -9 <PID>

# Or use a different port
PORT=3001 npm start
```

### Database Issues
```bash
# Reset database
rm chat.db
docker-compose restart
```

### Docker Issues
```bash
# Clean up Docker
docker-compose down
docker system prune -f
docker-compose build --no-cache
```

## License

MIT License - feel free to use this for any purpose!

---

Made with ❤️ for simple, effective communication.