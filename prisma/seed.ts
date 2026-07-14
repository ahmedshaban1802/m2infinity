import { db } from '@/lib/db';
import { hashPassword } from '@/lib/auth';

async function seed() {
  // Default admin account
  const adminPass = await hashPassword('admin');
  await db.account.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      password: adminPass,
      role: 'admin',
      isApproved: true,
    },
  });

  // Default settings
  const defaults = [
    { key: 'companyName', value: 'M2INFINITY' },
    { key: 'logo', value: '' },
    { key: 'workStart', value: '09:00' },
    { key: 'workEnd', value: '17:00' },
    { key: 'delayDeductionPerMin', value: '1' },
    { key: 'advancePercent', value: '50' },
    { key: 'gpsLat', value: '' },
    { key: 'gpsLng', value: '' },
    { key: 'gpsRadius', value: '100' },
  ];

  for (const s of defaults) {
    await db.appSetting.upsert({
      where: { key: s.key },
      update: {},
      create: s,
    });
  }

  console.log('✅ Seed completed');
}

seed().catch(console.error);