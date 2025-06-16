import React from 'react';
import { MessageCircle } from 'react-feather';
import { useChat } from '../../context/ChatContext';
import { useNavigate } from 'react-router-dom';

const ChatButton = () => {
  const { conversations } = useChat();
  const navigate = useNavigate();

  const unreadCount = conversations.reduce(
    (count, conversation) => count + conversation.unreadCount,
    0
  );

  const handleClick = () => {
    navigate('/chat');
  };

  return (
    <button
      onClick={handleClick}
      className="fixed bottom-6 right-6 bg-blue-500 text-white rounded-full p-4 shadow-lg hover:bg-blue-600 transition-colors"
    >
      <div className="relative">
        <MessageCircle className="w-6 h-6" />
        {unreadCount > 0 && (
          <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
            {unreadCount}
          </span>
        )}
      </div>
    </button>
  );
};

export default ChatButton; 