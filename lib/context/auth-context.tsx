'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { 
  GoogleAuthProvider, 
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  confirmPasswordReset
} from 'firebase/auth';
import { auth, db, actionCodeSettings } from '@/lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { SplashScreen } from '@/components/ui/splash-screen';

interface AuthContextType {
  user: User | null;
  isAdmin: boolean;
  loading: boolean;
  error: string | null;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  confirmPasswordReset: (oobCode: string, newPassword: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function generateUsername(email: string, displayName: string | null): string {
  if (displayName) {
    return displayName.toLowerCase().replace(/\s+/g, '_');
  }
  
  return email.split('@')[0].toLowerCase();
}

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
            const username = generateUsername(user.email!, user.displayName);
            await setDoc(userDocRef, {
              email: user.email,
              username: username,
              displayName: user.displayName || username,
              photoURL: user.photoURL || null,
              createdAt: new Date().toISOString(),
              lastLogin: new Date().toISOString(),
              isAdmin: user.email === 'hello@sendpin.app',
              setupComplete: false,
            });
            router.push('/setup');
          } else {
            console.log('User document exists, updating lastLogin');
            setIsAdmin(userDoc.data()?.isAdmin || false);
            
            // Check if setup is complete
            if (!userDoc.data()?.setupComplete) {
              router.push('/setup');
            } else {
              await setDoc(userDocRef, {
                lastLogin: new Date().toISOString(),
              }, { merge: true });
            }
          }
        } catch (err) {
          console.error('Error checking user document:', err);
        }
      } else {
        setIsAdmin(false);
        // Check if we're on the reset password page with an oobCode
        const pathname = window.location.pathname;
        const searchParams = new URLSearchParams(window.location.search);
        const hasOobCode = searchParams.has('oobCode');
        const isResetPasswordPage = pathname === '/reset-password';
        const isSetupPage = pathname === '/setup';

        console.log('Auth state - not logged in:', {
          pathname,
          hasOobCode,
          isResetPasswordPage,
          isSetupPage
        });

        // Only redirect if we're not on the reset password page with an oobCode
        if (!isResetPasswordPage || (isResetPasswordPage && !hasOobCode)) {
          console.log('Redirecting to login page...');
          router.replace('/login');
        }
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
      
      console.log('Google sign in successful, checking user document...');
      const userRef = doc(db, 'users', result.user.uid);
      const userDoc = await getDoc(userRef);
      
      if (!userDoc.exists()) {
        console.log('Creating new user document...');
        const username = generateUsername(result.user.email!, result.user.displayName);
        await setDoc(userRef, {
          email: result.user.email,
          username: username,
          displayName: result.user.displayName || username,
          photoURL: result.user.photoURL,
          createdAt: new Date().toISOString(),
          lastLogin: new Date().toISOString(),
          isAdmin: result.user.email === 'hello@sendpin.app',
          setupComplete: false,
        });
        console.log('Redirecting to setup page...');
        router.replace('/setup');
        return;
      }

      // Existing user
      const isUserAdmin = userDoc.data()?.isAdmin || result.user.email === 'hello@sendpin.app';
      
      // Check if setup is complete
      if (!userDoc.data()?.setupComplete) {
        console.log('Setup not complete, redirecting to setup...');
        router.replace('/setup');
        return;
      }

      await setDoc(userRef, {
        lastLogin: new Date().toISOString(),
        isAdmin: isUserAdmin,
      }, { merge: true });

      // Update admin status
      setIsAdmin(isUserAdmin);

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
      const userRef = doc(db, 'users', result.user.uid);
      const userDoc = await getDoc(userRef);
      const isUserAdmin = userDoc.exists() ? userDoc.data()?.isAdmin : email === 'hello@sendpin.app';
      
      await setDoc(userRef, {
        email: result.user.email,
        lastLogin: new Date().toISOString(),
        isAdmin: isUserAdmin,
      }, { merge: true });

      // Update admin status
      setIsAdmin(isUserAdmin);

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
      const username = generateUsername(email, null);
      await setDoc(doc(db, 'users', result.user.uid), {
        email: result.user.email,
        username: username,
        displayName: username,
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

  const sendPasswordReset = async (email: string) => {
    try {
      console.log('Sending password reset email...');
      await sendPasswordResetEmail(auth, email, actionCodeSettings);
      console.log('Password reset email sent successfully');
    } catch (error: any) {
      console.error('Password reset error:', error);
      throw new Error(error.message || 'Failed to send password reset email');
    }
  };

  const handlePasswordReset = async (oobCode: string, newPassword: string) => {
    try {
      console.log('Confirming password reset...');
      await confirmPasswordReset(auth, oobCode, newPassword);
      console.log('Password reset successful');
    } catch (error: any) {
      console.error('Password reset confirmation error:', error);
      throw new Error(error.message || 'Failed to reset password');
    }
  };

  if (loading) {
    return <SplashScreen />;
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
      sendPasswordReset,
      confirmPasswordReset: handlePasswordReset,
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