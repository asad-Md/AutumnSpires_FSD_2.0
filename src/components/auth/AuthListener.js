'use client';

import { useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { clearAllStores } from '@/lib/storage';
import { useUserStore } from '@/store/userStore';
import { useAuthStore } from '@/store/authStore';
import { useSidebarStore } from '@/store/sidebarStore';
import { useRouter } from 'next/navigation';

export default function AuthListener() {
  const router = useRouter();
  const clearUser = useUserStore((state) => state.clearUser);
  const logoutAuth = useAuthStore((state) => state.logout);
  const resetSidebar = useSidebarStore((state) => state.reset);

  useEffect(() => {
    const supabase = createClient();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') {
        console.log('AuthListener: User signed out, clearing stores...');
        await clearAllStores();
        clearUser();
        logoutAuth();
        resetSidebar();
        router.push('/');
        router.refresh();
      } else if (event === 'SIGNED_IN') {
         const storedUser = useUserStore.getState().user;
         // If we have a stored user but the new session ID is different, clear everything
         if (storedUser && session?.user?.id && storedUser.id !== session.user.id) {
            console.log(`AuthListener: User mismatch (Store: ${storedUser.id}, Session: ${session.user.id}). Clearing stores...`);
            await clearAllStores();
            clearUser();
            resetSidebar();
            // Use router.refresh() instead of reload to avoid loops if possible, 
            // though reload is safer for full state reset.
            window.location.reload();
         }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [clearUser, logoutAuth, router]);

  return null;
}
