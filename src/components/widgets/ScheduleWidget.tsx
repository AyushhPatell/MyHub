import { useState, useEffect } from 'react';
import { Calendar } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { semesterService, courseService, scheduleService } from '../../services/firestore';
import { Course, ScheduleBlock, DayOfWeek } from '../../types';
import ModalContainer from '../ModalContainer';
import { X } from 'lucide-react';

interface ScheduleWidgetProps {
  size: 'small' | 'medium' | 'large';
}

// Compact time slots - 7am to 9pm in 1-hour intervals for widget
const COMPACT_TIME_SLOTS = Array.from({ length: 15 }, (_, i) => 7 + i); // 7am to 9pm
const DAYS_OF_WEEK: DayOfWeek[] = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAY_ABBREVIATIONS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const formatTime = (hour: number): string => {
  const h = Math.floor(hour);
  const period = h >= 12 ? 'PM' : 'AM';
  const displayHour = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return `${displayHour} ${period}`;
};

const timeToMinutes = (time: string): number => {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

// Read-only details modal for widget
interface ScheduleBlockDetailsModalProps {
  course: Course | undefined;
  blocks: ScheduleBlock[];
  onClose: () => void;
}

function ScheduleBlockDetailsModal({ course, blocks, onClose }: ScheduleBlockDetailsModalProps) {
  const firstBlock = blocks[0];
  if (!firstBlock) return null;

  return (
    <ModalContainer onClose={onClose} backdropClassName="bg-black/70 backdrop-blur-md">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto scrollbar-hide">
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            {course?.courseCode || firstBlock.courseNumber || firstBlock.title || 'Course'} {course?.courseName || firstBlock.title ? `- ${course?.courseName || firstBlock.title}` : ''}
          </h2>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Course Info */}
          <div>
            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2 block">
              Course Information
            </label>
            <div className="space-y-2">
              <div className="flex items-start justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Course</span>
                <span className="text-sm font-semibold text-gray-900 dark:text-white text-right">
                  {course?.courseCode || firstBlock.courseNumber || 'N/A'}
                </span>
              </div>
              <div className="flex items-start justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Title</span>
                <span className="text-sm font-semibold text-gray-900 dark:text-white text-right">
                  {course?.courseName || firstBlock.title || 'N/A'}
                </span>
              </div>
              {firstBlock.associatedTerm && (
                <div className="flex items-start justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                  <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Associated Term</span>
                  <span className="text-sm font-semibold text-gray-900 dark:text-white text-right">
                    {firstBlock.associatedTerm}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Meeting Times */}
          <div>
            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2 block">
              Meeting Times
            </label>
            <div className="space-y-4">
              {blocks.map((block, idx) => (
                <div key={block.id || idx} className="bg-gray-50 dark:bg-gray-700/30 rounded-lg p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                      {block.type}
                    </span>
                    {block.sectionNumber && (
                      <span className="text-xs text-gray-600 dark:text-gray-400">
                        Section {block.sectionNumber}
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">Day:</span>{' '}
                      <span className="font-semibold text-gray-900 dark:text-white">{block.dayOfWeek}</span>
                    </div>
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">Time:</span>{' '}
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {block.startTime} - {block.endTime}
                      </span>
                    </div>
                    {block.location?.building && (
                      <div className="col-span-2">
                        <span className="text-gray-500 dark:text-gray-400">Location:</span>{' '}
                        <span className="font-semibold text-gray-900 dark:text-white">
                          {block.location.building}
                          {block.location.room && `, Room ${block.location.room}`}
                        </span>
                      </div>
                    )}
                    {block.instructorName && (
                      <div className="col-span-2">
                        <span className="text-gray-500 dark:text-gray-400">Instructor:</span>{' '}
                        <span className="font-semibold text-gray-900 dark:text-white">{block.instructorName}</span>
                      </div>
                    )}
                    {block.crn && (
                      <div className="col-span-2">
                        <span className="text-gray-500 dark:text-gray-400">CRN:</span>{' '}
                        <span className="font-semibold text-gray-900 dark:text-white">{block.crn}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </ModalContainer>
  );
}

export default function ScheduleWidget({ size }: ScheduleWidgetProps) {
  const { user } = useAuth();
  const [semester, setSemester] = useState<any>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [scheduleBlocks, setScheduleBlocks] = useState<ScheduleBlock[]>([]);
  const [selectedBlock, setSelectedBlock] = useState<ScheduleBlock | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const activeSemester = await semesterService.getActiveSemester(user.uid);
      if (activeSemester) {
        setSemester(activeSemester);
        const [courseList, blocks] = await Promise.all([
          courseService.getCourses(user.uid, activeSemester.id),
          scheduleService.getScheduleBlocks(user.uid, activeSemester.id)
        ]);
        setCourses(courseList);
        setScheduleBlocks(blocks);
      }
    } catch (error) {
      console.error('Error loading schedule data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCourseColor = (courseId: string): string => {
    const course = courses.find(c => c.id === courseId);
    return course?.color || '#2563EB';
  };

  const getBlocksForDay = (day: DayOfWeek): ScheduleBlock[] => {
    return scheduleBlocks.filter(block => block.dayOfWeek === day);
  };

  const getBlockPosition = (block: ScheduleBlock): { top: number; height: number } => {
    const startMinutes = timeToMinutes(block.startTime);
    const endMinutes = timeToMinutes(block.endTime);
    
    // Calculate position based on actual time within the 7am-9pm range (15 hours = 900 minutes)
    const firstSlotMinutes = COMPACT_TIME_SLOTS[0] * 60; // 7am = 420 minutes
    const lastSlotMinutes = COMPACT_TIME_SLOTS[COMPACT_TIME_SLOTS.length - 1] * 60; // 9pm = 1260 minutes
    const totalRangeMinutes = lastSlotMinutes - firstSlotMinutes; // 840 minutes (14 hours)
    
    // Calculate relative position (0-100%)
    let top = ((startMinutes - firstSlotMinutes) / totalRangeMinutes) * 100;
    let height = ((endMinutes - startMinutes) / totalRangeMinutes) * 100;
    
    // Clamp values to stay within bounds
    if (top < 0) {
      height = height + top; // Adjust height if top is negative
      top = 0;
    }
    if (top + height > 100) {
      height = 100 - top;
    }
    if (height < 0) height = 0;
    
    return { top, height };
  };

  const handleBlockClick = (block: ScheduleBlock) => {
    setSelectedBlock(block);
  };

  const getCourseBlocks = (courseId: string): ScheduleBlock[] => {
    return scheduleBlocks.filter(b => b.courseId === courseId);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[200px]">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-500 border-t-transparent"></div>
      </div>
    );
  }

  if (scheduleBlocks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[200px] text-center p-4">
        <Calendar className="w-12 h-12 text-gray-400 dark:text-gray-600 mb-3" />
        <p className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1">No Schedule</p>
        <p className="text-xs text-gray-500 dark:text-gray-500">
          Create your schedule to see it here
        </p>
      </div>
    );
  }

  // Determine grid dimensions based on size
  const timeColumnWidth = size === 'small' ? 'w-14' : 'w-16';
  const dayHeaderHeight = size === 'small' ? 'h-7' : 'h-8';
  const fontSize = size === 'small' ? 'text-[9px]' : size === 'medium' ? 'text-[10px]' : 'text-[11px]';
  const blockPadding = size === 'small' ? 'p-1.5' : 'p-2';

  return (
    <>
      <div className="h-full flex flex-col space-y-3">
        <div className="flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">Class Schedule</h3>
          </div>
          {semester && (
            <span className="text-xs text-gray-500 dark:text-gray-400">{semester.name}</span>
          )}
        </div>

        {/* Compact Schedule Grid - Use remaining space with even distribution */}
        <div className="relative flex-1 min-h-0 overflow-auto scrollbar-hide border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900">
          <div className="grid grid-cols-8 gap-0.5 min-w-full" style={{ 
            gridTemplateRows: `auto repeat(${COMPACT_TIME_SLOTS.length}, 1fr)`,
            height: '100%',
            minHeight: '100%'
          }}>
            {/* Time column */}
            <div 
              className={`sticky left-0 z-20 bg-white dark:bg-gray-900 ${timeColumnWidth} border-r border-gray-300 dark:border-gray-600`} 
              style={{ 
                gridRow: '1 / -1', 
                display: 'grid', 
                gridTemplateRows: `auto repeat(${COMPACT_TIME_SLOTS.length}, 1fr)`,
                height: '100%'
              }}
            >
              <div className={`${dayHeaderHeight} bg-white dark:bg-gray-900 flex-shrink-0`}></div>
              {COMPACT_TIME_SLOTS.map((hour, idx) => (
                <div
                  key={idx}
                  className={`border-r pr-1 ${fontSize} text-gray-500 dark:text-gray-400 text-right flex items-center justify-end`}
                  style={{ minHeight: 0 }}
                >
                  {idx % 2 === 0 && (
                    <span className="leading-none">{formatTime(hour)}</span>
                  )}
                </div>
              ))}
            </div>

            {/* Day columns */}
            {DAYS_OF_WEEK.map((day, dayIndex) => (
              <div 
                key={day} 
                className="relative border-r border-gray-300 dark:border-gray-600" 
                style={{ 
                  display: 'grid', 
                  gridTemplateRows: `auto repeat(${COMPACT_TIME_SLOTS.length}, 1fr)`,
                  height: '100%'
                }}
              >
                {/* Day header */}
                <div className={`${dayHeaderHeight} border-b border-gray-200 dark:border-gray-700 flex items-center justify-center font-semibold ${fontSize} text-gray-700 dark:text-gray-300 sticky top-0 bg-white dark:bg-gray-900 z-10 flex-shrink-0`}>
                  {DAY_ABBREVIATIONS[dayIndex]}
                </div>
                {/* Time slots container - evenly distributed with CSS Grid */}
                <div className="relative" style={{ gridRow: `2 / ${COMPACT_TIME_SLOTS.length + 2}`, height: '100%' }}>
                  {/* Grid lines - evenly distributed */}
                  {COMPACT_TIME_SLOTS.map((_hour, idx) => {
                    const isHour = idx % 2 === 0;
                    const slotHeight = 100 / COMPACT_TIME_SLOTS.length;
                    const top = idx * slotHeight;
                    return (
                      <div
                        key={`grid-${idx}`}
                        className="absolute left-0 right-0 border-t"
                        style={{
                          top: `${top}%`,
                          borderTopWidth: isHour ? '1px' : '0.5px',
                          borderColor: isHour
                            ? 'rgba(75, 85, 99, 0.3)'
                            : 'rgba(75, 85, 99, 0.15)',
                          zIndex: 1,
                        }}
                      />
                    );
                  })}
                  {/* Schedule Blocks */}
                  {getBlocksForDay(day).map((block) => {
                    const { top, height } = getBlockPosition(block);
                    const course = courses.find(c => c.id === block.courseId);
                    return (
                      <div
                        key={block.id}
                        onClick={() => handleBlockClick(block)}
                        className={`absolute left-0.5 right-0.5 rounded ${blockPadding} cursor-pointer hover:opacity-90 transition-opacity border-l-2`}
                        style={{
                          top: `${top}%`,
                          height: `${height}%`,
                          borderLeftColor: getCourseColor(block.courseId),
                          borderLeftWidth: '3px',
                          minHeight: size === 'small' ? '16px' : '20px',
                          zIndex: 10,
                        }}
                      >
                        {/* Solid background to cover grid lines */}
                        <div 
                          className="absolute inset-0 rounded bg-white dark:bg-gray-900"
                          style={{ zIndex: 0 }}
                        />
                        {/* Colored background layer */}
                        <div 
                          className="absolute inset-0 rounded"
                          style={{
                            backgroundColor: `${getCourseColor(block.courseId)}40`,
                            zIndex: 1,
                          }}
                        />
                        {/* Content - Only course name */}
                        <div className={`relative z-10 ${fontSize} font-bold text-gray-900 dark:text-white truncate leading-tight`}>
                          {course?.courseCode || block.courseNumber || block.title || 'Course'}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Block Details Modal */}
      {selectedBlock && (
        <ScheduleBlockDetailsModal
          course={courses.find(c => c.id === selectedBlock.courseId)}
          blocks={getCourseBlocks(selectedBlock.courseId)}
          onClose={() => setSelectedBlock(null)}
        />
      )}
    </>
  );
}

