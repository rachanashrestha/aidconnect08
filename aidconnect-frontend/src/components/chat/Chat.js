import React, { useEffect, useState } from 'react';
import { useChat } from '../../context/ChatContext';
import { useParams } from 'react-router-dom';
import ChatSidebar from './ChatSidebar';
import ChatWindow from './ChatWindow';
import './Chat.css';

const Chat = () => {
  const { activeChat, messages, sendMessage, setTyping, startChat } = useChat();
  const { roomId } = useParams();
  const [selectedChatId, setSelectedChatId] = useState(null);

  useEffect(() => {
    if (roomId) {
      // If we have a room ID in the URL, start that chat
      startChat(roomId);
      setSelectedChatId(roomId);
    }
  }, [roomId, startChat]);

  const handleSelectChat = (chatRoom) => {
    setSelectedChatId(chatRoom._id);
  };

  return (
    <div className="chat-container">
      <div className="chat-sidebar">
        <ChatSidebar 
          onSelectChat={handleSelectChat}
          selectedChatId={selectedChatId}
        />
      </div>
      <div className="chat-main">
        {activeChat ? (
          <ChatWindow
            chat={activeChat}
            messages={messages}
            onSendMessage={sendMessage}
            onTyping={setTyping}
          />
        ) : (
          <div className="no-chat-selected">
            <h2>Select a conversation to start chatting</h2>
            <p>Your messages will appear here</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Chat; 