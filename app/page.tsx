'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';

export default function HomePage() {
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!user) router.replace('/login');
    else if (user.role === 'admin') router.replace('/admin');
    else if (user.role === 'worker') router.replace('/worker');
    else router.replace('/dashboard');
  }, [user, router]);

  return null;
}
