import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Plus, Trash2, Calendar, X, Edit2, Clock } from 'lucide-react';
import { formatDate, formatTime, isOverdue } from '../../utils/dateHelpers';
import { Assignment, Course, CalendarEvent, Semester } from '../../types';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, startOfDay } from 'date-fns';
import ModalContainer from '../ModalContainer';
import { useAuth } from '../../hooks/useAuth';
import { calendarEventService, semesterService } from '../../services/firestore';

interface CalendarWidgetProps {
  size: 'small' | 'medium' | 'large';
  assignments: Assignment[];
  courses: Course[];
  onDateClick?: (date: Date, assignments: Assignment[]) => void;
}

export default function CalendarWidget({ size, assignments, courses, onDateClick: _onDateClick }: CalendarWidgetProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const { user } = useAuth();
  const navigate = useNavigate();
  const [semester, setSemester] = useState<Semester | null>(null);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [newEventTitle, setNewEventTitle] = useState('');
  const [newEventStart, setNewEventStart] = useState('');
  const [newEventEnd, setNewEventEnd] = useState('');
  const [newEventNotes, setNewEventNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [showAddEventForm, setShowAddEventForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const firstDayOfMonth = monthStart.getDay();
  const daysBeforeMonth = Array.from({ length: firstDayOfMonth }, (_, i) => i);

  const getAssignmentsForDate = (date: Date) => {
    return assignments.filter((assignment) => {
      if (assignment.completedAt) return false;
      const dueDate = new Date(assignment.dueDate);
      return isSameDay(dueDate, date);
    });
  };

  // Load semester and events, and cleanup old events
  useEffect(() => {
    const load = async () => {
      if (!user) return;
      try {
        setLoadingEvents(true);
        const activeSemester = await semesterService.getActiveSemester(user.uid);
        setSemester(activeSemester);
        if (activeSemester) {
          // Check if we need to cleanup old events (new month started)
          const lastCleanupKey = `last-event-cleanup-${user.uid}-${activeSemester.id}`;
          const lastCleanup = localStorage.getItem(lastCleanupKey);
          const now = new Date();
          const currentMonth = `${now.getFullYear()}-${now.getMonth()}`;
          
          if (lastCleanup !== currentMonth) {
            // New month - cleanup old events
            try {
              const deletedCount = await calendarEventService.cleanupOldEvents(user.uid, activeSemester.id);
              if (deletedCount > 0) {
                console.log(`Cleaned up ${deletedCount} old events from previous months`);
              }
              localStorage.setItem(lastCleanupKey, currentMonth);
            } catch (error) {
              console.error('Error cleaning up old events:', error);
            }
          }
          
          const evts = await calendarEventService.getEvents(user.uid, activeSemester.id);
          setEvents(evts);
        } else {
          setEvents([]);
        }
      } catch (error) {
        console.error('Error loading calendar events:', error);
      } finally {
        setLoadingEvents(false);
      }
    };
    load();
  }, [user]);

  const eventsByDate = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {};
    events.forEach((evt) => {
      if (!map[evt.date]) map[evt.date] = [];
      map[evt.date].push(evt);
    });
    return map;
  }, [events]);

  const getEventsForDate = (date: Date) => {
    const key = format(date, 'yyyy-MM-dd');
    return eventsByDate[key] || [];
  };

  const isDatePast = (date: Date) => {
    const today = startOfDay(new Date());
    const eventDate = startOfDay(date);
    // Only mark as past if the event date is strictly before today (not today or future)
    return eventDate.getTime() < today.getTime();
  };

  // Check if an event is over (considering end time if provided)
  const isEventOver = (event: CalendarEvent) => {
    // Parse the date string (format: "YYYY-MM-DD") - use local timezone
    const [year, month, day] = event.date.split('-').map(Number);
    // Create date in local timezone to avoid UTC issues
    const eventDate = new Date(year, month - 1, day); // month is 0-indexed, local timezone
    const today = new Date();
    const todayStart = startOfDay(today);
    const eventDateStart = startOfDay(eventDate);
    
    // If event date is before today, it's definitely over
    if (eventDateStart.getTime() < todayStart.getTime()) {
      return true;
    }
    
    // If event date is today and has an end time, check if current time is past end time
    if (eventDateStart.getTime() === todayStart.getTime() && event.endTime) {
      const [hours, minutes] = event.endTime.split(':').map(Number);
      // Create end datetime in local timezone
      const endDateTime = new Date(year, month - 1, day, hours, minutes, 0, 0);
      
      // Only mark as over if current time is past the end time
      return today.getTime() > endDateTime.getTime();
    }
    
    // If event is today but no end time, it's NOT over
    // If event is in the future, it's NOT over
    return false;
  };

  const handleDayClick = (day: Date) => {
    setSelectedDate(day);
    setShowAddEventForm(false);
    setEditingEvent(null);
    setNewEventTitle('');
    setNewEventStart('');
    setNewEventEnd('');
    setNewEventNotes('');
  };

  const handleCreateEvent = async () => {
    if (!user || !semester || !selectedDate) return;
    if (!newEventTitle.trim()) return;
    try {
      setSaving(true);
      const payload = {
        date: format(selectedDate, 'yyyy-MM-dd'),
        title: newEventTitle.trim(),
        startTime: newEventStart || undefined,
        endTime: newEventEnd || undefined,
        notes: newEventNotes || undefined,
      };
      
      if (editingEvent) {
        // Update existing event
        await calendarEventService.updateEvent(user.uid, semester.id, editingEvent.id, payload);
        setEvents((prev) => prev.map((e) => 
          e.id === editingEvent.id 
            ? { ...e, ...payload, updatedAt: new Date() }
            : e
        ));
      } else {
        // Create new event
        const id = await calendarEventService.createEvent(user.uid, semester.id, payload);
        setEvents((prev) => [...prev, { id, userId: user.uid, semesterId: semester.id, ...payload, createdAt: new Date(), updatedAt: new Date() }]);
      }
      
      setNewEventTitle('');
      setNewEventStart('');
      setNewEventEnd('');
      setNewEventNotes('');
      setShowAddEventForm(false);
      setEditingEvent(null);
    } catch (error) {
      console.error('Error saving event:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteEvent = async (evt: CalendarEvent) => {
    if (!user || !semester) return;
    try {
      await calendarEventService.deleteEvent(user.uid, semester.id, evt.id);
      setEvents((prev) => prev.filter((e) => e.id !== evt.id));
    } catch (error) {
      console.error('Error deleting event:', error);
    }
  };

  const handlePrevMonth = () => {
    setCurrentDate(subMonths(currentDate, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(addMonths(currentDate, 1));
  };

  const calendarHeaderSmall = (
    <div className="flex items-center justify-between">
      <button
        onClick={handlePrevMonth}
        className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-xl transition-colors"
      >
        <ChevronLeft className="w-5 h-5 text-gray-500 dark:text-gray-400" />
      </button>
      <div className="text-sm font-bold text-gray-900 dark:text-white">
        {format(currentDate, 'MMM yyyy')}
      </div>
      <button
        onClick={handleNextMonth}
        className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-xl transition-colors"
      >
        <ChevronRight className="w-5 h-5 text-gray-500 dark:text-gray-400" />
      </button>
    </div>
  );

  const calendarHeaderMd = (
    <div className="flex items-center justify-between">
      <button
        onClick={handlePrevMonth}
        className="p-2.5 hover:bg-gray-100 dark:hover:bg-white/5 rounded-2xl transition-colors"
      >
        <ChevronLeft className="w-6 h-6 text-gray-500 dark:text-gray-400" />
      </button>
      <div className="flex items-center gap-3">
        <CalendarIcon className="w-6 h-6 text-indigo-500 dark:text-indigo-400" />
        <div className="text-lg font-bold text-gray-900 dark:text-white">
          {format(currentDate, 'MMMM yyyy')}
        </div>
      </div>
      <button
        onClick={handleNextMonth}
        className="p-2.5 hover:bg-gray-100 dark:hover:bg-white/5 rounded-2xl transition-colors"
      >
        <ChevronRight className="w-6 h-6 text-gray-500 dark:text-gray-400" />
      </button>
    </div>
  );

  const calendarGridSmall = (
    <div className="grid grid-cols-7 gap-2 text-xs">
      {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, idx) => (
        <div key={idx} className="text-center text-gray-400 dark:text-gray-500 font-bold py-2">
          {day}
        </div>
      ))}
      {daysBeforeMonth.map((_, idx) => (
        <div key={`empty-${idx}`} className="aspect-square" />
      ))}
      {daysInMonth.map((day) => {
        const dayAssignments = getAssignmentsForDate(day);
        const dayEvents = getEventsForDate(day);
        const isToday = isSameDay(day, new Date());
        const hasItems = dayAssignments.length > 0 || dayEvents.length > 0;
        const hasPastItems = (
          dayAssignments.some(a => isDatePast(new Date(a.dueDate))) ||
          dayEvents.some(e => isEventOver(e))
        );
        return (
          <button
            key={day.toISOString()}
            onClick={() => handleDayClick(day)}
            className={`aspect-square text-xs rounded-2xl transition-all font-bold ${
              isToday
                ? 'bg-gradient-to-br from-indigo-500 to-purple-500 text-white shadow-lg'
                : hasItems
                ? hasPastItems
                  ? 'bg-gray-300 dark:bg-gray-600/60 text-gray-600 dark:text-gray-400 hover:bg-gray-400 dark:hover:bg-gray-600/80 opacity-70'
                  : 'bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-200 dark:hover:bg-indigo-500/30'
                : 'hover:bg-gray-100 dark:hover:bg-white/5 text-gray-600 dark:text-gray-400'
            }`}
            title={
              hasItems
                ? `${dayAssignments.length} assignment(s), ${dayEvents.length} event(s)`
                : ''
            }
          >
            {format(day, 'd')}
            {hasItems && (
              <div className={`w-1.5 h-1.5 rounded-full mx-auto mt-1 ${
                hasPastItems ? 'bg-gray-400 dark:bg-gray-500' : 'bg-current'
              }`} />
            )}
          </button>
        );
      })}
    </div>
  );

  const calendarGridMd = (
    <div className="grid grid-cols-7 gap-2.5 text-xs">
      {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, idx) => (
        <div key={idx} className="text-center text-gray-400 dark:text-gray-500 font-bold py-3">
          {day}
        </div>
      ))}
      {daysBeforeMonth.map((_, idx) => (
        <div key={`empty-${idx}`} className="aspect-square" />
      ))}
      {daysInMonth.map((day) => {
        const dayAssignments = getAssignmentsForDate(day);
        const dayEvents = getEventsForDate(day);
        const isToday = isSameDay(day, new Date());
        const hasItems = dayAssignments.length > 0 || dayEvents.length > 0;
        const hasPastItems = (
          dayAssignments.some(a => isDatePast(new Date(a.dueDate))) ||
          dayEvents.some(e => isEventOver(e))
        );
        return (
          <button
            key={day.toISOString()}
            onClick={() => handleDayClick(day)}
            className={`aspect-square text-sm rounded-2xl transition-all font-bold ${
              isToday
                ? 'bg-gradient-to-br from-indigo-500 to-purple-500 text-white ring-2 ring-indigo-300 dark:ring-indigo-700 shadow-lg'
                : hasItems
                ? hasPastItems
                  ? 'bg-gray-300 dark:bg-gray-600/60 text-gray-600 dark:text-gray-400 hover:bg-gray-400 dark:hover:bg-gray-600/80 border border-gray-400 dark:border-gray-500 opacity-70'
                  : 'bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-200 dark:hover:bg-indigo-500/30 border border-indigo-200 dark:border-indigo-500/30'
                : 'hover:bg-gray-100 dark:hover:bg-white/5 text-gray-600 dark:text-gray-400'
            }`}
            title={
              hasItems
                ? `${dayAssignments.length} assignment${dayAssignments.length !== 1 ? 's' : ''}, ${dayEvents.length} event${dayEvents.length !== 1 ? 's' : ''}`
                : format(day, 'MMMM d, yyyy')
            }
          >
            <div>{format(day, 'd')}</div>
            {hasItems && (
              <div className={`text-[10px] mt-1 font-bold ${
                hasPastItems ? 'text-gray-400 dark:text-gray-500' : ''
              }`}>
                {hasItems ? '•' : ''}
              </div>
            )}
          </button>
        );
      })}
    </div>
  );

  const bodyLargeUpcoming = (
    <div className="pt-5 border-t border-gray-200 dark:border-white/10">
      <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-4">
        Upcoming This Month
      </div>
      <div className="space-y-2.5 max-h-32 overflow-y-auto">
        {assignments
          .filter((a) => {
            if (a.completedAt) return false;
            const dueDate = new Date(a.dueDate);
            return isSameMonth(dueDate, currentDate) && dueDate >= new Date();
          })
          .slice(0, 5)
          .map((assignment) => {
            const course = courses.find((c) => c.id === assignment.courseId);
            return (
              <div
                key={assignment.id}
                className="flex items-center gap-3 text-xs p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-500/10"
              >
                <div
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: course?.color || '#6366F1' }}
                />
                <span className="text-gray-900 dark:text-white font-bold flex-1 truncate">{assignment.name}</span>
                <span className="text-gray-500 dark:text-gray-400 font-semibold">{format(new Date(assignment.dueDate), 'MMM d')}</span>
              </div>
            );
          })}
      </div>
    </div>
  );

  const calendarBody = (
    <>
      <div className={size === 'small' ? 'space-y-4' : 'space-y-5'}>
        {size === 'small' ? calendarHeaderSmall : calendarHeaderMd}
        {size === 'small' ? calendarGridSmall : calendarGridMd}
        {size === 'large' && bodyLargeUpcoming}
      </div>
    </>
  );

  return (
    <>
      {calendarBody}

      {/* Event Modal */}
      {selectedDate && (
        <ModalContainer onClose={() => setSelectedDate(null)} backdropClassName="bg-black bg-opacity-50">
          <div 
            className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {format(selectedDate, 'EEEE, MMM d, yyyy')}
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {getAssignmentsForDate(selectedDate).length > 0 && getEventsForDate(selectedDate).length > 0
                    ? `${getAssignmentsForDate(selectedDate).length} assignment${getAssignmentsForDate(selectedDate).length !== 1 ? 's' : ''}, ${getEventsForDate(selectedDate).length} event${getEventsForDate(selectedDate).length !== 1 ? 's' : ''}`
                    : getAssignmentsForDate(selectedDate).length > 0
                    ? `${getAssignmentsForDate(selectedDate).length} assignment${getAssignmentsForDate(selectedDate).length !== 1 ? 's' : ''}`
                    : getEventsForDate(selectedDate).length > 0
                    ? `${getEventsForDate(selectedDate).length} event${getEventsForDate(selectedDate).length !== 1 ? 's' : ''}`
                    : 'No items'}
                </p>
              </div>
              <button
                onClick={() => setSelectedDate(null)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 flex-shrink-0"
              >
                <X size={24} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 scrollbar-hide space-y-4">
              {loadingEvents && (
                <div className="text-sm text-gray-500 dark:text-gray-400">Loading events...</div>
              )}

              {!showAddEventForm && (
                <>
                  {/* Assignments Section */}
                  {getAssignmentsForDate(selectedDate).length > 0 && (
                    <div className="space-y-4">
                      {getAssignmentsForDate(selectedDate).map((assignment) => {
                        const course = courses.find((c) => c.id === assignment.courseId);
                        const isOverdueAssignment = !assignment.completedAt && isOverdue(new Date(assignment.dueDate));
                        const isPastAssignment = !assignment.completedAt && isDatePast(new Date(assignment.dueDate)) && !isOverdueAssignment;
                        return (
                          <div
                            key={assignment.id}
                            className={`bg-white dark:bg-gray-800 rounded-xl border ${
                              assignment.completedAt
                                ? 'border-gray-200 dark:border-gray-700 opacity-60'
                                : isOverdueAssignment
                                ? 'border-red-200 dark:border-red-800'
                                : isPastAssignment
                                ? 'border-gray-300 dark:border-gray-600 opacity-60'
                                : 'border-gray-200 dark:border-gray-700'
                            } hover:border-primary-300 dark:hover:border-primary-600 hover:shadow-md transition-all cursor-pointer`}
                            onClick={() => {
                              setSelectedDate(null);
                              if (course && semester) {
                                navigate(`/courses/${course.id}`);
                              }
                            }}
                          >
                            <div className="p-3">
                              <div className="flex items-center gap-3">
                                <div
                                  className="w-3 h-3 rounded-full flex-shrink-0"
                                  style={{ backgroundColor: course?.color || '#6366F1' }}
                                />
                                
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1.5">
                                    <h3
                                      className={`text-base font-semibold ${
                                        assignment.completedAt
                                          ? 'text-gray-500 dark:text-gray-400 line-through'
                                          : isPastAssignment
                                          ? 'text-gray-500 dark:text-gray-400 line-through'
                                          : 'text-gray-900 dark:text-white'
                                      }`}
                                    >
                                      {assignment.name}
                                    </h3>
                                    <span className={`text-xs font-medium ${
                                      isPastAssignment
                                        ? 'text-gray-400 dark:text-gray-500'
                                        : 'text-primary-600 dark:text-primary-400'
                                    }`}>
                                      {course?.courseCode || 'Course'}
                                    </span>
                                  </div>

                                  <div className="flex flex-wrap items-center gap-2 text-sm">
                                    <span className={`flex items-center ${
                                      isPastAssignment
                                        ? 'text-gray-400 dark:text-gray-500'
                                        : 'text-gray-600 dark:text-gray-400'
                                    }`}>
                                      <Calendar size={12} className="mr-1.5" />
                                      {formatDate(new Date(assignment.dueDate))} at {formatTime(new Date(assignment.dueDate))}
                                    </span>
                                    <span className="px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium text-xs">
                                      {assignment.type}
                                    </span>
                                    {assignment.gradeWeight && (
                                      <span className="text-gray-600 dark:text-gray-400 text-xs">
                                        {assignment.gradeWeight}% of course grade
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Events Section */}
                  {getEventsForDate(selectedDate).length > 0 && (
                    <div className={`space-y-4 ${getAssignmentsForDate(selectedDate).length > 0 ? 'mt-6' : ''}`}>
                      {getEventsForDate(selectedDate).map((evt) => {
                        const isPastEvent = isEventOver(evt);
                        return (
                        <div
                          key={evt.id}
                          className={`bg-white dark:bg-gray-800 rounded-xl border hover:shadow-md transition-all ${
                            isPastEvent
                              ? 'border-gray-300 dark:border-gray-600 opacity-60'
                              : 'border-gray-200 dark:border-gray-700 hover:border-primary-300 dark:hover:border-primary-600'
                          }`}
                        >
                          <div className="p-3">
                            <div className="flex items-center gap-3">
                              <div className={`w-3 h-3 rounded-full flex-shrink-0 ${
                                isPastEvent ? 'bg-gray-400 dark:bg-gray-500' : 'bg-purple-500'
                              }`} />
                              
                              <div className="flex-1 min-w-0">
                                <h3 className={`text-base font-semibold mb-1.5 ${
                                  isPastEvent
                                    ? 'text-gray-500 dark:text-gray-400 line-through'
                                    : 'text-gray-900 dark:text-white'
                                }`}>
                                  {evt.title}
                                </h3>

                                <div className="flex flex-wrap items-center gap-2 text-sm">
                                  {(evt.startTime || evt.endTime) && (
                                    <span className={`flex items-center ${
                                      isPastEvent ? 'text-gray-400 dark:text-gray-500' : 'text-gray-600 dark:text-gray-400'
                                    }`}>
                                      <Clock size={12} className="mr-1.5" />
                                      {evt.startTime || ''}{evt.startTime && evt.endTime ? ' - ' : ''}{evt.endTime || ''}
                                    </span>
                                  )}
                                  {evt.notes && (
                                    <span className={`text-xs ${
                                      isPastEvent ? 'text-gray-400 dark:text-gray-500' : 'text-gray-600 dark:text-gray-400'
                                    }`}>
                                      {evt.notes}
                                    </span>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center gap-1 flex-shrink-0">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingEvent(evt);
                                    setNewEventTitle(evt.title);
                                    setNewEventStart(evt.startTime || '');
                                    setNewEventEnd(evt.endTime || '');
                                    setNewEventNotes(evt.notes || '');
                                    setShowAddEventForm(true);
                                  }}
                                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 transition-colors"
                                  aria-label="Edit event"
                                >
                                  <Edit2 size={16} />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteEvent(evt);
                                  }}
                                  className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 text-red-500 transition-colors"
                                  aria-label="Delete event"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Empty State */}
                  {getAssignmentsForDate(selectedDate).length === 0 && getEventsForDate(selectedDate).length === 0 && !loadingEvents && (
                    <div className="text-center py-8">
                      <div className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                        No events or assignments on this day.
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-500 mb-4">
                        Add an event to get started!
                      </div>
                    </div>
                  )}

                  {/* Add Event Button */}
                  <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                    <button
                      onClick={() => setShowAddEventForm(true)}
                      className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-semibold hover:opacity-90 transition"
                    >
                      <Plus className="w-4 h-4" />
                      Add Event
                    </button>
                  </div>
                </>
              )}

              {/* Add Event Form */}
              {showAddEventForm && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
                      {editingEvent ? (
                        <>
                          <Edit2 className="w-4 h-4" />
                          Edit Event
                        </>
                      ) : (
                        <>
                          <Plus className="w-4 h-4" />
                          Add Event
                        </>
                      )}
                    </div>
                    <button
                      onClick={() => {
                        setShowAddEventForm(false);
                        setEditingEvent(null);
                        setNewEventTitle('');
                        setNewEventStart('');
                        setNewEventEnd('');
                        setNewEventNotes('');
                      }}
                      className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                    >
                      Cancel
                    </button>
                  </div>
                  <div className="space-y-3">
                    <input
                      type="text"
                      placeholder="Event title"
                      value={newEventTitle}
                      onChange={(e) => setNewEventTitle(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs text-gray-500 dark:text-gray-400">Start time</label>
                        <input
                          type="time"
                          value={newEventStart}
                          onChange={(e) => setNewEventStart(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
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
                      <div className="space-y-1">
                        <label className="text-xs text-gray-500 dark:text-gray-400">End time</label>
                        <input
                          type="time"
                          value={newEventEnd}
                          onChange={(e) => setNewEventEnd(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
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
                    <textarea
                      placeholder="Notes (optional)"
                      value={newEventNotes}
                      onChange={(e) => setNewEventNotes(e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                    <button
                      onClick={handleCreateEvent}
                      disabled={saving || !newEventTitle.trim() || !semester}
                      className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-semibold hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {saving ? 'Saving...' : editingEvent ? 'Save Changes' : 'Save Event'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </ModalContainer>
      )}
    </>
  );
}
