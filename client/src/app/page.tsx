'use client';

import { useState, useEffect, useRef } from 'react';
import { io, type Socket } from 'socket.io-client';
import Cookies from 'js-cookie';
import { Send, LogOut, Copy, Trash, MessageSquare, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

interface Message {
  _id: string;
  content: string;
  sender: string;
  createdAt: string;
  replyTo?: {
    _id: string;
    content: string;
    sender: string;
  } | null;
}

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL?.replace(/\/$/, '');
if (!BACKEND_URL) {
  console.error('NEXT_PUBLIC_BACKEND_URL is not defined');
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [username, setUsername] = useState('');
  const [isUsernameSet, setIsUsernameSet] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [socket, setSocket] = useState<Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);

  useEffect(() => {
    const initSocket = async () => {
      const socketInstance = io(BACKEND_URL);
      setSocket(socketInstance);

      const storedUsername = Cookies.get('username');
      if (storedUsername) {
        setUsername(storedUsername);
        setIsUsernameSet(true);
      }
      setIsLoading(false);
    };

    initSocket();

    return () => {
      socket?.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!isUsernameSet || !socket) return;

    const fetchMessages = async () => {
      try {
        const response = await fetch(`${BACKEND_URL}/messages`);
        if (!response.ok) throw new Error('Failed to fetch messages');
        const data = await response.json();
        setMessages(data);
      } catch (error) {
        console.error('Error fetching messages:', error);
      }
    };

    fetchMessages();

    const handleNewMessage = (message: Message) => {
      setMessages(prev => [...prev, message]);
    };

    const handleDeletedMessage = (messageId: string) => {
      setMessages(prev => prev.filter(msg => msg._id !== messageId));
    };

    socket.on('message', handleNewMessage);
    socket.on('messageDeleted', handleDeletedMessage);

    return () => {
      socket.off('message', handleNewMessage);
      socket.off('messageDeleted', handleDeletedMessage);
    };
  }, [isUsernameSet, socket]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessage.trim() && socket) {
      const messageData = {
        content: newMessage,
        sender: username,
      };
      
      socket.emit('message', messageData);
      setNewMessage('');
    }
  };

  const handleUsernameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (username.trim()) {
      Cookies.set('username', username, { expires: 7 });
      setIsUsernameSet(true);
    }
  };

  const handleLogout = () => {
    Cookies.remove('username');
    setIsUsernameSet(false);
    setUsername('');
    setMessages([]);
  };

  const handleDeleteMessage = async (messageId: string) => {
    try {
      const response = await fetch(`${BACKEND_URL}/messages/${messageId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) throw new Error('Failed to delete message');
      
      socket?.emit('messageDeleted', messageId);
    } catch (error) {
      console.error('Error deleting message:', error);
    }
  };

  const formatTime = (date: string) => {
    return new Date(date).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const formatFullDate = (date: string) => {
    return new Date(date).toLocaleString([], {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  if (isLoading) {
    return null;
  }

  if (!isUsernameSet) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <Card className="w-[400px]">
            <CardHeader>
              <CardTitle className="text-2xl">Welcome to Chat</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUsernameSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    Choose your username
                  </label>
                  <Input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter username..."
                    required
                  />
                </div>
                <Button type="submit" className="w-full">
                  Join Chat
                </Button>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      <motion.header 
        className="border-b"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="max-w-4xl mx-auto px-4 py-3 flex justify-between items-center">
          <h1 className="text-xl font-semibold">Chat App</h1>
          <div className="flex items-center gap-3">
            <span className="text-muted-foreground">Logged in as {username}</span>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={handleLogout}
              className="flex items-center gap-1"
            >
              <LogOut size={18} />
              Logout
            </Button>
          </div>
        </div>
      </motion.header>

      <div className="flex-1 max-w-4xl w-full mx-auto p-4 overflow-hidden flex flex-col">
        <Card className="flex-1 overflow-hidden">
          <CardContent className="p-4 space-y-4 h-full overflow-y-auto">
            <AnimatePresence initial={false}>
            {messages.map((message) => (
                <motion.div
                  key={message._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className={`flex ${message.sender === username ? 'justify-end' : 'justify-start'} py-2`}
                >
                  <ContextMenu>
                    <ContextMenuTrigger>
                      <div
                        className={`max-w-[80%] min-w-[240px] ${
                          message.sender === username 
                            ? 'bg-primary text-primary-foreground' 
                            : 'bg-muted'
                        } px-6 py-3 rounded-lg shadow-sm`}
                      >
                        {message.replyTo && (
                          <div className={`mb-2 p-2 rounded-md text-sm ${
                            message.sender === username 
                              ? 'bg-primary-foreground/10 text-primary-foreground/80' 
                              : 'bg-background/10 text-foreground/80'
                          }`}>
                            <div className="flex items-center gap-2">
                              <MessageSquare size={12} />
                              <span className="font-medium">{message.replyTo.sender}</span>
                            </div>
                            <p className="mt-1 line-clamp-2">{message.replyTo.content}</p>
                          </div>
                        )}
                        
                        <div className="flex flex-col gap-2">
                          <div className="flex justify-between items-center border-b border-opacity-10 pb-2">
                            <span className="font-medium text-sm">
                              {message.sender}
                            </span>
                            <HoverCard>
                              <HoverCardTrigger>
                                <span className="text-xs opacity-70 ml-4 hover:opacity-100 transition-opacity cursor-help">
                                  {formatTime(message.createdAt)}
                                </span>
                              </HoverCardTrigger>
                              <HoverCardContent className="w-auto p-2 text-xs">
                                {formatFullDate(message.createdAt)}
                              </HoverCardContent>
                            </HoverCard>
                          </div>
                          <p className="break-words leading-relaxed whitespace-pre-wrap">
                            {message.content}
                          </p>
                        </div>
                      </div>
                    </ContextMenuTrigger>
                    <ContextMenuContent className="w-64">
                      <ContextMenuItem
                        onClick={() => navigator.clipboard.writeText(message.content)}
                        className="flex items-center gap-2 cursor-pointer"
                      >
                        <Copy size={16} />
                        Copy Text
                      </ContextMenuItem>
                      
                      <ContextMenuItem
                        onClick={() => setReplyingTo(message)}
                        className="flex items-center gap-2 cursor-pointer"
                      >
                        <MessageSquare size={16} />
                        Reply
                      </ContextMenuItem>

                      <ContextMenuSeparator />

                      {message.sender === username && (
                        <ContextMenuItem
                          onClick={() => handleDeleteMessage(message._id)}
                          className="flex items-center gap-2 cursor-pointer text-red-600 dark:text-red-400"
                        >
                          <Trash size={16} />
                          Delete Message
                        </ContextMenuItem>
                      )}
                    </ContextMenuContent>
                  </ContextMenu>
                </motion.div>
              ))}
            </AnimatePresence>
            <div ref={messagesEndRef} />
          </CardContent>
        </Card>

        <Separator className="my-4" />

        <motion.form 
          onSubmit={handleSubmit} 
          className="flex flex-col gap-2"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          {replyingTo && (
            <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <MessageSquare size={14} />
                  <span className="text-sm font-medium">Reply to {replyingTo.sender}</span>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-1 mt-1">
                  {replyingTo.content}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setReplyingTo(null)}
              >
                <X size={14} />
              </Button>
            </div>
          )}
          
          <div className="flex gap-2">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type your message..."
              className="flex-1"
            />
            <Button type="submit" className="flex items-center gap-2">
              <Send size={18} />
              Send
            </Button>
          </div>
        </motion.form>
      </div>
    </div>
  );
}