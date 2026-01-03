import { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, X, Check } from 'lucide-react';
import { QuickNote } from '../../types';
import { quickNotesService } from '../../services/firestore';

interface QuickNotesWidgetProps {
  size: 'small' | 'medium' | 'large';
  userId: string;
}

const noteColors = [
  { name: 'Yellow', bg: 'bg-yellow-100 dark:bg-yellow-900/20', border: 'border-yellow-300 dark:border-yellow-800' },
  { name: 'Blue', bg: 'bg-blue-100 dark:bg-blue-900/20', border: 'border-blue-300 dark:border-blue-800' },
  { name: 'Green', bg: 'bg-green-100 dark:bg-green-900/20', border: 'border-green-300 dark:border-green-800' },
  { name: 'Pink', bg: 'bg-pink-100 dark:bg-pink-900/20', border: 'border-pink-300 dark:border-pink-800' },
  { name: 'Purple', bg: 'bg-purple-100 dark:bg-purple-900/20', border: 'border-purple-300 dark:border-purple-800' },
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
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-indigo-500 border-t-transparent"></div>
      </div>
    );
  }

  // Show all notes with scrolling if needed
  return (
    <div className="space-y-4">
      {showAddForm ? (
        <div className="space-y-4">
          <textarea
            value={newNoteContent}
            onChange={(e) => setNewNoteContent(e.target.value)}
            placeholder="Write a note..."
            className="w-full p-4 text-sm border-2 border-gray-200 dark:border-white/10 rounded-2xl bg-white dark:bg-gray-800/50 backdrop-blur-xl text-gray-900 dark:text-white resize-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-medium"
            rows={4}
            autoFocus
          />
          <div className="flex items-center gap-3">
            <button
              onClick={handleAddNote}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-bold rounded-xl transition-transform hover:scale-105"
            >
              <Check className="w-5 h-5" />
              Save
            </button>
            <button
              onClick={() => {
                setShowAddForm(false);
                setNewNoteContent('');
              }}
              className="px-4 py-3 bg-gray-100 dark:bg-gray-800/50 hover:bg-gray-200 dark:hover:bg-gray-700/50 text-gray-700 dark:text-gray-300 font-bold rounded-xl transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowAddForm(true)}
          className="w-full flex items-center justify-center gap-3 p-5 border-2 border-dashed border-indigo-300 dark:border-indigo-600 rounded-2xl hover:border-indigo-400 dark:hover:border-indigo-500 hover:bg-indigo-50/50 dark:hover:bg-indigo-500/10 transition-all font-bold text-indigo-600 dark:text-indigo-400"
        >
          <Plus className="w-6 h-6" />
          Add Note
        </button>
      )}

      <div className="space-y-3 max-h-96 overflow-y-auto scrollbar-hide">
        {notes.length === 0 ? (
          <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-10 font-semibold">No notes yet</p>
        ) : (
          notes.map((note) => {
            const colorClass = noteColors.find((c) => c.name.toLowerCase() === note.color) || noteColors[0];
            
            if (editingId === note.id) {
              return (
                <div key={note.id} className={`p-4 rounded-2xl border-2 ${colorClass.bg} ${colorClass.border}`}>
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="w-full p-3 text-sm border-2 border-gray-200 dark:border-white/10 rounded-xl bg-white dark:bg-gray-800/50 backdrop-blur-xl text-gray-900 dark:text-white resize-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-medium"
                    rows={4}
                    autoFocus
                  />
                  <div className="flex items-center gap-3 mt-4">
                    <button
                      onClick={() => handleSaveEdit(note.id)}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-bold rounded-lg transition-transform hover:scale-105"
                    >
                      <Check className="w-4 h-4" />
                      Save
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      className="px-3 py-2 bg-gray-100 dark:bg-gray-800/50 hover:bg-gray-200 dark:hover:bg-gray-700/50 text-gray-700 dark:text-gray-300 font-bold rounded-lg transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            }

            return (
              <div key={note.id} className={`group relative p-5 rounded-2xl border-2 ${colorClass.bg} ${colorClass.border} hover:scale-[1.02] transition-transform`}>
                <p className="text-sm text-gray-900 dark:text-white font-medium whitespace-pre-wrap break-words pr-10">
                  {note.content}
                </p>
                <div className="absolute top-4 right-4 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleStartEdit(note)}
                    className="p-2 hover:bg-white/50 dark:hover:bg-gray-800/50 rounded-xl transition-colors"
                    title="Edit"
                  >
                    <Edit2 className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                  </button>
                  <button
                    onClick={() => handleDeleteNote(note.id)}
                    className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-xl transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4 text-red-600 dark:text-red-400" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
