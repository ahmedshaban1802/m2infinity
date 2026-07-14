'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTheme } from '@/components/theme-provider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts';
import {
  Users, UserCheck, UserX, Clock, CalendarDays, DollarSign, Settings,
  Bell, Sun, Moon, LogOut, Plus, Pencil, Trash2, Search, Download, Save,
  X, Check, Building2, Fingerprint, CreditCard, HandCoins, AlertTriangle,
  ChevronRight, ChevronLeft, Loader2, UserPlus, ShieldCheck,
} from 'lucide-react';

interface AdminDashboardProps {
  session: { id: string; username: string; role: string; employeeId: string | null };
  onLogout: () => void;
}

interface Employee {
  id: string;
  name: string;
  job: string;
  salary: number;
  role: string;
  phone?: string;
  address?: string;
  code?: string;
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

interface SalaryRecord {
  id: string;
  employeeId: string;
  employeeName?: string;
  employeeJob?: string;
  baseSalary: number;
  delayDeduction: number;
  otherDeductions: number;
  advances: number;
  netSalary: number;
}

interface Notification {
  id: string;
  title?: string;
  message?: string;
  read?: boolean;
  createdAt?: string;
}

interface PendingAccount {
  id: string;
  employeeName?: string;
  job?: string;
  idCardImage?: string;
  username?: string;
}

interface AccountRecord {
  id: string;
  employeeId: string;
  employeeName?: string;
  username: string;
}

interface ReportData {
  attendanceRate: number;
  totalLate: number;
  totalLeaveDays: number;
  totalDeductions: number;
  weekly: { label: string; present: number; absent: number }[];
  delayRanking: { name: string; mins: number }[];
  empCount: number;
}

interface SettingsData {
  companyName: string;
  logo?: string;
  workStart: string;
  workEnd: string;
  delayDeductionPerMin: number;
  advancePercent: number;
  gpsLat: number;
  gpsLng: number;
  gpsRadius: number;
  adminUsername: string;
}

const ROLE_LABELS: Record<string, string> = { Employee: 'موظف', HR: 'موارد بشرية', Manager: 'مدير' };
const METHOD_LABELS: Record<string, string> = { gps: 'GPS', qr: 'QR', upc: 'UPC', manual: 'يدوي' };
const LEAVE_TYPE_LABELS: Record<string, string> = { annual: 'اعتيادية', sick: 'مرضية' };
const LEAVE_STATUS_LABELS: Record<string, string> = { pending: 'معلّق', approved: 'مقبول', rejected: 'مرفوض' };

function fmtMoney(n: number | undefined | null): string {
  if (n === undefined || n === null) return '٠';
  return Number(n).toLocaleString('ar-EG');
}

function getAttendanceStatus(rec: AttendanceRecord): string {
  if (!rec.checkIn) return 'غائب';
  if (!rec.checkOut) return 'حاضر';
  return 'اكتمل';
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

function getMonthKey(monthsAgo: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() - monthsAgo);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function getMonthLabel(monthsAgo: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() - monthsAgo);
  return d.toLocaleDateString('ar-EG', { year: 'numeric', month: 'long' });
}

export default function AdminDashboard({ session, onLogout }: AdminDashboardProps) {
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();

  const [companyName, setCompanyName] = useState('M2INFINITY');
  const [currentTime, setCurrentTime] = useState('');
  const [currentDateAr, setCurrentDateAr] = useState('');
  const [activeTab, setActiveTab] = useState('dashboard');

  // Notifications
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  // Pending accounts
  const [pendingAccounts, setPendingAccounts] = useState<PendingAccount[]>([]);
  const [pendingDialogOpen, setPendingDialogOpen] = useState(false);
  const [pendingLoading, setPendingLoading] = useState(false);

  // Accounts management
  const [accounts, setAccounts] = useState<AccountRecord[]>([]);
  const [accountsDialogOpen, setAccountsDialogOpen] = useState(false);
  const [accountsLoading, setAccountsLoading] = useState(false);
  const [editingAccount, setEditingAccount] = useState<AccountRecord | null>(null);
  const [editAccountUsername, setEditAccountUsername] = useState('');
  const [editAccountPassword, setEditAccountPassword] = useState('');

  // Dashboard
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [reportLoading, setReportLoading] = useState(false);

  // Employees
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [employeesLoading, setEmployeesLoading] = useState(false);
  const [empSearch, setEmpSearch] = useState('');
  const [empRoleFilter, setEmpRoleFilter] = useState('all');
  const [empPage, setEmpPage] = useState(1);
  const [empTotalPages, setEmpTotalPages] = useState(1);
  const [empDialogOpen, setEmpDialogOpen] = useState(false);
  const [empEditing, setEmpEditing] = useState<Employee | null>(null);
  const [empForm, setEmpForm] = useState({ name: '', job: '', salary: '', role: 'Employee', phone: '', address: '' });
  const [empSaving, setEmpSaving] = useState(false);
  const [empDeleteId, setEmpDeleteId] = useState<string | null>(null);
  const [empDeleting, setEmpDeleting] = useState(false);

  // Attendance
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [attPage, setAttPage] = useState(1);
  const [attTotalPages, setAttTotalPages] = useState(1);
  const [manualEmpId, setManualEmpId] = useState('');
  const [manualSaving, setManualSaving] = useState(false);

  // Leaves
  const [leaves, setLeaves] = useState<LeaveRecord[]>([]);
  const [leavesLoading, setLeavesLoading] = useState(false);
  const [leaveStatusFilter, setLeaveStatusFilter] = useState('all');
  const [leavePage, setLeavePage] = useState(1);
  const [leaveTotalPages, setLeaveTotalPages] = useState(1);
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);
  const [leaveForm, setLeaveForm] = useState({ employeeId: '', type: 'annual', startDate: '', endDate: '', reason: '' });
  const [leaveSaving, setLeaveSaving] = useState(false);

  // Salaries
  const [salaryMonth, setSalaryMonth] = useState(getMonthKey(0));
  const [salaries, setSalaries] = useState<SalaryRecord[]>([]);
  const [salariesLoading, setSalariesLoading] = useState(false);
  const [salarySummary, setSalarySummary] = useState({ base: 0, delayDeduction: 0, otherDeductions: 0, net: 0 });
  const [deductionDialogOpen, setDeductionDialogOpen] = useState(false);
  const [deductionForm, setDeductionForm] = useState({ employeeId: '', amount: '', reason: '' });
  const [deductionSaving, setDeductionSaving] = useState(false);
  const [advanceDialogOpen, setAdvanceDialogOpen] = useState(false);
  const [advanceForm, setAdvanceForm] = useState({ employeeId: '', amount: '', reason: '' });
  const [advanceSaving, setAdvanceSaving] = useState(false);

