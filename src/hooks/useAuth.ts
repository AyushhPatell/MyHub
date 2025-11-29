import { useState, useEffect } from 'react';
import { User as FirebaseUser } from 'firebase/auth';
import { onAuthStateChanged, getIdTokenResult } from 'firebase/auth';
import { auth } from '../config/firebase';

export const useAuth = () => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!isMounted) return;

      if (firebaseUser) {
        // Verify token is still valid
        try {
          const tokenResult = await getIdTokenResult(firebaseUser, true);
          if (tokenResult && isMounted) {
            setUser(firebaseUser);
          } else if (isMounted) {
            setUser(null);
          }
        } catch (error) {
          console.error('Error verifying auth token:', error);
          if (isMounted) {
            setUser(null);
          }
        }
      } else {
        setUser(null);
      }
      
      if (isMounted) {
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  return { user, loading };
};

