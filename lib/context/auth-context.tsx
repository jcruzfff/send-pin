'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { 
  GoogleAuthProvider, 
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword
} from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';

interface AuthContextType {
  user: User | null;
  isAdmin: boolean;
  loading: boolean;
  error: string | null;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    console.log('Setting up auth state listener...');
    
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log('Auth state changed:', user ? 'User logged in' : 'User logged out');
      
      setUser(user);
      if (user) {
        console.log('User details:', {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName
        });
        
        try {
          const userDocRef = doc(db, 'users', user.uid);
          const userDoc = await getDoc(userDocRef);
          
          if (!userDoc.exists()) {
            console.log('Creating new user document - first time user');
            await setDoc(userDocRef, {
              email: user.email,
              name: user.displayName,
              photoURL: user.photoURL,
              createdAt: new Date().toISOString(),
              lastLogin: new Date().toISOString(),
              isAdmin: false,
            });
            localStorage.setItem('isFirstLogin', 'true');
            setIsAdmin(false);
          } else {
            console.log('User document exists');
            setIsAdmin(userDoc.data()?.isAdmin || false);
          }
        } catch (err) {
          console.error('Error checking user document:', err);
          setIsAdmin(false);
        }
      } else {
        console.log('Redirecting to login page...');
        router.replace('/login');
      }
      setLoading(false);
    });

    return () => {
      console.log('Cleaning up auth state listener');
      unsubscribe();
    };
  }, [router]);

  const signInWithGoogle = async () => {
    try {
      console.log('Starting Google sign in...');
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({
        prompt: 'select_account',
        auth_type: 'reauthenticate'
      });
      
      const result = await signInWithPopup(auth, provider);
      
      console.log('Google sign in successful, updating user document...');
      await setDoc(doc(db, 'users', result.user.uid), {
        email: result.user.email,
        name: result.user.displayName,
        photoURL: result.user.photoURL,
        lastLogin: new Date().toISOString(),
      }, { merge: true });

      console.log('Redirecting to home page...');
      router.replace('/');
    } catch (error: any) {
      console.error('Google sign in error:', error);
      throw new Error(error.message || 'Failed to sign in with Google');
    }
  };

  const signInWithEmail = async (email: string, password: string) => {
    try {
      console.log('Starting email sign in...');
      const result = await signInWithEmailAndPassword(auth, email, password);
      
      console.log('Email sign in successful, updating user document...');
      await setDoc(doc(db, 'users', result.user.uid), {
        email: result.user.email,
        lastLogin: new Date().toISOString(),
      }, { merge: true });

      console.log('Redirecting to home page...');
      router.replace('/');
    } catch (error: any) {
      console.error('Email sign in error:', error);
      throw new Error(error.message || 'Failed to sign in with email');
    }
  };

  const signUpWithEmail = async (email: string, password: string) => {
    try {
      console.log('Starting email sign up...');
      const result = await createUserWithEmailAndPassword(auth, email, password);
      
      console.log('Email sign up successful, creating user document...');
      await setDoc(doc(db, 'users', result.user.uid), {
        email: result.user.email,
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString(),
        isAdmin: false,
      });

      localStorage.setItem('isFirstLogin', 'true');
      console.log('Redirecting to home page...');
      router.replace('/');
    } catch (error: any) {
      console.error('Email sign up error:', error);
      throw new Error(error.message || 'Failed to sign up with email');
    }
  };

  const signOut = async () => {
    try {
      console.log('Starting sign out process...');
      await firebaseSignOut(auth);
      console.log('Firebase sign out successful');
      // The onAuthStateChanged listener will handle the redirect
    } catch (error: any) {
      console.error('Sign out error:', error);
      throw new Error(error.message || 'Failed to sign out');
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-white">Loading...</div>
    </div>;
  }

  return (
    <AuthContext.Provider value={{
      user,
      isAdmin,
      loading,
      error,
      signInWithGoogle,
      signInWithEmail,
      signUpWithEmail,
      signOut,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
} 