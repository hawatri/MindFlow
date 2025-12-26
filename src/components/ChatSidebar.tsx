import React, { useState, useRef, useEffect } from 'react';
import { X, Send, MessageSquare, Loader2 } from 'lucide-react';
import type { Node, Viewport } from '../types';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

interface ChatSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  nodes: Node[];
  viewport: Viewport;
  apiKey: string;
  onChatQuery: (query: string, visibleNodesContext: string) => Promise<string>;
}

export const ChatSidebar: React.FC<ChatSidebarProps> = ({
  isOpen,
  onClose,
  nodes,
  viewport,
  apiKey,
  onChatQuery
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when sidebar opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Get visible nodes based on viewport
  const getVisibleNodes = (): Node[] => {
    if (!isOpen) return [];

    // Get canvas dimensions (accounting for sidebar width)
    const sidebarWidth = 384; // w-96 = 384px
    const canvasWidth = window.innerWidth - sidebarWidth;
    const canvasHeight = window.innerHeight;

    // Calculate visible bounds in world coordinates
    const visibleLeft = -viewport.x / viewport.zoom;
    const visibleTop = -viewport.y / viewport.zoom;
    const visibleRight = visibleLeft + canvasWidth / viewport.zoom;
    const visibleBottom = visibleTop + canvasHeight / viewport.zoom;

    return nodes.filter(node => {
      const nodeLeft = node.x;
      const nodeTop = node.y;
      const nodeRight = node.x + (node.width || 260);
      const nodeBottom = node.y + (node.height || 180);

      // Check if node overlaps with visible area
      return !(
        nodeRight < visibleLeft ||
        nodeLeft > visibleRight ||
        nodeBottom < visibleTop ||
        nodeTop > visibleBottom
      );
    });
  };

  // Extract text content from visible nodes
  const getVisibleNodesContext = (): string => {
    const visibleNodes = getVisibleNodes();
    
    if (visibleNodes.length === 0) {
      return 'No nodes are currently visible on the canvas.';
    }

    return visibleNodes.map((node, index) => {
      let content = `Node ${index + 1}: "${node.title}"\n`;
      
      if (node.data.label) {
        content += `Content: ${node.data.label}\n`;
      }

      // Add text attachments
      if (node.data.attachments) {
        node.data.attachments.forEach(att => {
          if (att.fileType === 'text' && att.content) {
            content += `Attachment (${att.name}): ${att.content}\n`;
          }
        });
      }

      return content;
    }).join('\n---\n\n');
  };

  const handleSend = async () => {
    if (!inputValue.trim() || isLoading || !apiKey) return;

    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: inputValue.trim(),
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      const visibleNodesContext = getVisibleNodesContext();
      const response = await onChatQuery(userMessage.content, visibleNodesContext);

      const assistantMessage: ChatMessage = {
        id: `msg-${Date.now()}`,
        role: 'assistant',
        content: response,
        timestamp: Date.now()
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      const errorMessage: ChatMessage = {
        id: `msg-${Date.now()}`,
        role: 'assistant',
        content: `Error: ${error instanceof Error ? error.message : 'Failed to get response'}`,
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="absolute right-0 top-0 bottom-0 w-96 bg-zinc-900 border-l border-zinc-800 flex flex-col z-50 shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-zinc-800 bg-zinc-950">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-indigo-400" />
          <h2 className="text-lg font-semibold text-white">Chat with your Flow</h2>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 hover:bg-zinc-800 rounded-md text-zinc-400 hover:text-white transition-colors"
        >
          <X size={18} />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center text-zinc-500 mt-8 px-4">
            <MessageSquare className="w-12 h-12 mx-auto mb-3 text-zinc-700" />
            <p className="text-sm">
              Ask questions about the nodes currently visible on your canvas.
            </p>
            <p className="text-xs mt-2 text-zinc-600">
              Example: "What is the relationship between Newton's First Law and the Quiz?"
            </p>
          </div>
        ) : (
          messages.map(msg => (
            <div
              key={msg.id}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-lg px-4 py-2 ${
                  msg.role === 'user'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-zinc-800 text-zinc-200'
                }`}
              >
                <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
              </div>
            </div>
          ))
        )}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-zinc-800 rounded-lg px-4 py-2 flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
              <span className="text-sm text-zinc-400">Thinking...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-zinc-800 bg-zinc-950">
        {!apiKey && (
          <div className="mb-2 p-2 bg-yellow-900/20 border border-yellow-800/50 rounded text-xs text-yellow-400">
            Please set your API key in Settings to use chat.
          </div>
        )}
        <div className="flex gap-2">
          <textarea
            ref={inputRef}
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about your flow..."
            disabled={isLoading || !apiKey}
            className="flex-1 bg-zinc-800 border border-zinc-700 rounded-md px-3 py-2 text-sm text-white placeholder-zinc-500 resize-none focus:outline-none focus:border-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            rows={2}
          />
          <button
            onClick={handleSend}
            disabled={isLoading || !inputValue.trim() || !apiKey}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send size={18} />
            )}
          </button>
        </div>
        <p className="text-xs text-zinc-500 mt-2">
          {getVisibleNodes().length} node{getVisibleNodes().length !== 1 ? 's' : ''} visible
        </p>
      </div>
    </div>
  );
};

