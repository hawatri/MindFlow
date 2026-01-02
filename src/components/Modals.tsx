import React, { useRef } from 'react';
import { Settings, BookOpen, Wand2, Sparkles, UploadCloud, FileText, AlertTriangle } from 'lucide-react';

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
  onFileUpload: (file: File) => void;
  fileName: string | null;
}

export const TopicModal: React.FC<TopicModalProps> = ({
  isOpen,
  topicInput,
  onTopicInputChange,
  onGenerate,
  onClose,
  isLoading,
  onFileUpload,
  fileName
}) => {
  if (!isOpen) return null;
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center backdrop-blur-sm">
      <div className="bg-zinc-900 border border-zinc-700 p-6 rounded-lg w-[480px] shadow-2xl">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-purple-400">
          <BookOpen className="w-5 h-5" /> Create Study Plan
        </h2>
        
        <div className="space-y-4">
          <div>
            <label className="text-xs text-zinc-500 uppercase font-semibold mb-1 block">By Topic</label>
            <textarea 
              className="w-full bg-zinc-800 border border-zinc-700 rounded p-3 text-sm focus:outline-none focus:border-purple-500 min-h-[80px]" 
              placeholder="E.g., Quantum Mechanics, History of Rome..." 
              value={topicInput} 
              onChange={(e) => onTopicInputChange(e.target.value)} 
            />
          </div>

          <div className="flex items-center gap-2">
            <div className="h-px bg-zinc-800 flex-1"></div>
            <span className="text-xs text-zinc-600 font-medium">OR BY FILE</span>
            <div className="h-px bg-zinc-800 flex-1"></div>
          </div>

          <div 
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-lg p-4 flex flex-col items-center justify-center cursor-pointer transition-colors ${
              fileName ? 'border-purple-500/50 bg-purple-500/10' : 'border-zinc-700 hover:border-zinc-600 hover:bg-zinc-800/50'
            }`}
          >
            <input 
              ref={fileInputRef}
              type="file" 
              accept=".pdf,.txt,.md" 
              className="hidden" 
              onChange={(e) => e.target.files?.[0] && onFileUpload(e.target.files[0])}
            />
            {fileName ? (
              <div className="flex items-center gap-2 text-purple-300">
                <FileText size={20} />
                <span className="text-sm font-medium truncate max-w-[300px]">{fileName}</span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-1 text-zinc-500">
                <UploadCloud size={24} />
                <span className="text-xs">Upload PDF or Text file</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <button 
            onClick={onClose} 
            className="px-3 py-1.5 text-sm hover:bg-zinc-800 rounded text-zinc-300"
          >
            Cancel
          </button>
          <button 
            onClick={onGenerate} 
            disabled={(!topicInput.trim() && !fileName) || isLoading} 
            className="px-4 py-1.5 text-sm bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed rounded font-medium flex items-center gap-2 text-white"
          >
            {isLoading ? 'Generating...' : 'Generate Plan'} <Wand2 size={14}/>
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

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  variant?: 'danger' | 'warning' | 'info';
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  variant = 'warning'
}) => {
  if (!isOpen) return null;

  const variantStyles = {
    danger: {
      icon: 'text-red-500',
      button: 'bg-red-600 hover:bg-red-500',
      border: 'border-red-500/30'
    },
    warning: {
      icon: 'text-amber-500',
      button: 'bg-amber-600 hover:bg-amber-500',
      border: 'border-amber-500/30'
    },
    info: {
      icon: 'text-blue-500',
      button: 'bg-blue-600 hover:bg-blue-500',
      border: 'border-blue-500/30'
    }
  };

  const styles = variantStyles[variant];

  return (
    <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center backdrop-blur-sm">
      <div className={`bg-zinc-900 border ${styles.border} p-6 rounded-lg w-[400px] shadow-2xl`}>
        <div className="flex items-start gap-3 mb-4">
          <AlertTriangle className={`w-6 h-6 ${styles.icon} shrink-0 mt-0.5`} />
          <div className="flex-1">
            <h2 className="text-xl font-bold text-white mb-2">{title}</h2>
            <p className="text-sm text-zinc-400">{message}</p>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <button 
            onClick={onCancel} 
            className="px-4 py-2 text-sm hover:bg-zinc-800 rounded text-zinc-300 transition-colors"
          >
            {cancelText}
          </button>
          <button 
            onClick={onConfirm} 
            className={`px-4 py-2 text-sm ${styles.button} rounded font-medium text-white transition-colors`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};