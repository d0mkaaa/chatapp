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
    methods: ["GET", "POST"]
  }
});

let messages = [];

app.use(cors({
  origin: process.env.FRONTEND_URL || "*"
}));
app.use(express.json());

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('message', async (message) => {
    try {
      const newMessage = {
        _id: Date.now().toString(),
        content: message.content,
        sender: message.sender,
        createdAt: new Date().toISOString()
      };
      messages.push(newMessage);
      
      if (messages.length > 50) {
        messages = messages.slice(-50);
      }
      
      io.emit('message', newMessage);
    } catch (error) {
      console.error('Error saving message:', error);
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

app.get('/messages', async (req, res) => {
  try {
    res.json([...messages].reverse());
  } catch (error) {
    res.status(500).json({ error: 'Error fetching messages' });
  }
});

app.delete('/messages/:id', async (req, res) => {
  try {
    const messageId = req.params.id;
    messages = messages.filter(msg => msg._id !== messageId);
    io.emit('messageDeleted', messageId);
    res.status(200).send({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Error deleting message' });
  }
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});