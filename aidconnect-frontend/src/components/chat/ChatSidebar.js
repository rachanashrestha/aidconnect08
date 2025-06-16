import React, { useEffect, useState } from 'react';
import { useChat } from '../../context/ChatContext';
import { useAuth } from '../../context/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import { MessageCircle, Flag, User, Shield } from 'react-feather';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './ChatSidebar.css';

const ChatSidebar = ({ onSelectChat, selectedChatId }) => {
  const { user, token } = useAuth();
  const chatContext = useChat();
  const [chatRooms, setChatRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchChatRooms = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          throw new Error('No authentication token found');
        }

        const response = await axios.get('http://localhost:5000/api/chat/rooms', {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        if (response.data) {
          setChatRooms(response.data);
        }
      } catch (error) {
        console.error('Error fetching chat rooms:', error);
        setError('Failed to load chat rooms');
      } finally {
        setLoading(false);
      }
    };

    fetchChatRooms();
  }, []);

  const handleChatSelect = (chatRoom) => {
    onSelectChat(chatRoom);
    navigate(`/chat/${chatRoom._id}`);
  };

  const getStatusIndicator = (userId) => {
    if (!chatContext) return null;
    const { onlineUsers } = chatContext;
    const status = onlineUsers[userId]?.status;
    if (status === 'online') {
      return <span className="status-indicator online" title="Online"></span>;
    }
    return <span className="status-indicator offline" title="Offline"></span>;
  };

  const handleReport = async (userId, event) => {
    event.stopPropagation();
    try {
      await axios.post('http://localhost:5000/api/messages/report', 
        { userId },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      alert('User has been reported');
    } catch (error) {
      console.error('Error reporting user:', error);
    }
  };

  const getRoleBadge = (role) => {
    switch (role) {
      case 'volunteer':
        return <span className="role-badge volunteer" title="Volunteer"><Shield size={14} /></span>;
      case 'requester':
        return <span className="role-badge requester" title="Requester"><User size={14} /></span>;
      default:
        return null;
    }
  };

  if (loading) {
    return <div className="chat-sidebar-loading">Loading chats...</div>;
  }

  if (error) {
    return <div className="chat-sidebar-error">{error}</div>;
  }

  const { activeChat, onlineUsers } = chatContext;
  const conversations = chatContext.conversations || chatRooms;

  return (
    <div className="chat-sidebar">
      <div className="chat-sidebar-header">
        <h2>Chats</h2>
      </div>
      <div className="chat-list">
        {conversations.length === 0 ? (
          <div className="no-chats">No active chats</div>
        ) : (
          conversations.map((conversation) => {
            const otherUser = conversation.participants.find(p => p._id !== user._id);
            if (!otherUser) return null;

            const isRequester = user.role === 'requester';
            const displayName = isRequester 
              ? `${otherUser.name} (Volunteer)`
              : `${otherUser.name} (Requester)`;

            return (
              <div
                key={conversation._id}
                className={`chat-item ${selectedChatId === conversation._id ? 'selected' : ''}`}
                onClick={() => handleChatSelect(conversation)}
              >
                <div className="chat-item-avatar">
                  {otherUser.profilePicture ? (
                    <img
                      src={otherUser.profilePicture}
                      alt={otherUser.name}
                    />
                  ) : (
                    <div className="avatar-placeholder">
                      {otherUser.name?.charAt(0)?.toUpperCase() || '?'}
                    </div>
                  )}
                  {getStatusIndicator(otherUser._id)}
                </div>
                <div className="chat-item-info">
                  <div className="chat-item-name">
                    {displayName}
                  </div>
                  <div className="chat-item-preview">
                    {conversation.lastMessage?.text || 'No messages yet'}
                  </div>
                </div>
                {conversation.unreadCount > 0 && (
                  <div className="unread-badge">{conversation.unreadCount}</div>
                )}
                <button
                  className="report-button"
                  onClick={(e) => handleReport(otherUser._id, e)}
                  title="Report User"
                >
                  <Flag size={16} />
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default ChatSidebar; 