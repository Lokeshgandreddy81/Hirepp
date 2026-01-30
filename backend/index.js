console.log('1. Starting index.js...');
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
// LOAD ENV VARS FIRST
dotenv.config();

console.log('2. Modules imported. Config...');
const path = require('path');
const connectDB = require('./config/db');
console.log('3. DB Module loaded. Loading Routes...');
const userRoutes = require('./routes/userRoutes');
const uploadRoutes = require('./routes/uploadRoutes');

console.log('4. Connecting to DB...');
connectDB();

const app = express();
console.log('5. Express initialized.');

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Request Logging Middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Serve the uploads folder so users can watch their videos
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.get('/', (req, res) => {
  res.send('API is running...');
});

// Use the routes
app.use('/api/users', userRoutes);
app.use('/api/upload', uploadRoutes); // Register Upload Routes
app.use('/api/jobs', require('./routes/jobRoutes'));
app.use('/api/applications', require('./routes/applicationRoutes'));
app.use('/api/chat', require('./routes/chatRoutes'));
app.use('/api/matches', require('./routes/matchingRoutes'));

// Port 5001 matches the frontend fetch logic
// Port 5001 matches the frontend fetch logic
const PORT = process.env.PORT || 5001;

// --- SOCKET.IO SETUP ---
const http = require('http');
const { Server } = require('socket.io');

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // Allow all for dev
    methods: ["GET", "POST"]
  }
});

// Pass io to routes if needed (or use export)
app.set('io', io);

io.on('connection', (socket) => {
  console.log('User Connected:', socket.id);

  socket.on('joinRoom', ({ applicationId }) => {
    socket.join(applicationId);
    console.log(`User ${socket.id} joined room: ${applicationId}`);
  });

  socket.on('sendMessage', async (data) => {
    // data = { applicationId, senderId, receiverId, text }
    try {
      const { applicationId, senderId, receiverId, text } = data;

      // Save to DB
      const Message = require('./models/Message');
      const newMessage = await Message.create({
        applicationId: applicationId, // Match schema (was application)
        sender: senderId,
        // receiver: receiverId, // Schema doesn't have receiver, it's inferred from Application
        text
      });

      // Populate sender for frontend display
      const populatedMessage = await newMessage.populate('sender', 'name firstName');

      // Emit to Room
      io.to(applicationId).emit('receiveMessage', populatedMessage);

    } catch (err) {
      console.error("Socket Message Error:", err);
      socket.emit('messageFailed', { error: err.message });
    }
  });

  socket.on('disconnect', () => {
    console.log('User Disconnected', socket.id);
  });
});

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});