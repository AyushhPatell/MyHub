import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  setDoc,
  query,
  where,
  orderBy,
  Timestamp,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { Semester, Course, Assignment, RecurringTemplate, Notification, DashboardLayout, WidgetConfig, QuickNote, ScheduleBlock, CalendarEvent } from '../types';

// Helper to convert Firestore timestamps to Date objects
const convertTimestamp = (data: any) => {
  if (!data) return data;
  const converted = { ...data };
  Object.keys(converted).forEach((key) => {
    if (converted[key]?.toDate) {
      converted[key] = converted[key].toDate();
    }
  });
  return converted;
};

// Semester operations
export const semesterService = {
  async getActiveSemester(userId: string): Promise<Semester | null> {
    try {
      const q = query(
        collection(db, 'users', userId, 'semesters'),
        where('isActive', '==', true)
      );
      const snapshot = await getDocs(q);
      if (snapshot.empty) return null;
      // Sort in memory to avoid index requirement
      const semesters = snapshot.docs
        .map((doc) => convertTimestamp({ id: doc.id, ...doc.data() }) as Semester)
        .filter(s => !s.archived) // Exclude archived semesters
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      return semesters[0] || null;
    } catch (error) {
      console.error('Error getting active semester:', error);
      throw error;
    }
  },

  async getSemesters(userId: string, includeArchived: boolean = false): Promise<Semester[]> {
    try {
      const q = query(collection(db, 'users', userId, 'semesters'));
      const snapshot = await getDocs(q);
      let semesters = snapshot.docs.map((doc) => convertTimestamp({ id: doc.id, ...doc.data() }) as Semester);
      
      // Exclude archived semesters unless explicitly requested
      if (!includeArchived) {
        semesters = semesters.filter(s => !s.archived);
      }
      
      // Sort in memory to avoid index requirement
      return semesters.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    } catch (error) {
      console.error('Error getting semesters:', error);
      throw error;
    }
  },

  async createSemester(userId: string, semester: Omit<Semester, 'id' | 'userId' | 'createdAt'>): Promise<string> {
    // Get all existing semesters
    const existingSemesters = await this.getSemesters(userId);
    
    // Find the currently active semester
    const activeSemester = existingSemesters.find(s => s.isActive && !s.archived);
    
    // Archive the active semester (only keep 1 archived)
    if (activeSemester) {
      // If there's already an archived semester, delete it (we only keep 1)
      const archivedSemester = existingSemesters.find(s => s.archived);
      if (archivedSemester) {
        await deleteDoc(doc(db, 'users', userId, 'semesters', archivedSemester.id));
      }
      
      // Archive the current active semester
      await updateDoc(doc(db, 'users', userId, 'semesters', activeSemester.id), { 
        isActive: false,
        archived: true
      });
    }

    const docRef = await addDoc(collection(db, 'users', userId, 'semesters'), {
      ...semester,
      userId,
      archived: false,
      createdAt: Timestamp.now(),
    });
    return docRef.id;
  },

  async getArchivedSemester(userId: string): Promise<Semester | null> {
    try {
      const q = query(
        collection(db, 'users', userId, 'semesters'),
        where('archived', '==', true)
      );
      const snapshot = await getDocs(q);
      if (snapshot.empty) return null;
      const semesters = snapshot.docs
        .map((doc) => convertTimestamp({ id: doc.id, ...doc.data() }) as Semester)
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      return semesters[0]; // Return the most recent archived semester
    } catch (error) {
      console.error('Error getting archived semester:', error);
      throw error;
    }
  },

  async switchToSemester(userId: string, semesterId: string): Promise<void> {
    // Get all semesters including archived ones
    const allSemesters = await this.getSemesters(userId, true);
    const targetSemester = allSemesters.find(s => s.id === semesterId);
    
    if (!targetSemester) {
      throw new Error('Semester not found');
    }

    // Deactivate current active semester and archive it if it's not already archived
    const currentActive = allSemesters.find(s => s.isActive && !s.archived);
    if (currentActive && currentActive.id !== semesterId) {
      // If there's another archived semester (not the one we're switching to), delete it so we only keep 1 archived
      const existingArchived = allSemesters.find(s => s.archived && s.id !== semesterId);
      if (existingArchived) {
        await deleteDoc(doc(db, 'users', userId, 'semesters', existingArchived.id));
      }

      await updateDoc(doc(db, 'users', userId, 'semesters', currentActive.id), {
        isActive: false,
        archived: true
      });
    }

    // Activate the target semester and unarchive it
    await updateDoc(doc(db, 'users', userId, 'semesters', semesterId), {
      isActive: true,
      archived: false
    });
  },

  // Will be used for editing semester details
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async updateSemester(userId: string, semesterId: string, updates: Partial<Semester>): Promise<void> {
    await updateDoc(doc(db, 'users', userId, 'semesters', semesterId), updates);
  },
};

