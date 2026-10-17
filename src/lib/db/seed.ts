// BongzMoto Realistic Seed Data
import { getDbClient } from './client';
import { repo } from './repository';
import { randomUUID } from 'crypto';

export async function seedDatabase() {
  const db = getDbClient();

  // Check if already seeded
  const check = await db.execute({ sql: `SELECT COUNT(*) as count FROM workshops` });
  if ((check.rows[0].count as number) > 0) {
    return;
  }

  console.log('Seeding BongzMoto database with South African workshop data...');

  const workshopId = 'ws-bongz-auto-soweto';
  const ownerId = 'usr-bongani-owner';
  const mechanicId = 'usr-sipho-mechanic';

  // 1. Create Workshop
  await db.execute({
    sql: `INSERT INTO workshops (
            id, name, slug, owner_id, phone, phone_display, address,
            tax_enabled, tax_rate_percent, vat_number, job_prefix, receipt_prefix,
            next_job_number, next_receipt_number
          ) VALUES (?, ?, ?, ?, ?, ?, ?, 0, 15.0, NULL, 'JOB-', 'REC-', 1004, 1002)`,
    args: [
      workshopId,
      'Bongz Auto Workshop',
      'bongz-auto',
      ownerId,
      '+27825550192',
      '082 555 0192',
      'Stand 412, Vilakazi St, Orlando West, Soweto, 1804',
    ],
  });

  // 2. Create Users
  await db.execute({
    sql: `INSERT INTO users (id, email, full_name, role, active_workshop_id) VALUES
          (?, 'bongani@bongzmoto.co.za', 'Bongani Khumalo (Owner)', 'owner', ?),
          (?, 'sipho@bongzmoto.co.za', 'Sipho Ndlovu (Mechanic)', 'mechanic', ?)`,
    args: [ownerId, workshopId, mechanicId, workshopId],
  });

  // Workshop members
  await db.execute({
    sql: `INSERT INTO workshop_members (id, workshop_id, user_id, role) VALUES
          (?, ?, ?, 'owner'),
          (?, ?, ?, 'mechanic')`,
    args: [randomUUID(), workshopId, ownerId, randomUUID(), workshopId, mechanicId],
  });

  // 3. Create Customers
  const cust1Id = 'cust-thabo-molefe';
  const cust2Id = 'cust-lerato-dlamini';
  const cust3Id = 'cust-jabu-zulu';

  await db.execute({
    sql: `INSERT INTO customers (id, workshop_id, full_name, phone, phone_display, address, notes) VALUES
          (?, ?, 'Thabo Molefe', '+27834567890', '083 456 7890', 'Zone 3, Meadowlands, Soweto', 'Regular customer. Prefers WhatsApp.'),
          (?, ?, 'Lerato Dlamini', '+27721234567', '072 123 4567', 'Diepkloof Ext, Soweto', 'Commutes to Sandton daily.'),
          (?, ?, 'Jabulani "Jabu" Zulu', '+27829876543', '082 987 6543', 'Baragwanath Taxi Rank, Soweto', 'Local taxi association operator.')`,
    args: [cust1Id, workshopId, cust2Id, workshopId, cust3Id, workshopId],
  });

  // 4. Create Vehicles
  const veh1Id = 'veh-polo-vivo';
  const veh2Id = 'veh-quantum-taxi';
  const veh3Id = 'veh-ranger';

  await db.execute({
    sql: `INSERT INTO vehicles (id, workshop_id, customer_id, registration, registration_display, make, model, year, mileage, color, notes) VALUES
          (?, ?, ?, 'JH82YNGP', 'JH 82 YN GP', 'Volkswagen', 'Polo Vivo 1.4', 2018, 142000, 'Silver', 'Front brake squeal and clutch slipping'),
          (?, ?, ?, 'DN44LKGP', 'DN 44 LK GP', 'Toyota', 'HiAce Ses''fikile 2.7', 2020, 298000, 'White', 'Alternator not charging battery, hard start'),
          (?, ?, ?, 'CA492811', 'CA 492-811', 'Ford', 'Ranger 2.2 TDCi', 2019, 115000, 'Charcoal Gray', 'Major 120 000 km service & front shock replacement')`,
    args: [
      veh1Id,
      workshopId,
      cust1Id,
      veh2Id,
      workshopId,
      cust3Id,
      veh3Id,
      workshopId,
      cust2Id,
    ],
  });

  // 5. Job 1: JOB-1001 - VW Polo Vivo (In Progress with Approved Quote & Payment)
  const job1Id = 'job-1001';
  await db.execute({
    sql: `INSERT INTO jobs (
            id, workshop_id, job_number, customer_id, vehicle_id, 
            assigned_mechanic_id, status, payment_status, 
            customer_reported_problem, diagnosis_notes, expected_completion_date, 
            created_by
          ) VALUES (?, ?, 'JOB-1001', ?, ?, ?, 'in_progress', 'partially_paid', ?, ?, ?, ?)`,
    args: [
      job1Id,
      workshopId,
      cust1Id,
      veh1Id,
      mechanicId,
      'Clutch pedal feels spongy and engine revs high without accelerating on incline. Squealing noise from front left wheel when braking.',
      'Clutch pressure plate worn down to rivets, release bearing noisy. Front brake pads at 15% life, discs have slight lip. Recommended clutch kit replacement and front disc skim with Ferodo pads.',
      '2026-10-18',
      ownerId,
    ],
  });

  // Tasks for Job 1
  await repo.addJobTask(workshopId, job1Id, 'Drain gearbox oil and inspect for metal filings');
  await repo.addJobTask(workshopId, job1Id, 'Drop gearbox and remove worn clutch kit');
  await repo.addJobTask(workshopId, job1Id, 'Fit new LUK 3-piece clutch kit and bleed slave cylinder');
  await repo.addJobTask(workshopId, job1Id, 'Replace front brake pads with Ferodo Premier');

  // Quote for Job 1
  const quote1 = await repo.saveQuoteRevision(workshopId, job1Id, ownerId, 'Bongani Khumalo (Owner)', {
    items: [
      { item_type: 'part', description: 'LUK Clutch Kit (Cover, Plate, Release Bearing)', quantity: 1, unit_price_cents: 245000 },
      { item_type: 'labour', description: 'Labour: Gearbox removal, clutch installation & bleeding', quantity: 3.5, unit_price_cents: 45000 },
      { item_type: 'part', description: 'Ferodo Front Brake Pads set', quantity: 1, unit_price_cents: 68000 },
      { item_type: 'labour', description: 'Labour: Front brake pad replacement and disc cleaning', quantity: 1, unit_price_cents: 35000 },
      { item_type: 'part', description: 'Castrol 75W-90 Gearbox Oil (2L)', quantity: 2, unit_price_cents: 18000 },
    ],
    notes: 'Warranty: 6 months on clutch assembly. Please collect old parts on request.',
  });

  // Customer Approval for Job 1
  await repo.recordQuoteApproval(workshopId, job1Id, quote1.id, ownerId, 'Bongani Khumalo (Owner)', {
    status: 'approved',
    method: 'whatsapp',
    notes: 'Customer approved full quotation via WhatsApp audio message at 11:24.',
  });

  // Deposit Payment for Job 1
  await repo.recordPayment(workshopId, job1Id, ownerId, 'Bongani Khumalo (Owner)', {
    amount_cents: 250000, // R 2,500.00 deposit
    payment_method: 'eft',
    reference: 'FNB-EFT-9921',
    notes: 'Deposit paid for parts purchase.',
    idempotency_key: 'seed-pay-job1-dep',
  });

  // 6. Job 2: JOB-1002 - Toyota HiAce Quantum (Awaiting Approval)
  const job2Id = 'job-1002';
  await db.execute({
    sql: `INSERT INTO jobs (
            id, workshop_id, job_number, customer_id, vehicle_id, 
            assigned_mechanic_id, status, payment_status, 
            customer_reported_problem, diagnosis_notes, expected_completion_date, 
            created_by
          ) VALUES (?, ?, 'JOB-1002', ?, ?, ?, 'awaiting_approval', 'unpaid', ?, ?, ?, ?)`,
    args: [
      job2Id,
      workshopId,
      cust3Id,
      veh2Id,
      mechanicId,
      'Battery warning light on dash. Taxi struggled to start this morning at Bara rank. Driver had to jump-start twice.',
      'Multimeter test showed 11.8V running (alternator not charging). Tested rectifier diodes - diode pack shorted. Battery holds 12.4V resting. Alternator needs reconditioning or replacement.',
      '2026-10-16',
      mechanicId,
    ],
  });

  await repo.addJobTask(workshopId, job2Id, 'Remove alternator and bench-test voltage output');
  await repo.addJobTask(workshopId, job2Id, 'Fit replacement Bosch alternator and check belt tension');
  await repo.addJobTask(workshopId, job2Id, 'Test charging voltage under heavy load (lights + sound system)');

  await repo.saveQuoteRevision(workshopId, job2Id, ownerId, 'Bongani Khumalo (Owner)', {
    items: [
      { item_type: 'part', description: 'Remanufactured Bosch 12V 90A Alternator', quantity: 1, unit_price_cents: 185000 },
      { item_type: 'part', description: 'Fan / Serpentine Belt', quantity: 1, unit_price_cents: 28000 },
      { item_type: 'labour', description: 'Labour: Alternator removal, replacement and electrical test', quantity: 2, unit_price_cents: 40000 },
    ],
    notes: 'Same-day turnaround for taxi. Quote valid for 7 days.',
  });

  // 7. Job 3: JOB-1003 - Ford Ranger 2.2 (Ready for collection)
  const job3Id = 'job-1003';
  await db.execute({
    sql: `INSERT INTO jobs (
            id, workshop_id, job_number, customer_id, vehicle_id, 
            assigned_mechanic_id, status, payment_status, 
            customer_reported_problem, diagnosis_notes, expected_completion_date, 
            ready_date, created_by
          ) VALUES (?, ?, 'JOB-1003', ?, ?, ?, 'ready_for_collection', 'paid', ?, ?, ?, datetime('now'), ?)`,
    args: [
      job3Id,
      workshopId,
      cust2Id,
      veh3Id,
      mechanicId,
      '120 000 km major service due. Customer also reported knocks on bumpy dirt roads.',
      'Oil filter, air filter, fuel filter, pollen filter replaced. Front stabilizer bar link bushes perished. Replaced links with Monroe heavy duty.',
      '2026-10-15',
      ownerId,
    ],
  });

  const quote3 = await repo.saveQuoteRevision(workshopId, job3Id, ownerId, 'Bongani Khumalo (Owner)', {
    items: [
      { item_type: 'part', description: 'Major Service Kit (Oil, Fuel, Air, Cabin Filters)', quantity: 1, unit_price_cents: 145000 },
      { item_type: 'part', description: 'Fully Synthetic 5W-30 Engine Oil (8L)', quantity: 1, unit_price_cents: 110000 },
      { item_type: 'part', description: 'Monroe Heavy Duty Stabilizer Link Rods (Pair)', quantity: 1, unit_price_cents: 85000 },
      { item_type: 'labour', description: 'Labour: Major service & front suspension overhaul', quantity: 3, unit_price_cents: 45000 },
    ],
  });

  await repo.recordQuoteApproval(workshopId, job3Id, quote3.id, ownerId, 'Bongani Khumalo (Owner)', {
    status: 'approved',
    method: 'verbal',
    notes: 'Customer called in and gave verbal approval at 09:15.',
  });

  // Fully paid
  await repo.recordPayment(workshopId, job3Id, ownerId, 'Bongani Khumalo (Owner)', {
    amount_cents: quote3.total_cents,
    payment_method: 'card_external',
    reference: 'Yoco-POS-8812',
    notes: 'Paid via Yoco card machine at reception.',
    idempotency_key: 'seed-pay-job3-full',
  });

  console.log('Seeding completed successfully!');
}
