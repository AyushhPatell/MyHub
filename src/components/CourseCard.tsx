import { useNavigate } from 'react-router-dom';
import { Course } from '../types';
import { MoreVertical } from 'lucide-react';
import { useState, useRef } from 'react';

interface CourseCardProps {
  course: Course;
  semesterId: string;
  onEdit: (course: Course) => void;
}

export default function CourseCard({ course, semesterId: _semesterId, onEdit }: CourseCardProps) {
  const [showMenu, setShowMenu] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const navigate = useNavigate();

  const handleMenuClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('Menu button clicked, current showMenu:', showMenu);
    setShowMenu(prev => !prev);
  };

  const handleCardClick = (e: React.MouseEvent) => {
    // Don't navigate if menu is open or if clicking on menu area
    if (showMenu) {
      return;
    }
    // Check if click is on the menu button area
    const target = e.target as HTMLElement;
    if (target.closest('button[title="Course options"]') || target.closest('[data-menu-dropdown]')) {
      return;
    }
    navigate(`/courses/${course.id}`);
  };

  // Close menu when clicking outside - removed to prevent interference with Edit button
  // The backdrop now handles closing the menu

  return (
    <div className="group relative">
      <div 
        className="relative overflow-hidden bg-white/60 dark:bg-white/5 backdrop-blur-xl rounded-2xl border border-gray-200 dark:border-white/10 p-4 hover:border-indigo-300 dark:hover:border-indigo-500/30 transition-all hover:scale-[1.01] hover:shadow-xl cursor-pointer"
        onClick={handleCardClick}
      >
        {/* Color accent bar */}
        <div
          className="absolute top-0 left-0 right-0 h-1.5"
          style={{ backgroundColor: course.color }}
        />
        
        {/* Menu button - positioned above everything with higher z-index */}
        <button
          ref={menuButtonRef}
          type="button"
          onClick={handleMenuClick}
          className="absolute top-4 right-4 z-[100] p-2 text-gray-400 hover:text-gray-600 dark:hover:text-white opacity-100 transition-all rounded-xl hover:bg-gray-100 dark:hover:bg-white/5 pointer-events-auto"
          title="Course options"
        >
          <MoreVertical size={20} />
        </button>
        
        {showMenu && (
          <>
            {/* Backdrop to prevent card clicks - only closes on backdrop click, not menu */}
            <div 
              className="fixed inset-0 z-[90]"
              onMouseDown={(e) => {
                const target = e.target as HTMLElement;
                // Only close if clicking directly on backdrop, not on menu
                if (!target.closest('[data-menu-dropdown]') && !target.closest('button[title="Course options"]')) {
                  setShowMenu(false);
                }
              }}
            />
            {/* Menu dropdown */}
            <div 
              data-menu-dropdown
              className="absolute right-4 top-12 w-40 bg-white dark:bg-gray-800/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-200 dark:border-white/10 z-[100] overflow-hidden"
            >
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  console.log('Edit button clicked, calling onEdit with course:', course);
                  // Close menu first
                  setShowMenu(false);
                  // Call onEdit immediately
                  onEdit(course);
                }}
                className="w-full text-left px-4 py-3 text-sm font-semibold text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
              >
                Edit
              </button>
            </div>
          </>
        )}

        {/* Course content */}
        <div className="pr-12">

          {/* Course content */}
          <div className="mt-1">
            <div className="flex items-start justify-between mb-3">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-lg"
                style={{ backgroundColor: course.color }}
              >
                {course.courseCode.split(' ')[1]?.charAt(0) || 'C'}
              </div>
            </div>

            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1.5">
              {course.courseCode}
            </h3>
            <p className="text-sm text-gray-900 dark:text-gray-200 mb-3 line-clamp-2 font-semibold leading-tight">
              {course.courseName}
            </p>

            {course.professor && (
              <div className="mb-3">
                <p className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-0.5">
                  Professor
                </p>
                <p className="text-xs font-bold text-gray-900 dark:text-white">
                  {course.professor}
                </p>
              </div>
            )}

            {course.schedule.length > 0 && (
              <div className="pt-3 border-t border-gray-200 dark:border-white/10">
                <div className="flex flex-wrap gap-1.5">
                  {course.schedule.map((schedule, index) => (
                    <span
                      key={index}
                      className="text-[10px] px-2 py-1 bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 rounded-lg font-semibold border border-indigo-200 dark:border-indigo-500/30"
                    >
                      {schedule.day.substring(0, 3)} {schedule.startTime}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
