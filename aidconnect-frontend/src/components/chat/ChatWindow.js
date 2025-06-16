import React, { useState, useRef, useEffect } from 'react';
import { useChat } from '../../context/ChatContext';
import { useAuth } from '../../context/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import { Send, Image, X, Paperclip, MapPin, MessageCircle } from 'react-feather';
import './ChatWindow.css';

const ChatWindow = ({ onClose }) => {
  const { user } = useAuth();
  const {
    activeChat,
    messages = [],
    typingUsers = {},
    sendMessage,
    setTyping,
    markAsRead,
  } = useChat();

  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [attachment, setAttachment] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  useEffect(() => {
    if (activeChat && Array.isArray(messages)) {
      const unreadMessages = messages.filter(
        (m) => !m.read && m.receiver === user._id
      );
      if (unreadMessages.length > 0) {
        markAsRead(unreadMessages.map((m) => m._id));
      }
    }
  }, [activeChat, messages, user._id, markAsRead]);

  const handleTyping = () => {
    if (!isTyping && activeChat) {
      setIsTyping(true);
      setTyping(activeChat._id, true);
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      if (activeChat) {
        setTyping(activeChat._id, false);
      }
    }, 2000);
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() && !selectedImage && !attachment) return;

    try {
      let messageType = 'text';
      let file = null;

      if (selectedImage && attachment) {
        messageType = 'image';
        file = attachment;
      }

      await sendMessage(newMessage, messageType, file);
      setNewMessage('');
      setSelectedImage(null);
      setAttachment(null);
      setIsTyping(false);
      if (activeChat) {
        setTyping(activeChat._id, false);
      }
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const handleImageSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result);
      };
      reader.readAsDataURL(file);
      setAttachment(file);
    }
  };

  const handleKeyPress = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSend(event);
    }
  };

  const handleShareLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const location = {
            coordinates: [position.coords.longitude, position.coords.latitude]
          };
          try {
            await sendMessage('Shared location', 'location', location);
          } catch (error) {
            console.error('Error sharing location:', error);
          }
        },
        (error) => {
          console.error('Error getting location:', error);
        }
      );
    }
  };

  if (!activeChat || !activeChat.participants) {
    return (
      <div className="chat-window no-active-chat">
        <div className="no-chat-content">
          <MessageCircle size={64} />
          <h3>No Active Chat</h3>
          <p>Select a conversation to start chatting</p>
        </div>
      </div>
    );
  }

  const otherUser = activeChat.participants.find(p => p._id !== user._id);
  if (!otherUser) {
    return (
      <div className="chat-window no-active-chat">
        <div className="no-chat-content">
          <MessageCircle size={64} />
          <h3>Invalid Chat</h3>
          <p>Unable to find the other participant</p>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-window">
      {/* Chat Header */}
      <div className="chat-header">
        <div className="user-info">
          <div className="user-avatar">
            <img
              src={otherUser.profilePicture || '/default-avatar.png'}
              alt={otherUser.name}
            />
            <span className={`status-indicator ${typingUsers[activeChat._id] ? 'typing' : 'online'}`}></span>
          </div>
          <div className="user-details">
            <h3>{otherUser.name}</h3>
            <p>{typingUsers[activeChat._id] ? 'typing...' : 'online'}</p>
          </div>
        </div>
        <button onClick={onClose} className="close-button" aria-label="Close Chat">
          <X />
        </button>
      </div>

      {/* Messages */}
      <div className="chat-messages">
        {Array.isArray(messages) && messages.map((message) => (
          <div
            key={message._id}
            className={`message-row ${
              message.sender._id === user._id ? 'outgoing' : 'incoming'
            }`}
          >
            <div className="message-bubble">
              <div className="message-info">
                <span className="message-sender">
                  {message.sender._id === user._id ? 'You' : message.sender.name}
                </span>
                <span className="message-time">
                  {formatDistanceToNow(new Date(message.createdAt), {
                    addSuffix: true,
                  })}
                </span>
              </div>
              {message.type === 'text' && <p>{message.text}</p>}
              {message.type === 'image' && message.metadata?.imageUrl && (
                <div className="message-image">
                  <img src={message.metadata.imageUrl} alt="Shared" />
                </div>
              )}
              {message.type === 'location' && message.metadata?.location && (
                <div className="message-location">
                  <MapPin size={16} />
                  <a
                    href={`https://www.google.com/maps?q=${message.metadata.location.coordinates[1]},${message.metadata.location.coordinates[0]}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    View Location
                  </a>
                </div>
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <form onSubmit={handleSend} className="message-input">
        <div className="input-actions">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="action-button"
          >
            <Image size={20} />
          </button>
          <button
            type="button"
            onClick={handleShareLocation}
            className="action-button"
          >
            <MapPin size={20} />
          </button>
        </div>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleImageSelect}
          accept="image/*"
          style={{ display: 'none' }}
        />
        <textarea
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          onKeyDown={handleTyping}
          placeholder="Type a message..."
          rows={1}
        />
        <button type="submit" className="send-button">
          <Send size={20} />
        </button>
      </form>

      {/* Image Preview */}
      {selectedImage && (
        <div className="image-preview">
          <img src={selectedImage} alt="Preview" />
          <button
            onClick={() => {
              setSelectedImage(null);
              setAttachment(null);
            }}
            className="remove-image"
          >
            <X size={20} />
          </button>
        </div>
      )}
    </div>
  );
};

export default ChatWindow;
