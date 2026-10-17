import { NextResponse } from 'next/server';
import { seedDatabase } from '@/lib/db/seed';

export async function POST() {
  try {
    await seedDatabase();
    return NextResponse.json({ success: true, message: 'Database initialized and seeded.' });
  } catch (error: any) {
    console.error('Error seeding database:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
