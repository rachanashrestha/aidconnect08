import React, { useState } from 'react';
import { X, MessageSquare } from 'react-feather';
import { useChat } from '../../context/ChatContext';
import ChatSidebar from './ChatSidebar';
import ChatWindow from './ChatWindow';
import './ChatModal.css';

const ChatModal = ({ isOpen, onClose }) => {
  const [selectedChat, setSelectedChat] = useState(null);
  const { activeChat, messages, sendMessage, setTyping } = useChat();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-gray-900 bg-opacity-50 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="relative flex flex-col w-full max-w-6xl h-[80vh] bg-white rounded-xl shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <MessageSquare className="w-6 h-6 text-blue-600" />
              <h2 className="text-xl font-semibold text-gray-800">Messages</h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Chat Container */}
          <div className="flex-1 flex overflow-hidden">
            {/* Sidebar */}
            <div className="w-80 border-r border-gray-200 bg-gray-50">
              <ChatSidebar onSelectChat={setSelectedChat} />
            </div>

            {/* Chat Window */}
            <div className="flex-1 flex flex-col">
              {selectedChat ? (
                <ChatWindow
                  chat={selectedChat}
                  messages={messages}
                  onSendMessage={sendMessage}
                  onTyping={setTyping}
                  onClose={() => setSelectedChat(null)}
                />
              ) : (
                <div className="flex-1 flex items-center justify-center bg-gray-50">
                  <div className="text-center">
                    <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900">Select a conversation</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Choose a chat from the sidebar to start messaging
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatModal; 