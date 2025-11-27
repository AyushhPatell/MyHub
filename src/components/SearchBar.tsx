import { useState, useEffect, useRef } from 'react';
import { Search, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { semesterService, courseService, assignmentService } from '../services/firestore';
import { Course, Assignment } from '../types';

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
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setQuery('');
        setResults([]);
      }
    };

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

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
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

  const handleResultClick = (result: SearchResult) => {
    if (result.type === 'course') {
      navigate(`/courses/${result.id}`);
    } else if (result.courseId) {
      navigate(`/courses/${result.courseId}`);
    }
    setIsOpen(false);
    setQuery('');
    setResults([]);
  };

  return (
    <div ref={searchRef} className="relative">
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center justify-center space-x-2 px-4 py-2 h-10 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 hover:border-gray-400 dark:hover:border-gray-500 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 shadow-sm"
        title="Search (Ctrl+K or Cmd+K)"
      >
        <Search size={18} />
        <span className="hidden md:inline text-sm">Search...</span>
        <span className="hidden lg:inline text-xs text-gray-500 dark:text-gray-400 px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded border border-gray-300 dark:border-gray-600">⌘K</span>
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 bg-black bg-opacity-50 z-[100]" onClick={() => setIsOpen(false)} />
          <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl mx-4 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 z-[101] overflow-hidden">
            <div className="flex items-center px-4 py-3 border-b border-gray-200 dark:border-gray-700">
              <Search size={18} className="text-gray-400 mr-3" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search courses and assignments..."
                className="flex-1 bg-transparent border-none outline-none text-gray-900 dark:text-white placeholder-gray-400"
                autoFocus
              />
              <button
                onClick={() => {
                  setIsOpen(false);
                  setQuery('');
                  setResults([]);
                }}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
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
                      onClick={() => handleResultClick(result)}
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
        </>
      )}
    </div>
  );
}