// Course operations
export const courseService = {
  async getCourses(userId: string, semesterId: string): Promise<Course[]> {
    try {
      const q = query(collection(db, 'users', userId, 'semesters', semesterId, 'courses'));
      const snapshot = await getDocs(q);
      const courses = snapshot.docs.map((doc) => convertTimestamp({ id: doc.id, ...doc.data() }) as Course);
      // Sort in memory to avoid index requirement
      return courses.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    } catch (error) {
      console.error('Error getting courses:', error);
      throw error;
    }
  },

  async getCourse(userId: string, semesterId: string, courseId: string): Promise<Course | null> {
    const docSnap = await getDoc(doc(db, 'users', userId, 'semesters', semesterId, 'courses', courseId));
    if (!docSnap.exists()) return null;
    return convertTimestamp({ id: docSnap.id, ...docSnap.data() }) as Course;
  },

  async createCourse(
    userId: string,
    semesterId: string,
    course: Omit<Course, 'id' | 'semesterId' | 'createdAt'>
  ): Promise<string> {
    const docRef = await addDoc(collection(db, 'users', userId, 'semesters', semesterId, 'courses'), {
      ...course,
      semesterId,
      createdAt: Timestamp.now(),
    });
    return docRef.id;
  },

  // Will be used for editing course details
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async updateCourse(
    userId: string,
    semesterId: string,
    courseId: string,
    updates: Partial<Course>
  ): Promise<void> {
    await updateDoc(doc(db, 'users', userId, 'semesters', semesterId, 'courses', courseId), updates);
  },

  // Will be used for deleting courses
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async deleteCourse(userId: string, semesterId: string, courseId: string): Promise<void> {
    await deleteDoc(doc(db, 'users', userId, 'semesters', semesterId, 'courses', courseId));
  },
};

// Assignment operations
export const assignmentService = {
  async getAssignments(
    userId: string,
    semesterId: string,
    courseId: string,
    filters?: { completed?: boolean }
  ): Promise<Assignment[]> {
    try {
      let q = query(
        collection(db, 'users', userId, 'semesters', semesterId, 'courses', courseId, 'assignments')
      );

      if (filters?.completed === false) {
        q = query(q, where('completedAt', '==', null));
      }

      const snapshot = await getDocs(q);
      let assignments = snapshot.docs.map((doc) => convertTimestamp({ id: doc.id, ...doc.data() }) as Assignment);
      
      // Sort in memory to avoid index requirement
      assignments = assignments.sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
      
      return assignments;
    } catch (error) {
      console.error('Error getting assignments:', error);
      throw error;
    }
  },

  async getAllAssignments(userId: string, semesterId: string): Promise<Assignment[]> {
    const courses = await courseService.getCourses(userId, semesterId);
    
    // Fetch all assignments in parallel for better performance
    const assignmentPromises = courses.map((course) => 
      this.getAssignments(userId, semesterId, course.id)
    );
    
    const assignmentArrays = await Promise.all(assignmentPromises);
    const allAssignments = assignmentArrays.flat();

    return allAssignments.sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
  },

  async createAssignment(
    userId: string,
    semesterId: string,
    courseId: string,
    assignment: Omit<Assignment, 'id' | 'courseId' | 'createdAt' | 'priority'>
  ): Promise<string> {
    try {
      // Build the document data, excluding undefined values
      const docData: any = {
        name: assignment.name,
        courseId,
        dueDate: Timestamp.fromDate(assignment.dueDate),
        type: assignment.type,
        isRecurring: assignment.isRecurring || false,
        createdAt: Timestamp.now(),
      };

      // Only add optional fields if they exist
      if (assignment.gradeWeight !== undefined && assignment.gradeWeight !== null) {
        docData.gradeWeight = assignment.gradeWeight;
      }

      if (assignment.links && assignment.links.length > 0) {
        docData.links = assignment.links;
      }

      if (assignment.completedAt) {
        docData.completedAt = Timestamp.fromDate(assignment.completedAt);
      }

      const docRef = await addDoc(
        collection(db, 'users', userId, 'semesters', semesterId, 'courses', courseId, 'assignments'),
        docData
      );
      return docRef.id;
    } catch (error) {
      console.error('Error creating assignment:', error);
      throw error;
    }
  },

  async updateAssignment(
    userId: string,
    semesterId: string,
    courseId: string,
    assignmentId: string,
    updates: Partial<Assignment>
  ): Promise<void> {
    const updateData: any = { ...updates };
    if (updates.dueDate) {
      updateData.dueDate = Timestamp.fromDate(updates.dueDate);
    }
    if (updates.completedAt !== undefined) {
      updateData.completedAt = updates.completedAt ? Timestamp.fromDate(updates.completedAt) : null;
    }
    await updateDoc(
      doc(db, 'users', userId, 'semesters', semesterId, 'courses', courseId, 'assignments', assignmentId),
      updateData
    );
  },

  // Will be used for deleting assignments
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async deleteAssignment(
    userId: string,
    semesterId: string,
    courseId: string,
    assignmentId: string
  ): Promise<void> {
    await deleteDoc(
      doc(db, 'users', userId, 'semesters', semesterId, 'courses', courseId, 'assignments', assignmentId)
    );
  },

  async markComplete(
    userId: string,
    semesterId: string,
    courseId: string,
    assignmentId: string,
    completed: boolean
  ): Promise<void> {
    try {
      const updateData: any = {};
      
      if (completed) {
        updateData.completedAt = Timestamp.fromDate(new Date());
      } else {
        // When unchecking, we need to explicitly set it to null (not undefined)
        updateData.completedAt = null;
      }
      
      await updateDoc(
        doc(db, 'users', userId, 'semesters', semesterId, 'courses', courseId, 'assignments', assignmentId),
        updateData
      );
    } catch (error) {
      console.error('Error marking assignment complete:', error);
      throw error;
    }
  },
};

