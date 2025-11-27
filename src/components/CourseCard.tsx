import { Link } from 'react-router-dom';
import { Course } from '../types';
import { BookOpen, User, MoreVertical } from 'lucide-react';
import { useState } from 'react';

interface CourseCardProps {
  course: Course;
  semesterId: string;
  onEdit: (course: Course) => void;
}

export default function CourseCard({ course, semesterId, onEdit }: CourseCardProps) {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div className="relative bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 hover:border-primary-300 dark:hover:border-primary-700 transition-all hover:shadow-lg group">
      <div className="absolute top-4 right-4">
        <button
          onClick={() => setShowMenu(!showMenu)}
          className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
          title="Course options"
        >
          <MoreVertical size={18} />
        </button>
        {showMenu && (
          <div className="absolute right-0 mt-2 w-32 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-10">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit(course);
                setShowMenu(false);
              }}
              className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-t-lg"
            >
              Edit
            </button>
          </div>
        )}
      </div>
      <Link
        to={`/courses/${course.id}`}
        className="block"
        onClick={() => setShowMenu(false)}
      >
      <div className="flex items-start justify-between mb-4">
        <div
          className="w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold text-lg"
          style={{ backgroundColor: course.color }}
        >
          {course.courseCode.split(' ')[1]?.charAt(0) || 'C'}
        </div>
      </div>

      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
        {course.courseCode}
      </h3>
      <p className="text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
        {course.courseName}
      </p>

      {course.professor && (
        <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 mb-2">
          <User className="w-4 h-4 mr-2" />
          {course.professor}
        </div>
      )}

      {course.schedule.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex flex-wrap gap-2">
            {course.schedule.map((schedule, index) => (
              <span
                key={index}
                className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded"
              >
                {schedule.day.substring(0, 3)} {schedule.startTime}
              </span>
            ))}
          </div>
        </div>
      )}
      </Link>
      {showMenu && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setShowMenu(false)}
        />
      )}
    </div>
  );
}

