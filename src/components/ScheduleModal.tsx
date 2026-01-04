import { useState, useEffect } from 'react';
import { X, Plus, Calendar, Edit2, Trash2 } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { semesterService, courseService, scheduleService } from '../services/firestore';
import { Course, ScheduleBlock, DayOfWeek, ScheduleBlockType } from '../types';
import ModalContainer from './ModalContainer';

interface ScheduleModalProps {
  onClose: () => void;
}

const DAYS_OF_WEEK: DayOfWeek[] = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const TIME_SLOTS = Array.from({ length: 28 }, (_, i) => 7 + i * 0.5); // 7am to 9pm in 30-min intervals

const formatTime = (hour: number): string => {
  const h = Math.floor(hour);
  const m = hour % 1 === 0.5 ? 30 : 0;
  const period = h >= 12 ? 'PM' : 'AM';
  const displayHour = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return `${displayHour}:${m.toString().padStart(2, '0')} ${period}`;
};

const timeToMinutes = (time: string): number => {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

export default function ScheduleModal({ onClose }: ScheduleModalProps) {
  const { user } = useAuth();
  const [semester, setSemester] = useState<any>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [scheduleBlocks, setScheduleBlocks] = useState<ScheduleBlock[]>([]);
  const [selectedBlock, setSelectedBlock] = useState<ScheduleBlock | null>(null);
  const [editingCourseId, setEditingCourseId] = useState<string | null>(null);
  const [editingSingleBlock, setEditingSingleBlock] = useState<ScheduleBlock | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [confirmDialog, setConfirmDialog] = useState<{
    show: boolean;
    message: string;
    onConfirm: () => void;
  }>({ show: false, message: '', onConfirm: () => {} });

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
        const courseList = await courseService.getCourses(user.uid, activeSemester.id);
        setCourses(courseList);
        const blocks = await scheduleService.getScheduleBlocks(user.uid, activeSemester.id);
        setScheduleBlocks(blocks);
      }
    } catch (error) {
      console.error('Error loading schedule data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBlockClick = (block: ScheduleBlock, e: React.MouseEvent) => {
    // Don't open details if clicking edit/delete buttons
    if ((e.target as HTMLElement).closest('button')) {
      return;
    }
    setSelectedBlock(block);
  };


  const handleDeleteCourseClick = (courseId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user || !semester) return;
    const courseBlocks = scheduleBlocks.filter(b => b.courseId === courseId);
    setConfirmDialog({
      show: true,
      message: `Are you sure you want to delete all ${courseBlocks.length} schedule block(s) for this course?`,
      onConfirm: async () => {
        try {
          for (const block of courseBlocks) {
            await scheduleService.deleteScheduleBlock(user.uid, semester.id, block.id);
          }
          await loadData();
          setSelectedBlock(null);
          setConfirmDialog({ show: false, message: '', onConfirm: () => {} });
        } catch (error) {
          console.error('Error deleting course schedule:', error);
          alert('Failed to delete course schedule. Please try again.');
          setConfirmDialog({ show: false, message: '', onConfirm: () => {} });
        }
      },
    });
  };

  const handleDeleteBlockClick = (block: ScheduleBlock, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user || !semester) return;
    setConfirmDialog({
      show: true,
      message: 'Are you sure you want to delete this schedule block?',
      onConfirm: async () => {
        try {
          await scheduleService.deleteScheduleBlock(user.uid, semester.id, block.id);
          await loadData();
          // If this was the selected block, close the details
          if (selectedBlock?.id === block.id) {
            setSelectedBlock(null);
          }
          setConfirmDialog({ show: false, message: '', onConfirm: () => {} });
        } catch (error) {
          console.error('Error deleting schedule block:', error);
          alert('Failed to delete schedule block. Please try again.');
          setConfirmDialog({ show: false, message: '', onConfirm: () => {} });
        }
      },
    });
  };

  const handleSaveCourseSchedule = async (courseScheduleData: any) => {
    if (!user || !semester) return;
    try {
      const { courseId, courseInfo, blocks } = courseScheduleData;
      
      // If editing, delete existing blocks first
      if (editingCourseId) {
        const existingBlocks = scheduleBlocks.filter(b => b.courseId === editingCourseId);
        for (const block of existingBlocks) {
          await scheduleService.deleteScheduleBlock(user.uid, semester.id, block.id);
        }
      }

      // Create all blocks for this course
      for (const block of blocks) {
        await scheduleService.createScheduleBlock(user.uid, semester.id, {
          courseId,
          ...courseInfo,
          ...block,
        });
      }

      await loadData();
      setEditingCourseId(null);
      setShowAddForm(false);
    } catch (error) {
      console.error('Error saving course schedule:', error);
      alert('Failed to save course schedule. Please try again.');
    }
  };

  const handleSaveSingleBlock = async (blockId: string, day: DayOfWeek, startTime: string, endTime: string) => {
    if (!user || !semester) return;
    try {
      await scheduleService.updateScheduleBlock(user.uid, semester.id, blockId, {
        dayOfWeek: day,
        startTime,
        endTime,
      });
      await loadData();
      setEditingSingleBlock(null);
      setSelectedBlock(null);
    } catch (error) {
      console.error('Error updating block:', error);
      alert('Failed to update block. Please try again.');
    }
  };

  const getBlocksForDay = (day: DayOfWeek): ScheduleBlock[] => {
    return scheduleBlocks.filter(block => block.dayOfWeek === day);
  };

  const getBlockPosition = (block: ScheduleBlock): { top: number; height: number } => {
    const startMinutes = timeToMinutes(block.startTime);
    const endMinutes = timeToMinutes(block.endTime);
    
    // Calculate position based on actual time within the 7am-9pm range
    // TIME_SLOTS has 28 slots (7am to 9pm in 30-min intervals = 14 hours = 28 slots)
    const firstSlotMinutes = 7 * 60; // 7am = 420 minutes
    const lastSlotMinutes = 21 * 60; // 9pm = 1260 minutes (end of 9pm slot)
    const totalRangeMinutes = lastSlotMinutes - firstSlotMinutes; // 840 minutes (14 hours)
    
    // Calculate relative position (0-100%) - this matches the grid's visual distribution
    let top = ((startMinutes - firstSlotMinutes) / totalRangeMinutes) * 100;
    let height = ((endMinutes - startMinutes) / totalRangeMinutes) * 100;
    
    // Clamp values to stay within bounds
    if (top < 0) {
      height = Math.max(0, height + top); // Adjust height if top is negative
      top = 0;
    }
    if (top + height > 100) {
      height = Math.max(0, 100 - top);
    }
    if (height < 0) height = 0;
    
    return { top, height };
  };

  const getCourseColor = (courseId: string): string => {
    const course = courses.find(c => c.id === courseId);
    return course?.color || '#6366F1';
  };

  const getCourseBlocks = (courseId: string): ScheduleBlock[] => {
    return scheduleBlocks.filter(b => b.courseId === courseId);
  };

  if (loading) {
    return (
      <ModalContainer onClose={onClose}>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-500 border-t-transparent mx-auto"></div>
        </div>
      </ModalContainer>
    );
  }

  if (!semester) {
    return (
      <ModalContainer onClose={onClose}>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-8 max-w-md">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">No Active Semester</h2>
          <p className="text-gray-600 dark:text-gray-300 mb-6">Please set up a semester first to create your schedule.</p>
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            Close
          </button>
        </div>
      </ModalContainer>
    );
  }

  return (
    <>
      <ModalContainer onClose={onClose} backdropClassName="bg-black/80 backdrop-blur-sm">
        <div className="w-full h-full max-w-[95vw] max-h-[95vh] bg-white dark:bg-gray-900 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex-shrink-0 px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white truncate">Course Schedule</h2>
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1 truncate">{semester.name}</p>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
              {scheduleBlocks.length > 0 && (
                <button
                  onClick={() => {
                    setShowAddForm(true);
                    setEditingCourseId(null);
                  }}
                  className="flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-1.5 sm:py-2 bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-xs sm:text-sm font-semibold sm:font-bold rounded-lg sm:rounded-xl hover:scale-105 transition-transform shadow-lg"
                >
                  <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span className="hidden sm:inline">Add Course Schedule</span>
                  <span className="sm:hidden">Add</span>
                </button>
              )}
              <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg transition-colors"
              >
                <X size={24} />
              </button>
            </div>
          </div>

          {/* Schedule Grid - Full Width */}
          <div className="flex-1 overflow-auto scrollbar-hide min-h-0" style={{ padding: '0' }}>
            <div className="p-3 sm:p-6 h-full min-h-[600px]">
            {scheduleBlocks.length === 0 && !showAddForm ? (
              <div className="h-full flex items-center justify-center">
                <div className="text-center max-w-md">
                  <Calendar className="w-16 h-16 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No Schedule Created Yet</h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-6">
                    Create your weekly class schedule to visualize your lectures and tutorials.
                  </p>
                  <button
                    onClick={() => setShowAddForm(true)}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-bold rounded-xl hover:scale-105 transition-transform shadow-lg"
                  >
                    <Plus className="w-5 h-5" />
                    Create Schedule
                  </button>
                </div>
              </div>
            ) : (
              <div className="relative h-full w-full">
                {/* Grid - Responsive width for day columns with even distribution */}
                <div className="grid grid-cols-8 gap-2 sm:gap-4 min-w-[800px] sm:min-w-[1200px] h-full" style={{ 
                  gridTemplateRows: `auto repeat(${TIME_SLOTS.length}, 1fr)`,
                }}>
                  {/* Time column */}
                  <div className="sticky left-0 z-30 bg-white dark:bg-gray-900 w-16 sm:w-24" style={{ 
                    boxShadow: '2px 0 4px -1px rgba(0, 0, 0, 0.1)', 
                    marginLeft: '-0.75rem', 
                    paddingLeft: '0.75rem', 
                    overflow: 'visible',
                    gridRow: '1 / -1',
                    display: 'grid',
                    gridTemplateRows: `auto repeat(${TIME_SLOTS.length}, 1fr)`,
                    height: '100%'
                  }}>
                    <div className="h-8 sm:h-12 bg-white dark:bg-gray-900 sticky top-0 z-30 flex-shrink-0" style={{ boxShadow: '0 2px 4px -1px rgba(0, 0, 0, 0.1)' }}></div>
                    {TIME_SLOTS.map((hour, idx) => (
                      <div
                        key={idx}
                        className="border-r pr-1 sm:pr-2 text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 text-right bg-white dark:bg-gray-900 flex items-center justify-end"
                        style={{ borderColor: 'rgba(75, 85, 99, 0.4)', minHeight: 0 }}
                      >
                        {idx % 2 === 0 && formatTime(hour)}
                      </div>
                    ))}
                  </div>

                  {/* Day columns - Wider */}
                  {DAYS_OF_WEEK.map((day, dayIndex) => (
                    <div 
                      key={day} 
                      className="relative border-r" 
                      style={{ 
                        borderRightWidth: dayIndex === DAYS_OF_WEEK.length - 1 ? '0px' : '1px', 
                        borderColor: 'rgba(75, 85, 99, 0.4)',
                        display: 'grid',
                        gridTemplateRows: `auto repeat(${TIME_SLOTS.length}, 1fr)`,
                        height: '100%'
                      }}
                    >
                      {/* Day header */}
                      <div className="h-8 sm:h-12 border-b border-gray-200 dark:border-gray-700 flex items-center justify-center font-semibold text-xs sm:text-sm text-gray-700 dark:text-gray-300 sticky top-0 bg-white dark:bg-gray-900 z-20 flex-shrink-0" style={{ boxShadow: '0 2px 4px -1px rgba(0, 0, 0, 0.1)', marginTop: '-0.75rem', paddingTop: '0.75rem' }}>
                        {day.substring(0, 3)}
                      </div>
                      {/* Time slots - Evenly distributed with CSS Grid */}
                      <div className="relative" style={{ gridRow: `2 / ${TIME_SLOTS.length + 2}`, height: '100%', minHeight: 0 }}>
                        {/* Grid lines - Hour and half-hour marks - evenly distributed */}
                        {TIME_SLOTS.map((_hour, idx) => {
                          const isHour = idx % 2 === 0;
                          const slotHeight = 100 / TIME_SLOTS.length;
                          const top = idx * slotHeight;
                          return (
                            <div
                              key={`grid-${idx}`}
                              className="absolute left-0 right-0 border-t"
                              style={{
                                top: `${top}%`,
                                borderTopWidth: isHour ? '1px' : '0.5px',
                                borderColor: isHour 
                                  ? 'rgba(75, 85, 99, 0.5)' // gray-600 with higher opacity for better visibility in light mode
                                  : 'rgba(75, 85, 99, 0.3)',
                                zIndex: 1,
                              }}
                            />
                          );
                        })}
                        {getBlocksForDay(day).map((block) => {
                          const { top, height } = getBlockPosition(block);
                          const course = courses.find(c => c.id === block.courseId);
                          return (
                            <div
                              key={block.id}
                              onClick={(e) => handleBlockClick(block, e)}
                              className="absolute left-0.5 right-0.5 sm:left-1 sm:right-1 rounded-md sm:rounded-lg p-1.5 sm:p-2.5 cursor-pointer hover:opacity-90 transition-opacity shadow-sm border-l-4 group"
                                style={{
                                top: `${top}%`,
                                height: `${height}%`,
                                borderLeftColor: getCourseColor(block.courseId),
                                borderLeftWidth: '3px',
                                minHeight: '24px',
                                zIndex: 10, // Higher z-index to ensure blocks are above grid lines but below time column
                                position: 'relative', // Ensure proper stacking context
                              }}
                            >
                              {/* Solid background to completely cover grid lines */}
                              <div 
                                className="absolute inset-0 rounded-lg bg-white dark:bg-gray-900"
                                style={{
                                  zIndex: 0,
                                }}
                              />
                              {/* Colored background layer on top of white */}
                              <div 
                                className="absolute inset-0 rounded-lg"
                                style={{
                                  backgroundColor: `${getCourseColor(block.courseId)}40`,
                                  zIndex: 1,
                                }}
                              />
                              {/* Content layer */}
                              <div className="flex items-start justify-between h-full relative" style={{ zIndex: 2 }}>
                                <div className="flex-1 min-w-0">
                                  <div className="text-[10px] sm:text-sm font-bold text-gray-900 dark:text-white truncate leading-tight">
                                    {course?.courseCode || block.courseNumber || 'Course'}
                                  </div>
                                  <div className="text-[9px] sm:text-xs text-gray-600 dark:text-gray-400 truncate mt-0.5 capitalize leading-tight">
                                    {block.type}
                                  </div>
                                </div>
                              <div className="hidden xl:flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-2">
                                  <button
                                    onClick={(e) => handleDeleteBlockClick(block, e)}
                                    className="p-1 bg-white/80 dark:bg-gray-800/80 rounded hover:bg-white dark:hover:bg-gray-700 transition-colors"
                                    title="Delete this block"
                                  >
                                    <Trash2 size={12} className="text-red-600 dark:text-red-400" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            </div>
          </div>
        </div>
      </ModalContainer>

      {/* Course Schedule Details Modal */}
      {selectedBlock && (
        <CourseScheduleDetailsModal
          courseId={selectedBlock.courseId}
          course={courses.find(c => c.id === selectedBlock.courseId)}
          blocks={getCourseBlocks(selectedBlock.courseId)}
          onClose={() => setSelectedBlock(null)}
          onEdit={() => {
            setEditingCourseId(selectedBlock.courseId);
            setSelectedBlock(null);
            setShowAddForm(true);
          }}
          onDelete={(e) => handleDeleteCourseClick(selectedBlock.courseId, e)}
          onDeleteBlock={handleDeleteBlockClick}
          onEditBlock={(block) => {
            setEditingSingleBlock(block);
            setSelectedBlock(null);
          }}
        />
      )}

      {/* Add/Edit Course Schedule Form Modal */}
      {(showAddForm || editingCourseId) && !editingSingleBlock && (
        <CourseScheduleEditorModal
          courses={courses}
          existingBlocks={editingCourseId ? getCourseBlocks(editingCourseId) : []}
          courseId={editingCourseId}
          onSave={handleSaveCourseSchedule}
          onClose={() => {
            setShowAddForm(false);
            setEditingCourseId(null);
          }}
        />
      )}

      {/* Edit Single Block Modal */}
      {editingSingleBlock && (
        <EditSingleBlockModal
          block={editingSingleBlock}
          onSave={handleSaveSingleBlock}
          onClose={() => setEditingSingleBlock(null)}
        />
      )}

      {/* Confirmation Dialog */}
      {confirmDialog.show && (
        <ConfirmDialog
          message={confirmDialog.message}
          onConfirm={confirmDialog.onConfirm}
          onCancel={() => setConfirmDialog({ show: false, message: '', onConfirm: () => {} })}
        />
      )}
    </>
  );
}

// Course Schedule Details Modal - Shows all info for a course and all its blocks
interface CourseScheduleDetailsModalProps {
  courseId: string;
  course: Course | undefined;
  blocks: ScheduleBlock[];
  onClose: () => void;
  onEdit: () => void;
  onDelete: (e: React.MouseEvent) => void;
  onDeleteBlock: (block: ScheduleBlock, e: React.MouseEvent) => void;
  onEditBlock: (block: ScheduleBlock) => void;
}

function CourseScheduleDetailsModal({ 
  courseId: _courseId, 
  course, 
  blocks, 
  onClose, 
  onEdit, 
  onDelete,
  onDeleteBlock,
  onEditBlock
}: CourseScheduleDetailsModalProps) {
  // Get common info from first block (all blocks share this info)
  const firstBlock = blocks[0];
  if (!firstBlock) return null;

  return (
    <ModalContainer onClose={onClose} backdropClassName="bg-black/70 backdrop-blur-md">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto scrollbar-hide">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            {course?.courseCode || firstBlock.courseNumber || 'Course'} {course?.courseName || firstBlock.title ? `- ${course?.courseName || firstBlock.title}` : ''}
          </h2>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Course Info */}
          <div>
            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2 block">
              Course Information
            </label>
            <div className="space-y-2">
              {(course?.courseCode || firstBlock.courseNumber) && (
                <div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Course</div>
                  <div className="text-sm font-semibold text-gray-900 dark:text-white">
                    {course?.courseCode || firstBlock.courseNumber || 'N/A'}
                  </div>
                </div>
              )}
              {(course?.courseName || firstBlock.title) && (
                <div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Course Name</div>
                  <div className="text-sm font-semibold text-gray-900 dark:text-white">
                    {course?.courseName || firstBlock.title || 'N/A'}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Location */}
          {(firstBlock.location?.building || firstBlock.location?.room) && (
            <div>
              <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2 block">
                Location
              </label>
              <div className="space-y-1">
                {firstBlock.location?.building && (
                  <div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Building</div>
                    <div className="text-sm font-semibold text-gray-900 dark:text-white">{firstBlock.location.building}</div>
                  </div>
                )}
                {firstBlock.location?.room && (
                  <div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Room</div>
                    <div className="text-sm font-semibold text-gray-900 dark:text-white">{firstBlock.location.room}</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Instructor */}
          {firstBlock.instructorName && (
            <div>
              <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2 block">
                Instructor
              </label>
              <div className="text-sm font-semibold text-gray-900 dark:text-white">{firstBlock.instructorName}</div>
            </div>
          )}

          {/* CRN Details */}
          {(firstBlock.crn || firstBlock.associatedTerm) && (
            <div>
              <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2 block">
                CRN Details
              </label>
              <div className="grid grid-cols-2 gap-4">
                {firstBlock.crn && (
                  <div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">CRN</div>
                    <div className="text-sm font-semibold text-gray-900 dark:text-white">{firstBlock.crn}</div>
                  </div>
                )}
                {firstBlock.associatedTerm && (
                  <div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Associated Term</div>
                    <div className="text-sm font-semibold text-gray-900 dark:text-white">{firstBlock.associatedTerm}</div>
                  </div>
                )}
                {firstBlock.sectionNumber && (
                  <div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Section Number</div>
                    <div className="text-sm font-semibold text-gray-900 dark:text-white">{firstBlock.sectionNumber}</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Schedule Blocks List */}
          <div>
            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3 block">
              Schedule Blocks ({blocks.length})
            </label>
            <div className="space-y-2">
              {blocks.map((block, index) => (
                <div
                  key={block.id}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 capitalize">
                        {block.type} {index + 1}
                      </span>
                      <span className="text-sm font-semibold text-gray-900 dark:text-white">
                        {block.dayOfWeek}
                      </span>
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {block.startTime} - {block.endTime}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onEditBlock(block)}
                      className="p-1.5 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/20 rounded transition-colors"
                      title="Edit this block"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      onClick={(e) => onDeleteBlock(block, e)}
                      className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/20 rounded transition-colors"
                      title="Delete this block"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={onEdit}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              <Edit2 size={16} />
              Edit Course Schedule
            </button>
            <button
              onClick={onDelete}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              <Trash2 size={16} />
              Delete All
            </button>
          </div>
        </div>
      </div>
    </ModalContainer>
  );
}

// Course Schedule Editor Modal - Add/Edit all blocks for a course at once
interface CourseScheduleEditorModalProps {
  courses: Course[];
  existingBlocks: ScheduleBlock[];
  courseId: string | null;
  onSave: (data: any) => void;
  onClose: () => void;
}

function CourseScheduleEditorModal({ courses, existingBlocks, courseId, onSave, onClose }: CourseScheduleEditorModalProps) {
  const [selectedCourseId, setSelectedCourseId] = useState<string>(courseId || '');
  const [customCourseName, setCustomCourseName] = useState<string>('');
  const [useCustomCourse, setUseCustomCourse] = useState<boolean>(!courseId);
  const [numLectures, setNumLectures] = useState<number>(existingBlocks.filter(b => b.type === 'lecture').length || 0);
  const [numTutorials, setNumTutorials] = useState<number>(existingBlocks.filter(b => b.type === 'tutorial').length || 0);
  
  // Common course info
  const [courseInfo, setCourseInfo] = useState({
    course: existingBlocks[0]?.courseNumber || (existingBlocks[0]?.subject && existingBlocks[0]?.courseNumber ? `${existingBlocks[0].subject} ${existingBlocks[0].courseNumber}` : '') || '',
    title: existingBlocks[0]?.title || '',
    instructorName: existingBlocks[0]?.instructorName || '',
    sectionNumber: existingBlocks[0]?.sectionNumber || '',
    crn: existingBlocks[0]?.crn || '',
    associatedTerm: existingBlocks[0]?.associatedTerm || '',
  });

  // Separate location for lectures and tutorials
  // If only lectures are selected, use lectureLocation for all
  // If both are selected, use separate locations
  const [lectureLocation, setLectureLocation] = useState({
    building: existingBlocks.find(b => b.type === 'lecture')?.location?.building || '',
    room: existingBlocks.find(b => b.type === 'lecture')?.location?.room || '',
  });
  const [tutorialLocation, setTutorialLocation] = useState({
    building: existingBlocks.find(b => b.type === 'tutorial')?.location?.building || '',
    room: existingBlocks.find(b => b.type === 'tutorial')?.location?.room || '',
  });

  // Block-specific info (day and time)
  const [lectureBlocks, setLectureBlocks] = useState<Array<{ day: DayOfWeek; startTime: string; endTime: string }>>(
    existingBlocks.filter(b => b.type === 'lecture').map(b => ({
      day: b.dayOfWeek,
      startTime: b.startTime,
      endTime: b.endTime,
    })) || []
  );
  const [tutorialBlocks, setTutorialBlocks] = useState<Array<{ day: DayOfWeek; startTime: string; endTime: string }>>(
    existingBlocks.filter(b => b.type === 'tutorial').map(b => ({
      day: b.dayOfWeek,
      startTime: b.startTime,
      endTime: b.endTime,
    })) || []
  );

  const selectedCourse = courses.find(c => c.id === selectedCourseId);

  // Auto-fill from selected course
  useEffect(() => {
    if (selectedCourse && !useCustomCourse) {
      setCourseInfo(prev => ({
        ...prev,
        course: selectedCourse.courseCode,
        title: selectedCourse.courseName,
        instructorName: selectedCourse.professor || prev.instructorName,
      }));
    }
  }, [selectedCourse, useCustomCourse]);

  // Update lecture/tutorial arrays when counts change
  useEffect(() => {
    if (numLectures > lectureBlocks.length) {
      setLectureBlocks(prev => [...prev, ...Array(numLectures - prev.length).fill(null).map(() => ({
        day: 'Monday' as DayOfWeek,
        startTime: '09:00',
        endTime: '10:30',
      }))]);
    } else if (numLectures < lectureBlocks.length) {
      setLectureBlocks(prev => prev.slice(0, numLectures));
    }
  }, [numLectures]);

  useEffect(() => {
    if (numTutorials > tutorialBlocks.length) {
      setTutorialBlocks(prev => [...prev, ...Array(numTutorials - prev.length).fill(null).map(() => ({
        day: 'Monday' as DayOfWeek,
        startTime: '09:00',
        endTime: '10:30',
      }))]);
    } else if (numTutorials < tutorialBlocks.length) {
      setTutorialBlocks(prev => prev.slice(0, numTutorials));
    }
  }, [numTutorials]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const finalCourseId = useCustomCourse ? customCourseName : selectedCourseId;
    if (!finalCourseId) {
      alert('Please select or enter a course');
      return;
    }

    if (numLectures === 0 && numTutorials === 0) {
      alert('Please add at least one lecture or tutorial');
      return;
    }

    // Validate all blocks
    const allBlocks = [...lectureBlocks, ...tutorialBlocks];
    for (const block of allBlocks) {
      if (!block.day || !block.startTime || !block.endTime) {
        alert('Please fill in all day and time fields');
        return;
      }
      if (block.startTime >= block.endTime) {
        alert('End time must be after start time');
        return;
      }
    }

    // Build blocks array with appropriate locations
    const blocks: any[] = [];
    lectureBlocks.forEach((block, _index) => {
      blocks.push({
        type: 'lecture' as ScheduleBlockType,
        dayOfWeek: block.day,
        startTime: block.startTime,
        endTime: block.endTime,
        location: {
          building: lectureLocation.building || undefined,
          room: lectureLocation.room || undefined,
        },
      });
    });
    tutorialBlocks.forEach((block, _index) => {
      blocks.push({
        type: 'tutorial' as ScheduleBlockType,
        dayOfWeek: block.day,
        startTime: block.startTime,
        endTime: block.endTime,
        location: {
          building: tutorialLocation.building || undefined,
          room: tutorialLocation.room || undefined,
        },
      });
    });

    // For courseInfo, use lecture location as default (for backward compatibility)
    onSave({
      courseId: useCustomCourse ? customCourseName : selectedCourseId,
      courseInfo: {
        courseNumber: courseInfo.course, // Store as courseNumber for backward compatibility
        title: courseInfo.title,
        instructorName: courseInfo.instructorName,
        sectionNumber: courseInfo.sectionNumber,
        crn: courseInfo.crn,
        associatedTerm: courseInfo.associatedTerm,
        // Store lecture location as default for backward compatibility
        building: lectureLocation.building || undefined,
        room: lectureLocation.room || undefined,
        location: {
          building: lectureLocation.building || undefined,
          room: lectureLocation.room || undefined,
        },
      },
      blocks,
    });
  };

  return (
    <ModalContainer onClose={onClose} backdropClassName="bg-black/70 backdrop-blur-md">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto scrollbar-hide">
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            {courseId ? 'Edit Course Schedule' : 'Add Course Schedule'}
          </h2>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Course Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Course <span className="text-red-500">*</span>
            </label>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <input
                  type="radio"
                  id="select-course"
                  checked={!useCustomCourse}
                  onChange={() => setUseCustomCourse(false)}
                  className="w-4 h-4 text-indigo-600"
                />
                <label htmlFor="select-course" className="text-sm text-gray-700 dark:text-gray-300">
                  Select from existing courses
                </label>
              </div>
              {!useCustomCourse && (
                <select
                  value={selectedCourseId}
                  onChange={(e) => setSelectedCourseId(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                  required={!useCustomCourse}
                >
                  <option value="">Select a course</option>
                  {courses.map((course) => (
                    <option key={course.id} value={course.id}>
                      {course.courseCode} - {course.courseName}
                    </option>
                  ))}
                </select>
              )}

              <div className="flex items-center gap-3">
                <input
                  type="radio"
                  id="custom-course"
                  checked={useCustomCourse}
                  onChange={() => setUseCustomCourse(true)}
                  className="w-4 h-4 text-indigo-600"
                />
                <label htmlFor="custom-course" className="text-sm text-gray-700 dark:text-gray-300">
                  Enter custom course name
                </label>
              </div>
              {useCustomCourse && (
                <input
                  type="text"
                  value={customCourseName}
                  onChange={(e) => setCustomCourseName(e.target.value)}
                  placeholder="e.g., CSCI 3172 - Web-Centric Computing"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                  required={useCustomCourse}
                />
              )}
            </div>
          </div>

          {/* Number of Lectures and Tutorials */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Number of Lectures (0-2)
              </label>
              <select
                value={numLectures}
                onChange={(e) => setNumLectures(Number(e.target.value))}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
              >
                <option value={0}>0</option>
                <option value={1}>1</option>
                <option value={2}>2</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Number of Tutorials (0-2)
              </label>
              <select
                value={numTutorials}
                onChange={(e) => setNumTutorials(Number(e.target.value))}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
              >
                <option value={0}>0</option>
                <option value={1}>1</option>
                <option value={2}>2</option>
              </select>
            </div>
          </div>

          {/* Common Course Information */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Common Course Information</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Course
                </label>
                <input
                  type="text"
                  value={courseInfo.course}
                  onChange={(e) => setCourseInfo(prev => ({ ...prev, course: e.target.value }))}
                  placeholder="e.g., CSCI 3172"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Title
                </label>
                <input
                  type="text"
                  value={courseInfo.title}
                  onChange={(e) => setCourseInfo(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="e.g., Web-Centric Computing"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Location fields - show separate fields if both lecture and tutorial are selected */}
              {numLectures > 0 && numTutorials > 0 ? (
                <>
                  {/* Lecture Location */}
                  <div className="border-l-2 border-indigo-500 pl-4">
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Lecture Location</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Building
                        </label>
                        <input
                          type="text"
                          value={lectureLocation.building}
                          onChange={(e) => setLectureLocation(prev => ({ ...prev, building: e.target.value }))}
                          placeholder="e.g., COLLABORATIVE HEALTH EDUC BLDG"
                          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Room
                        </label>
                        <input
                          type="text"
                          value={lectureLocation.room}
                          onChange={(e) => setLectureLocation(prev => ({ ...prev, room: e.target.value }))}
                          placeholder="e.g., Room C170"
                          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                    </div>
                  </div>
                  {/* Tutorial Location */}
                  <div className="border-l-2 border-purple-500 pl-4">
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Tutorial Location</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Building
                        </label>
                        <input
                          type="text"
                          value={tutorialLocation.building}
                          onChange={(e) => setTutorialLocation(prev => ({ ...prev, building: e.target.value }))}
                          placeholder="e.g., COLLABORATIVE HEALTH EDUC BLDG"
                          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Room
                        </label>
                        <input
                          type="text"
                          value={tutorialLocation.room}
                          onChange={(e) => setTutorialLocation(prev => ({ ...prev, room: e.target.value }))}
                          placeholder="e.g., Room C170"
                          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                    </div>
                  </div>
                </>
              ) : numLectures > 0 ? (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Building
                    </label>
                    <input
                      type="text"
                      value={lectureLocation.building}
                      onChange={(e) => setLectureLocation(prev => ({ ...prev, building: e.target.value }))}
                      placeholder="e.g., COLLABORATIVE HEALTH EDUC BLDG"
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Room
                    </label>
                    <input
                      type="text"
                      value={lectureLocation.room}
                      onChange={(e) => setLectureLocation(prev => ({ ...prev, room: e.target.value }))}
                      placeholder="e.g., Room C170"
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              ) : numTutorials > 0 ? (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Building
                    </label>
                    <input
                      type="text"
                      value={tutorialLocation.building}
                      onChange={(e) => setTutorialLocation(prev => ({ ...prev, building: e.target.value }))}
                      placeholder="e.g., COLLABORATIVE HEALTH EDUC BLDG"
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Room
                    </label>
                    <input
                      type="text"
                      value={tutorialLocation.room}
                      onChange={(e) => setTutorialLocation(prev => ({ ...prev, room: e.target.value }))}
                      placeholder="e.g., Room C170"
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              ) : null}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Instructor Name
                </label>
                <input
                  type="text"
                  value={courseInfo.instructorName}
                  onChange={(e) => setCourseInfo(prev => ({ ...prev, instructorName: e.target.value }))}
                  placeholder="e.g., Saurabh Dey"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Section Number
                  </label>
                  <input
                    type="text"
                    value={courseInfo.sectionNumber}
                    onChange={(e) => setCourseInfo(prev => ({ ...prev, sectionNumber: e.target.value }))}
                    placeholder="e.g., 01"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    CRN
                  </label>
                  <input
                    type="text"
                    value={courseInfo.crn}
                    onChange={(e) => setCourseInfo(prev => ({ ...prev, crn: e.target.value }))}
                    placeholder="e.g., 20824"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Associated Term
                  </label>
                  <input
                    type="text"
                    value={courseInfo.associatedTerm}
                    onChange={(e) => setCourseInfo(prev => ({ ...prev, associatedTerm: e.target.value }))}
                    placeholder="e.g., Winter 2025"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Lecture Blocks */}
          {numLectures > 0 && (
            <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Lectures</h3>
              <div className="space-y-4">
                {lectureBlocks.map((block, index) => (
                  <div key={index} className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
                    <div className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Lecture {index + 1}</div>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Day <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={block.day}
                          onChange={(e) => {
                            const newBlocks = [...lectureBlocks];
                            newBlocks[index].day = e.target.value as DayOfWeek;
                            setLectureBlocks(newBlocks);
                          }}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 text-sm"
                          required
                        >
                          {DAYS_OF_WEEK.map((day) => (
                            <option key={day} value={day}>{day}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Start Time <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="time"
                          value={block.startTime}
                          onChange={(e) => {
                            const newBlocks = [...lectureBlocks];
                            newBlocks[index].startTime = e.target.value;
                            setLectureBlocks(newBlocks);
                          }}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 text-sm"
                          style={{ 
                            minHeight: '44px',
                            height: '44px',
                            fontSize: '16px'
                          }}
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                          End Time <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="time"
                          value={block.endTime}
                          onChange={(e) => {
                            const newBlocks = [...lectureBlocks];
                            newBlocks[index].endTime = e.target.value;
                            setLectureBlocks(newBlocks);
                          }}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 text-sm"
                          style={{ 
                            minHeight: '44px',
                            height: '44px',
                            fontSize: '16px'
                          }}
                          required
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tutorial Blocks */}
          {numTutorials > 0 && (
            <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Tutorials</h3>
              <div className="space-y-4">
                {tutorialBlocks.map((block, index) => (
                  <div key={index} className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
                    <div className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Tutorial {index + 1}</div>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Day <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={block.day}
                          onChange={(e) => {
                            const newBlocks = [...tutorialBlocks];
                            newBlocks[index].day = e.target.value as DayOfWeek;
                            setTutorialBlocks(newBlocks);
                          }}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 text-sm"
                          required
                        >
                          {DAYS_OF_WEEK.map((day) => (
                            <option key={day} value={day}>{day}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Start Time <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="time"
                          value={block.startTime}
                          onChange={(e) => {
                            const newBlocks = [...tutorialBlocks];
                            newBlocks[index].startTime = e.target.value;
                            setTutorialBlocks(newBlocks);
                          }}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 text-sm"
                          style={{ 
                            minHeight: '44px',
                            height: '44px',
                            fontSize: '16px'
                          }}
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                          End Time <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="time"
                          value={block.endTime}
                          onChange={(e) => {
                            const newBlocks = [...tutorialBlocks];
                            newBlocks[index].endTime = e.target.value;
                            setTutorialBlocks(newBlocks);
                          }}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 text-sm"
                          style={{ 
                            minHeight: '44px',
                            height: '44px',
                            fontSize: '16px'
                          }}
                          required
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              {courseId ? 'Update' : 'Add'} Course Schedule
            </button>
          </div>
        </form>
      </div>
    </ModalContainer>
  );
}

// Edit Single Block Modal - Only edit day and time
interface EditSingleBlockModalProps {
  block: ScheduleBlock;
  onSave: (blockId: string, day: DayOfWeek, startTime: string, endTime: string) => void;
  onClose: () => void;
}

function EditSingleBlockModal({ block, onSave, onClose }: EditSingleBlockModalProps) {
  const [day, setDay] = useState<DayOfWeek>(block.dayOfWeek);
  const [startTime, setStartTime] = useState(block.startTime);
  const [endTime, setEndTime] = useState(block.endTime);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (startTime >= endTime) {
      alert('End time must be after start time');
      return;
    }
    onSave(block.id, day, startTime, endTime);
  };

  return (
    <ModalContainer onClose={onClose} backdropClassName="bg-black/70 backdrop-blur-md">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full">
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Edit Block</h2>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Type
            </label>
            <div className="px-4 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg text-sm text-gray-700 dark:text-gray-300 capitalize">
              {block.type}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Day <span className="text-red-500">*</span>
            </label>
            <select
              value={day}
              onChange={(e) => setDay(e.target.value as DayOfWeek)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
              required
            >
              {DAYS_OF_WEEK.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Start Time <span className="text-red-500">*</span>
              </label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                style={{ 
                  minHeight: '44px',
                  height: '44px',
                  fontSize: '16px'
                }}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                End Time <span className="text-red-500">*</span>
              </label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                style={{ 
                  minHeight: '44px',
                  height: '44px',
                  fontSize: '16px'
                }}
                required
              />
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Update Block
            </button>
          </div>
        </form>
      </div>
    </ModalContainer>
  );
}

// Confirmation Dialog Component
interface ConfirmDialogProps {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

function ConfirmDialog({ message, onConfirm, onCancel }: ConfirmDialogProps) {
  return (
    <ModalContainer onClose={onCancel} backdropClassName="bg-black/70 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Confirm Action</h3>
        <p className="text-gray-600 dark:text-gray-400 mb-6">{message}</p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Confirm
          </button>
        </div>
      </div>
    </ModalContainer>
  );
}
