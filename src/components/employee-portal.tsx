'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useTheme } from '@/components/theme-provider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Fingerprint, LogOut, Sun, Moon, Clock, CalendarDays, DollarSign,
  TrendingUp, TrendingDown, Plane, CheckCircle, Loader2,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// ─── Types ───────────────────────────────────────────────────────────────────

interface EmployeePortalProps {
  session: { id: string; username: string; role: string; employeeId: string | null };
  onLogout: () => void;
}

interface AttendanceRecord {
  id: string;
  employeeId: string;
  employeeName?: string;
  employeeCode?: string;
  employeeJob?: string;
  checkIn?: string;
  checkOut?: string;
  method?: string;
  delayMinutes?: number;
  date?: string;
}

interface LeaveRecord {
  id: string;
  employeeId: string;
  employeeName?: string;
  type: string;
  startDate: string;
  endDate: string;
  days?: number;
  reason?: string;
  status: string;
}

interface ReportsData {
  salary: number;
  totalDeductions: number;
  totalAdvances: number;
  totalDelay: number;
  completeDays: number;
  leaveDays: number;
}

interface SettingsData {
  companyName: string;
  logo?: string;
  workStart?: string;
  workEnd?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const LEAVE_TYPE_LABELS: Record<string, string> = { annual: 'اعتيادية', sick: 'مرضية' };
const LEAVE_STATUS_LABELS: Record<string, string> = { pending: 'معلّق', approved: 'مقبول', rejected: 'مرفوض' };

function fmtMoney(n: number | undefined | null): string {
  if (n === undefined || n === null) return '٠';
  return Number(n).toLocaleString('ar-EG');
}

function fmtNum(n: number | undefined | null): string {
  if (n === undefined || n === null) return '٠';
  return Number(n).toLocaleString('ar-EG');
}

function formatDateAr(dateStr: string): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' });
  } catch {
    return dateStr;
  }
}

function formatTime(timeStr: string | undefined | null): string {
  if (!timeStr) return '—';
  try {
    const d = new Date(timeStr);
    return d.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return timeStr;
  }
}