  // Settings
  const [settings, setSettings] = useState<SettingsData>({
    companyName: '', workStart: '08:00', workEnd: '17:00',
    delayDeductionPerMin: 1, advancePercent: 25,
    gpsLat: 0, gpsLng: 0, gpsRadius: 100, adminUsername: '',
  });
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsForm, setSettingsForm] = useState({
    companyName: '', workStart: '08:00', workEnd: '17:00',
    delayDeductionPerMin: '1', advancePercent: '25',
    gpsLat: '0', gpsLng: '0', gpsRadius: '100',
    adminUsername: '', adminPassword: '', adminPasswordConfirm: '',
  });
  const [logoFile, setLogoFile] = useState<File | null>(null);

  // ─── Clock ───
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      setCurrentDateAr(now.toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }));
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  // ─── Fetch helpers ───
  const apiFetch = useCallback(async (url: string, options?: RequestInit) => {
    const res = await fetch(url, { headers: { 'Content-Type': 'application/json', ...options?.headers }, ...options });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(text || `Error ${res.status}`);
    }
    return res.json();
  }, []);

  // ─── Load settings & notifications on mount ───
  useEffect(() => {
    apiFetch('/api/settings').then((data: SettingsData) => {
      setSettings(data);
      setCompanyName(data.companyName || 'M2INFINITY');
      setSettingsForm((f) => ({
        ...f,
        companyName: data.companyName || '',
        workStart: data.workStart || '08:00',
        workEnd: data.workEnd || '17:00',
        delayDeductionPerMin: String(data.delayDeductionPerMin ?? 1),
        advancePercent: String(data.advancePercent ?? 25),
        gpsLat: String(data.gpsLat ?? 0),
        gpsLng: String(data.gpsLng ?? 0),
        gpsRadius: String(data.gpsRadius ?? 100),
        adminUsername: data.adminUsername || '',
      }));
    }).catch(() => {});

    apiFetch('/api/notifications').then((data: Notification[]) => {
      setNotifications(data);
      setUnreadCount(data.filter((n) => !n.read).length);
    }).catch(() => {});

    apiFetch('/api/pending').then((data: PendingAccount[]) => {
      setPendingAccounts(data);
    }).catch(() => {});
  }, [apiFetch]);

  // ─── Load data based on active tab ───
  const fetchEmployees = useCallback(async (page: number, search: string, role: string) => {
    setEmployeesLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page) });
      if (search) params.set('search', search);
      if (role && role !== 'all') params.set('role', role);
      const data = await apiFetch(`/api/employees?${params}`);
      setEmployees(data.employees || data.data || []);
      setEmpTotalPages(data.totalPages || Math.ceil((data.total || 0) / 10) || 1);
    } catch (e: unknown) {
      toast({ title: 'خطأ', description: e instanceof Error ? e.message : 'فشل تحميل الموظفين', variant: 'destructive' });
    } finally {
      setEmployeesLoading(false);
    }
  }, [apiFetch, toast]);

  const fetchAttendance = useCallback(async (date: string, page: number) => {
    setAttendanceLoading(true);
    try {
      const params = new URLSearchParams({ date, page: String(page) });
      const data = await apiFetch(`/api/attendance?${params}`);
      setAttendance(data.records || data.data || []);
      setAttTotalPages(data.totalPages || Math.ceil((data.total || 0) / 10) || 1);
    } catch (e: unknown) {
      toast({ title: 'خطأ', description: e instanceof Error ? e.message : 'فشل تحميل الحضور', variant: 'destructive' });
    } finally {
      setAttendanceLoading(false);
    }
  }, [apiFetch, toast]);

  const fetchLeaves = useCallback(async (status: string, page: number) => {
    setLeavesLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page) });
      if (status && status !== 'all') params.set('status', status);
      const data = await apiFetch(`/api/leaves?${params}`);
      setLeaves(data.leaves || data.data || []);
      setLeaveTotalPages(data.totalPages || Math.ceil((data.total || 0) / 10) || 1);
    } catch (e: unknown) {
      toast({ title: 'خطأ', description: e instanceof Error ? e.message : 'فشل تحميل الإجازات', variant: 'destructive' });
    } finally {
      setLeavesLoading(false);
    }
  }, [apiFetch, toast]);

  const fetchSalaries = useCallback(async (month: string) => {
    setSalariesLoading(true);
    try {
      const data = await apiFetch(`/api/salaries?month=${month}`);
      const list = data.salaries || data.data || [];
      setSalaries(list);
      const base = list.reduce((s: number, r: SalaryRecord) => s + (r.baseSalary || 0), 0);
      const delay = list.reduce((s: number, r: SalaryRecord) => s + (r.delayDeduction || 0), 0);
      const other = list.reduce((s: number, r: SalaryRecord) => s + (r.otherDeductions || 0), 0);
      const net = list.reduce((s: number, r: SalaryRecord) => s + (r.netSalary || 0), 0);
      setSalarySummary({ base, delayDeduction: delay, otherDeductions: other, net });
    } catch (e: unknown) {
      toast({ title: 'خطأ', description: e instanceof Error ? e.message : 'فشل تحميل الرواتب', variant: 'destructive' });
    } finally {
      setSalariesLoading(false);
    }
  }, [apiFetch, toast]);

  const fetchReport = useCallback(async () => {
    setReportLoading(true);
    try {
      const data = await apiFetch('/api/reports');
      setReportData(data);
    } catch (e: unknown) {
      toast({ title: 'خطأ', description: e instanceof Error ? e.message : 'فشل تحميل التقرير', variant: 'destructive' });
    } finally {
      setReportLoading(false);
    }
  }, [apiFetch, toast]);

  useEffect(() => {
    if (activeTab === 'dashboard') fetchReport();
    if (activeTab === 'employees') fetchEmployees(empPage, empSearch, empRoleFilter);
    if (activeTab === 'attendance') fetchAttendance(attendanceDate, attPage);
    if (activeTab === 'leaves') fetchLeaves(leaveStatusFilter, leavePage);
    if (activeTab === 'salaries') fetchSalaries(salaryMonth);
  }, [activeTab]);

  // Re-fetch when pagination/filter changes within a tab
  useEffect(() => {
    if (activeTab === 'employees') fetchEmployees(empPage, empSearch, empRoleFilter);
  }, [empPage, empSearch, empRoleFilter]);

  useEffect(() => {
    if (activeTab === 'attendance') fetchAttendance(attendanceDate, attPage);
  }, [attendanceDate, attPage]);

  useEffect(() => {
    if (activeTab === 'leaves') fetchLeaves(leaveStatusFilter, leavePage);
  }, [leaveStatusFilter, leavePage]);

  useEffect(() => {
    if (activeTab === 'salaries') fetchSalaries(salaryMonth);
  }, [salaryMonth]);

  // Close notification dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // ─── Employee CRUD ───
  const openAddEmployee = () => {
    setEmpEditing(null);
    setEmpForm({ name: '', job: '', salary: '', role: 'Employee', phone: '', address: '' });
    setEmpDialogOpen(true);
  };

  const openEditEmployee = (emp: Employee) => {
    setEmpEditing(emp);
    setEmpForm({ name: emp.name, job: emp.job, salary: String(emp.salary), role: emp.role, phone: emp.phone || '', address: emp.address || '' });
    setEmpDialogOpen(true);
  };

  const saveEmployee = async () => {
    if (!empForm.name || !empForm.job || !empForm.salary) {
      toast({ title: 'خطأ', description: 'يرجى ملء جميع الحقول المطلوبة', variant: 'destructive' });
      return;
    }
    setEmpSaving(true);
    try {
      const body = { name: empForm.name, job: empForm.job, salary: Number(empForm.salary), role: empForm.role, phone: empForm.phone, address: empForm.address };
      if (empEditing) {
        await apiFetch(`/api/employees/${empEditing.id}`, { method: 'PUT', body: JSON.stringify(body) });
        toast({ title: 'تم التحديث', description: 'تم تحديث بيانات الموظف بنجاح' });
      } else {
        await apiFetch('/api/employees', { method: 'POST', body: JSON.stringify(body) });
        toast({ title: 'تمت الإضافة', description: 'تم إضافة الموظف بنجاح' });
      }
      setEmpDialogOpen(false);
      fetchEmployees(empPage, empSearch, empRoleFilter);
    } catch (e: unknown) {
      toast({ title: 'خطأ', description: e instanceof Error ? e.message : 'فشل حفظ الموظف', variant: 'destructive' });
    } finally {
      setEmpSaving(false);
    }
  };

  const deleteEmployee = async () => {
    if (!empDeleteId) return;
    setEmpDeleting(true);
    try {
      await apiFetch(`/api/employees/${empDeleteId}`, { method: 'DELETE' });
      toast({ title: 'تم الحذف', description: 'تم حذف الموظف بنجاح' });
      setEmpDeleteId(null);
      fetchEmployees(empPage, empSearch, empRoleFilter);
    } catch (e: unknown) {
      toast({ title: 'خطأ', description: e instanceof Error ? e.message : 'فشل حذف الموظف', variant: 'destructive' });
    } finally {
      setEmpDeleting(false);
    }
  };

  // ─── Manual attendance ───
  const manualCheck = async (type: 'in' | 'out') => {
    if (!manualEmpId) {
      toast({ title: 'خطأ', description: 'يرجى اختيار موظف', variant: 'destructive' });
      return;
    }
    setManualSaving(true);
    try {
      await apiFetch('/api/attendance/manual', { method: 'POST', body: JSON.stringify({ employeeId: manualEmpId, type }) });
      toast({ title: 'تم', description: type === 'in' ? 'تم تسجيل الحضور' : 'تم تسجيل الانصراف' });
      fetchAttendance(attendanceDate, attPage);
    } catch (e: unknown) {
      toast({ title: 'خطأ', description: e instanceof Error ? e.message : 'فشل تسجيل الحضور', variant: 'destructive' });
    } finally {
      setManualSaving(false);
    }
  };

  // ─── Leave CRUD ───
  const openAddLeave = () => {
    setLeaveForm({ employeeId: '', type: 'annual', startDate: '', endDate: '', reason: '' });
    setLeaveDialogOpen(true);
  };

  const saveLeave = async () => {
    if (!leaveForm.employeeId || !leaveForm.startDate || !leaveForm.endDate) {
      toast({ title: 'خطأ', description: 'يرجى ملء جميع الحقول المطلوبة', variant: 'destructive' });
      return;
    }
    setLeaveSaving(true);
    try {
      await apiFetch('/api/leaves', { method: 'POST', body: JSON.stringify(leaveForm) });
      toast({ title: 'تمت الإضافة', description: 'تم إضافة الإجازة بنجاح' });
      setLeaveDialogOpen(false);
      fetchLeaves(leaveStatusFilter, leavePage);
    } catch (e: unknown) {
      toast({ title: 'خطأ', description: e instanceof Error ? e.message : 'فشل إضافة الإجازة', variant: 'destructive' });
    } finally {
      setLeaveSaving(false);
    }
  };

  const updateLeaveStatus = async (id: string, status: 'approved' | 'rejected') => {
    try {
      await apiFetch(`/api/leaves/${id}`, { method: 'PUT', body: JSON.stringify({ status }) });
      toast({ title: 'تم', description: status === 'approved' ? 'تم قبول الإجازة' : 'تم رفض الإجازة' });
      fetchLeaves(leaveStatusFilter, leavePage);
    } catch (e: unknown) {
      toast({ title: 'خطأ', description: e instanceof Error ? e.message : 'فشل تحديث الإجازة', variant: 'destructive' });
    }
  };

  // ─── Salary deduction/advance ───
  const openDeduction = (empId: string) => {
    setDeductionForm({ employeeId: empId, amount: '', reason: '' });
    setDeductionDialogOpen(true);
  };

  const saveDeduction = async () => {
    if (!deductionForm.employeeId || !deductionForm.amount) {
      toast({ title: 'خطأ', description: 'يرجى ملء جميع الحقول', variant: 'destructive' });
      return;
    }
    setDeductionSaving(true);
    try {
      await apiFetch('/api/deductions', { method: 'POST', body: JSON.stringify({ employeeId: deductionForm.employeeId, amount: Number(deductionForm.amount), reason: deductionForm.reason, month: salaryMonth }) });
      toast({ title: 'تم', description: 'تم إضافة الخصم بنجاح' });
      setDeductionDialogOpen(false);
      fetchSalaries(salaryMonth);
    } catch (e: unknown) {
      toast({ title: 'خطأ', description: e instanceof Error ? e.message : 'فشل إضافة الخصم', variant: 'destructive' });
    } finally {
      setDeductionSaving(false);
    }
  };

  const openAdvance = (empId: string) => {
    setAdvanceForm({ employeeId: empId, amount: '', reason: '' });
    setAdvanceDialogOpen(true);
  };

  const saveAdvance = async () => {
    if (!advanceForm.employeeId || !advanceForm.amount) {
      toast({ title: 'خطأ', description: 'يرجى ملء جميع الحقول', variant: 'destructive' });
      return;
    }
    setAdvanceSaving(true);
    try {
      await apiFetch('/api/advances', { method: 'POST', body: JSON.stringify({ employeeId: advanceForm.employeeId, amount: Number(advanceForm.amount), reason: advanceForm.reason, month: salaryMonth }) });
      toast({ title: 'تم', description: 'تم إضافة السلفة بنجاح' });
      setAdvanceDialogOpen(false);
      fetchSalaries(salaryMonth);
    } catch (e: unknown) {
      toast({ title: 'خطأ', description: e instanceof Error ? e.message : 'فشل إضافة السلفة', variant: 'destructive' });
    } finally {
      setAdvanceSaving(false);
    }
  };

  // ─── Settings ───
  const loadSettingsTab = () => {
    setSettingsForm({
      companyName: settings.companyName || '',
      workStart: settings.workStart || '08:00',
      workEnd: settings.workEnd || '17:00',
      delayDeductionPerMin: String(settings.delayDeductionPerMin ?? 1),
      advancePercent: String(settings.advancePercent ?? 25),
      gpsLat: String(settings.gpsLat ?? 0),
      gpsLng: String(settings.gpsLng ?? 0),
      gpsRadius: String(settings.gpsRadius ?? 100),
      adminUsername: settings.adminUsername || '',
      adminPassword: '',
      adminPasswordConfirm: '',
    });
  };

  const saveSettings = async () => {
    if (settingsForm.adminPassword && settingsForm.adminPassword !== settingsForm.adminPasswordConfirm) {
      toast({ title: 'خطأ', description: 'كلمة المرور غير متطابقة', variant: 'destructive' });
      return;
    }
    setSettingsSaving(true);
    try {
      const body: Record<string, unknown> = {
        companyName: settingsForm.companyName,
        workStart: settingsForm.workStart,
        workEnd: settingsForm.workEnd,
        delayDeductionPerMin: Number(settingsForm.delayDeductionPerMin),
        advancePercent: Number(settingsForm.advancePercent),
        gpsLat: Number(settingsForm.gpsLat),
        gpsLng: Number(settingsForm.gpsLng),
        gpsRadius: Number(settingsForm.gpsRadius),
        adminUsername: settingsForm.adminUsername,
      };
      if (settingsForm.adminPassword) body.adminPassword = settingsForm.adminPassword;
      const data = await apiFetch('/api/settings', { method: 'PUT', body: JSON.stringify(body) });
      setSettings(data);
      setCompanyName(data.companyName || 'M2INFINITY');
      toast({ title: 'تم الحفظ', description: 'تم حفظ الإعدادات بنجاح' });
    } catch (e: unknown) {
      toast({ title: 'خطأ', description: e instanceof Error ? e.message : 'فشل حفظ الإعدادات', variant: 'destructive' });
    } finally {
      setSettingsSaving(false);
    }
  };

  // ─── Notifications ───
  const markAllRead = async () => {
    try {
      await apiFetch('/api/notifications', { method: 'PUT' });
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch { /* silent */ }
  };

  // ─── Pending accounts ───
  const handlePendingAction = async (accountId: string, action: 'approve' | 'reject') => {
    try {
      await apiFetch('/api/pending', { method: 'PUT', body: JSON.stringify({ accountId, action }) });
      toast({ title: 'تم', description: action === 'approve' ? 'تم قبول الحساب' : 'تم رفض الحساب' });
      setPendingAccounts((prev) => prev.filter((a) => a.id !== accountId));
    } catch (e: unknown) {
      toast({ title: 'خطأ', description: e instanceof Error ? e.message : 'فشل تحديث الحساب', variant: 'destructive' });
    }
  };

  // ─── Accounts management ───
  const openAccountsDialog = async () => {
    setAccountsDialogOpen(true);
    setAccountsLoading(true);
    try {
      const data = await apiFetch('/api/accounts');
      setAccounts(data.accounts || data.data || data || []);
    } catch (e: unknown) {
      toast({ title: 'خطأ', description: e instanceof Error ? e.message : 'فشل تحميل الحسابات', variant: 'destructive' });
    } finally {
      setAccountsLoading(false);
    }
  };

  const openEditAccount = (acc: AccountRecord) => {
    setEditingAccount(acc);
    setEditAccountUsername(acc.username);
    setEditAccountPassword('');
  };

  const saveAccount = async () => {
    if (!editingAccount) return;
    try {
      const body: Record<string, string> = { accountId: editingAccount.id };
      if (editAccountUsername) body.username = editAccountUsername;
      if (editAccountPassword) body.password = editAccountPassword;
      await apiFetch('/api/accounts', { method: 'PUT', body: JSON.stringify(body) });
      toast({ title: 'تم', description: 'تم تحديث الحساب بنجاح' });
      setEditingAccount(null);
      openAccountsDialog();
    } catch (e: unknown) {
      toast({ title: 'خطأ', description: e instanceof Error ? e.message : 'فشل تحديث الحساب', variant: 'destructive' });
    }
  };

  // ─── Logout ───
  const handleLogout = async () => {
    try {
      await fetch('/api/auth/session', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ logout: true }) });
    } catch { /* silent */ }
    onLogout();
  };

  // ─── Export CSV helper ───
  const exportCSV = async (endpoint: string) => {
    try {
      const res = await fetch(endpoint);
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${endpoint.split('/').pop() || 'export'}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: 'تم', description: 'تم تصدير الملف بنجاح' });
    } catch (e: unknown) {
      toast({ title: 'خطأ', description: e instanceof Error ? e.message : 'فشل التصدير', variant: 'destructive' });
    }
  };

  // ─── Dashboard stat cards ───
  const presentToday = reportData?.weekly?.[reportData.weekly.length - 1]?.present ?? 0;
  const statCards = [
    { label: 'إجمالي الموظفين', value: reportData?.empCount ?? 0, icon: Users, color: 'bg-teal-500', lightColor: 'bg-teal-50 dark:bg-teal-950' },
    { label: 'الحاضرون اليوم', value: presentToday, icon: UserCheck, color: 'bg-green-500', lightColor: 'bg-green-50 dark:bg-green-950' },
    { label: 'المتأخرون', value: reportData?.delayRanking?.length ?? 0, icon: UserX, color: 'bg-red-500', lightColor: 'bg-red-50 dark:bg-red-950' },
    { label: 'إجمالي التأخير', value: `${fmtMoney(reportData?.totalLate)} د`, icon: Clock, color: 'bg-amber-500', lightColor: 'bg-amber-50 dark:bg-amber-950' },
    { label: 'الإجازات المعتمدة', value: fmtMoney(reportData?.totalLeaveDays), icon: CalendarDays, color: 'bg-purple-500', lightColor: 'bg-purple-50 dark:bg-purple-950' },
    { label: 'خصومات الشهر', value: fmtMoney(reportData?.totalDeductions), icon: DollarSign, color: 'bg-pink-500', lightColor: 'bg-pink-50 dark:bg-pink-950' },
  ];

  // ─── Pagination component ───
  const Pagination = ({ page, totalPages, setPage }: { page: number; totalPages: number; setPage: (p: number) => void }) => {
    if (totalPages <= 1) return null;
    const pages: number[] = [];
    const start = Math.max(1, page - 2);
    const end = Math.min(totalPages, page + 2);
    for (let i = start; i <= end; i++) pages.push(i);
    return (
      <div className="flex items-center justify-center gap-1 mt-4">
        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
          <ChevronRight className="h-4 w-4" />
        </Button>
        {pages.map((p) => (
          <Button key={p} variant={p === page ? 'default' : 'outline'} size="sm" className="w-8 h-8 p-0" onClick={() => setPage(p)}>
            {p}
          </Button>
        ))}
        <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
      </div>
    );
  };

  // ─── Render ───
  return (
    <div dir="rtl" className="min-h-screen flex flex-col bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-[1400px] mx-auto px-4 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Building2 className="h-7 w-7 text-teal-600" />
            <h1 className="text-lg font-bold text-teal-700 dark:text-teal-400 hidden sm:block">{companyName}</h1>
            <Badge variant="outline" className="text-xs border-teal-300 text-teal-700 dark:text-teal-400">مدير النظام</Badge>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground hidden md:block">{currentTime}</span>

            {/* Pending accounts button */}
            <Button variant="outline" size="icon" className="relative" onClick={() => setPendingDialogOpen(true)}>
              <UserPlus className="h-4 w-4" />
              {pendingAccounts.length > 0 && (
                <span className="absolute -top-1 -left-1 bg-amber-500 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center">{pendingAccounts.length}</span>
              )}
            </Button>

            {/* Accounts management */}
            <Button variant="outline" size="icon" onClick={openAccountsDialog}>
              <ShieldCheck className="h-4 w-4" />
            </Button>

            {/* Notifications */}
            <div ref={notifRef} className="relative">
              <Button variant="outline" size="icon" className="relative" onClick={() => setNotifOpen(!notifOpen)}>
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -left-1 bg-red-500 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center">{unreadCount > 9 ? '٩+' : unreadCount}</span>
                )}
              </Button>
              {notifOpen && (
                <div className="absolute left-0 top-full mt-2 w-80 bg-popover border rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
                  <div className="p-3 border-b flex items-center justify-between">
                    <span className="font-semibold text-sm">الإشعارات</span>
                    <div className="flex gap-2">
                      {unreadCount > 0 && (
                        <Button variant="ghost" size="sm" className="text-xs h-7" onClick={markAllRead}>تعيين الكل كمقروء</Button>
                      )}
                      <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => { setNotifOpen(false); }}>
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  {notifications.length === 0 ? (
                    <div className="p-4 text-center text-sm text-muted-foreground">لا توجد إشعارات</div>
                  ) : (
                    <div className="max-h-72 overflow-y-auto">
                      {notifications.slice(0, 20).map((n) => (
                        <div key={n.id} className={`p-3 border-b text-sm ${!n.read ? 'bg-teal-50 dark:bg-teal-950/30' : ''}`}>
                          <div className="font-medium">{n.title || 'إشعار'}</div>
                          <div className="text-muted-foreground text-xs mt-1">{n.message || ''}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Theme toggle */}
            <Button variant="outline" size="icon" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>

            {/* Logout */}
            <Button variant="outline" size="icon" onClick={handleLogout}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-[1400px] mx-auto w-full px-4 py-6">
        {/* Welcome Banner */}
        <div className="mb-6 rounded-xl bg-gradient-to-l from-teal-600 to-cyan-500 p-6 text-white">
          <h2 className="text-2xl font-bold mb-1">مرحباً بك في لوحة التحكم</h2>
          <p className="text-teal-100">{currentDateAr}</p>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full flex mb-6 overflow-x-auto bg-muted/50 h-auto p-1">
            <TabsTrigger value="dashboard" className="flex-1 min-w-[100px] data-[state=active]:bg-teal-600 data-[state=active]:text-white">
              <Users className="h-4 w-4 ml-1" />
              <span className="hidden sm:inline">لوحة التحكم</span>
            </TabsTrigger>
            <TabsTrigger value="employees" className="flex-1 min-w-[100px] data-[state=active]:bg-teal-600 data-[state=active]:text-white">
              <Users className="h-4 w-4 ml-1" />
              <span className="hidden sm:inline">الموظفين</span>
            </TabsTrigger>
            <TabsTrigger value="attendance" className="flex-1 min-w-[100px] data-[state=active]:bg-teal-600 data-[state=active]:text-white">
              <Fingerprint className="h-4 w-4 ml-1" />
              <span className="hidden sm:inline">الحضور</span>
            </TabsTrigger>
            <TabsTrigger value="leaves" className="flex-1 min-w-[100px] data-[state=active]:bg-teal-600 data-[state=active]:text-white">
              <CalendarDays className="h-4 w-4 ml-1" />
              <span className="hidden sm:inline">الإجازات</span>
            </TabsTrigger>
            <TabsTrigger value="salaries" className="flex-1 min-w-[100px] data-[state=active]:bg-teal-600 data-[state=active]:text-white">
              <DollarSign className="h-4 w-4 ml-1" />
              <span className="hidden sm:inline">الرواتب</span>
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex-1 min-w-[100px] data-[state=active]:bg-teal-600 data-[state=active]:text-white">
              <Settings className="h-4 w-4 ml-1" />
              <span className="hidden sm:inline">الإعدادات</span>
            </TabsTrigger>
          </TabsList>

          {/* ═══════════════ TAB 1: Dashboard ═══════════════ */}
          <TabsContent value="dashboard">
            {reportLoading ? (
              <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-teal-600" /></div>
            ) : (
              <>
                {/* Stat Cards */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
                  {statCards.map((card) => (
                    <Card key={card.label} className={`${card.lightColor} border-0`}>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <div className={`${card.color} rounded-lg p-2`}>
                            <card.icon className="h-4 w-4 text-white" />
                          </div>
                        </div>
                        <div className="text-2xl font-bold">{card.value}</div>
                        <div className="text-xs text-muted-foreground mt-1">{card.label}</div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">الحضور الأسبوعي</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={reportData?.weekly || []}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="label" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Line type="monotone" dataKey="present" name="حاضر" stroke="#16a34a" strokeWidth={2} />
                          <Line type="monotone" dataKey="absent" name="غائب" stroke="#dc2626" strokeWidth={2} />
                        </LineChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">أكثر الموظفين تأخيراً</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={reportData?.delayRanking || []} layout="vertical" margin={{ left: 20 }}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis type="number" />
                          <YAxis type="category" dataKey="name" width={100} />
                          <Tooltip />
                          <Bar dataKey="mins" name="دقائق" fill="#f59e0b" radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </div>
              </>
            )}
          </TabsContent>

          {/* ═══════════════ TAB 2: Employees ═══════════════ */}
          <TabsContent value="employees">
            <Card>
              <CardContent className="p-4">
                {/* Toolbar */}
                <div className="flex flex-col sm:flex-row gap-3 mb-4">
                  <div className="relative flex-1">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="بحث عن موظف..."
                      className="pr-9"
                      value={empSearch}
                      onChange={(e) => { setEmpSearch(e.target.value); setEmpPage(1); }}
                    />
                  </div>
                  <Select value={empRoleFilter} onValueChange={(v) => { setEmpRoleFilter(v); setEmpPage(1); }}>
                    <SelectTrigger className="w-full sm:w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">الكل</SelectItem>
                      <SelectItem value="Employee">موظف</SelectItem>
                      <SelectItem value="HR">موارد بشرية</SelectItem>
                      <SelectItem value="Manager">مدير</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="flex gap-2">
                    <Button onClick={openAddEmployee} className="bg-teal-600 hover:bg-teal-700">
                      <Plus className="h-4 w-4 ml-1" />
                      إضافة موظف
                    </Button>
                    <Button variant="outline" onClick={() => exportCSV('/api/export/csv/employees')}>
                      <Download className="h-4 w-4 ml-1" />
                      <span className="hidden sm:inline">تصدير</span>
                    </Button>
                  </div>
                </div>

                {/* Table */}
                {employeesLoading ? (
                  <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-teal-600" /></div>
                ) : employees.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">لا يوجد موظفين</div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-right">الكود</TableHead>
                          <TableHead className="text-right">الاسم</TableHead>
                          <TableHead className="text-right hidden md:table-cell">الوظيفة</TableHead>
                          <TableHead className="text-right hidden lg:table-cell">الراتب</TableHead>
                          <TableHead className="text-right">الصلاحية</TableHead>
                          <TableHead className="text-right">إجراءات</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {employees.map((emp) => (
                          <TableRow key={emp.id}>
                            <TableCell className="font-mono">{emp.code || emp.id.slice(0, 6)}</TableCell>
                            <TableCell className="font-medium">{emp.name}</TableCell>
                            <TableCell className="hidden md:table-cell">{emp.job}</TableCell>
                            <TableCell className="hidden lg:table-cell">{fmtMoney(emp.salary)}</TableCell>
                            <TableCell><Badge variant="outline">{ROLE_LABELS[emp.role] || emp.role}</Badge></TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditEmployee(emp)}>
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-700" onClick={() => setEmpDeleteId(emp.id)}>
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
                <Pagination page={empPage} totalPages={empTotalPages} setPage={setEmpPage} />
              </CardContent>
            </Card>
          </TabsContent>

          {/* ═══════════════ TAB 3: Attendance ═══════════════ */}
          <TabsContent value="attendance">
            <Card>
              <CardContent className="p-4">
                {/* Toolbar */}
                <div className="flex flex-col sm:flex-row gap-3 mb-4">
                  <div className="flex items-center gap-2">
                    <Label className="text-sm whitespace-nowrap">التاريخ:</Label>
                    <Input type="date" className="w-40" value={attendanceDate} onChange={(e) => { setAttendanceDate(e.target.value); setAttPage(1); }} />
                  </div>
                  <Button variant="outline" onClick={() => exportCSV(`/api/export/csv/attendance`)}>
                    <Download className="h-4 w-4 ml-1" />
                    <span className="hidden sm:inline">تصدير</span>
                  </Button>
                  <div className="sm:mr-auto flex items-center gap-2">
                    <Select value={manualEmpId} onValueChange={setManualEmpId}>
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder="اختر موظف" />
                      </SelectTrigger>
                      <SelectContent>
                        {employees.map((emp) => (
                          <SelectItem key={emp.id} value={emp.id}>{emp.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button size="sm" variant="outline" className="border-green-500 text-green-600 hover:bg-green-50" disabled={manualSaving} onClick={() => manualCheck('in')}>
                      <Check className="h-3.5 w-3.5 ml-1" />
                      حضور
                    </Button>
                    <Button size="sm" variant="outline" className="border-red-500 text-red-600 hover:bg-red-50" disabled={manualSaving} onClick={() => manualCheck('out')}>
                      <X className="h-3.5 w-3.5 ml-1" />
                      انصراف
                    </Button>
                  </div>
                </div>

                {/* Table */}
                {attendanceLoading ? (
                  <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-teal-600" /></div>
                ) : attendance.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">لا توجد سجلات حضور</div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-right">الموظف</TableHead>
                          <TableHead className="text-right hidden sm:table-cell">الكود</TableHead>
                          <TableHead className="text-right">حضور</TableHead>
                          <TableHead className="text-right hidden md:table-cell">طريقة</TableHead>
                          <TableHead className="text-right">انصراف</TableHead>
                          <TableHead className="text-right hidden lg:table-cell">تأخير</TableHead>
                          <TableHead className="text-right">الحالة</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {attendance.map((rec) => {
                          const status = getAttendanceStatus(rec);
                          return (
                            <TableRow key={rec.id}>
                              <TableCell className="font-medium">{rec.employeeName || rec.employeeId}</TableCell>
                              <TableCell className="hidden sm:table-cell font-mono">{rec.employeeCode || ''}</TableCell>
                              <TableCell>{rec.checkIn ? new Date(rec.checkIn).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) : '—'}</TableCell>
                              <TableCell className="hidden md:table-cell">{rec.method ? METHOD_LABELS[rec.method] || rec.method : '—'}</TableCell>
                              <TableCell>{rec.checkOut ? new Date(rec.checkOut).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) : '—'}</TableCell>
                              <TableCell className="hidden lg:table-cell">{rec.delayMinutes ? `${rec.delayMinutes} د` : '—'}</TableCell>
                              <TableCell>
                                <Badge variant={status === 'اكتمل' ? 'default' : status === 'حاضر' ? 'secondary' : 'destructive'}>
                                  {status}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
                <Pagination page={attPage} totalPages={attTotalPages} setPage={setAttPage} />
              </CardContent>
            </Card>
          </TabsContent>

          {/* ═══════════════ TAB 4: Leaves ═══════════════ */}
          <TabsContent value="leaves">
            <Card>
              <CardContent className="p-4">
                {/* Toolbar */}
                <div className="flex flex-col sm:flex-row gap-3 mb-4">
                  <Select value={leaveStatusFilter} onValueChange={(v) => { setLeaveStatusFilter(v); setLeavePage(1); }}>
                    <SelectTrigger className="w-full sm:w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">الكل</SelectItem>
                      <SelectItem value="pending">معلّق</SelectItem>
                      <SelectItem value="approved">مقبول</SelectItem>
                      <SelectItem value="rejected">مرفوض</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="sm:mr-auto flex gap-2">
                    <Button onClick={openAddLeave} className="bg-teal-600 hover:bg-teal-700">
                      <Plus className="h-4 w-4 ml-1" />
                      إضافة إجازة
                    </Button>
                    <Button variant="outline" onClick={() => exportCSV('/api/export/csv/leaves')}>
                      <Download className="h-4 w-4 ml-1" />
                      <span className="hidden sm:inline">تصدير</span>
                    </Button>
                  </div>
                </div>

                {/* Table */}
                {leavesLoading ? (
                  <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-teal-600" /></div>
                ) : leaves.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">لا توجد إجازات</div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-right">الموظف</TableHead>
                          <TableHead className="text-right">النوع</TableHead>
                          <TableHead className="text-right hidden sm:table-cell">من</TableHead>
                          <TableHead className="text-right hidden sm:table-cell">إلى</TableHead>
                          <TableHead className="text-right">الأيام</TableHead>
                          <TableHead className="text-right">الحالة</TableHead>
                          <TableHead className="text-right">إجراءات</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {leaves.map((lv) => (
                          <TableRow key={lv.id}>
                            <TableCell className="font-medium">{lv.employeeName || lv.employeeId}</TableCell>
                            <TableCell>{LEAVE_TYPE_LABELS[lv.type] || lv.type}</TableCell>
                            <TableCell className="hidden sm:table-cell">{lv.startDate}</TableCell>
                            <TableCell className="hidden sm:table-cell">{lv.endDate}</TableCell>
                            <TableCell>{lv.days ?? '—'}</TableCell>
                            <TableCell>
                              <Badge variant={lv.status === 'approved' ? 'default' : lv.status === 'rejected' ? 'destructive' : 'secondary'}>
                                {LEAVE_STATUS_LABELS[lv.status] || lv.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {lv.status === 'pending' && (
                                <div className="flex gap-1">
                                  <Button variant="ghost" size="icon" className="h-8 w-8 text-green-600 hover:text-green-800" onClick={() => updateLeaveStatus(lv.id, 'approved')}>
                                    <Check className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-700" onClick={() => updateLeaveStatus(lv.id, 'rejected')}>
                                    <X className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
                <Pagination page={leavePage} totalPages={leaveTotalPages} setPage={setLeavePage} />
              </CardContent>
            </Card>
          </TabsContent>

          {/* ═══════════════ TAB 5: Salaries ═══════════════ */}
          <TabsContent value="salaries">
            <Card>
              <CardContent className="p-4">
                {/* Toolbar */}
                <div className="flex flex-col sm:flex-row gap-3 mb-4">
                  <Select value={salaryMonth} onValueChange={setSalaryMonth}>
                    <SelectTrigger className="w-full sm:w-56">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 12 }, (_, i) => (
                        <SelectItem key={i} value={getMonthKey(i)}>{getMonthLabel(i)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="sm:mr-auto">
                    <Button variant="outline" onClick={() => exportCSV(`/api/export/csv/salaries?month=${salaryMonth}`)}>
                      <Download className="h-4 w-4 ml-1" />
                      <span className="hidden sm:inline">تصدير</span>
                    </Button>
                  </div>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <Card className="bg-teal-50 dark:bg-teal-950 border-0">
                    <CardContent className="p-4">
                      <div className="text-xs text-muted-foreground mb-1">الأساسي</div>
                      <div className="text-xl font-bold">{fmtMoney(salarySummary.base)}</div>
                    </CardContent>
                  </Card>
                  <Card className="bg-red-50 dark:bg-red-950 border-0">
                    <CardContent className="p-4">
                      <div className="text-xs text-muted-foreground mb-1">خصم تأخير</div>
                      <div className="text-xl font-bold text-red-600">{fmtMoney(salarySummary.delayDeduction)}</div>
                    </CardContent>
                  </Card>
                  <Card className="bg-amber-50 dark:bg-amber-950 border-0">
                    <CardContent className="p-4">
                      <div className="text-xs text-muted-foreground mb-1">خصومات أخرى</div>
                      <div className="text-xl font-bold text-amber-600">{fmtMoney(salarySummary.otherDeductions)}</div>
                    </CardContent>
                  </Card>
                  <Card className="bg-green-50 dark:bg-green-950 border-0">
                    <CardContent className="p-4">
                      <div className="text-xs text-muted-foreground mb-1">الصافي</div>
                      <div className="text-xl font-bold text-green-600">{fmtMoney(salarySummary.net)}</div>
                    </CardContent>
                  </Card>
                </div>

                {/* Table */}
                {salariesLoading ? (
                  <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-teal-600" /></div>
                ) : salaries.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">لا توجد بيانات رواتب</div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-right">الموظف</TableHead>
                          <TableHead className="text-right hidden md:table-cell">الوظيفة</TableHead>
                          <TableHead className="text-right">الأساسي</TableHead>
                          <TableHead className="text-right hidden lg:table-cell">خصم تأخير</TableHead>
                          <TableHead className="text-right hidden lg:table-cell">خصومات</TableHead>
                          <TableHead className="text-right">صافي</TableHead>
                          <TableHead className="text-right">إجراءات</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {salaries.map((s) => (
                          <TableRow key={s.id}>
                            <TableCell className="font-medium">{s.employeeName || s.employeeId}</TableCell>
                            <TableCell className="hidden md:table-cell">{s.employeeJob || ''}</TableCell>
                            <TableCell>{fmtMoney(s.baseSalary)}</TableCell>
                            <TableCell className="hidden lg:table-cell text-red-600">{fmtMoney(s.delayDeduction)}</TableCell>
                            <TableCell className="hidden lg:table-cell text-amber-600">{fmtMoney(s.otherDeductions)}</TableCell>
                            <TableCell className="font-semibold text-green-600">{fmtMoney(s.netSalary)}</TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => openDeduction(s.employeeId)}>
                                  <CreditCard className="h-3 w-3 ml-1" />
                                  خصم
                                </Button>
                                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => openAdvance(s.employeeId)}>
                                  <HandCoins className="h-3 w-3 ml-1" />
                                  سلفة
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ═══════════════ TAB 6: Settings ═══════════════ */}
          <TabsContent value="settings">
            <div className="space-y-6">
              {/* Load settings form when tab is activated */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-teal-600" />
                    معلومات الشركة
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>اسم الشركة</Label>
                    <Input value={settingsForm.companyName} onChange={(e) => setSettingsForm((f) => ({ ...f, companyName: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>شعار الشركة</Label>
                    <Input type="file" accept="image/*" onChange={(e) => setLogoFile(e.target.files?.[0] || null)} />
                    {settings.logo && (
                      <img src={settings.logo} alt="الشعار" className="h-16 w-16 object-contain rounded border" />
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Clock className="h-5 w-5 text-teal-600" />
                    إعدادات العمل
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>بداية العمل</Label>
                      <Input type="time" value={settingsForm.workStart} onChange={(e) => setSettingsForm((f) => ({ ...f, workStart: e.target.value }))} />
                    </div>
                    <div className="space-y-2">
                      <Label>نهاية العمل</Label>
                      <Input type="time" value={settingsForm.workEnd} onChange={(e) => setSettingsForm((f) => ({ ...f, workEnd: e.target.value }))} />
                    </div>
                    <div className="space-y-2">
                      <Label>خصم التأخير لكل دقيقة</Label>
                      <Input type="number" value={settingsForm.delayDeductionPerMin} onChange={(e) => setSettingsForm((f) => ({ ...f, delayDeductionPerMin: e.target.value }))} />
                    </div>
                    <div className="space-y-2">
                      <Label>نسبة السلفة (%)</Label>
                      <Input type="number" value={settingsForm.advancePercent} onChange={(e) => setSettingsForm((f) => ({ ...f, advancePercent: e.target.value }))} />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Fingerprint className="h-5 w-5 text-teal-600" />
                    إعدادات GPS
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>خط العرض (Latitude)</Label>
                      <Input type="number" step="any" value={settingsForm.gpsLat} onChange={(e) => setSettingsForm((f) => ({ ...f, gpsLat: e.target.value }))} />
                    </div>
                    <div className="space-y-2">
                      <Label>خط الطول (Longitude)</Label>
                      <Input type="number" step="any" value={settingsForm.gpsLng} onChange={(e) => setSettingsForm((f) => ({ ...f, gpsLng: e.target.value }))} />
                    </div>
                    <div className="space-y-2">
                      <Label>نطاق GPS (متر)</Label>
                      <Input type="number" value={settingsForm.gpsRadius} onChange={(e) => setSettingsForm((f) => ({ ...f, gpsRadius: e.target.value }))} />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-teal-600" />
                    حساب المدير
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>اسم المستخدم</Label>
                      <Input value={settingsForm.adminUsername} onChange={(e) => setSettingsForm((f) => ({ ...f, adminUsername: e.target.value }))} />
                    </div>
                    <div className="space-y-2">
                      <Label>كلمة المرور الجديدة</Label>
                      <Input type="password" placeholder="اتركه فارغاً إذا لم ترد التغيير" value={settingsForm.adminPassword} onChange={(e) => setSettingsForm((f) => ({ ...f, adminPassword: e.target.value }))} />
                    </div>
                    <div className="space-y-2">
                      <Label>تأكيد كلمة المرور</Label>
                      <Input type="password" placeholder="أعد إدخال كلمة المرور" value={settingsForm.adminPasswordConfirm} onChange={(e) => setSettingsForm((f) => ({ ...f, adminPasswordConfirm: e.target.value }))} />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-end">
                <Button className="bg-teal-600 hover:bg-teal-700 min-w-32" disabled={settingsSaving} onClick={saveSettings}>
                  {settingsSaving ? <Loader2 className="h-4 w-4 animate-spin ml-2" /> : <Save className="h-4 w-4 ml-2" />}
                  حفظ الإعدادات
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </main>

      {/* ═══════════════ DIALOGS ═══════════════ */}

      {/* Add/Edit Employee Dialog */}
      <Dialog open={empDialogOpen} onOpenChange={setEmpDialogOpen}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle>{empEditing ? 'تعديل موظف' : 'إضافة موظف جديد'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>الاسم</Label>
              <Input value={empForm.name} onChange={(e) => setEmpForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>الوظيفة</Label>
              <Input value={empForm.job} onChange={(e) => setEmpForm((f) => ({ ...f, job: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>الراتب</Label>
                <Input type="number" value={empForm.salary} onChange={(e) => setEmpForm((f) => ({ ...f, salary: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>الصلاحية</Label>
                <Select value={empForm.role} onValueChange={(v) => setEmpForm((f) => ({ ...f, role: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Employee">موظف</SelectItem>
                    <SelectItem value="HR">موارد بشرية</SelectItem>
                    <SelectItem value="Manager">مدير</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>الهاتف</Label>
              <Input value={empForm.phone} onChange={(e) => setEmpForm((f) => ({ ...f, phone: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>العنوان</Label>
              <Input value={empForm.address} onChange={(e) => setEmpForm((f) => ({ ...f, address: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEmpDialogOpen(false)}>إلغاء</Button>
            <Button className="bg-teal-600 hover:bg-teal-700" disabled={empSaving} onClick={saveEmployee}>
              {empSaving && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
              {empEditing ? 'تحديث' : 'إضافة'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Employee Dialog */}
      <Dialog open={!!empDeleteId} onOpenChange={() => setEmpDeleteId(null)}>
        <DialogContent className="max-w-sm" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              تأكيد الحذف
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">هل أنت متأكد من حذف هذا الموظف؟ لا يمكن التراجع عن هذا الإجراء.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEmpDeleteId(null)}>إلغاء</Button>
            <Button variant="destructive" disabled={empDeleting} onClick={deleteEmployee}>
              {empDeleting && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
              حذف
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Leave Dialog */}
      <Dialog open={leaveDialogOpen} onOpenChange={setLeaveDialogOpen}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle>إضافة إجازة</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>الموظف</Label>
              <Select value={leaveForm.employeeId} onValueChange={(v) => setLeaveForm((f) => ({ ...f, employeeId: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="اختر موظف" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>{emp.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>نوع الإجازة</Label>
              <Select value={leaveForm.type} onValueChange={(v) => setLeaveForm((f) => ({ ...f, type: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="annual">اعتيادية</SelectItem>
                  <SelectItem value="sick">مرضية</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>من</Label>
                <Input type="date" value={leaveForm.startDate} onChange={(e) => setLeaveForm((f) => ({ ...f, startDate: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>إلى</Label>
                <Input type="date" value={leaveForm.endDate} onChange={(e) => setLeaveForm((f) => ({ ...f, endDate: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>السبب</Label>
              <Input value={leaveForm.reason} onChange={(e) => setLeaveForm((f) => ({ ...f, reason: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLeaveDialogOpen(false)}>إلغاء</Button>
            <Button className="bg-teal-600 hover:bg-teal-700" disabled={leaveSaving} onClick={saveLeave}>
              {leaveSaving && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
              إضافة
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Deduction Dialog */}
      <Dialog open={deductionDialogOpen} onOpenChange={setDeductionDialogOpen}>
        <DialogContent className="max-w-sm" dir="rtl">
          <DialogHeader>
            <DialogTitle>إضافة خصم</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>المبلغ</Label>
              <Input type="number" value={deductionForm.amount} onChange={(e) => setDeductionForm((f) => ({ ...f, amount: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>السبب</Label>
              <Input value={deductionForm.reason} onChange={(e) => setDeductionForm((f) => ({ ...f, reason: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeductionDialogOpen(false)}>إلغاء</Button>
            <Button variant="destructive" disabled={deductionSaving} onClick={saveDeduction}>
              {deductionSaving && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
              إضافة الخصم
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Advance Dialog */}
      <Dialog open={advanceDialogOpen} onOpenChange={setAdvanceDialogOpen}>
        <DialogContent className="max-w-sm" dir="rtl">
          <DialogHeader>
            <DialogTitle>إضافة سلفة</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>المبلغ</Label>
              <Input type="number" value={advanceForm.amount} onChange={(e) => setAdvanceForm((f) => ({ ...f, amount: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>السبب</Label>
              <Input value={advanceForm.reason} onChange={(e) => setAdvanceForm((f) => ({ ...f, reason: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdvanceDialogOpen(false)}>إلغاء</Button>
            <Button className="bg-amber-500 hover:bg-amber-600" disabled={advanceSaving} onClick={saveAdvance}>
              {advanceSaving && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
              إضافة السلفة
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Pending Accounts Dialog */}
      <Dialog open={pendingDialogOpen} onOpenChange={setPendingDialogOpen}>
        <DialogContent className="max-w-lg" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-amber-500" />
              حسابات بانتظار الموافقة ({pendingAccounts.length})
            </DialogTitle>
          </DialogHeader>
          {pendingLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-teal-600" /></div>
          ) : pendingAccounts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">لا توجد حسابات معلّقة</div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {pendingAccounts.map((acc) => (
                <div key={acc.id} className="flex items-center gap-4 p-3 border rounded-lg">
                  {acc.idCardImage && (
                    <img src={acc.idCardImage} alt="بطاقة" className="h-16 w-24 object-cover rounded border" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{acc.employeeName || 'غير معروف'}</div>
                    <div className="text-sm text-muted-foreground">{acc.job || ''}</div>
                    {acc.username && <div className="text-xs text-muted-foreground">@{acc.username}</div>}
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => handlePendingAction(acc.id, 'approve')}>
                      <Check className="h-3.5 w-3.5 ml-1" />
                      قبول
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => handlePendingAction(acc.id, 'reject')}>
                      <X className="h-3.5 w-3.5 ml-1" />
                      رفض
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Accounts Management Dialog */}
      <Dialog open={accountsDialogOpen} onOpenChange={setAccountsDialogOpen}>
        <DialogContent className="max-w-lg" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-teal-600" />
              إدارة الحسابات
            </DialogTitle>
          </DialogHeader>
          {accountsLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-teal-600" /></div>
          ) : accounts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">لا توجد حسابات</div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {accounts.map((acc) => (
                <div key={acc.id} className="flex items-center gap-4 p-3 border rounded-lg">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium">{acc.employeeName || 'غير معروف'}</div>
                    <div className="text-sm text-muted-foreground">اسم المستخدم: <span className="font-mono">{acc.username}</span></div>
                  </div>
                  {editingAccount?.id === acc.id ? (
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Input
                        className="w-32 h-8 text-sm"
                        value={editAccountUsername}
                        onChange={(e) => setEditAccountUsername(e.target.value)}
                        placeholder="اسم المستخدم"
                      />
                      <Input
                        className="w-28 h-8 text-sm"
                        type="password"
                        value={editAccountPassword}
                        onChange={(e) => setEditAccountPassword(e.target.value)}
                        placeholder="كلمة المرور"
                      />
                      <Button size="sm" className="h-8 bg-teal-600 hover:bg-teal-700" onClick={saveAccount}>
                        <Save className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-8" onClick={() => setEditingAccount(null)}>
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ) : (
                    <Button size="sm" variant="outline" className="flex-shrink-0" onClick={() => openEditAccount(acc)}>
                      <Pencil className="h-3.5 w-3.5 ml-1" />
                      تعديل
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}