// Recurring Template operations
export const recurringTemplateService = {
  async getTemplates(userId: string, semesterId: string, courseId: string): Promise<RecurringTemplate[]> {
    try {
      const q = query(
        collection(db, 'users', userId, 'semesters', semesterId, 'courses', courseId, 'recurringTemplates')
      );
      const snapshot = await getDocs(q);
      const templates = snapshot.docs.map((doc) => 
        convertTimestamp({ id: doc.id, ...doc.data() }) as RecurringTemplate
      );
      return templates.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    } catch (error) {
      console.error('Error getting recurring templates:', error);
      throw error;
    }
  },

  async createTemplate(
    userId: string,
    semesterId: string,
    courseId: string,
    template: Omit<RecurringTemplate, 'id' | 'courseId' | 'createdAt'>
  ): Promise<string> {
    const updateData: any = {
      ...template,
      courseId,
      createdAt: Timestamp.now(),
    };
    if (template.startDate) {
      updateData.startDate = Timestamp.fromDate(template.startDate);
    }
    if (template.endDate) {
      updateData.endDate = Timestamp.fromDate(template.endDate);
    }
    const docRef = await addDoc(
      collection(db, 'users', userId, 'semesters', semesterId, 'courses', courseId, 'recurringTemplates'),
      updateData
    );
    return docRef.id;
  },

  async updateTemplate(
    userId: string,
    semesterId: string,
    courseId: string,
    templateId: string,
    updates: Partial<RecurringTemplate>
  ): Promise<void> {
    const updateData: any = { ...updates };
    if (updates.startDate) {
      updateData.startDate = Timestamp.fromDate(updates.startDate);
    }
    if (updates.endDate) {
      updateData.endDate = Timestamp.fromDate(updates.endDate);
    }
    await updateDoc(
      doc(db, 'users', userId, 'semesters', semesterId, 'courses', courseId, 'recurringTemplates', templateId),
      updateData
    );
  },

  async deleteTemplate(
    userId: string,
    semesterId: string,
    courseId: string,
    templateId: string
  ): Promise<void> {
    await deleteDoc(
      doc(db, 'users', userId, 'semesters', semesterId, 'courses', courseId, 'recurringTemplates', templateId)
    );
  },

  async generateAssignmentsFromTemplate(
    userId: string,
    semesterId: string,
    courseId: string,
    templateId: string
  ): Promise<void> {
    // Get the template
    const templateDoc = await getDoc(
      doc(db, 'users', userId, 'semesters', semesterId, 'courses', courseId, 'recurringTemplates', templateId)
    );
    if (!templateDoc.exists()) throw new Error('Template not found');
    
    const template = convertTimestamp({ id: templateDoc.id, ...templateDoc.data() }) as RecurringTemplate;
    
    // Get existing assignments from this template
    const existingAssignments = await assignmentService.getAssignments(userId, semesterId, courseId);
    const templateAssignments = existingAssignments.filter(
      (a) => a.recurringTemplateId === templateId
    );
    
    // Generate assignments based on pattern
    const assignments: Omit<Assignment, 'id' | 'courseId' | 'createdAt' | 'priority'>[] = [];
    const now = new Date();
    const endDate = template.endDate > now ? template.endDate : now;
    let currentDate = new Date(template.startDate);
    
    // Set the day of week and time
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const targetDay = dayNames.indexOf(template.dayOfWeek);
    
    while (currentDate <= endDate) {
      // Find the next occurrence of the target day
      while (currentDate.getDay() !== targetDay) {
        currentDate.setDate(currentDate.getDate() + 1);
      }
      
      if (currentDate > endDate) break;
      
      // Check if assignment already exists for this date
      const [timeHours, timeMinutes] = template.time.split(':').map(Number);
      const dueDate = new Date(currentDate);
      dueDate.setHours(timeHours, timeMinutes, 0, 0);
      
      const exists = templateAssignments.some((a) => {
        const aDate = new Date(a.dueDate);
        return (
          aDate.getDate() === dueDate.getDate() &&
          aDate.getMonth() === dueDate.getMonth() &&
          aDate.getFullYear() === dueDate.getFullYear()
        );
      });
      
      if (!exists && dueDate >= now) {
        // Generate assignment name with pattern
        let assignmentName = template.assignmentNamePattern;
        if (assignmentName.includes('{n}')) {
          const weekNumber = Math.floor((currentDate.getTime() - template.startDate.getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1;
          assignmentName = assignmentName.replace('{n}', weekNumber.toString());
        }
        
        assignments.push({
          name: assignmentName,
          dueDate,
          type: template.type,
          isRecurring: true,
          recurringTemplateId: templateId,
        });
      }
      
      // Move to next occurrence based on pattern
      if (template.pattern === 'weekly') {
        currentDate.setDate(currentDate.getDate() + 7);
      } else if (template.pattern === 'biweekly') {
        currentDate.setDate(currentDate.getDate() + 14);
      } else if (template.pattern === 'monthly') {
        currentDate.setMonth(currentDate.getMonth() + 1);
      } else {
        break; // custom - not implemented yet
      }
    }
    
    // Create all assignments
    for (const assignment of assignments) {
      await assignmentService.createAssignment(userId, semesterId, courseId, assignment);
    }
  },
};

// Notification operations
export const notificationService = {
  async getNotifications(userId: string, unreadOnly: boolean = false): Promise<Notification[]> {
    try {
      let q = query(collection(db, 'users', userId, 'notifications'));
      if (unreadOnly) {
        q = query(q, where('isRead', '==', false));
      }
      const snapshot = await getDocs(q);
      const notifications = snapshot.docs.map((doc) => 
        convertTimestamp({ id: doc.id, ...doc.data() }) as Notification
      );
      return notifications.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    } catch (error) {
      console.error('Error getting notifications:', error);
      throw error;
    }
  },

  async createNotification(
    userId: string,
    notification: Omit<Notification, 'id' | 'userId' | 'createdAt' | 'isRead'>
  ): Promise<string> {
    // Check if similar notification already exists today (avoid duplicates)
    const existing = await this.getNotifications(userId);
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    const duplicate = existing.find(
      (n) => {
        // Check if it's the same type and related item
        if (n.type !== notification.type || n.relatedItemId !== notification.relatedItemId) {
          return false;
        }
        
        // Check if it was created today (same day, regardless of read status)
        const notificationDate = new Date(n.createdAt);
        const notificationDayStart = new Date(
          notificationDate.getFullYear(),
          notificationDate.getMonth(),
          notificationDate.getDate()
        );
        
        return notificationDayStart.getTime() === todayStart.getTime();
      }
    );
    
    if (duplicate) {
      return duplicate.id; // Return existing notification ID
    }
    
    const docRef = await addDoc(collection(db, 'users', userId, 'notifications'), {
      ...notification,
      userId,
      isRead: false,
      createdAt: Timestamp.now(),
    });
    return docRef.id;
  },

  async markAsRead(userId: string, notificationId: string): Promise<void> {
    await updateDoc(doc(db, 'users', userId, 'notifications', notificationId), {
      isRead: true,
    });
    // Clean up old notifications after marking as read
    await this.cleanupOldNotifications(userId);
  },

  async markAllAsRead(userId: string): Promise<void> {
    const notifications = await this.getNotifications(userId, true);
    const batch = notifications.map((n) =>
      updateDoc(doc(db, 'users', userId, 'notifications', n.id), { isRead: true })
    );
    await Promise.all(batch);
    // Clean up old notifications after marking all as read
    await this.cleanupOldNotifications(userId);
  },

  async deleteNotification(userId: string, notificationId: string): Promise<void> {
    await deleteDoc(doc(db, 'users', userId, 'notifications', notificationId));
  },

  async checkAndCreateNotifications(userId: string, semesterId: string): Promise<void> {
    try {
      const assignments = await assignmentService.getAllAssignments(userId, semesterId);
      const now = new Date();
      
      for (const assignment of assignments) {
        if (assignment.completedAt) continue; // Skip completed assignments
        
        const dueDate = new Date(assignment.dueDate);
        // Reset time to midnight for accurate day calculation
        dueDate.setHours(0, 0, 0, 0);
        const nowMidnight = new Date(now);
        nowMidnight.setHours(0, 0, 0, 0);
        
        const daysUntilDue = Math.ceil((dueDate.getTime() - nowMidnight.getTime()) / (1000 * 60 * 60 * 24));
        
        // Create notifications based on timing - only for specific days
        if (daysUntilDue < 0) {
          // Overdue - create once per day
          await this.createNotification(userId, {
            type: 'overdue',
            message: `${assignment.name} is overdue`,
            relatedItemId: assignment.id,
            relatedItemType: 'assignment',
          });
        } else if (daysUntilDue === 0) {
          // Due today - create once per day
          await this.createNotification(userId, {
            type: 'deadline-today',
            message: `${assignment.name} is due today`,
            relatedItemId: assignment.id,
            relatedItemType: 'assignment',
          });
        } else if (daysUntilDue === 1) {
          // Due in 1 day - create once per day
          await this.createNotification(userId, {
            type: 'deadline-soon',
            message: `${assignment.name} is due in 1 day`,
            relatedItemId: assignment.id,
            relatedItemType: 'assignment',
          });
        } else if (daysUntilDue === 3) {
          // Due in 3 days - create once per day
          await this.createNotification(userId, {
            type: 'deadline-soon',
            message: `${assignment.name} is due in 3 days`,
            relatedItemId: assignment.id,
            relatedItemType: 'assignment',
          });
        }
        // Note: We skip day 2 to avoid too many notifications
        // Only notify at 3 days and 1 day before due date
      }
    } catch (error) {
      console.error('Error in checkAndCreateNotifications:', error);
      throw error;
    }
  },

  async cleanupOldNotifications(userId: string, keepUnreadCount: number = 10, keepRecentReadCount: number = 5): Promise<void> {
    try {
      const allNotifications = await this.getNotifications(userId);
      
      // Separate read and unread
      const unread = allNotifications.filter((n) => !n.isRead);
      const read = allNotifications.filter((n) => n.isRead);
      
      // Keep all unread (up to keepUnreadCount)
      const unreadToKeep = unread.slice(0, keepUnreadCount);
      
      // Keep only the most recent read notifications
      const readToKeep = read.slice(0, keepRecentReadCount);
      
      // Find notifications to delete
      const toDelete = allNotifications.filter(
        (n) =>
          !unreadToKeep.find((u) => u.id === n.id) &&
          !readToKeep.find((r) => r.id === n.id)
      );
      
      // Delete old notifications
      if (toDelete.length > 0) {
        const deletePromises = toDelete.map((n) =>
          deleteDoc(doc(db, 'users', userId, 'notifications', n.id))
        );
        await Promise.all(deletePromises);
      }
    } catch (error) {
      console.error('Error cleaning up old notifications:', error);
      throw error;
    }
  },
};

// Dashboard Layout & Widget Service
export const widgetService = {
  async getDashboardLayout(userId: string): Promise<DashboardLayout | null> {
    try {
      const docRef = doc(db, 'users', userId, 'dashboard', 'layout');
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) return null;
      const data = docSnap.data();
      return {
        userId,
        widgets: (data.widgets || []).map((w: any) => ({
          ...w,
          settings: w.settings || {},
        })),
        updatedAt: data.updatedAt?.toDate() || new Date(),
      } as DashboardLayout;
    } catch (error) {
      console.error('Error getting dashboard layout:', error);
      throw error;
    }
  },

  async saveDashboardLayout(userId: string, layout: DashboardLayout): Promise<void> {
    try {
      const docRef = doc(db, 'users', userId, 'dashboard', 'layout');
      await updateDoc(docRef, {
        widgets: layout.widgets.map((w) => ({
          ...w,
          settings: w.settings || {},
        })),
        updatedAt: Timestamp.now(),
      });
    } catch (error: any) {
      // If document doesn't exist, create it
      if (error.code === 'not-found' || error.code === 'permission-denied') {
        try {
          await addDoc(collection(db, 'users', userId, 'dashboard'), {
            widgets: layout.widgets.map((w) => ({
              ...w,
              settings: w.settings || {},
            })),
            updatedAt: Timestamp.now(),
          });
        } catch (createError) {
          // Try with setDoc instead
          const setDocRef = doc(db, 'users', userId, 'dashboard', 'layout');
          await setDoc(setDocRef, {
            widgets: layout.widgets.map((w) => ({
              ...w,
              settings: w.settings || {},
            })),
            updatedAt: Timestamp.now(),
          });
        }
      } else {
        console.error('Error saving dashboard layout:', error);
        throw error;
      }
    }
  },

  async updateWidgetConfig(userId: string, widgetId: string, updates: Partial<WidgetConfig>): Promise<void> {
    try {
      const layout = await this.getDashboardLayout(userId);
      if (!layout) {
        // Create default layout
        const defaultLayout: DashboardLayout = {
          userId,
          widgets: [],
          updatedAt: new Date(),
        };
        await this.saveDashboardLayout(userId, defaultLayout);
        return;
      }

      const updatedWidgets = layout.widgets.map((w) =>
        w.id === widgetId ? { ...w, ...updates } : w
      );
      await this.saveDashboardLayout(userId, { ...layout, widgets: updatedWidgets });
    } catch (error) {
      console.error('Error updating widget config:', error);
      throw error;
    }
  },
};

// Quick Notes Service
export const quickNotesService = {
  async getNotes(userId: string): Promise<QuickNote[]> {
    try {
      const q = query(
        collection(db, 'users', userId, 'quickNotes'),
        orderBy('updatedAt', 'desc')
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map((doc) =>
        convertTimestamp({ id: doc.id, ...doc.data() })
      ) as QuickNote[];
    } catch (error) {
      console.error('Error getting quick notes:', error);
      throw error;
    }
  },

  async createNote(userId: string, note: Omit<QuickNote, 'id' | 'userId' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      const now = Timestamp.now();
      const docRef = await addDoc(collection(db, 'users', userId, 'quickNotes'), {
        ...note,
        userId,
        createdAt: now,
        updatedAt: now,
      });
      return docRef.id;
    } catch (error) {
      console.error('Error creating quick note:', error);
      throw error;
    }
  },

  async updateNote(userId: string, noteId: string, updates: Partial<QuickNote>): Promise<void> {
    try {
      const docRef = doc(db, 'users', userId, 'quickNotes', noteId);
      await updateDoc(docRef, {
        ...updates,
        updatedAt: Timestamp.now(),
      });
    } catch (error) {
      console.error('Error updating quick note:', error);
      throw error;
    }
  },

  async deleteNote(userId: string, noteId: string): Promise<void> {
    try {
      const docRef = doc(db, 'users', userId, 'quickNotes', noteId);
      await deleteDoc(docRef);
    } catch (error) {
      console.error('Error deleting quick note:', error);
      throw error;
    }
  },
};

// Schedule Service
export const scheduleService = {
  async getScheduleBlocks(userId: string, semesterId: string): Promise<ScheduleBlock[]> {
    try {
      // Get all blocks without ordering to avoid index requirement
      const snapshot = await getDocs(
        collection(db, 'users', userId, 'semesters', semesterId, 'scheduleBlocks')
      );
      // Sort in memory: first by day of week, then by start time
      const daysOrder: Record<string, number> = {
        'Sunday': 0, 'Monday': 1, 'Tuesday': 2, 'Wednesday': 3,
        'Thursday': 4, 'Friday': 5, 'Saturday': 6
      };
      return snapshot.docs
        .map((doc) => convertTimestamp({ id: doc.id, ...doc.data() }) as ScheduleBlock)
        .sort((a, b) => {
          const dayDiff = (daysOrder[a.dayOfWeek] || 0) - (daysOrder[b.dayOfWeek] || 0);
          if (dayDiff !== 0) return dayDiff;
          // If same day, sort by start time
          return a.startTime.localeCompare(b.startTime);
        });
    } catch (error) {
      console.error('Error getting schedule blocks:', error);
      throw error;
    }
  },

  async createScheduleBlock(
    userId: string,
    semesterId: string,
    blockData: Omit<ScheduleBlock, 'id' | 'userId' | 'semesterId' | 'createdAt' | 'updatedAt'>
  ): Promise<string> {
    try {
      const now = new Date();
      const docRef = await addDoc(
        collection(db, 'users', userId, 'semesters', semesterId, 'scheduleBlocks'),
        {
          ...blockData,
          userId,
          semesterId,
          createdAt: Timestamp.fromDate(now),
          updatedAt: Timestamp.fromDate(now),
        }
      );
      return docRef.id;
    } catch (error) {
      console.error('Error creating schedule block:', error);
      throw error;
    }
  },

  async updateScheduleBlock(
    userId: string,
    semesterId: string,
    blockId: string,
    updates: Partial<Omit<ScheduleBlock, 'id' | 'userId' | 'semesterId' | 'createdAt' | 'updatedAt'>>
  ): Promise<void> {
    try {
      const docRef = doc(db, 'users', userId, 'semesters', semesterId, 'scheduleBlocks', blockId);
      await updateDoc(docRef, {
        ...updates,
        updatedAt: Timestamp.fromDate(new Date()),
      });
    } catch (error) {
      console.error('Error updating schedule block:', error);
      throw error;
    }
  },

  async deleteScheduleBlock(userId: string, semesterId: string, blockId: string): Promise<void> {
    try {
      const docRef = doc(db, 'users', userId, 'semesters', semesterId, 'scheduleBlocks', blockId);
      await deleteDoc(docRef);
    } catch (error) {
      console.error('Error deleting schedule block:', error);
      throw error;
    }
  },

  async getScheduleBlocksByCourse(userId: string, semesterId: string, courseId: string): Promise<ScheduleBlock[]> {
    try {
      // Get blocks for specific course without ordering to avoid index requirement
      const q = query(
        collection(db, 'users', userId, 'semesters', semesterId, 'scheduleBlocks'),
        where('courseId', '==', courseId)
      );
      const snapshot = await getDocs(q);
      // Sort in memory: first by day of week, then by start time
      const daysOrder: Record<string, number> = {
        'Sunday': 0, 'Monday': 1, 'Tuesday': 2, 'Wednesday': 3,
        'Thursday': 4, 'Friday': 5, 'Saturday': 6
      };
      return snapshot.docs
        .map((doc) => convertTimestamp({ id: doc.id, ...doc.data() }) as ScheduleBlock)
        .sort((a, b) => {
          const dayDiff = (daysOrder[a.dayOfWeek] || 0) - (daysOrder[b.dayOfWeek] || 0);
          if (dayDiff !== 0) return dayDiff;
          // If same day, sort by start time
          return a.startTime.localeCompare(b.startTime);
        });
    } catch (error) {
      console.error('Error getting schedule blocks by course:', error);
      throw error;
    }
  },
};

// Calendar Event operations (personal events for calendar widget)
export const calendarEventService = {
  async getEvents(userId: string, semesterId: string): Promise<CalendarEvent[]> {
    try {
      const q = collection(db, 'users', userId, 'semesters', semesterId, 'calendarEvents');
      const snapshot = await getDocs(q);
      const events = snapshot.docs.map((doc) => convertTimestamp({ id: doc.id, ...doc.data() }) as CalendarEvent);
      // Sort by date/time
      return events.sort((a, b) => {
        if (a.date !== b.date) return a.date.localeCompare(b.date);
        return (a.startTime || '').localeCompare(b.startTime || '');
      });
    } catch (error) {
      console.error('Error getting calendar events:', error);
      throw error;
    }
  },

  async createEvent(
    userId: string,
    semesterId: string,
    event: Omit<CalendarEvent, 'id' | 'userId' | 'semesterId' | 'createdAt' | 'updatedAt'>
  ): Promise<string> {
    try {
      const now = new Date();
      // Filter out undefined values - Firestore doesn't accept undefined
      const eventData: any = {
        date: event.date,
        title: event.title,
        userId,
        semesterId,
        createdAt: now,
        updatedAt: now,
      };
      if (event.startTime) eventData.startTime = event.startTime;
      if (event.endTime) eventData.endTime = event.endTime;
      if (event.notes) eventData.notes = event.notes;
      
      const docRef = await addDoc(collection(db, 'users', userId, 'semesters', semesterId, 'calendarEvents'), eventData);
      return docRef.id;
    } catch (error) {
      console.error('Error creating calendar event:', error);
      throw error;
    }
  },

  async updateEvent(
    userId: string,
    semesterId: string,
    eventId: string,
    eventData: Partial<Omit<CalendarEvent, 'id' | 'userId' | 'semesterId' | 'createdAt'>>
  ): Promise<void> {
    try {
      const docRef = doc(db, 'users', userId, 'semesters', semesterId, 'calendarEvents', eventId);
      const updateData: any = {};
      if (eventData.date) updateData.date = eventData.date;
      if (eventData.title) updateData.title = eventData.title;
      if (eventData.startTime !== undefined) updateData.startTime = eventData.startTime;
      if (eventData.endTime !== undefined) updateData.endTime = eventData.endTime;
      if (eventData.notes !== undefined) updateData.notes = eventData.notes;
      updateData.updatedAt = new Date();
      await updateDoc(docRef, updateData);
    } catch (error) {
      console.error('Error updating calendar event:', error);
      throw error;
    }
  },

  async deleteEvent(userId: string, semesterId: string, eventId: string): Promise<void> {
    try {
      const docRef = doc(db, 'users', userId, 'semesters', semesterId, 'calendarEvents', eventId);
      await deleteDoc(docRef);
    } catch (error) {
      console.error('Error deleting calendar event:', error);
      throw error;
    }
  },

  /**
   * Delete events from previous months (keep only current month)
   * This should be called when a new month starts
   */
  async cleanupOldEvents(userId: string, semesterId: string): Promise<number> {
    try {
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();
      
      // Get all events
      const q = collection(db, 'users', userId, 'semesters', semesterId, 'calendarEvents');
      const snapshot = await getDocs(q);
      
      let deletedCount = 0;
      const batchSize = 500;
      let batch = writeBatch(db);
      let batchCount = 0;

      for (const eventDoc of snapshot.docs) {
        const eventData = eventDoc.data();
        const eventDate = new Date(eventData.date);
        
        // Delete if event is from a previous month
        if (eventDate.getMonth() < currentMonth || eventDate.getFullYear() < currentYear) {
          batch.delete(doc(db, 'users', userId, 'semesters', semesterId, 'calendarEvents', eventDoc.id));
          batchCount++;
          deletedCount++;
          
          // Commit batch if it reaches the limit
          if (batchCount >= batchSize) {
            await batch.commit();
            batch = writeBatch(db);
            batchCount = 0;
          }
        }
      }
      
      // Commit remaining deletes
      if (batchCount > 0) {
        await batch.commit();
      }
      
      return deletedCount;
    } catch (error) {
      console.error('Error cleaning up old events:', error);
      throw error;
    }
  },
};

// Account Deletion Service
export const accountService = {
  /**
   * Deletes all user data from Firestore
   * This includes: semesters, courses, assignments, notifications, dashboard layout, quick notes, and recurring templates
   */
  async deleteUserAccount(userId: string): Promise<void> {
    try {
      // Verify user is authenticated
      if (!userId) {
        throw new Error('User ID is required for account deletion');
      }
      
      // Use batch operations for better permission handling and atomicity
      const batchSize = 500; // Firestore batch limit
      
      // Delete all semesters and their subcollections
      const semestersSnapshot = await getDocs(collection(db, 'users', userId, 'semesters'));
      
      for (const semesterDoc of semestersSnapshot.docs) {
        const semesterId = semesterDoc.id;
        
        // Delete all courses in this semester
        const coursesSnapshot = await getDocs(
          collection(db, 'users', userId, 'semesters', semesterId, 'courses')
        );
        
        for (const courseDoc of coursesSnapshot.docs) {
          const courseId = courseDoc.id;
          
          // Delete all assignments in this course
          const assignmentsSnapshot = await getDocs(
            collection(db, 'users', userId, 'semesters', semesterId, 'courses', courseId, 'assignments')
          );
          
          // Process assignments in batches
          const assignmentDocs = assignmentsSnapshot.docs;
          for (let i = 0; i < assignmentDocs.length; i += batchSize) {
            const batch = writeBatch(db);
            const batchDocs = assignmentDocs.slice(i, i + batchSize);
            batchDocs.forEach((assignmentDoc) => {
              batch.delete(doc(db, 'users', userId, 'semesters', semesterId, 'courses', courseId, 'assignments', assignmentDoc.id));
            });
            await batch.commit();
          }
          
          // Delete the course
          await deleteDoc(doc(db, 'users', userId, 'semesters', semesterId, 'courses', courseId));
        }
        
        // Delete all recurring templates in this semester
        const templatesSnapshot = await getDocs(
          collection(db, 'users', userId, 'semesters', semesterId, 'recurringTemplates')
        );
        
        const templateDocs = templatesSnapshot.docs;
        for (let i = 0; i < templateDocs.length; i += batchSize) {
          const batch = writeBatch(db);
          const batchDocs = templateDocs.slice(i, i + batchSize);
          batchDocs.forEach((templateDoc) => {
            batch.delete(doc(db, 'users', userId, 'semesters', semesterId, 'recurringTemplates', templateDoc.id));
          });
          await batch.commit();
        }
        
        // Delete all schedule blocks in this semester
        const scheduleBlocksSnapshot = await getDocs(
          collection(db, 'users', userId, 'semesters', semesterId, 'scheduleBlocks')
        );
        
        const scheduleBlockDocs = scheduleBlocksSnapshot.docs;
        for (let i = 0; i < scheduleBlockDocs.length; i += batchSize) {
          const batch = writeBatch(db);
          const batchDocs = scheduleBlockDocs.slice(i, i + batchSize);
          batchDocs.forEach((blockDoc) => {
            batch.delete(doc(db, 'users', userId, 'semesters', semesterId, 'scheduleBlocks', blockDoc.id));
          });
          await batch.commit();
        }
        
        // Delete the semester
        await deleteDoc(doc(db, 'users', userId, 'semesters', semesterId));
      }
      
      // Delete all notifications in batches
      const notificationsSnapshot = await getDocs(collection(db, 'users', userId, 'notifications'));
      const notificationDocs = notificationsSnapshot.docs;
      for (let i = 0; i < notificationDocs.length; i += batchSize) {
        const batch = writeBatch(db);
        const batchDocs = notificationDocs.slice(i, i + batchSize);
        batchDocs.forEach((notificationDoc) => {
          batch.delete(doc(db, 'users', userId, 'notifications', notificationDoc.id));
        });
        await batch.commit();
      }
      
      // Delete dashboard layout in batches
      const dashboardSnapshot = await getDocs(collection(db, 'users', userId, 'dashboard'));
      const dashboardDocs = dashboardSnapshot.docs;
      for (let i = 0; i < dashboardDocs.length; i += batchSize) {
        const batch = writeBatch(db);
        const batchDocs = dashboardDocs.slice(i, i + batchSize);
        batchDocs.forEach((dashboardDoc) => {
          batch.delete(doc(db, 'users', userId, 'dashboard', dashboardDoc.id));
        });
        await batch.commit();
      }
      
      // Delete all quick notes in batches
      const notesSnapshot = await getDocs(collection(db, 'users', userId, 'quickNotes'));
      const notesDocs = notesSnapshot.docs;
      for (let i = 0; i < notesDocs.length; i += batchSize) {
        const batch = writeBatch(db);
        const batchDocs = notesDocs.slice(i, i + batchSize);
        batchDocs.forEach((noteDoc) => {
          batch.delete(doc(db, 'users', userId, 'quickNotes', noteDoc.id));
        });
        await batch.commit();
      }
      
      // Delete user document (this should be last)
      await deleteDoc(doc(db, 'users', userId));
      
      console.log('User account and all associated data deleted successfully');
    } catch (error: any) {
      console.error('Error deleting user account:', error);
      // Provide more specific error message
      if (error.code === 'permission-denied') {
        throw new Error('Permission denied. Please ensure you are logged in and have proper permissions.');
      }
      throw error;
    }
  },
};

