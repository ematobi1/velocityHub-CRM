import React, { useState, useEffect, useRef } from 'react';
import { FiMessageCircle, FiX, FiSend, FiUser, FiMaximize2, FiMinimize2 } from 'react-icons/fi';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [mode, setMode] = useState('ai');
  const [status, setStatus] = useState('active');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const startChat = async () => {
    try {
      const response = await axios.post(`${API_URL}/chat/sessions`, {
        visitorName: 'User',
        visitorEmail: ''
      });

      if (response.data.success) {
        setSessionId(response.data.session.id);
        setMessages(response.data.session.messages);
        setMode(response.data.session.mode);
        setIsOpen(true);
      }
    } catch (error) {
      console.error('Error starting chat:', error);
    }
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || !sessionId) return;

    const userMessage = {
      id: `msg_${Date.now()}_user`,
      sender: { type: 'user', name: 'You' },
      content: { text: inputMessage },
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const response = await axios.post(
        `${API_URL}/chat/sessions/${sessionId}/messages`,
        { message: inputMessage }
      );

      if (response.data.success) {
        const newMessage = response.data.message;
        setMessages(prev => [...prev, {
          id: newMessage.id || `msg_${Date.now()}_${Math.random()}`,
          sender: newMessage.sender,
          content: newMessage.content,
          timestamp: new Date(newMessage.timestamp)
        }]);

        if (response.data.session) {
          setMode(response.data.session.handler?.type || 'ai');
          setStatus(response.data.session.status);
        }

        if (newMessage.needsAgent) {
          setMessages(prev => [...prev, {
            id: `msg_${Date.now()}_system`,
            sender: { type: 'system', name: 'System' },
            content: { text: 'Would you like to speak with a live agent?' },
            timestamp: new Date()
          }]);
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(prev => [...prev, {
        id: `msg_${Date.now()}_error`,
        sender: { type: 'system', name: 'System' },
        content: { text: 'Error sending message. Please try again.' },
        timestamp: new Date()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const requestAgent = async () => {
    if (!sessionId) return;

    try {
      const response = await axios.post(
        `${API_URL}/chat/sessions/${sessionId}/request-agent`
      );

      if (response.data.success) {
        setStatus(response.data.session.status);
        setMessages(prev => [...prev, {
          sender: 'system',
          content: 'Connecting you to a live agent. Please wait...',
          timestamp: new Date()
        }]);
      }
    } catch (error) {
      console.error('Error requesting agent:', error);
    }
  };

  const endChat = async () => {
    if (!sessionId) return;

    try {
      await axios.post(`${API_URL}/chat/sessions/${sessionId}/end`);
      setIsOpen(false);
      setSessionId(null);
      setMessages([]);
      setMode('ai');
      setStatus('active');
    } catch (error) {
      console.error('Error ending chat:', error);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const getSenderColor = (sender) => {
    switch (sender) {
      case 'ai':
        return 'bg-primary-100 text-primary-800';
      case 'agent':
        return 'bg-green-100 text-green-800';
      case 'system':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getSenderIcon = (sender) => {
    switch (sender) {
      case 'ai':
        return '🤖';
      case 'agent':
        return '👨‍💼';
      case 'system':
        return 'ℹ️';
      default:
        return '👤';
    }
  };

  // Helper to normalize sender (handle both string and object formats)
  const normalizeSender = (sender) => {
    if (typeof sender === 'string') {
      return sender;
    }
    if (typeof sender === 'object' && sender.type) {
      return sender.type;
    }
    return 'user';
  };

  const normalizeContent = (content) => {
    if (typeof content === 'string') {
      return content;
    }
    if (typeof content === 'object' && content.text) {
      return content.text;
    }
    return '';
  };

  if (!isOpen) {
    return (
      <button
        onClick={startChat}
        className="fixed bottom-6 right-6 bg-primary-600 text-white p-4 rounded-full shadow-lg hover:bg-primary-700 transition-all transform hover:scale-110 z-50"
        title="Chat with us"
      >
        <FiMessageCircle size={28} />
      </button>
    );
  }

  return (
    <div
      className={`fixed bottom-6 right-6 bg-white rounded-lg shadow-2xl border border-gray-200 flex flex-col transition-all z-50 ${
        isExpanded ? 'w-[600px] h-[700px]' : 'w-[380px] h-[550px]'
      }`}
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 text-white p-4 rounded-t-lg flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
          <div>
            <h3 className="font-semibold text-lg">VelocityHub Assistant</h3>
            <p className="text-xs text-primary-100">
              {mode === 'ai' ? '🤖 AI Assistant' : '👨‍💼 Live Agent'}
              {status === 'waiting_for_agent' && ' - Connecting...'}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="hover:bg-primary-500 p-1.5 rounded transition-colors"
            title={isExpanded ? 'Minimize' : 'Maximize'}
          >
            {isExpanded ? <FiMinimize2 size={18} /> : <FiMaximize2 size={18} />}
          </button>
          <button
            onClick={endChat}
            className="hover:bg-primary-500 p-1.5 rounded transition-colors"
            title="End chat"
          >
            <FiX size={20} />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
        {messages.map((msg, index) => {
          const senderType = normalizeSender(msg.sender);
          return (
            <div
              key={index}
              className={`flex ${senderType === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[75%] ${
                  senderType === 'user'
                    ? 'bg-primary-600 text-white'
                    : getSenderColor(senderType)
                } rounded-lg p-3 shadow-sm`}
              >
                {senderType !== 'user' && (
                  <div className="flex items-center space-x-1 mb-1 text-xs font-medium">
                    <span>{getSenderIcon(senderType)}</span>
                    <span className="capitalize">{senderType}</span>
                  </div>
                )}
                <p className="text-sm whitespace-pre-wrap">{normalizeContent(msg.content)}</p>
                <span className="text-xs opacity-70 mt-1 block">
                  {new Date(msg.timestamp).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              </div>
            </div>
          );
        })}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-200 rounded-lg p-3">
              <div className="flex space-x-2">
                <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Actions */}
      {mode === 'ai' && status === 'active' && (
        <div className="px-4 py-2 bg-white border-t border-gray-200">
          <button
            onClick={requestAgent}
            className="w-full text-sm text-primary-600 hover:text-primary-700 flex items-center justify-center space-x-1 py-1"
          >
            <FiUser size={14} />
            <span>Speak with a live agent</span>
          </button>
        </div>
      )}

      {/* Input */}
      <div className="p-4 border-t border-gray-200 bg-white rounded-b-lg">
        <div className="flex items-center space-x-2">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your message..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            disabled={isLoading || status === 'waiting_for_agent'}
          />
          <button
            onClick={sendMessage}
            disabled={!inputMessage.trim() || isLoading || status === 'waiting_for_agent'}
            className="bg-primary-600 text-white p-2.5 rounded-full hover:bg-primary-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            <FiSend size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}

export default ChatWidget;
