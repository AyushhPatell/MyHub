import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { Semester, Course, Assignment } from '../types';

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
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      return semesters[0];
    } catch (error) {
      console.error('Error getting active semester:', error);
      throw error;
    }
  },

  async getSemesters(userId: string): Promise<Semester[]> {
    try {
      const q = query(collection(db, 'users', userId, 'semesters'));
      const snapshot = await getDocs(q);
      const semesters = snapshot.docs.map((doc) => convertTimestamp({ id: doc.id, ...doc.data() }) as Semester);
      // Sort in memory to avoid index requirement
      return semesters.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    } catch (error) {
      console.error('Error getting semesters:', error);
      throw error;
    }
  },

  async createSemester(userId: string, semester: Omit<Semester, 'id' | 'userId' | 'createdAt'>): Promise<string> {
    // Deactivate all other semesters
    const existingSemesters = await this.getSemesters(userId);
    for (const existing of existingSemesters) {
      if (existing.isActive) {
        await updateDoc(doc(db, 'users', userId, 'semesters', existing.id), { isActive: false });
      }
    }

    const docRef = await addDoc(collection(db, 'users', userId, 'semesters'), {
      ...semester,
      userId,
      createdAt: Timestamp.now(),
    });
    return docRef.id;
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

