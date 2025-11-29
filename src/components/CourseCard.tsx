import { Link } from 'react-router-dom';
import { Course } from '../types';
import { MoreVertical } from 'lucide-react';
import { useState } from 'react';

interface CourseCardProps {
  course: Course;
  semesterId: string;
  onEdit: (course: Course) => void;
}

export default function CourseCard({ course, semesterId, onEdit }: CourseCardProps) {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div className="group relative">
      <Link
        to={`/courses/${course.id}`}
        className="block"
        onClick={() => setShowMenu(false)}
      >
        <div className="relative overflow-hidden bg-white/60 dark:bg-white/5 backdrop-blur-xl rounded-2xl border border-gray-200 dark:border-white/10 p-4 hover:border-indigo-300 dark:hover:border-indigo-500/30 transition-all hover:scale-[1.01] hover:shadow-xl">
          {/* Color accent bar */}
          <div
            className="absolute top-0 left-0 right-0 h-1.5"
            style={{ backgroundColor: course.color }}
          />
          
          {/* Menu button */}
          <button
            onClick={(e) => {
              e.preventDefault();
              setShowMenu(!showMenu);
            }}
            className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-white opacity-0 group-hover:opacity-100 transition-all rounded-xl hover:bg-gray-100 dark:hover:bg-white/5 z-10"
            title="Course options"
          >
            <MoreVertical size={20} />
          </button>
          
          {showMenu && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowMenu(false)}
              />
              <div className="absolute right-4 top-12 w-40 bg-white dark:bg-gray-800/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-200 dark:border-white/10 z-20 overflow-hidden">
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onEdit(course);
                    setShowMenu(false);
                  }}
                  className="w-full text-left px-4 py-3 text-sm font-semibold text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
                >
                  Edit
                </button>
              </div>
            </>
          )}

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
      </Link>
    </div>
  );
}
