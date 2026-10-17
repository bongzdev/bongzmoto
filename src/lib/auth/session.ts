// BongzMoto Authentication & Workshop Context Helper
import { cookies } from 'next/headers';
import { repo } from '../db/repository';
import { User, Workshop } from '../types';

export const DEFAULT_WORKSHOP_ID = 'ws-bongz-auto-soweto';
export const DEFAULT_OWNER_ID = 'usr-bongani-owner';
export const DEFAULT_MECHANIC_ID = 'usr-sipho-mechanic';

export interface AuthContext {
  user: User;
  workshop: Workshop;
  isOwner: boolean;
  isMechanic: boolean;
}

export async function getCurrentAuth(): Promise<AuthContext> {
  const cookieStore = await cookies();
  const userIdCookie = cookieStore.get('bongzmoto_user_id')?.value;
  const userId = userIdCookie || DEFAULT_OWNER_ID;

  let user = await repo.getUser(userId);
  if (!user) {
    user = await repo.getUser(DEFAULT_OWNER_ID);
  }

  if (!user) {
    // Fallback if not yet seeded
    return {
      user: {
        id: DEFAULT_OWNER_ID,
        email: 'bongani@bongzmoto.co.za',
        full_name: 'Bongani Khumalo (Owner)',
        role: 'owner',
        active_workshop_id: DEFAULT_WORKSHOP_ID,
        created_at: new Date().toISOString(),
      },
      workshop: {
        id: DEFAULT_WORKSHOP_ID,
        name: 'Bongz Auto Workshop',
        slug: 'bongz-auto',
        owner_id: DEFAULT_OWNER_ID,
        phone: '+27825550192',
        phone_display: '082 555 0192',
        address: 'Stand 412, Vilakazi St, Orlando West, Soweto',
        tax_enabled: false,
        tax_rate_percent: 15.0,
        job_prefix: 'JOB-',
        receipt_prefix: 'REC-',
        next_job_number: 1004,
        next_receipt_number: 1002,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      isOwner: true,
      isMechanic: false,
    };
  }

  let workshop = await repo.getWorkshop(user.active_workshop_id);
  if (!workshop) {
    workshop = (await repo.getWorkshop(DEFAULT_WORKSHOP_ID))!;
  }

  return {
    user,
    workshop,
    isOwner: user.role === 'owner',
    isMechanic: user.role === 'mechanic',
  };
}

export function assertOwner(auth: AuthContext) {
  if (!auth.isOwner) {
    throw new Error('Access denied: Owner privileges required for this action.');
  }
}
