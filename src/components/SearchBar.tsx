import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Search, X, Filter, BookOpen, FileText, Calendar, StickyNote } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { semesterService, courseService, assignmentService, quickNotesService, calendarEventService } from '../services/firestore';
import { Course, Assignment, QuickNote, CalendarEvent, AssignmentType } from '../types';
import { formatDate } from '../utils/dateHelpers';

interface SearchResult {
  type: 'course' | 'assignment' | 'note' | 'event';
  id: string;
  courseId?: string;
  title: string;
  subtitle: string;
  date?: Date;
  course?: Course;
  assignment?: Assignment;
  note?: QuickNote;
  event?: CalendarEvent;
}

interface SearchFilters {
  courseId?: string;
  assignmentType?: AssignmentType;
  status?: 'all' | 'completed' | 'pending' | 'overdue';
  dateFrom?: string;
  dateTo?: string;
  searchIn: ('courses' | 'assignments' | 'notes' | 'events')[];
}

export default function SearchBar() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [courses, setCourses] = useState<Course[]>([]);
  const [filters, setFilters] = useState<SearchFilters>({
    searchIn: ['courses', 'assignments', 'notes', 'events'],
  });
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load courses for filter dropdown
  useEffect(() => {
    const loadCourses = async () => {
      if (!user) return;
      try {
        const semester = await semesterService.getActiveSemester(user.uid);
        if (semester) {
          const courseList = await courseService.getCourses(user.uid, semester.id);
          setCourses(courseList);
        }
      } catch (error) {
        console.error('Error loading courses:', error);
      }
    };
    if (isOpen) {
      loadCourses();
    }
  }, [user, isOpen]);

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
        setShowFilters(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
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
        if (filters.searchIn.includes('courses')) {
          const courseList = await courseService.getCourses(user.uid, semester.id);
          const filteredCourses = courseList.filter((course) => {
            if (filters.courseId && course.id !== filters.courseId) return false;
            return (
              course.courseCode.toLowerCase().includes(searchLower) ||
              course.courseName.toLowerCase().includes(searchLower) ||
              (course.professor && course.professor.toLowerCase().includes(searchLower))
            );
          });

          filteredCourses.forEach((course) => {
            allResults.push({
              type: 'course',
              id: course.id,
              title: course.courseCode,
              subtitle: course.courseName,
              course,
            });
          });
        }

        // Search assignments
        if (filters.searchIn.includes('assignments')) {
          const courseList = await courseService.getCourses(user.uid, semester.id);
          for (const course of courseList) {
            if (filters.courseId && course.id !== filters.courseId) continue;
            
            const assignments = await assignmentService.getAssignments(user.uid, semester.id, course.id);
            const filteredAssignments = assignments.filter((assignment) => {
              // Text search
              if (!assignment.name.toLowerCase().includes(searchLower)) return false;
              
              // Type filter
              if (filters.assignmentType && assignment.type !== filters.assignmentType) return false;
              
              // Status filter
              if (filters.status) {
                if (filters.status === 'completed' && !assignment.completedAt) return false;
                if (filters.status === 'pending' && assignment.completedAt) return false;
                if (filters.status === 'overdue') {
                  const dueDate = new Date(assignment.dueDate);
                  const now = new Date();
                  if (assignment.completedAt || dueDate >= now) return false;
                }
              }
              
              // Date range filter
              if (filters.dateFrom || filters.dateTo) {
                const dueDate = new Date(assignment.dueDate);
                if (filters.dateFrom && dueDate < new Date(filters.dateFrom)) return false;
                if (filters.dateTo && dueDate > new Date(filters.dateTo)) return false;
              }
              
              return true;
            });

            filteredAssignments.forEach((assignment) => {
              allResults.push({
                type: 'assignment',
                id: assignment.id,
                courseId: course.id,
                title: assignment.name,
                subtitle: `${course.courseCode} • ${formatDate(new Date(assignment.dueDate))}`,
                date: new Date(assignment.dueDate),
                course,
                assignment,
              });
            });
          }
        }

        // Search notes
        if (filters.searchIn.includes('notes')) {
          const notes = await quickNotesService.getNotes(user.uid);
          const filteredNotes = notes.filter((note) => {
            const contentMatch = note.content.toLowerCase().includes(searchLower);
            const tagsMatch = note.tags?.some(tag => tag.toLowerCase().includes(searchLower));
            return contentMatch || tagsMatch;
          });

          filteredNotes.forEach((note) => {
            const preview = note.content.length > 60 ? note.content.substring(0, 60) + '...' : note.content;
            allResults.push({
              type: 'note',
              id: note.id,
              title: preview,
              subtitle: note.tags && note.tags.length > 0 ? `Tags: ${note.tags.join(', ')}` : 'Quick Note',
              date: note.updatedAt,
              note,
            });
          });
        }

        // Search events
        if (filters.searchIn.includes('events')) {
          const events = await calendarEventService.getEvents(user.uid, semester.id);
          const filteredEvents = events.filter((event) => {
            if (!event.title.toLowerCase().includes(searchLower)) return false;
            
            // Date range filter
            if (filters.dateFrom || filters.dateTo) {
              const eventDate = new Date(event.date);
              if (filters.dateFrom && eventDate < new Date(filters.dateFrom)) return false;
              if (filters.dateTo && eventDate > new Date(filters.dateTo)) return false;
            }
            
            return true;
          });

          filteredEvents.forEach((event) => {
            const dateStr = formatDate(new Date(event.date));
            const timeStr = event.startTime || event.endTime 
              ? `${event.startTime || ''}${event.startTime && event.endTime ? ' - ' : ''}${event.endTime || ''}`
              : '';
            allResults.push({
              type: 'event',
              id: event.id,
              title: event.title,
              subtitle: `${dateStr}${timeStr ? ` • ${timeStr}` : ''}`,
              date: new Date(event.date),
              event,
            });
          });
        }

        // Sort results by relevance (exact matches first, then by date)
        allResults.sort((a, b) => {
          const aExact = a.title.toLowerCase() === query.toLowerCase();
          const bExact = b.title.toLowerCase() === query.toLowerCase();
          if (aExact && !bExact) return -1;
          if (!aExact && bExact) return 1;
          if (a.date && b.date) {
            return b.date.getTime() - a.date.getTime();
          }
          return 0;
        });

        setResults(allResults.slice(0, 20)); // Limit to 20 results
      } catch (error) {
        console.error('Error searching:', error);
      } finally {
        setLoading(false);
      }
    };

    const timeoutId = setTimeout(search, 300); // Debounce
    return () => clearTimeout(timeoutId);
  }, [query, user, filters]);

  const handleResultClick = (result: SearchResult, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    let path = '';
    if (result.type === 'course') {
      path = `/courses/${result.id}`;
    } else if (result.type === 'assignment' && result.courseId) {
      path = `/courses/${result.courseId}`;
    } else if (result.type === 'note' || result.type === 'event') {
      // Notes and events don't have dedicated pages, so we'll just close
      setIsOpen(false);
      setQuery('');
      setResults([]);
      return;
    }
    
    setIsOpen(false);
    setQuery('');
    setResults([]);
    setShowFilters(false);
    
    if (path) {
      setTimeout(() => {
        navigate(path);
      }, 100);
    }
  };

  const groupedResults = results.reduce((acc, result) => {
    if (!acc[result.type]) {
      acc[result.type] = [];
    }
    acc[result.type].push(result);
    return acc;
  }, {} as Record<string, SearchResult[]>);

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'course': return 'Courses';
      case 'assignment': return 'Assignments';
      case 'note': return 'Notes';
      case 'event': return 'Events';
      default: return type;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'course': return BookOpen;
      case 'assignment': return FileText;
      case 'note': return StickyNote;
      case 'event': return Calendar;
      default: return Search;
    }
  };

  const toggleSearchIn = (type: 'courses' | 'assignments' | 'notes' | 'events') => {
    setFilters(prev => ({
      ...prev,
      searchIn: prev.searchIn.includes(type)
        ? prev.searchIn.filter(t => t !== type)
        : [...prev.searchIn, type]
    }));
  };

  const resetFilters = () => {
    setFilters({
      searchIn: ['courses', 'assignments', 'notes', 'events'],
    });
  };

  return (
    <div ref={searchRef} className="relative">
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center justify-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 md:px-4 py-2 h-9 sm:h-10 bg-white/60 dark:bg-white/5 backdrop-blur-xl border border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-white dark:hover:bg-white/10 hover:border-indigo-300 dark:hover:border-indigo-500/30 transition-all font-semibold text-sm shadow-sm touch-manipulation"
        style={{ minWidth: '36px', minHeight: '36px' }}
        title="Search (Ctrl+K or Cmd+K)"
      >
        <Search size={16} className="sm:w-[18px] sm:h-[18px]" />
        <span className="hidden md:inline">Search...</span>
        <span className="hidden lg:inline text-xs text-gray-500 dark:text-gray-400 px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800/50 rounded border border-gray-200 dark:border-white/10">⌘K</span>
      </button>

      {isOpen && createPortal(
        <>
          <div 
            className="fixed inset-0 bg-black/70 z-[9998]"
            style={{ backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setIsOpen(false);
                setQuery('');
                setResults([]);
                setShowFilters(false);
              }
            }}
          />
          <div className="fixed inset-0 z-[9999] flex items-start justify-center pt-[10vh] pointer-events-none p-4">
            <div 
              className="w-full max-w-3xl bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border-2 border-indigo-300 dark:border-indigo-500/50 overflow-hidden ring-4 ring-indigo-200/50 dark:ring-indigo-500/20 pointer-events-auto max-h-[85vh] flex flex-col" 
              onClick={(e) => e.stopPropagation()}
            >
              {/* Search Input */}
              <div className="flex items-center px-4 py-4 border-b-2 border-indigo-200 dark:border-indigo-500/30 bg-gradient-to-r from-indigo-50/50 to-purple-50/50 dark:from-indigo-950/30 dark:to-purple-950/30">
                <Search size={20} className="text-indigo-500 dark:text-indigo-400 mr-3 flex-shrink-0" />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search courses, assignments, notes, events..."
                  className="flex-1 bg-transparent border-none outline-none text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none text-base sm:text-lg font-medium"
                  autoFocus
                  onFocus={(e) => e.target.select()}
                />
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`mr-2 p-2 rounded-lg transition-colors ${
                    showFilters 
                      ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400' 
                      : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                  title="Toggle filters"
                >
                  <Filter size={18} />
                </button>
                <button
                  onClick={() => {
                    setIsOpen(false);
                    setQuery('');
                    setResults([]);
                    setShowFilters(false);
                  }}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Filters Panel */}
              {showFilters && (
                <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Search In:</span>
                    <button
                      onClick={resetFilters}
                      className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
                    >
                      Reset
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(['courses', 'assignments', 'notes', 'events'] as const).map((type) => (
                      <button
                        key={type}
                        onClick={() => toggleSearchIn(type)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                          filters.searchIn.includes(type)
                            ? 'bg-indigo-600 text-white'
                            : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                        }`}
                      >
                        {getTypeLabel(type)}
                      </button>
                    ))}
                  </div>

                  {filters.searchIn.includes('assignments') && (
                    <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-200 dark:border-gray-700">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Course
                        </label>
                        <select
                          value={filters.courseId || ''}
                          onChange={(e) => setFilters(prev => ({ ...prev, courseId: e.target.value || undefined }))}
                          className="w-full px-2 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        >
                          <option value="">All Courses</option>
                          {courses.map(course => (
                            <option key={course.id} value={course.id}>{course.courseCode}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Status
                        </label>
                        <select
                          value={filters.status || 'all'}
                          onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value as any || undefined }))}
                          className="w-full px-2 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        >
                          <option value="all">All</option>
                          <option value="pending">Pending</option>
                          <option value="completed">Completed</option>
                          <option value="overdue">Overdue</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Type
                        </label>
                        <select
                          value={filters.assignmentType || ''}
                          onChange={(e) => setFilters(prev => ({ ...prev, assignmentType: e.target.value as AssignmentType || undefined }))}
                          className="w-full px-2 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        >
                          <option value="">All Types</option>
                          <option value="Assignment">Assignment</option>
                          <option value="Quiz">Quiz</option>
                          <option value="Exam">Exam</option>
                          <option value="Project">Project</option>
                          <option value="Lab">Lab</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                    </div>
                  )}

                  {(filters.searchIn.includes('assignments') || filters.searchIn.includes('events') || filters.searchIn.includes('notes')) && (
                    <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-200 dark:border-gray-700">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Date From
                        </label>
                        <input
                          type="date"
                          value={filters.dateFrom || ''}
                          onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value || undefined }))}
                          className="w-full px-2 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          style={{ 
                            minHeight: '44px',
                            height: '44px',
                            minWidth: '100%',
                            width: '100%',
                            maxWidth: '100%',
                            boxSizing: 'border-box',
                            WebkitAppearance: 'none',
                            appearance: 'none',
                            fontSize: '16px'
                          }}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Date To
                        </label>
                        <input
                          type="date"
                          value={filters.dateTo || ''}
                          onChange={(e) => setFilters(prev => ({ ...prev, dateTo: e.target.value || undefined }))}
                          className="w-full px-2 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          style={{ 
                            minHeight: '44px',
                            height: '44px',
                            minWidth: '100%',
                            width: '100%',
                            maxWidth: '100%',
                            boxSizing: 'border-box',
                            WebkitAppearance: 'none',
                            appearance: 'none',
                            fontSize: '16px'
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Results */}
              <div className="flex-1 overflow-y-auto max-h-[60vh]">
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
                    <p className="text-xs mt-2 hidden sm:block">Press Ctrl+K or Cmd+K to open search</p>
                  </div>
                ) : (
                  <div className="py-2">
                    {Object.entries(groupedResults).map(([type, typeResults]) => {
                      const Icon = getTypeIcon(type);
                      return (
                        <div key={type} className="mb-4">
                          <div className="px-4 py-2 flex items-center gap-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                            <Icon size={14} />
                            {getTypeLabel(type)} ({typeResults.length})
                          </div>
                          {typeResults.map((result) => (
                            <button
                              key={`${result.type}-${result.id}`}
                              onClick={(e) => handleResultClick(result, e)}
                              className="w-full text-left px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                            >
                              <div className="flex items-start space-x-3">
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                                  result.type === 'course'
                                    ? 'bg-indigo-100 dark:bg-indigo-900/20'
                                    : result.type === 'assignment'
                                    ? 'bg-amber-100 dark:bg-amber-900/20'
                                    : result.type === 'note'
                                    ? 'bg-green-100 dark:bg-green-900/20'
                                    : 'bg-purple-100 dark:bg-purple-900/20'
                                }`}>
                                  {result.type === 'course' ? (
                                    <BookOpen size={16} className="text-indigo-600 dark:text-indigo-400" />
                                  ) : result.type === 'assignment' ? (
                                    <FileText size={16} className="text-amber-600 dark:text-amber-400" />
                                  ) : result.type === 'note' ? (
                                    <StickyNote size={16} className="text-green-600 dark:text-green-400" />
                                  ) : (
                                    <Calendar size={16} className="text-purple-600 dark:text-purple-400" />
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
                      );
                    })}
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
