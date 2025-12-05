import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Search, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { semesterService, courseService, assignmentService } from '../services/firestore';

interface SearchResult {
  type: 'course' | 'assignment';
  id: string;
  courseId?: string;
  title: string;
  subtitle: string;
}

export default function SearchBar() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
        event.preventDefault();
        setIsOpen(true);
      }
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false);
        setQuery('');
        setResults([]);
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!query.trim() || !user) {
      setResults([]);
      return;
    }

    const search = async () => {
      setLoading(true);
      try {
        const semester = await semesterService.getActiveSemester(user.uid);
        if (!semester) {
          setResults([]);
          setLoading(false);
          return;
        }

        const allResults: SearchResult[] = [];
        const searchLower = query.toLowerCase();

        // Search courses
        const courses = await courseService.getCourses(user.uid, semester.id);
        courses.forEach((course) => {
          if (
            course.courseCode.toLowerCase().includes(searchLower) ||
            course.courseName.toLowerCase().includes(searchLower)
          ) {
            allResults.push({
              type: 'course',
              id: course.id,
              title: course.courseCode,
              subtitle: course.courseName,
            });
          }
        });

        // Search assignments
        for (const course of courses) {
          const assignments = await assignmentService.getAssignments(user.uid, semester.id, course.id);
          assignments.forEach((assignment) => {
            if (assignment.name.toLowerCase().includes(searchLower)) {
              allResults.push({
                type: 'assignment',
                id: assignment.id,
                courseId: course.id,
                title: assignment.name,
                subtitle: `${course.courseCode} • ${new Date(assignment.dueDate).toLocaleDateString()}`,
              });
            }
          });
        }

        setResults(allResults.slice(0, 10)); // Limit to 10 results
      } catch (error) {
        console.error('Error searching:', error);
      } finally {
        setLoading(false);
      }
    };

    const timeoutId = setTimeout(search, 300); // Debounce
    return () => clearTimeout(timeoutId);
  }, [query, user]);

  const handleResultClick = (result: SearchResult, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Determine navigation path first
    let path = '';
    if (result.type === 'course') {
      path = `/courses/${result.id}`;
    } else if (result.courseId) {
      path = `/courses/${result.courseId}`;
    }
    
    // Close modal
    setIsOpen(false);
    setQuery('');
    setResults([]);
    
    // Navigate after a tiny delay to ensure modal closes
    if (path) {
      setTimeout(() => {
        navigate(path);
      }, 100);
    }
  };

  return (
    <div ref={searchRef} className="relative">
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center justify-center gap-2 px-4 py-2 h-10 bg-white/60 dark:bg-white/5 backdrop-blur-xl border border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-white dark:hover:bg-white/10 hover:border-indigo-300 dark:hover:border-indigo-500/30 transition-all font-semibold text-sm shadow-sm"
        title="Search (Ctrl+K or Cmd+K)"
      >
        <Search size={18} />
        <span className="hidden md:inline">Search...</span>
        <span className="hidden lg:inline text-xs text-gray-500 dark:text-gray-400 px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800/50 rounded border border-gray-200 dark:border-white/10">⌘K</span>
      </button>

      {isOpen && createPortal(
        <>
          <div 
            className="fixed inset-0 bg-black/70 z-[9998]"
            style={{ backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}
            onClick={(e) => {
              // Only close if clicking directly on backdrop, not on child elements
              if (e.target === e.currentTarget) {
                setIsOpen(false);
                setQuery('');
                setResults([]);
              }
            }}
          />
          <div className="fixed inset-0 z-[9999] flex items-start justify-center pt-[20vh] pointer-events-none p-4">
            <div 
              className="w-full max-w-2xl bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border-2 border-indigo-300 dark:border-indigo-500/50 overflow-hidden ring-4 ring-indigo-200/50 dark:ring-indigo-500/20 pointer-events-auto" 
              onClick={(e) => e.stopPropagation()}
            >
            <div className="flex items-center px-4 py-4 border-b-2 border-indigo-200 dark:border-indigo-500/30 bg-gradient-to-r from-indigo-50/50 to-purple-50/50 dark:from-indigo-950/30 dark:to-purple-950/30">
              <Search size={20} className="text-indigo-500 dark:text-indigo-400 mr-3" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search courses and assignments..."
                className="flex-1 bg-transparent border-none outline-none text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none text-lg font-medium"
                autoFocus
                onFocus={(e) => e.target.select()}
              />
              <button
                onClick={() => {
                  setIsOpen(false);
                  setQuery('');
                  setResults([]);
                }}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="max-h-96 overflow-y-auto">
              {loading ? (
                <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600 mx-auto"></div>
                </div>
              ) : results.length === 0 && query ? (
                <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                  No results found
                </div>
              ) : results.length === 0 ? (
                <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                  <p className="text-sm">Start typing to search...</p>
                  <p className="text-xs mt-2">Press Ctrl+K or Cmd+K to open search</p>
                </div>
              ) : (
                <div className="py-2">
                  {results.map((result) => (
                    <button
                      key={`${result.type}-${result.id}`}
                      onClick={(e) => handleResultClick(result, e)}
                      className="w-full text-left px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                      <div className="flex items-start space-x-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          result.type === 'course'
                            ? 'bg-primary-100 dark:bg-primary-900/20'
                            : 'bg-amber-100 dark:bg-amber-900/20'
                        }`}>
                          {result.type === 'course' ? (
                            <span className="text-xs font-bold text-primary-600 dark:text-primary-400">
                              {result.title.split(' ')[1]?.charAt(0) || 'C'}
                            </span>
                          ) : (
                            <span className="text-xs">📝</span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 dark:text-white truncate">
                            {result.title}
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                            {result.subtitle}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            </div>
          </div>
        </>,
        document.body
      )}
    </div>
  );
}

