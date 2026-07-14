'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useTheme } from '@/components/theme-provider';
import { useToast } from '@/hooks/use-toast';
import {
  Building2,
  User,
  Lock,
  Briefcase,
  ArrowLeft,
  Eye,
  EyeOff,
  Loader2,
  CreditCard,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface LoginResponse {
  id: string;
  username: string;
  role: string;
  employeeId: string | null;
}

interface AuthScreenProps {
  onLogin: (session: LoginResponse) => void;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function AuthScreen({ onLogin }: AuthScreenProps) {
  const { setTheme } = useTheme();
  const { toast } = useToast();

  /* ---------- state ---------- */
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mounted, setMounted] = useState(false);

  /* login fields */
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPass, setShowLoginPass] = useState(false);

  /* register fields */
  const [regName, setRegName] = useState('');
  const [regJob, setRegJob] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirm, setRegConfirm] = useState('');
  const [showRegPass, setShowRegPass] = useState(false);
  const [showRegConfirm, setShowRegConfirm] = useState(false);
  const [idFront, setIdFront] = useState<string | null>(null);
  const [idBack, setIdBack] = useState<string | null>(null);

  const frontRef = useRef<HTMLInputElement>(null);
  const backRef = useRef<HTMLInputElement>(null);

  /* ensure dark mode on mount & trigger entrance animation */
  useEffect(() => {
    setTheme('dark');
    const t = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(t);
  }, [setTheme]);

  /* ---------- helpers ---------- */

  const resetForm = useCallback(() => {
    setError('');
    setLoginUsername('');
    setLoginPassword('');
    setRegName('');
    setRegJob('');
    setRegUsername('');
    setRegPassword('');
    setRegConfirm('');
    setIdFront(null);
    setIdBack(null);
    setShowLoginPass(false);
    setShowRegPass(false);
    setShowRegConfirm(false);
  }, []);

  const switchMode = useCallback(() => {
    resetForm();
    setMode((m) => (m === 'login' ? 'register' : 'login'));
  }, [resetForm]);

  const handleImage = (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: (v: string) => void,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError('حجم الصورة يجب أن يكون أقل من 5 ميجابايت');
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => setter(reader.result as string);
    reader.readAsDataURL(file);
  };

  /* ---------- API ---------- */

  const handleLogin = async () => {
    setError('');
    if (!loginUsername.trim() || !loginPassword.trim()) {
      setError('يرجى ملء جميع الحقول');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: loginUsername.trim(), password: loginPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'اسم المستخدم أو كلمة المرور غير صحيحة');
        return;
      }
      onLogin(data);
    } catch {
      setError('حدث خطأ في الاتصال بالخادم');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    setError('');
    if (!regName.trim() || !regJob.trim() || !regUsername.trim() || !regPassword.trim() || !regConfirm.trim()) {
      setError('يرجى ملء جميع الحقول');
      return;
    }
    if (regPassword.length < 4) {
      setError('كلمة المرور يجب أن تكون 4 أحرف على الأقل');
      return;
    }
    if (regPassword !== regConfirm) {
      setError('كلمتا المرور غير متطابقتين');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: regName.trim(),
          job: regJob.trim(),
          username: regUsername.trim(),
          password: regPassword,
          idFront,
          idBack,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'فشل في إنشاء الحساب');
        return;
      }
      toast({ title: 'تم إنشاء الحساب بنجاح', description: 'يمكنك الآن تسجيل الدخول' });
      resetForm();
      setMode('login');
    } catch {
      setError('حدث خطأ في الاتصال بالخادم');
    } finally {
      setLoading(false);
    }
  };

  /* ---------- key handler ---------- */
  const onLoginKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleLogin();
  };

  /* ---------- shared styles ---------- */

  const inputCls =
    'w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 pr-11 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500/60 transition-all duration-200 text-sm font-[var(--font-cairo)]';

  const labelCls = 'block text-sm font-semibold text-white/70 mb-1.5 font-[var(--font-cairo)]';

  /* ---------------------------------------------------------------- */
  /*  RENDER                                                           */
  /* ---------------------------------------------------------------- */

  return (
    <div
      dir="rtl"
      className={`fixed inset-0 z-50 flex items-center justify-center overflow-hidden font-[var(--font-cairo)] transition-all duration-1000 ${
        mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
      }`}
      style={{ background: 'linear-gradient(135deg, #0c1222 0%, #0d3b3b 100%)' }}
    >
      {/* ---------- particles ---------- */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <style>{`
          @keyframes particleFloat {
            0%   { transform: translateY(0) translateX(0) scale(1);   opacity: 0;   }
            10%  { opacity: 1; }
            90%  { opacity: 1; }
            100% { transform: translateY(-100vh) translateX(40px) scale(0.4); opacity: 0; }
          }
          .auth-particle {
            position: absolute;
            border-radius: 50%;
            background: rgba(13,148,136,0.45);
            animation: particleFloat linear infinite;
          }
        `}</style>
        {Array.from({ length: 30 }).map((_, i) => {
          const size = 3 + Math.random() * 5;
          const left = Math.random() * 100;
          const dur = 8 + Math.random() * 14;
          const delay = Math.random() * 12;
          return (
            <span
              key={i}
              className="auth-particle"
              style={{
                width: size,
                height: size,
                left: `${left}%`,
                bottom: '-10px',
                animationDuration: `${dur}s`,
                animationDelay: `${delay}s`,
              }}
            />
          );
        })}
      </div>

      {/* ---------- card ---------- */}
      <div
        className={`relative z-10 w-full max-w-md mx-4 rounded-2xl p-6 sm:p-8 backdrop-blur-2xl shadow-2xl transition-all duration-700 ${
          mounted ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
        }`}
        style={{
          background: 'rgba(12, 18, 34, 0.65)',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 0 60px rgba(13,148,136,0.08), 0 25px 50px rgba(0,0,0,0.4)',
        }}
      >
        {/* --- Logo --- */}
        <div className="flex flex-col items-center mb-6">
          <div
            className="flex h-16 w-16 items-center justify-center rounded-2xl shadow-lg shadow-teal-500/20"
            style={{ background: 'linear-gradient(135deg, #0d9488, #f59e0b)' }}
          >
            <Building2 className="h-8 w-8 text-white" />
          </div>
          <h1 className="mt-3 text-2xl font-bold text-white tracking-tight font-[var(--font-cairo)]">
            M2INFINITY
          </h1>
          <p className="mt-1 text-xs text-white/50 font-[var(--font-cairo)]">
            نظام إدارة الموظفين
          </p>
        </div>

        {/* --- Error banner --- */}
        {error && (
          <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300 text-center font-[var(--font-cairo)] animate-in fade-in duration-300">
            {error}
          </div>
        )}

        {/* ===================== LOGIN ===================== */}
        {mode === 'login' && (
          <div className="flex flex-col gap-4">
            {/* username */}
            <div>
              <label className={labelCls}>اسم المستخدم</label>
              <div className="relative">
                <User className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
                <input
                  className={inputCls}
                  type="text"
                  placeholder="أدخل اسم المستخدم"
                  value={loginUsername}
                  onChange={(e) => setLoginUsername(e.target.value)}
                  onKeyDown={onLoginKeyDown}
                  autoFocus
                />
              </div>
            </div>

            {/* password */}
            <div>
              <label className={labelCls}>كلمة المرور</label>
              <div className="relative">
                <Lock className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
                <input
                  className={inputCls}
                  type={showLoginPass ? 'text' : 'password'}
                  placeholder="أدخل كلمة المرور"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  onKeyDown={onLoginKeyDown}
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowLoginPass((v) => !v)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                >
                  {showLoginPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* submit */}
            <button
              onClick={handleLogin}
              disabled={loading}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold text-white transition-all duration-200 hover:shadow-lg hover:shadow-teal-500/25 active:scale-[0.98] disabled:opacity-60 font-[var(--font-cairo)]"
              style={{ background: 'linear-gradient(135deg, #0d9488, #0f766e)' }}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'تسجيل الدخول'
              )}
            </button>

            {/* switch */}
            <button
              onClick={switchMode}
              className="mt-2 flex items-center justify-center gap-1.5 text-sm text-white/40 hover:text-teal-400 transition-colors font-[var(--font-cairo)]"
            >
              <span>ليس لديك حساب؟</span>
              <span className="font-semibold text-teal-400">إنشاء حساب جديد</span>
            </button>
          </div>
        )}

        {/* ===================== REGISTER ===================== */}
        {mode === 'register' && (
          <div className="flex flex-col gap-4">
            {/* back button */}
            <button
              onClick={switchMode}
              className="mb-1 flex items-center gap-1 text-sm text-white/40 hover:text-white/70 transition-colors self-start font-[var(--font-cairo)]"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>العودة لتسجيل الدخول</span>
            </button>

            {/* name */}
            <div>
              <label className={labelCls}>الاسم الكامل</label>
              <div className="relative">
                <User className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
                <input
                  className={inputCls}
                  type="text"
                  placeholder="أدخل الاسم الكامل"
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                />
              </div>
            </div>

            {/* job title */}
            <div>
              <label className={labelCls}>المسمى الوظيفي</label>
              <div className="relative">
                <Briefcase className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
                <input
                  className={inputCls}
                  type="text"
                  placeholder="مثال: مهندس برمجيات"
                  value={regJob}
                  onChange={(e) => setRegJob(e.target.value)}
                />
              </div>
            </div>

            {/* username */}
            <div>
              <label className={labelCls}>اسم المستخدم</label>
              <div className="relative">
                <User className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
                <input
                  className={inputCls}
                  type="text"
                  placeholder="اختر اسم مستخدم"
                  value={regUsername}
                  onChange={(e) => setRegUsername(e.target.value)}
                />
              </div>
            </div>

            {/* password */}
            <div>
              <label className={labelCls}>كلمة المرور</label>
              <div className="relative">
                <Lock className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
                <input
                  className={inputCls}
                  type={showRegPass ? 'text' : 'password'}
                  placeholder="أدخل كلمة المرور"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowRegPass((v) => !v)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                >
                  {showRegPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* confirm password */}
            <div>
              <label className={labelCls}>تأكيد كلمة المرور</label>
              <div className="relative">
                <Lock className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
                <input
                  className={inputCls}
                  type={showRegConfirm ? 'text' : 'password'}
                  placeholder="أعد كتابة كلمة المرور"
                  value={regConfirm}
                  onChange={(e) => setRegConfirm(e.target.value)}
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowRegConfirm((v) => !v)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                >
                  {showRegConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* ID card images */}
            <div className="grid grid-cols-2 gap-3">
              {/* front */}
              <div>
                <label className={`${labelCls} text-center`}>الوجه الأمامي</label>
                <input
                  ref={frontRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleImage(e, setIdFront)}
                />
                <button
                  type="button"
                  onClick={() => frontRef.current?.click()}
                  className="relative flex h-28 w-full flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-white/15 bg-white/[0.03] text-white/30 transition-all duration-200 hover:border-teal-500/40 hover:bg-white/[0.06] hover:text-teal-400 overflow-hidden"
                >
                  {idFront ? (
                    <>
                      <img
                        src={idFront}
                        alt="الوجه الأمامي"
                        className="absolute inset-0 h-full w-full object-cover rounded-xl"
                      />
                      <span className="relative z-10 rounded-lg bg-black/50 px-2 py-0.5 text-[10px] text-white">
                        تغيير الصورة
                      </span>
                    </>
                  ) : (
                    <>
                      <CreditCard className="h-6 w-6" />
                      <span className="text-[11px]">إرفاق صورة</span>
                    </>
                  )}
                </button>
              </div>

              {/* back */}
              <div>
                <label className={`${labelCls} text-center`}>الوجه الخلفي</label>
                <input
                  ref={backRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleImage(e, setIdBack)}
                />
                <button
                  type="button"
                  onClick={() => backRef.current?.click()}
                  className="relative flex h-28 w-full flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-white/15 bg-white/[0.03] text-white/30 transition-all duration-200 hover:border-teal-500/40 hover:bg-white/[0.06] hover:text-teal-400 overflow-hidden"
                >
                  {idBack ? (
                    <>
                      <img
                        src={idBack}
                        alt="الوجه الخلفي"
                        className="absolute inset-0 h-full w-full object-cover rounded-xl"
                      />
                      <span className="relative z-10 rounded-lg bg-black/50 px-2 py-0.5 text-[10px] text-white">
                        تغيير الصورة
                      </span>
                    </>
                  ) : (
                    <>
                      <CreditCard className="h-6 w-6" />
                      <span className="text-[11px]">إرفاق صورة</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* submit */}
            <button
              onClick={handleRegister}
              disabled={loading}
              className="mt-1 flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold text-white transition-all duration-200 hover:shadow-lg hover:shadow-teal-500/25 active:scale-[0.98] disabled:opacity-60 font-[var(--font-cairo)]"
              style={{ background: 'linear-gradient(135deg, #0d9488, #0f766e)' }}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'إنشاء الحساب'
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}