function getCurrentMonthName(): string {
  return new Date().toLocaleDateString('ar-EG', { year: 'numeric', month: 'long' });
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function EmployeePortal({ session, onLogout }: EmployeePortalProps) {
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();

  // ── Clock ──
  const [currentTime, setCurrentTime] = useState('');
  const [currentDateAr, setCurrentDateAr] = useState('');

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      setCurrentDateAr(now.toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  // ── Data state ──
  const [companyName, setCompanyName] = useState('M2INFINITY');
  const [employeeName, setEmployeeName] = useState('');
  const [employeeCode, setEmployeeCode] = useState('');
  const [employeeJob, setEmployeeJob] = useState('');

  // Attendance
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [attPage, setAttPage] = useState(1);
  const [attTotalPages, setAttTotalPages] = useState(1);
  const [todayRecord, setTodayRecord] = useState<AttendanceRecord | null>(null);
  const [checkInLoading, setCheckInLoading] = useState(false);
  const [checkOutLoading, setCheckOutLoading] = useState(false);

  // Leaves
  const [leaves, setLeaves] = useState<LeaveRecord[]>([]);
  const [leavesLoading, setLeavesLoading] = useState(false);
  const [leavePage, setLeavePage] = useState(1);
  const [leaveTotalPages, setLeaveTotalPages] = useState(1);

  // Reports
  const [reports, setReports] = useState<ReportsData | null>(null);
  const [reportsLoading, setReportsLoading] = useState(false);

  // Leave dialog
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);
  const [leaveForm, setLeaveForm] = useState({ type: 'annual', startDate: '', endDate: '', reason: '' });
  const [leaveSubmitting, setLeaveSubmitting] = useState(false);

  // Initial loading
  const [initialLoading, setInitialLoading] = useState(true);

  // ── Fetch helpers ──
  const employeeId = session.employeeId || '';

  const fetchAttendance = useCallback(async (page: number) => {
    if (!employeeId) return;
    setAttendanceLoading(true);
    try {
      const res = await fetch(`/api/attendance?employeeId=${employeeId}&page=${page}`);
      if (!res.ok) throw new Error('فشل في جلب بيانات الحضور');
      const data = await res.json();
      setAttendance(data.records || []);
      setAttTotalPages(data.totalPages || 1);
      setAttPage(page);

      // Extract employee info from first record if available
      if (data.records && data.records.length > 0) {
        const rec = data.records[0] as AttendanceRecord;
        if (rec.employeeName) setEmployeeName(rec.employeeName);
        if (rec.employeeCode) setEmployeeCode(rec.employeeCode);
        if (rec.employeeJob) setEmployeeJob(rec.employeeJob);
      }

      // Check if there's a record for today
      const today = new Date().toISOString().split('T')[0];
      const todayRec = (data.records || []).find((r: AttendanceRecord) => {
        if (!r.date) return false;
        return r.date.startsWith(today);
      });
      if (todayRec) {
        setTodayRecord(todayRec);
      } else {
        setTodayRecord(null);
      }
    } catch (err) {
      console.error(err);
      toast({ title: 'خطأ', description: 'فشل في جلب بيانات الحضور', variant: 'destructive' });
    } finally {
      setAttendanceLoading(false);
    }
  }, [employeeId, toast]);

  const fetchLeaves = useCallback(async (page: number) => {
    setLeavesLoading(true);
    try {
      const res = await fetch(`/api/leaves?page=${page}`);
      if (!res.ok) throw new Error('فشل في جلب بيانات الإجازات');
      const data = await res.json();
      setLeaves(data.records || []);
      setLeaveTotalPages(data.totalPages || 1);
      setLeavePage(page);
    } catch (err) {
      console.error(err);
      toast({ title: 'خطأ', description: 'فشل في جلب بيانات الإجازات', variant: 'destructive' });
    } finally {
      setLeavesLoading(false);
    }
  }, [toast]);

  const fetchReports = useCallback(async () => {
    setReportsLoading(true);
    try {
      const res = await fetch('/api/reports');
      if (!res.ok) throw new Error('فشل في جلب التقرير المالي');
      const data = await res.json();
      setReports(data);
    } catch (err) {
      console.error(err);
      toast({ title: 'خطأ', description: 'فشل في جلب التقرير المالي', variant: 'destructive' });
    } finally {
      setReportsLoading(false);
    }
  }, [toast]);

  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch('/api/settings');
      if (!res.ok) return;
      const data = await res.json();
      if (data.companyName) setCompanyName(data.companyName);
    } catch {
      // silent
    }
  }, []);

  // ── Initial data load ──
  useEffect(() => {
    let mounted = true;
    (async () => {
      await Promise.all([
        fetchAttendance(1),
        fetchLeaves(1),
        fetchReports(),
        fetchSettings(),
      ]);
      if (mounted) setInitialLoading(false);
    })();
    return () => { mounted = false; };
  }, [fetchAttendance, fetchLeaves, fetchReports, fetchSettings]);

  // ── Check-in ──
  const handleCheckIn = async () => {
    setCheckInLoading(true);
    try {
      const res = await fetch('/api/attendance/check-in', { method: 'POST' });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'فشل في تسجيل الحضور');
      }
      toast({ title: 'تم بنجاح', description: 'تم تسجيل حضورك بنجاح ✓' });
      await fetchAttendance(1);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'فشل في تسجيل الحضور';
      toast({ title: 'خطأ', description: msg, variant: 'destructive' });
    } finally {
      setCheckInLoading(false);
    }
  };

  // ── Check-out ──
  const handleCheckOut = async () => {
    setCheckOutLoading(true);
    try {
      const res = await fetch('/api/attendance/check-out', { method: 'POST' });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'فشل في تسجيل الانصراف');
      }
      toast({ title: 'تم بنجاح', description: 'تم تسجيل انصرافك بنجاح ✓' });
      await fetchAttendance(1);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'فشل في تسجيل الانصراف';
      toast({ title: 'خطأ', description: msg, variant: 'destructive' });
    } finally {
      setCheckOutLoading(false);
    }
  };

  // ── Submit leave ──
  const handleSubmitLeave = async () => {
    if (!leaveForm.startDate || !leaveForm.endDate) {
      toast({ title: 'خطأ', description: 'يرجى تحديد تاريخ البداية والنهاية', variant: 'destructive' });
      return;
    }
    if (new Date(leaveForm.endDate) < new Date(leaveForm.startDate)) {
      toast({ title: 'خطأ', description: 'تاريخ النهاية يجب أن يكون بعد تاريخ البداية', variant: 'destructive' });
      return;
    }
    setLeaveSubmitting(true);
    try {
      const res = await fetch('/api/leaves', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId,
          type: leaveForm.type,
          startDate: leaveForm.startDate,
          endDate: leaveForm.endDate,
          reason: leaveForm.reason,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'فشل في تقديم طلب الإجازة');
      }
      toast({ title: 'تم بنجاح', description: 'تم تقديم طلب الإجازة بنجاح ✓' });
      setLeaveDialogOpen(false);
      setLeaveForm({ type: 'annual', startDate: '', endDate: '', reason: '' });
      await fetchLeaves(1);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'فشل في تقديم طلب الإجازة';
      toast({ title: 'خطأ', description: msg, variant: 'destructive' });
    } finally {
      setLeaveSubmitting(false);
    }
  };

  // ── Logout ──
  const handleLogout = async () => {
    try {
      await fetch('/api/auth/session', { method: 'POST' });
    } catch {
      // silent
    }
    onLogout();
  };

  // ── Derived values ──
  const hasCheckedInToday = todayRecord && todayRecord.checkIn && !todayRecord.checkOut;
  const hasCompletedToday = todayRecord && todayRecord.checkIn && todayRecord.checkOut;
  const canCheckIn = !todayRecord || (!todayRecord.checkIn);
  const canCheckOut = hasCheckedInToday;

  // Salary calculation from reports
  const baseSalary = reports?.salary || 0;
  const totalDeductions = reports?.totalDeductions || 0;
  const totalAdvances = reports?.totalAdvances || 0;
  const totalDelay = reports?.totalDelay || 0;
  const netSalary = baseSalary - totalDeductions - totalAdvances;

  // ── Status badge color for leaves ──
  function leaveStatusVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
    if (status === 'approved') return 'default';
    if (status === 'rejected') return 'destructive';
    return 'secondary';
  }

  function leaveStatusClass(status: string): string {
    if (status === 'approved') return 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300';
    if (status === 'rejected') return 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300';
    return 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300';
  }

  // ── Initial loading screen ──
  if (initialLoading) {
    return (
      <div dir="rtl" className="min-h-screen bg-gradient-to-br from-teal-50 to-white dark:from-gray-950 dark:to-gray-900 flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-10 w-10 text-teal-600 animate-spin mx-auto" />
          <p className="text-gray-600 dark:text-gray-300 text-lg">جاري تحميل البوابة...</p>
        </div>
      </div>
    );
  }

  // ── Render ──
  return (
    <div dir="rtl" className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-amber-50/30 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      <div className="max-w-[880px] mx-auto px-4 py-6 flex flex-col min-h-screen">

        {/* ─── Header ─── */}
        <header className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <h1 className="text-xl sm:text-2xl font-bold text-teal-700 dark:text-teal-400">{companyName}</h1>
            <Badge className="bg-teal-600 text-white hover:bg-teal-700 text-xs sm:text-sm">موظف</Badge>
          </div>
          <div className="flex items-center gap-2">
            {/* Clock */}
            <div className="hidden sm:flex flex-col items-end text-xs text-gray-500 dark:text-gray-400 ml-2">
              <span className="font-mono text-base font-semibold text-gray-700 dark:text-gray-200">{currentTime}</span>
              <span>{currentDateAr}</span>
            </div>
            {/* Theme toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="rounded-full"
              aria-label="تبديل المظهر"
            >
              {theme === 'dark' ? <Sun className="h-5 w-5 text-amber-400" /> : <Moon className="h-5 w-5 text-gray-600" />}
            </Button>
            {/* Logout */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 dark:border-red-800 dark:hover:bg-red-950 dark:text-red-400 dark:hover:text-red-300"
            >
              <LogOut className="h-4 w-4 ml-1" />
              <span className="hidden sm:inline">خروج</span>
            </Button>
          </div>
        </header>

        {/* Mobile clock */}
        <div className="sm:hidden text-center mb-4">
          <p className="font-mono text-lg font-semibold text-gray-700 dark:text-gray-200">{currentTime}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">{currentDateAr}</p>
        </div>

        {/* ─── Employee Info Card ─── */}
        <Card className="mb-6 border-teal-100 dark:border-teal-900/50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              {/* Avatar */}
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-teal-500 to-teal-700 flex items-center justify-center shrink-0 shadow-lg shadow-teal-500/20">
                <span className="text-2xl sm:text-3xl font-bold text-white">
                  {employeeName ? employeeName.charAt(0) : '?'}
                </span>
              </div>
              {/* Info */}
              <div className="flex-1 min-w-0">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white truncate">
                  {employeeName || 'موظف'}
                </h2>
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  {employeeCode && (
                    <Badge variant="outline" className="font-mono text-sm border-teal-300 text-teal-700 dark:border-teal-700 dark:text-teal-400">
                      {employeeCode}
                    </Badge>
                  )}
                  {employeeJob && (
                    <span className="text-sm text-gray-500 dark:text-gray-400">{employeeJob}</span>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ─── Tabs ─── */}
        <Tabs defaultValue="attendance" className="flex-1" onValueChange={() => {}}>
          <TabsList className="w-full grid grid-cols-4 mb-6 bg-gray-100 dark:bg-gray-800 h-auto p-1">
            <TabsTrigger value="attendance" className="text-xs sm:text-sm py-2.5 data-[state=active]:bg-teal-600 data-[state=active]:text-white">
              <Fingerprint className="h-4 w-4 ml-1 hidden sm:inline-block" />
              الحضور
            </TabsTrigger>
            <TabsTrigger value="salary" className="text-xs sm:text-sm py-2.5 data-[state=active]:bg-teal-600 data-[state=active]:text-white">
              <DollarSign className="h-4 w-4 ml-1 hidden sm:inline-block" />
              مرتبي
            </TabsTrigger>
            <TabsTrigger value="leaves" className="text-xs sm:text-sm py-2.5 data-[state=active]:bg-teal-600 data-[state=active]:text-white">
              <Plane className="h-4 w-4 ml-1 hidden sm:inline-block" />
              إجازاتي
            </TabsTrigger>
            <TabsTrigger value="summary" className="text-xs sm:text-sm py-2.5 data-[state=active]:bg-teal-600 data-[state=active]:text-white">
              <TrendingUp className="h-4 w-4 ml-1 hidden sm:inline-block" />
              ملخص
            </TabsTrigger>
          </TabsList>

          {/* ═══════════════ TAB 1: ATTENDANCE ═══════════════ */}
          <TabsContent value="attendance" className="space-y-6">
            {/* Action Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {canCheckIn && (
                <Button
                  onClick={handleCheckIn}
                  disabled={checkInLoading}
                  className="h-20 text-lg font-bold bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-500/30 transition-all hover:scale-[1.02]"
                >
                  {checkInLoading ? (
                    <Loader2 className="h-6 w-6 animate-spin ml-2" />
                  ) : (
                    <Fingerprint className="h-6 w-6 ml-2" />
                  )}
                  تسجيل حضور
                </Button>
              )}
              {canCheckOut && (
                <Button
                  onClick={handleCheckOut}
                  disabled={checkOutLoading}
                  className="h-20 text-lg font-bold bg-amber-500 hover:bg-amber-600 text-white shadow-lg shadow-amber-500/30 transition-all hover:scale-[1.02]"
                >
                  {checkOutLoading ? (
                    <Loader2 className="h-6 w-6 animate-spin ml-2" />
                  ) : (
                    <LogOut className="h-6 w-6 ml-2" />
                  )}
                  تسجيل انصراف
                </Button>
              )}
              {hasCompletedToday && todayRecord && (
                <div className="col-span-full flex items-center justify-center gap-3 p-6 rounded-xl bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800">
                  <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
                  <div>
                    <p className="text-lg font-bold text-green-700 dark:text-green-300">اكتمل يومك ✓</p>
                    <p className="text-sm text-green-600 dark:text-green-400">
                      حضور: {formatTime(todayRecord.checkIn)} — انصراف: {formatTime(todayRecord.checkOut)}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Attendance Table */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <CalendarDays className="h-5 w-5 text-teal-600" />
                  سجل الحضور الأخير
                </CardTitle>
              </CardHeader>
              <CardContent>
                {attendanceLoading ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="h-8 w-8 text-teal-600 animate-spin" />
                  </div>
                ) : attendance.length === 0 ? (
                  <p className="text-center text-gray-400 py-12">لا توجد سجلات حضور بعد</p>
                ) : (
                  <>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="border-gray-200 dark:border-gray-700">
                            <TableHead className="text-center">التاريخ</TableHead>
                            <TableHead className="text-center">حضور</TableHead>
                            <TableHead className="text-center">انصراف</TableHead>
                            <TableHead className="text-center">تأخير</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {attendance.map((rec) => (
                            <TableRow key={rec.id} className="border-gray-100 dark:border-gray-800">
                              <TableCell className="text-center text-sm">
                                {formatDateAr(rec.date || '')}
                              </TableCell>
                              <TableCell className="text-center font-mono text-sm">
                                {formatTime(rec.checkIn)}
                              </TableCell>
                              <TableCell className="text-center font-mono text-sm">
                                {formatTime(rec.checkOut)}
                              </TableCell>
                              <TableCell className="text-center text-sm">
                                {rec.delayMinutes && rec.delayMinutes > 0 ? (
                                  <span className="text-red-600 dark:text-red-400 font-semibold">
                                    {fmtNum(rec.delayMinutes)} د
                                  </span>
                                ) : (
                                  <span className="text-green-600 dark:text-green-400">—</span>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    {/* Pagination */}
                    {attTotalPages > 1 && (
                      <div className="flex items-center justify-center gap-2 mt-4">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={attPage <= 1}
                          onClick={() => fetchAttendance(attPage - 1)}
                        >
                          السابق
                        </Button>
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          {fmtNum(attPage)} / {fmtNum(attTotalPages)}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={attPage >= attTotalPages}
                          onClick={() => fetchAttendance(attPage + 1)}
                        >
                          التالي
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ═══════════════ TAB 2: MY SALARY ═══════════════ */}
          <TabsContent value="salary">
            <Card className="overflow-hidden border-teal-100 dark:border-teal-900/50">
              <CardHeader className="bg-gradient-to-l from-teal-600 to-teal-700 text-white">
                <CardTitle className="text-xl flex items-center gap-2">
                  <DollarSign className="h-6 w-6" />
                  كشف راتب — {getCurrentMonthName()}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {reportsLoading ? (
                  <div className="flex justify-center py-16">
                    <Loader2 className="h-8 w-8 text-teal-600 animate-spin" />
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100 dark:divide-gray-800">
                    {/* Base Salary */}
                    <div className="flex items-center justify-between px-6 py-4">
                      <span className="text-gray-700 dark:text-gray-300 flex items-center gap-2">
                        <span className="text-xl">💰</span> الراتب الأساسي
                      </span>
                      <span className="text-lg font-bold text-teal-700 dark:text-teal-400 font-mono">
                        {fmtMoney(baseSalary)} ج.م
                      </span>
                    </div>
                    {/* Delay Deduction */}
                    <div className="flex items-center justify-between px-6 py-4 bg-red-50/50 dark:bg-red-950/20">
                      <span className="text-gray-700 dark:text-gray-300 flex items-center gap-2">
                        <span className="text-xl">⏰</span> خصم تأخير
                      </span>
                      <span className="text-lg font-semibold text-red-600 dark:text-red-400 font-mono">
                        -{fmtMoney(totalDeductions)} ج.م
                      </span>
                    </div>
                    {/* Advances */}
                    <div className="flex items-center justify-between px-6 py-4 bg-amber-50/50 dark:bg-amber-950/20">
                      <span className="text-gray-700 dark:text-gray-300 flex items-center gap-2">
                        <span className="text-xl">💸</span> سلفة
                      </span>
                      <span className="text-lg font-semibold text-red-600 dark:text-red-400 font-mono">
                        -{fmtMoney(totalAdvances)} ج.م
                      </span>
                    </div>
                    {/* Net Salary */}
                    <div className="flex items-center justify-between px-6 py-5 bg-green-50 dark:bg-green-950/30">
                      <span className="text-lg font-bold text-green-800 dark:text-green-300 flex items-center gap-2">
                        <span className="text-2xl">🏆</span> الصافي
                      </span>
                      <span className="text-2xl font-black text-green-700 dark:text-green-400 font-mono">
                        {fmtMoney(netSalary)} ج.م
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ═══════════════ TAB 3: MY LEAVES ═══════════════ */}
          <TabsContent value="leaves" className="space-y-4">
            {/* Request button */}
            <div className="flex justify-end">
              <Button
                onClick={() => setLeaveDialogOpen(true)}
                className="bg-teal-600 hover:bg-teal-700 text-white"
              >
                <Plane className="h-4 w-4 ml-2" />
                طلب إجازة
              </Button>
            </div>

            <Card>
              <CardContent className="p-0">
                {leavesLoading ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="h-8 w-8 text-teal-600 animate-spin" />
                  </div>
                ) : leaves.length === 0 ? (
                  <p className="text-center text-gray-400 py-12">لا توجد طلبات إجازة</p>
                ) : (
                  <>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="border-gray-200 dark:border-gray-700">
                            <TableHead className="text-center">النوع</TableHead>
                            <TableHead className="text-center">من</TableHead>
                            <TableHead className="text-center">إلى</TableHead>
                            <TableHead className="text-center">الأيام</TableHead>
                            <TableHead className="text-center">الحالة</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {leaves.map((lv) => (
                            <TableRow key={lv.id} className="border-gray-100 dark:border-gray-800">
                              <TableCell className="text-center text-sm">
                                {LEAVE_TYPE_LABELS[lv.type] || lv.type}
                              </TableCell>
                              <TableCell className="text-center text-sm">
                                {formatDateAr(lv.startDate)}
                              </TableCell>
                              <TableCell className="text-center text-sm">
                                {formatDateAr(lv.endDate)}
                              </TableCell>
                              <TableCell className="text-center text-sm font-mono">
                                {fmtNum(lv.days)}
                              </TableCell>
                              <TableCell className="text-center">
                                <Badge
                                  variant={leaveStatusVariant(lv.status)}
                                  className={leaveStatusClass(lv.status)}
                                >
                                  {LEAVE_STATUS_LABELS[lv.status] || lv.status}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    {/* Pagination */}
                    {leaveTotalPages > 1 && (
                      <div className="flex items-center justify-center gap-2 mt-4 pb-4">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={leavePage <= 1}
                          onClick={() => fetchLeaves(leavePage - 1)}
                        >
                          السابق
                        </Button>
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          {fmtNum(leavePage)} / {fmtNum(leaveTotalPages)}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={leavePage >= leaveTotalPages}
                          onClick={() => fetchLeaves(leavePage + 1)}
                        >
                          التالي
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ═══════════════ TAB 4: FINANCIAL SUMMARY ═══════════════ */}
          <TabsContent value="summary">
            {reportsLoading ? (
              <div className="flex justify-center py-16">
                <Loader2 className="h-8 w-8 text-teal-600 animate-spin" />
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Base Salary */}
                <Card className="border-teal-100 dark:border-teal-900/50 overflow-hidden">
                  <CardContent className="p-5">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-lg bg-teal-100 dark:bg-teal-900/50 flex items-center justify-center">
                        <DollarSign className="h-5 w-5 text-teal-600 dark:text-teal-400" />
                      </div>
                      <span className="text-sm text-gray-500 dark:text-gray-400">الراتب الأساسي</span>
                    </div>
                    <p className="text-2xl font-bold text-teal-700 dark:text-teal-400 font-mono">
                      {fmtMoney(baseSalary)} <span className="text-sm font-normal">ج.م</span>
                    </p>
                  </CardContent>
                </Card>

                {/* Total Deductions */}
                <Card className="border-red-100 dark:border-red-900/50 overflow-hidden">
                  <CardContent className="p-5">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-lg bg-red-100 dark:bg-red-900/50 flex items-center justify-center">
                        <TrendingDown className="h-5 w-5 text-red-600 dark:text-red-400" />
                      </div>
                      <span className="text-sm text-gray-500 dark:text-gray-400">إجمالي الخصومات (٦ أشهر)</span>
                    </div>
                    <p className="text-2xl font-bold text-red-600 dark:text-red-400 font-mono">
                      {fmtMoney(totalDeductions)} <span className="text-sm font-normal">ج.م</span>
                    </p>
                  </CardContent>
                </Card>

                {/* Total Advances */}
                <Card className="border-amber-100 dark:border-amber-900/50 overflow-hidden">
                  <CardContent className="p-5">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center">
                        <DollarSign className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                      </div>
                      <span className="text-sm text-gray-500 dark:text-gray-400">إجمالي السلف (٦ أشهر)</span>
                    </div>
                    <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 font-mono">
                      {fmtMoney(totalAdvances)} <span className="text-sm font-normal">ج.م</span>
                    </p>
                  </CardContent>
                </Card>

                {/* Total Delay */}
                <Card className="border-blue-100 dark:border-blue-900/50 overflow-hidden">
                  <CardContent className="p-5">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center">
                        <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <span className="text-sm text-gray-500 dark:text-gray-400">إجمالي التأخير</span>
                    </div>
                    <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 font-mono">
                      {fmtNum(totalDelay)} <span className="text-sm font-normal">دقيقة</span>
                    </p>
                  </CardContent>
                </Card>

                {/* Complete Days */}
                <Card className="border-green-100 dark:border-green-900/50 overflow-hidden">
                  <CardContent className="p-5">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/50 flex items-center justify-center">
                        <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                      </div>
                      <span className="text-sm text-gray-500 dark:text-gray-400">أيام اكتمال الحضور</span>
                    </div>
                    <p className="text-2xl font-bold text-green-600 dark:text-green-400 font-mono">
                      {fmtNum(reports?.completeDays)} <span className="text-sm font-normal">يوم</span>
                    </p>
                  </CardContent>
                </Card>

                {/* Leave Days */}
                <Card className="border-pink-100 dark:border-pink-900/50 overflow-hidden">
                  <CardContent className="p-5">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-lg bg-pink-100 dark:bg-pink-900/50 flex items-center justify-center">
                        <Plane className="h-5 w-5 text-pink-600 dark:text-pink-400" />
                      </div>
                      <span className="text-sm text-gray-500 dark:text-gray-400">أيام الإجازات</span>
                    </div>
                    <p className="text-2xl font-bold text-pink-600 dark:text-pink-400 font-mono">
                      {fmtNum(reports?.leaveDays)} <span className="text-sm font-normal">يوم</span>
                    </p>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* ─── Leave Request Dialog ─── */}
        <Dialog open={leaveDialogOpen} onOpenChange={setLeaveDialogOpen}>
          <DialogContent className="sm:max-w-md" dir="rtl">
            <DialogHeader>
              <DialogTitle className="text-xl flex items-center gap-2">
                <Plane className="h-5 w-5 text-teal-600" />
                طلب إجازة جديدة
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              {/* Type */}
              <div className="space-y-2">
                <Label>نوع الإجازة</Label>
                <Select
                  value={leaveForm.type}
                  onValueChange={(val) => setLeaveForm({ ...leaveForm, type: val })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="annual">اعتيادية</SelectItem>
                    <SelectItem value="sick">مرضية</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {/* Start Date */}
              <div className="space-y-2">
                <Label>تاريخ البداية</Label>
                <Input
                  type="date"
                  value={leaveForm.startDate}
                  onChange={(e) => setLeaveForm({ ...leaveForm, startDate: e.target.value })}
                />
              </div>
              {/* End Date */}
              <div className="space-y-2">
                <Label>تاريخ النهاية</Label>
                <Input
                  type="date"
                  value={leaveForm.endDate}
                  onChange={(e) => setLeaveForm({ ...leaveForm, endDate: e.target.value })}
                />
              </div>
              {/* Reason */}
              <div className="space-y-2">
                <Label>السبب</Label>
                <Textarea
                  placeholder="اكتب سبب الإجازة..."
                  value={leaveForm.reason}
                  onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })}
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                variant="outline"
                onClick={() => setLeaveDialogOpen(false)}
                disabled={leaveSubmitting}
              >
                إلغاء
              </Button>
              <Button
                onClick={handleSubmitLeave}
                disabled={leaveSubmitting}
                className="bg-teal-600 hover:bg-teal-700 text-white"
              >
                {leaveSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin ml-2" />
                ) : null}
                تقديم الطلب
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </div>
    </div>
  );
}