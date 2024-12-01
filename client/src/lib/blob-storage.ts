import { put, del, list } from '@vercel/blob';

export interface Message {
  _id: string;
  content: string;
  sender: string;
  createdAt: string;
}

const MESSAGES_PREFIX = 'messages/';

export async function saveMessage(message: Message) {
  try {
    const content = JSON.stringify(message);
    const blob = await put(`${MESSAGES_PREFIX}${message._id}.json`, content, {
      contentType: 'application/json',
      access: 'public', 
    });
    return { success: true, url: blob.url };
  } catch (error) {
    console.error('Error saving message:', error);
    throw new Error('Failed to save message to blob storage');
  }
}

export async function getMessages() {
  try {
    const { blobs } = await list({ prefix: MESSAGES_PREFIX });
    const messages: Message[] = [];
    
    for (const blob of blobs) {
      try {
        const response = await fetch(blob.url);
        if (!response.ok) continue; 
        const message = await response.json();
        messages.push(message);
      } catch (err) {
        console.error(`Error fetching message from ${blob.url}:`, err);
        continue;
      }
    }
    
    return messages.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  } catch (error) {
    console.error('Error getting messages:', error);
    throw new Error('Failed to fetch messages from blob storage');
  }
}

export async function deleteMessage(messageId: string) {
  try {
    await del(`${MESSAGES_PREFIX}${messageId}.json`);
    return { success: true };
  } catch (error) {
    console.error('Error deleting message:', error);
    throw new Error('Failed to delete message from blob storage');
  }
}