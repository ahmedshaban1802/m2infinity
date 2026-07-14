import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin, requireAuth, getEmployeeId } from '@/lib/session';

export async function GET() {
  try {
    const session = await requireAuth();

    if (session.role === 'admin') {
      const today = new Date();
      let totalAtt = 0, totalLate = 0, totalLv = 0, totalDed = 0;

      for (let i = 6; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const ds = d.toISOString().split('T')[0];
        const dayAtt = await db.attendance.findMany({ where: { date: ds } });
        totalAtt += dayAtt.filter(a => a.checkIn).length;
        totalLate += dayAtt.reduce((s, a) => s + a.delayMinutes, 0);
      }

      const approvedLeaves = await db.leave.findMany({ where: { status: 'approved' } });
      totalLv = approvedLeaves.reduce((s, l) => s + l.days, 0);

      const thisMon = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
      const deductions = await db.deduction.findMany({ where: { month: thisMon } });
      const advances = await db.advance.findMany({ where: { month: thisMon } });
      totalDed = deductions.reduce((s, d) => s + d.amount, 0) + advances.reduce((s, a) => s + a.amount, 0);

      const empCount = await db.employee.count();
      const pct = empCount ? Math.round(totalAtt / (empCount * 7) * 100) : 0;

      // Weekly data
      const weekly = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const ds = d.toISOString().split('T')[0];
        const dayName = d.toLocaleDateString('ar-EG', { weekday: 'short' });
        const dayAtt = await db.attendance.findMany({ where: { date: ds } });
        weekly.push({
          label: dayName,
          present: dayAtt.filter(a => a.checkIn).length,
          absent: empCount - dayAtt.filter(a => a.checkIn).length,
        });
      }

      // Top delays
      const allEmps = await db.employee.findMany();
      const delayRanking = await Promise.all(allEmps.map(async (emp) => {
        const att = await db.attendance.findMany({ where: { employeeId: emp.id } });
        const mins = att.reduce((s, a) => s + a.delayMinutes, 0);
        return { name: emp.name.split(' ')[0], mins };
      }));
      delayRanking.sort((a, b) => b.mins - a.mins);

      return NextResponse.json({
        attendanceRate: `${pct}%`,
        totalLate,
        totalLeaveDays: totalLv,
        totalDeductions: totalDed,
        weekly,
        delayRanking: delayRanking.slice(0, 6),
        empCount,
      });
    }

    // Employee reports
    const eid = await getEmployeeId(session);
    if (!eid) return NextResponse.json({}, { status: 200 });

    const emp = await db.employee.findUnique({ where: { id: eid } });
    const attendance = await db.attendance.findMany({ where: { employeeId: eid } });
    const leaves = await db.leave.findMany({ where: { employeeId: eid } });
    const deductions = await db.deduction.findMany({ where: { employeeId: eid } });
    const advances = await db.advance.findMany({ where: { employeeId: eid } });

    return NextResponse.json({
      salary: emp?.salary || 0,
      totalDeductions: deductions.reduce((s, d) => s + d.amount, 0),
      totalAdvances: advances.reduce((s, a) => s + a.amount, 0),
      totalDelay: attendance.reduce((s, a) => s + a.delayMinutes, 0),
      completeDays: attendance.filter(a => a.checkIn && a.checkOut).length,
      leaveDays: leaves.filter(l => l.status === 'approved').reduce((s, l) => s + l.days, 0),
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'خطأ';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}