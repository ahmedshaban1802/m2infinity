'use client';

import { useState, useEffect } from 'react';
import AuthScreen from '@/components/auth-screen';
import AdminDashboard from '@/components/admin-dashboard';
import EmployeePortal from '@/components/employee-portal';

interface SessionData {
  id: string;
  username: string;
  role: string;
  employeeId: string | null;
}

export default function Home() {
  const [session, setSession] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing session
    fetch('/api/auth/session')
      .then(res => {
        if (res.ok) return res.json();
        throw new Error();
      })
      .then(data => {
        if (data.accountId) {
          setSession({
            id: data.accountId,
            username: data.username,
            role: data.role,
            employeeId: data.employeeId,
          });
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleLogin = (data: SessionData) => {
    setSession(data);
  };

  const handleLogout = () => {
    fetch('/api/auth/session', { method: 'POST' }).finally(() => {
      setSession(null);
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-600 to-amber-500 flex items-center justify-center animate-pulse">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
          </div>
          <p className="text-muted-foreground text-sm">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return <AuthScreen onLogin={handleLogin} />;
  }

  if (session.role === 'admin') {
    return <AdminDashboard session={session} onLogout={handleLogout} />;
  }

  return <EmployeePortal session={session} onLogout={handleLogout} />;
}