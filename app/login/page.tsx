'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/context/auth-context';
import { Oxanium } from 'next/font/google';
import { cn } from '@/lib/utils';
import Image from 'next/image';

const oxanium = Oxanium({ 
  subsets: ['latin'],
  variable: '--font-oxanium',
});

export default function LoginPage() {
  const { user, signInWithGoogle, signInWithEmail } = useAuth();
  const router = useRouter();
  const [showEmailLogin, setShowEmailLogin] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isFormValid, setIsFormValid] = useState(false);
  const [emailError, setEmailError] = useState(false);
  const [passwordError, setPasswordError] = useState(false);

  useEffect(() => {
    if (user) {
      router.push('/');
    }
  }, [user, router]);

  // Validate form whenever email or password changes
  useEffect(() => {
    const emailValid = email.includes('@') && email.includes('.');
    const passwordValid = password.length >= 6;
    setIsFormValid(emailValid && passwordValid);
  }, [email, password]);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError(false);
    setPasswordError(false);

    // Basic email validation
    if (!email.includes('@') || !email.includes('.')) {
      setEmailError(true);
      return;
    }

    try {
      await signInWithEmail(email, password);
    } catch (error: any) {
      // Handle different Firebase auth errors
      const errorCode = error.message.toLowerCase();
      if (errorCode.includes('invalid-credential') || 
          errorCode.includes('wrong-password') || 
          errorCode.includes('user-not-found')) {
        setPasswordError(true);
        setError('Password Invalid. Please try again.');
      } else if (errorCode.includes('invalid-email')) {
        setEmailError(true);
        setError('Invalid email address');
      } else {
        setEmailError(true);
        setPasswordError(true);
        setError('Login failed. Please try again.');
      }
    }
  };

  if (showEmailLogin) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className={cn(
          "w-full max-w-md bg-black rounded-3xl p-8",
          "border border-[#333333]",
          oxanium.className
        )}>
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h1 className="text-3xl font-bold text-white">
                Login
              </h1>
              <p className="text-zinc-400 text-xs">
                Please login with your details
              </p>
            </div>

            <form onSubmit={handleEmailLogin} className="space-y-4">
              <div className="space-y-4">
                <div className="relative">
                  <div className={cn(
                    "flex items-center bg-[#222222] rounded-full px-4 py-3",
                    email && !email.includes('@') && "outline outline-1 outline-red-500"
                  )}>
                    <span className="text-zinc-400 mr-3">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect width="20" height="16" x="2" y="4" rx="2"/>
                        <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
                      </svg>
                    </span>
                    <input
                      type="email"
                      placeholder="Enter valid email address"
                      className="bg-transparent w-full text-white focus:outline-none"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="relative">
                  <div className="flex items-center bg-[#222222] rounded-full px-4 py-3">
                    <span className="text-zinc-400 mr-3">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/>
                        <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                      </svg>
                    </span>
                    <input
                      type="password"
                      placeholder="Enter password"
                      className="bg-transparent w-full text-white focus:outline-none"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        setPasswordError(false);
                        setError('');
                      }}
                      minLength={6}
                      required
                    />
                  </div>
                </div>

              </div>

              {error && (
                <div className="text-red-500 text-sm text-center">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={!isFormValid}
                className={cn(
                  "w-full rounded-full py-3 mt-6 transition-all duration-200",
                  isFormValid 
                    ? "bg-[#B2FF4D] text-black hover:bg-[#9FE646] cursor-pointer" 
                    : "bg-[#1A1A1A] text-[#666666] cursor-not-allowed opacity-50"
                )}
              >
                Login
              </button>
            </form>

            <div className="text-center space-y-4">
              <button
                onClick={() => setShowEmailLogin(false)}
                className="text-zinc-400 hover:text-white transition-colors"
              >
                Go back
              </button>
              
              <div>
                <span className="text-zinc-400">Forgot Password? </span>
                <button 
                  onClick={() => router.push('/reset-password')}
                  className="text-[#B2FF4D] hover:underline"
                >
                  Click here to reset.
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className={cn(
        "w-full max-w-md bg-black rounded-3xl p-8",
        "border border-[#333333]",
        oxanium.className
      )}>
        <div className="space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold text-white">
              Login
            </h1>
            <p className="text-zinc-400 text-xs">
              Please sign up or login with your details
            </p>
          </div>

          <div className="space-y-4">
            <button
              onClick={signInWithGoogle}
              className="w-full bg-white text-black rounded-full py-3 flex items-center justify-center gap-3"
            >
              <Image
                src="/icons/google.svg"
                alt="Google"
                width={20}
                height={20}
              />
              Continue with Google
            </button>

            <button
              onClick={() => setShowEmailLogin(true)}
              className="w-full text-[#B2FF4D] text-center"
            >
              Or login with email
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 