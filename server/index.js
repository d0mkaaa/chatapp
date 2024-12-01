const express = require('express');
const cors = require('cors');
const { createServer } = require('http');
const { Server } = require('socket.io');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || "*",
    methods: ["GET", "POST", "DELETE"]
  }
});

let messages = [];

app.use(cors({
  origin: process.env.FRONTEND_URL || "*"
}));
app.use(express.json());

app.get('/', (req, res) => {
  res.json({ status: 'Server is running' });
});

app.get('/messages', (req, res) => {
  try {
    res.json(messages);
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Error fetching messages' });
  }
});

app.delete('/messages/:id', (req, res) => {
  try {
    const messageId = req.params.id;
    messages = messages.filter(msg => msg._id !== messageId);
    io.emit('messageDeleted', messageId);
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error deleting message:', error);
    res.status(500).json({ error: 'Error deleting message' });
  }
});

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('message', async (message) => {
    try {
      const newMessage = {
        _id: Date.now().toString(),
        content: message.content,
        sender: message.sender,
        createdAt: new Date().toISOString(),
        replyTo: message.replyTo
      };
      messages.push(newMessage);
      
      if (messages.length > 50) {
        messages = messages.slice(-50);
      }
      
      io.emit('message', newMessage);
    } catch (error) {
      console.error('Error handling message:', error);
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});