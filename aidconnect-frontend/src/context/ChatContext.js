import React, { createContext, useContext, useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import axios from 'axios';

const API_URL = 'http://localhost:5000';

const ChatContext = createContext();

export const useChat = () => {
  return useContext(ChatContext);
};

export const ChatProvider = ({ children }) => {
  const { user, token } = useAuth();
  const [socket, setSocket] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [typingUsers, setTypingUsers] = useState({});
  const [onlineUsers, setOnlineUsers] = useState({});

  useEffect(() => {
    if (user && token) {
      const newSocket = io(API_URL, {
        auth: { token }
      });

      newSocket.on('connect', () => {
        console.log('Connected to chat server');
      });

      newSocket.on('newMessage', (message) => {
        setMessages(prev => Array.isArray(prev) ? [...prev, message] : [message]);
        
        // Update conversation list
        setConversations(prev => {
          const currentConversations = Array.isArray(prev) ? prev : [];
          const index = currentConversations.findIndex(conv => 
            conv.participants.some(p => p._id === message.sender._id)
          );
          
          if (index === -1) {
            return [...currentConversations, {
              lastMessage: message,
              participants: [message.sender],
              unreadCount: 1
            }];
          }
          
          const updated = [...currentConversations];
          updated[index] = {
            ...updated[index],
            lastMessage: message,
            unreadCount: (updated[index].unreadCount || 0) + 1
          };
          return updated;
        });
      });

      newSocket.on('userTyping', ({ userId, isTyping }) => {
        setTypingUsers(prev => ({
          ...(prev || {}),
          [userId]: isTyping
        }));
      });

      newSocket.on('userStatus', ({ userId, status, lastSeen }) => {
        setOnlineUsers(prev => ({
          ...(prev || {}),
          [userId]: { status, lastSeen }
        }));
      });

      setSocket(newSocket);

      return () => {
        newSocket.close();
      };
    }
  }, [user, token]);

  const sendMessage = async (text, type = 'text', file = null) => {
    try {
      if (!activeChat) {
        throw new Error('No active chat selected');
      }

      const receiver = activeChat.participants.find(p => p._id !== user._id)?._id;
      if (!receiver) {
        throw new Error('No receiver found in active chat');
      }

      // Validate message type
      const validTypes = ['text', 'image', 'location'];
      if (!validTypes.includes(type)) {
        throw new Error(`Invalid message type. Must be one of: ${validTypes.join(', ')}`);
      }

      let formData = new FormData();
      formData.append('receiver', receiver);
      formData.append('text', text);
      formData.append('type', type);

      if (file) {
        if (type === 'image') {
          formData.append('file', file);
        } else if (type === 'location') {
          formData.append('location', JSON.stringify(file));
        }
      }

      const response = await axios.post(
        `${API_URL}/api/messages/send`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            ...(file ? {} : { 'Content-Type': 'application/json' })
          }
        }
      );

      const newMessage = response.data;
      setMessages(prev => Array.isArray(prev) ? [...prev, newMessage] : [newMessage]);
      
      // Update the conversation's last message
      setConversations(prev => {
        const currentConversations = Array.isArray(prev) ? prev : [];
        const index = currentConversations.findIndex(conv => 
          conv.participants.some(p => p._id === receiver)
        );
        if (index === -1) return currentConversations;
        
        const updated = [...currentConversations];
        updated[index] = {
          ...updated[index],
          lastMessage: newMessage
        };
        return updated;
      });

      return newMessage;
    } catch (error) {
      console.error('Error sending message:', error);
      if (error.response) {
        console.error('Error response:', error.response.data);
      }
      throw error;
    }
  };

  const setTyping = (receiverId, isTyping) => {
    if (socket) {
      socket.emit('typing', { receiverId, isTyping });
    }
  };

  const markAsRead = async (messageIds) => {
    if (!socket || !messageIds?.length) return;

    try {
      await axios.put(`${API_URL}/api/messages/read`, 
        { messageIds },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      socket.emit('markAsRead', { messageIds });
      setMessages(prev => {
        const currentMessages = Array.isArray(prev) ? prev : [];
        return currentMessages.map(msg =>
          messageIds.includes(msg._id) ? { ...msg, read: true } : msg
        );
      });
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  };

  const startChat = async (roomId) => {
    try {
      if (!roomId) {
        throw new Error('Room ID is required to start a chat');
      }

      // Fetch chat room details
      const response = await axios.get(`${API_URL}/api/chat/room/${roomId}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      const chatRoom = response.data;
      if (!chatRoom) {
        throw new Error('Chat room not found');
      }

      // Set active chat
      setActiveChat(chatRoom);

      // Fetch messages for this chat room
      const messagesResponse = await axios.get(`${API_URL}/api/chat/room/${roomId}/messages`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      // Update messages state
      setMessages(messagesResponse.data || []);

      // Update conversations list
      setConversations(prev => {
        const currentConversations = Array.isArray(prev) ? prev : [];
        const index = currentConversations.findIndex(conv => conv._id === roomId);
        
        if (index === -1) {
          return [...currentConversations, chatRoom];
        }
        
        const updated = [...currentConversations];
        updated[index] = chatRoom;
        return updated;
      });

      // Mark messages as read
      const unreadMessages = messagesResponse.data?.filter(
        msg => !msg.read && msg.receiver === user._id
      );
      if (unreadMessages?.length > 0) {
        markAsRead(unreadMessages.map(msg => msg._id));
      }

      return chatRoom;
    } catch (error) {
      console.error('Error starting chat:', error);
      setActiveChat(null);
      setMessages([]);
      throw error;
    }
  };

  const value = {
    socket,
    conversations,
    activeChat,
    messages,
    typingUsers,
    onlineUsers,
    setActiveChat,
    setMessages,
    sendMessage,
    setTyping,
    markAsRead,
    startChat
  };

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  );
}; 