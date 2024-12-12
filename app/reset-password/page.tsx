'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/context/auth-context';
import { Oxanium } from 'next/font/google';
import { cn } from '@/lib/utils';
import { useSearchParams, useRouter } from 'next/navigation';

const oxanium = Oxanium({ 
  subsets: ['latin'],
  variable: '--font-oxanium',
});

export default function ResetPasswordPage() {
  const { sendPasswordReset, confirmPasswordReset } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const oobCode = searchParams.get('oobCode');
  
  console.log('Reset Password Page - URL Parameters:', {
    oobCode,
    mode: searchParams.get('mode'),
    fullUrl: window.location.href
  });

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [emailError, setEmailError] = useState(false);
  const [isValidEmail, setIsValidEmail] = useState(false);

  // Validate email whenever it changes
  useEffect(() => {
    const emailValid = email.includes('@') && email.includes('.');
    setIsValidEmail(emailValid);
  }, [email]);

  const handleSendResetEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setEmailError(false);

    try {
      await sendPasswordReset(email);
      setSuccess('If the email exists, check your inbox for a reset link.');
    } catch (error: any) {
      setEmailError(true);
      setError('Email not found. Please try again.');
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    try {
      await confirmPasswordReset(oobCode!, password);
      router.push('/login?reset=success');
    } catch (error: any) {
      setError(error.message);
    }
  };

  // If we have an oobCode, show the new password form
  if (oobCode) {
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
                Reset Password
              </h1>
              <p className="text-zinc-400 text-xs">
                Please enter your new password
              </p>
            </div>

            <form onSubmit={handlePasswordReset} className="space-y-4">
              <div className="space-y-4">
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
                      placeholder="Enter new password"
                      className="bg-transparent w-full text-white focus:outline-none"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
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
                      placeholder="Confirm new password"
                      className="bg-transparent w-full text-white focus:outline-none"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      minLength={6}
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
                className="w-full bg-[#222222] text-white rounded-full py-3 hover:bg-[#2a2a2a]"
              >
                Reset Password
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // Show the email form by default
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
              Reset Password
            </h1>
            <p className="text-zinc-400 text-xs">
              Enter your email to receive a password reset link
            </p>
          </div>

          <form onSubmit={handleSendResetEmail} className="space-y-4">
            <div className="relative">
              <div className={cn(
                "flex items-center bg-[#222222] rounded-full px-4 py-3",
                emailError && "outline outline-1 outline-red-500"
              )}>
                <span className="text-zinc-400 mr-3">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect width="20" height="16" x="2" y="4" rx="2"/>
                    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
                  </svg>
                </span>
                <input
                  type="email"
                  placeholder="Enter your email address"
                  className="bg-transparent w-full text-white focus:outline-none"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setEmailError(false);
                    setError('');
                  }}
                  required
                />
              </div>
              {emailError && (
                <p className="text-[#FF6B6B] text-sm mt-1 ml-4">Bad login</p>
              )}
            </div>

            {error && !emailError && (
              <div className="text-red-500 text-sm text-center">
                {error}
              </div>
            )}

            {success && (
              <div className="text-[#B2FF4D] text-sm text-center">
                {success}
              </div>
            )}

            <button
              type="submit"
              disabled={!isValidEmail}
              className={cn(
                "w-full rounded-full py-3 transition-all duration-200",
                isValidEmail 
                  ? "bg-[#B2FF4D] text-black hover:bg-[#9FE646] cursor-pointer" 
                  : "bg-[#1A1A1A] text-[#666666] cursor-not-allowed opacity-50"
              )}
            >
              Send Reset Link
            </button>

            <button
              onClick={() => router.push('/login')}
              className="w-full text-zinc-400 hover:text-white transition-colors"
            >
              Back to Login
            </button>
          </form>
        </div>
      </div>
    </div>
  );
} 