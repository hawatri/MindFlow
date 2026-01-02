import React, { useState, useEffect } from 'react';
import { X, Search, Save, Trash2, Download, Loader2, FileText, Calendar } from 'lucide-react';
import { getUserFlows, searchUserFlows, loadFlowFromFirebase, deleteFlowFromFirebase, saveFlowToFirebase, updateFlowInFirebase, type SavedFlow } from '../utils/firebase';
import type { AppState } from '../types';

interface SavedFlowsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentFlow: AppState;
  onLoadFlow: (flow: AppState) => void;
  currentUser: any;
}

export const SavedFlowsModal: React.FC<SavedFlowsModalProps> = ({
  isOpen,
  onClose,
  currentFlow,
  onLoadFlow,
  currentUser
}) => {
  const [flows, setFlows] = useState<SavedFlow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saveTitle, setSaveTitle] = useState('');
  const [saveDescription, setSaveDescription] = useState('');
  const [showSaveForm, setShowSaveForm] = useState(false);
  const [editingFlowId, setEditingFlowId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && currentUser) {
      loadFlows();
    }
  }, [isOpen, currentUser]);

  const loadFlows = async () => {
    if (!currentUser) return;
    
    setIsLoading(true);
    setError(null);
    try {
      const userFlows = searchTerm.trim()
        ? await searchUserFlows(searchTerm)
        : await getUserFlows();
      setFlows(userFlows);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load flows');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      const timeoutId = setTimeout(() => {
        if (searchTerm.trim() || flows.length > 0) {
          loadFlows();
        }
      }, 300);
      return () => clearTimeout(timeoutId);
    }
  }, [searchTerm]);

  const handleSaveFlow = async () => {
    if (!saveTitle.trim()) {
      setError('Please enter a title');
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      if (editingFlowId) {
        await updateFlowInFirebase(editingFlowId, currentFlow, saveTitle, saveDescription);
      } else {
        await saveFlowToFirebase(currentFlow, saveTitle, saveDescription);
      }
      setShowSaveForm(false);
      setSaveTitle('');
      setSaveDescription('');
      setEditingFlowId(null);
      await loadFlows();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save flow');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLoadFlow = async (flowId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const flow = await loadFlowFromFirebase(flowId);
      if (flow) {
        onLoadFlow(flow.flowData);
        onClose();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load flow');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteFlow = async (flowId: string) => {
    if (!window.confirm('Are you sure you want to delete this flow?')) return;

    setIsLoading(true);
    setError(null);
    try {
      await deleteFlowFromFirebase(flowId);
      await loadFlows();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete flow');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditFlow = (flow: SavedFlow) => {
    setEditingFlowId(flow.id || null);
    setSaveTitle(flow.title);
    setSaveDescription(flow.description || '');
    setShowSaveForm(true);
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center backdrop-blur-sm">
      <div className="bg-zinc-900 border border-zinc-700 p-6 rounded-lg w-[600px] max-h-[80vh] shadow-2xl flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <FileText className="w-5 h-5" /> Saved Flows
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

        {showSaveForm ? (
          <div className="flex-1 overflow-y-auto">
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-zinc-400 mb-2">Title *</label>
                <input
                  type="text"
                  value={saveTitle}
                  onChange={(e) => setSaveTitle(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded p-2 text-sm focus:outline-none focus:border-purple-500"
                  placeholder="My Study Flow"
                />
              </div>
              <div>
                <label className="block text-sm text-zinc-400 mb-2">Description</label>
                <textarea
                  value={saveDescription}
                  onChange={(e) => setSaveDescription(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded p-2 text-sm focus:outline-none focus:border-purple-500 min-h-[80px]"
                  placeholder="Optional description..."
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setShowSaveForm(false);
                    setSaveTitle('');
                    setSaveDescription('');
                    setEditingFlowId(null);
                  }}
                  className="flex-1 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded text-white"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveFlow}
                  disabled={isSaving || !saveTitle.trim()}
                  className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed rounded text-white font-medium"
                >
                  {isSaving ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 size={16} className="animate-spin" /> Saving...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <Save size={16} /> {editingFlowId ? 'Update' : 'Save'}
                    </span>
                  )}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="flex gap-2 mb-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 w-4 h-4" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search flows..."
                  className="w-full bg-zinc-800 border border-zinc-700 rounded pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-purple-500"
                />
              </div>
              <button
                onClick={() => setShowSaveForm(true)}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded text-white font-medium flex items-center gap-2"
              >
                <Save size={16} /> Save Current
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2">
              {isLoading && flows.length === 0 ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 size={24} className="animate-spin text-purple-500" />
                </div>
              ) : flows.length === 0 ? (
                <div className="text-center py-8 text-zinc-500">
                  {searchTerm ? 'No flows found' : 'No saved flows yet'}
                </div>
              ) : (
                flows.map((flow) => (
                  <div
                    key={flow.id}
                    className="bg-zinc-800 border border-zinc-700 rounded p-4 hover:border-purple-500/50 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h3 className="font-medium text-white mb-1">{flow.title}</h3>
                        {flow.description && (
                          <p className="text-sm text-zinc-400 mb-2">{flow.description}</p>
                        )}
                        <div className="flex items-center gap-4 text-xs text-zinc-500">
                          <span className="flex items-center gap-1">
                            <Calendar size={12} />
                            {formatDate(flow.updatedAt)}
                          </span>
                          <span>{flow.flowData.nodes.length} nodes</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleLoadFlow(flow.id!)}
                        className="flex-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 rounded text-sm text-white"
                      >
                        Load
                      </button>
                      <button
                        onClick={() => handleEditFlow(flow)}
                        className="px-3 py-1.5 bg-zinc-700 hover:bg-zinc-600 rounded text-sm text-white"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteFlow(flow.id!)}
                        className="px-3 py-1.5 bg-red-600 hover:bg-red-500 rounded text-sm text-white"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {error && (
              <div className="mt-4 p-3 bg-red-900/20 border border-red-500/30 rounded text-sm text-red-400">
                {error}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};




