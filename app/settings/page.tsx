'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/context/auth-context';
import { ChevronLeft, Trash2, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { collection, query, where, getDocs, doc, updateDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { cn } from '@/lib/utils';
import { Oxanium } from 'next/font/google';
import { toast } from 'sonner';

const oxanium = Oxanium({ 
  subsets: ['latin'],
  variable: '--font-oxanium',
});

interface AdminUser {
  id: string;
  email: string;
  name?: string;
  photoURL?: string;
}

export default function SettingsPage() {
  const router = useRouter();
  const { user, isAdmin } = useAuth();
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!isAdmin) {
      router.replace('/');
      return;
    }

    loadAdmins();
  }, [isAdmin, router]);

  const loadAdmins = async () => {
    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('isAdmin', '==', true));
      const snapshot = await getDocs(q);
      
      const adminsList: AdminUser[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        adminsList.push({
          id: doc.id,
          email: data.email,
          name: data.name || data.displayName,
          photoURL: data.photoURL
        });
      });

      setAdmins(adminsList);
    } catch (error) {
      console.error('Error loading admins:', error);
      toast.error('Failed to load admin list');
    } finally {
      setLoading(false);
    }
  };

  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdminEmail.trim() || processing) return;

    setProcessing(true);
    try {
      // Check if user exists
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('email', '==', newAdminEmail.trim()));
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        toast.error('No user found with this email');
        return;
      }

      const userDoc = snapshot.docs[0];
      const userData = userDoc.data();

      // Check if already admin
      if (userData.isAdmin) {
        toast.error('User is already an admin');
        return;
      }

      // Update user to admin
      await updateDoc(doc(db, 'users', userDoc.id), {
        isAdmin: true,
        updatedAt: new Date().toISOString()
      });

      toast.success('Admin added successfully');
      setNewAdminEmail('');
      loadAdmins();
    } catch (error) {
      console.error('Error adding admin:', error);
      toast.error('Failed to add admin');
    } finally {
      setProcessing(false);
    }
  };

  const handleRemoveAdmin = async (adminId: string, adminEmail: string) => {
    if (processing) return;
    
    // Prevent removing the last admin or the current user
    if (admins.length === 1) {
      toast.error('Cannot remove the last admin');
      return;
    }
    
    if (adminEmail === 'hello@sendpin.app') {
      toast.error('Cannot remove the primary admin');
      return;
    }

    if (user?.uid === adminId) {
      toast.error('Cannot remove yourself as admin');
      return;
    }

    setProcessing(true);
    try {
      await updateDoc(doc(db, 'users', adminId), {
        isAdmin: false,
        updatedAt: new Date().toISOString()
      });

      toast.success('Admin removed successfully');
      loadAdmins();
    } catch (error) {
      console.error('Error removing admin:', error);
      toast.error('Failed to remove admin');
    } finally {
      setProcessing(false);
    }
  };

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-black">
        <div className="flex items-center h-[65px] px-[18px] border-b border-zinc-800">
          <button
            onClick={() => router.back()}
            className="p-2 -ml-2 hover:bg-white/10 rounded-full transition-colors"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <h1 className={cn("ml-2 text-lg font-semibold", oxanium.className)}>Settings</h1>
        </div>
      </div>

      {/* Content */}
      <div className="p-[18px] max-w-2xl mx-auto">
        {/* Admin Management Section */}
        <div className="space-y-6">
          <div>
            <h2 className={cn("text-xl font-semibold mb-2", oxanium.className)}>Admin Management</h2>
            <p className="text-zinc-400 text-sm">Add or remove admin privileges for users</p>
          </div>

          {/* Add Admin Form */}
          <form onSubmit={handleAddAdmin} className="space-y-4">
            <div className="flex gap-2">
              <input
                type="email"
                value={newAdminEmail}
                onChange={(e) => setNewAdminEmail(e.target.value)}
                placeholder="Enter user email"
                className="flex-1 px-4 py-2 rounded-full bg-zinc-900/50 
                          border border-zinc-800 text-white placeholder:text-zinc-500
                          focus:outline-none focus:ring-1 focus:ring-white/20"
                disabled={processing}
              />
              <button
                type="submit"
                disabled={processing || !newAdminEmail.trim()}
                className="p-2 bg-[#a3ff12] text-black rounded-full hover:bg-[#92e610] 
                          transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
          </form>

          {/* Admins List */}
          <div className="space-y-2">
            <h3 className={cn("text-lg font-medium", oxanium.className)}>Current Admins</h3>
            
            {loading ? (
              <div className="text-zinc-400 text-sm">Loading admins...</div>
            ) : admins.length === 0 ? (
              <div className="text-zinc-400 text-sm">No admins found</div>
            ) : (
              <div className="space-y-2">
                {admins.map((admin) => (
                  <div
                    key={admin.id}
                    className="flex items-center justify-between p-4 bg-zinc-900/50 
                              border border-zinc-800 rounded-lg"
                  >
                    <div>
                      <p className="font-medium">{admin.email}</p>
                      {admin.name && (
                        <p className="text-sm text-zinc-400">{admin.name}</p>
                      )}
                    </div>
                    
                    <button
                      onClick={() => handleRemoveAdmin(admin.id, admin.email)}
                      disabled={processing || admin.email === 'hello@sendpin.app' || admin.id === user?.uid}
                      className="p-2 text-red-400 hover:bg-red-400/10 rounded-full 
                                transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 