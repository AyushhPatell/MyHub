import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

/**
 * Hook to check if the current user is an admin
 * 
 * This checks the user's Firestore document for the isAdmin field.
 * Admin status should be set server-side only for security.
 */
export function useIsAdmin() {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setIsAdmin(false);
      setLoading(false);
      return;
    }

    // Check Firestore for admin status
    const checkAdminStatus = async () => {
      try {
        const userDoc = doc(db, 'users', user.uid);
        const docSnap = await getDoc(userDoc);
        
        if (docSnap.exists()) {
          const userData = docSnap.data();
          const adminStatus = userData.isAdmin === true;
          console.log('[useIsAdmin] Admin status check:', {
            userId: user.uid,
            isAdmin: adminStatus,
            userData: { ...userData, isAdmin: userData.isAdmin }
          });
          setIsAdmin(adminStatus);
        } else {
          console.warn('[useIsAdmin] User document does not exist:', user.uid);
          setIsAdmin(false);
        }
      } catch (error) {
        console.error('[useIsAdmin] Error checking admin status:', error);
        setIsAdmin(false);
      } finally {
        setLoading(false);
      }
    };

    checkAdminStatus();
  }, [user]);

  return { isAdmin, loading };
}

