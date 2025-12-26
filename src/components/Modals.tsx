import React, { useRef } from 'react';
import { Settings, BookOpen, Wand2, Sparkles, Upload, X, FileText } from 'lucide-react';
import type { Attachment } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  apiKey: string;
  onApiKeyChange: (value: string) => void;
  onSave: () => void;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  apiKey,
  onApiKeyChange,
  onSave,
  onClose
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center backdrop-blur-sm">
      <div className="bg-zinc-900 border border-zinc-700 p-6 rounded-lg w-96 shadow-xl">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <Settings className="w-5 h-5" /> Settings
        </h2>
        <div className="mb-4">
          <label className="block text-sm text-zinc-400 mb-2">Google Gemini API Key</label>
          <input 
            type="password" 
            className="w-full bg-zinc-800 border border-zinc-700 rounded p-2 text-sm focus:outline-none focus:border-blue-500" 
            placeholder="Demo Mode if empty" 
            value={apiKey} 
            onChange={(e) => onApiKeyChange(e.target.value)} 
          />
        </div>
        <div className="flex justify-end gap-2">
          <button 
            onClick={onClose} 
            className="px-3 py-1.5 text-sm hover:bg-zinc-800 rounded"
          >
            Cancel
          </button>
          <button 
            onClick={onSave} 
            className="px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-500 rounded font-medium"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

interface TopicModalProps {
  isOpen: boolean;
  topicInput: string;
  onTopicInputChange: (value: string) => void;
  onGenerate: () => void;
  onClose: () => void;
  isLoading: boolean;
  selectedFile: Attachment | null;
  onFileSelect: (file: Attachment | null) => void;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
}

export const TopicModal: React.FC<TopicModalProps> = ({
  isOpen,
  topicInput,
  onTopicInputChange,
  onGenerate,
  onClose,
  isLoading,
  selectedFile,
  onFileSelect,
  onFileChange
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileRemove = () => {
    onFileSelect(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center backdrop-blur-sm">
      <div className="bg-zinc-900 border border-zinc-700 p-6 rounded-lg w-96 shadow-2xl">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-purple-400">
          <BookOpen className="w-5 h-5" /> Create Study Plan
        </h2>
        
        <div className="mb-3">
          <label className="block text-sm text-zinc-400 mb-2">Topic (optional if file uploaded)</label>
          <textarea 
            className="w-full bg-zinc-800 border border-zinc-700 rounded p-3 text-sm focus:outline-none focus:border-purple-500 min-h-[80px]" 
            placeholder="Enter topic or upload a file..." 
            value={topicInput} 
            onChange={(e) => onTopicInputChange(e.target.value)} 
          />
        </div>

        <div className="mb-4">
          <label className="block text-sm text-zinc-400 mb-2">Upload File (PDF, TXT, MD)</label>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.txt,.md,.doc,.docx"
            onChange={onFileChange}
            className="hidden"
          />
          
          {selectedFile ? (
            <div className="flex items-center gap-2 p-2 bg-zinc-800 border border-zinc-700 rounded">
              <FileText size={16} className="text-purple-400" />
              <span className="flex-1 text-sm text-zinc-300 truncate">{selectedFile.name}</span>
              <button
                onClick={handleFileRemove}
                className="p-1 hover:bg-zinc-700 rounded text-zinc-400 hover:text-red-400"
                title="Remove file"
              >
                <X size={14} />
              </button>
            </div>
          ) : (
            <button
              onClick={handleFileClick}
              className="w-full p-3 bg-zinc-800 border border-zinc-700 rounded hover:bg-zinc-700 transition-colors flex items-center justify-center gap-2 text-sm text-zinc-300"
            >
              <Upload size={16} /> Choose File
            </button>
          )}
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <button 
            onClick={onClose} 
            className="px-3 py-1.5 text-sm hover:bg-zinc-800 rounded"
          >
            Cancel
          </button>
          <button 
            onClick={onGenerate} 
            disabled={(!topicInput.trim() && !selectedFile) || isLoading} 
            className="px-3 py-1.5 text-sm bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed rounded font-medium flex items-center gap-2"
          >
            {isLoading ? 'Generating...' : 'Generate'} <Wand2 size={14}/>
          </button>
        </div>
      </div>
    </div>
  );
};

interface LoadingOverlayProps {
  isVisible: boolean;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ isVisible }) => {
  if (!isVisible) return null;

  return (
    <div className="fixed top-20 left-1/2 -translate-x-1/2 bg-indigo-900/80 backdrop-blur text-indigo-100 px-4 py-2 rounded-full text-sm font-medium z-[100] animate-pulse shadow-lg flex items-center gap-2">
      <Sparkles size={16} /> AI Thinking...
    </div>
  );
};