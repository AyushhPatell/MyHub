import { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, X, Check } from 'lucide-react';
import { QuickNote } from '../../types';
import { quickNotesService } from '../../services/firestore';
import { useAuth } from '../../hooks/useAuth';

interface QuickNotesWidgetProps {
  size: 'small' | 'medium' | 'large';
  userId: string;
}

const noteColors = [
  { name: 'Yellow', class: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800' },
  { name: 'Blue', class: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800' },
  { name: 'Green', class: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' },
  { name: 'Pink', class: 'bg-pink-50 dark:bg-pink-900/20 border-pink-200 dark:border-pink-800' },
  { name: 'Purple', class: 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800' },
];

export default function QuickNotesWidget({ size, userId }: QuickNotesWidgetProps) {
  const [notes, setNotes] = useState<QuickNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newNoteContent, setNewNoteContent] = useState('');

  useEffect(() => {
    loadNotes();
  }, [userId]);

  const loadNotes = async () => {
    try {
      setLoading(true);
      const loadedNotes = await quickNotesService.getNotes(userId);
      setNotes(loadedNotes);
    } catch (error) {
      console.error('Error loading notes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddNote = async () => {
    if (!newNoteContent.trim()) return;
    try {
      const randomColor = noteColors[Math.floor(Math.random() * noteColors.length)];
      await quickNotesService.createNote(userId, {
        content: newNoteContent.trim(),
        color: randomColor.name.toLowerCase(),
      });
      setNewNoteContent('');
      setShowAddForm(false);
      loadNotes();
    } catch (error) {
      console.error('Error adding note:', error);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    try {
      await quickNotesService.deleteNote(userId, noteId);
      loadNotes();
    } catch (error) {
      console.error('Error deleting note:', error);
    }
  };

  const handleStartEdit = (note: QuickNote) => {
    setEditingId(note.id);
    setEditContent(note.content);
  };

  const handleSaveEdit = async (noteId: string) => {
    try {
      await quickNotesService.updateNote(userId, noteId, { content: editContent.trim() });
      setEditingId(null);
      setEditContent('');
      loadNotes();
    } catch (error) {
      console.error('Error updating note:', error);
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditContent('');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const displayNotes = size === 'small' ? notes.slice(0, 3) : size === 'medium' ? notes.slice(0, 5) : notes;

  return (
    <div className="space-y-3">
      {/* Add Note Form */}
      {showAddForm ? (
        <div className="space-y-2">
          <textarea
            value={newNoteContent}
            onChange={(e) => setNewNoteContent(e.target.value)}
            placeholder="Write a note..."
            className="w-full p-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            rows={3}
            autoFocus
          />
          <div className="flex items-center gap-2">
            <button
              onClick={handleAddNote}
              className="flex items-center gap-1 px-3 py-1.5 bg-primary-600 hover:bg-primary-700 text-white text-xs rounded-lg transition-colors"
            >
              <Check className="w-3.5 h-3.5" />
              Save
            </button>
            <button
              onClick={() => {
                setShowAddForm(false);
                setNewNoteContent('');
              }}
              className="flex items-center gap-1 px-3 py-1.5 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 text-xs rounded-lg transition-colors"
            >
              <X className="w-3.5 h-3.5" />
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowAddForm(true)}
          className="w-full flex items-center justify-center gap-2 p-2 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-primary-400 dark:hover:border-primary-600 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors text-sm text-gray-600 dark:text-gray-400"
        >
          <Plus className="w-4 h-4" />
          Add Note
        </button>
      )}

      {/* Notes List */}
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {displayNotes.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">No notes yet</p>
        ) : (
          displayNotes.map((note) => {
            const colorClass = noteColors.find((c) => c.name.toLowerCase() === note.color)?.class || noteColors[0].class;
            
            if (editingId === note.id) {
              return (
                <div key={note.id} className={`p-3 rounded-lg border ${colorClass}`}>
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="w-full p-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white resize-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    rows={3}
                    autoFocus
                  />
                  <div className="flex items-center gap-2 mt-2">
                    <button
                      onClick={() => handleSaveEdit(note.id)}
                      className="flex items-center gap-1 px-2 py-1 bg-primary-600 hover:bg-primary-700 text-white text-xs rounded transition-colors"
                    >
                      <Check className="w-3 h-3" />
                      Save
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      className="flex items-center gap-1 px-2 py-1 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 text-xs rounded transition-colors"
                    >
                      <X className="w-3 h-3" />
                      Cancel
                    </button>
                  </div>
                </div>
              );
            }

            return (
              <div key={note.id} className={`p-3 rounded-lg border ${colorClass} group`}>
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm text-gray-800 dark:text-gray-200 flex-1 whitespace-pre-wrap break-words">
                    {note.content}
                  </p>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleStartEdit(note)}
                      className="p-1 hover:bg-white/50 dark:hover:bg-gray-800/50 rounded transition-colors"
                      title="Edit"
                    >
                      <Edit2 className="w-3.5 h-3.5 text-gray-600 dark:text-gray-400" />
                    </button>
                    <button
                      onClick={() => handleDeleteNote(note.id)}
                      className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

