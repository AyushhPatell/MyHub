import { doc, getDoc, setDoc, increment, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';

/**
 * Track a visit to the application
 * @param _userId - The user's ID (kept for potential future use)
 * @param isAdmin - Whether the user is an admin
 */
export async function trackVisit(_userId: string, isAdmin: boolean): Promise<void> {
  try {
    const visitsRef = doc(db, 'appUsage', 'visits');
    const visitsDoc = await getDoc(visitsRef);

    if (!visitsDoc.exists()) {
      // Initialize the document
      // IMPORTANT: If user is admin, only increment admin visits, NOT user visits
      await setDoc(visitsRef, {
        totalUserVisits: isAdmin ? 0 : 1,
        totalAdminVisits: isAdmin ? 1 : 0,
        lastUpdated: serverTimestamp(),
      });
    } else {
      // Increment ONLY the appropriate counter
      // IMPORTANT: Admin visits should NOT also increment user visits
      const updates: any = {
        lastUpdated: serverTimestamp(),
      };

      if (isAdmin) {
        // Admin visit - only increment admin counter
        updates.totalAdminVisits = increment(1);
      } else {
        // Regular user visit - only increment user counter
        updates.totalUserVisits = increment(1);
      }

      await setDoc(visitsRef, updates, { merge: true });
    }
  } catch (error) {
    console.error('[visitTracker] Error tracking visit:', error);
    // Don't throw - visit tracking shouldn't break the app
  }
}

/**
 * Get visit statistics
 */
export async function getVisitStats(): Promise<{
  totalUserVisits: number;
  totalAdminVisits: number;
}> {
  try {
    const visitsRef = doc(db, 'appUsage', 'visits');
    const visitsDoc = await getDoc(visitsRef);

    if (visitsDoc.exists()) {
      const data = visitsDoc.data();
      return {
        totalUserVisits: Number(data.totalUserVisits) || 0,
        totalAdminVisits: Number(data.totalAdminVisits) || 0,
      };
    }

    return {
      totalUserVisits: 0,
      totalAdminVisits: 0,
    };
  } catch (error) {
    console.error('[visitTracker] Error getting visit stats:', error);
    return {
      totalUserVisits: 0,
      totalAdminVisits: 0,
    };
  }
}

