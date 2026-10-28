const { createClient } = require('@libsql/client');
const { randomUUID } = require('crypto');

const client = createClient({
  url: process.env.DATABASE_URL,
  authToken: process.env.DATABASE_AUTH_TOKEN,
});

async function seedShelbezInvoice() {
  console.log('Seeding Shelbez workshop banking details and Invoice #3408...');

  const workshopId = 'ws-shelbez-phuthaditjhaba';

  // 1. Update Shelbez workshop with official banking details
  await client.execute({
    sql: `UPDATE workshops SET
            bank_name = 'First National Bank (FNB)',
            account_holder = 'Shelbez Auto Mechanic & Panel Beaters',
            account_number = '62815244843',
            branch_code = '231733',
            branch_name = 'Phuthaditjhaba',
            phone = '+27836249726',
            phone_display = '083 624 9726',
            address = '2996 Bluegumbosch, Phuthaditjhaba 9868, Free State',
            logo_url = 'https://eihjrjvsgcxkgdzlondk.supabase.co/storage/v1/object/public/logos/shelbez-logo.jpg',
            updated_at = datetime('now')
          WHERE id = ?`,
    args: [workshopId],
  });
  console.log('Updated Shelbez workshop banking and contact details.');

  // Find owner or user for Shelbez
  const userRes = await client.execute({
    sql: `SELECT id FROM users WHERE active_workshop_id = ? LIMIT 1`,
    args: [workshopId],
  });

  let userId = userRes.rows.length > 0 ? userRes.rows[0].id : null;
  if (!userId) {
    const ownerRes = await client.execute(`SELECT id FROM users LIMIT 1;`);
    userId = ownerRes.rows[0].id;
  }

  // 2. Create / ensure Customer
  const custId = 'cust-shelbez-sample-hilux';
  await client.execute({
    sql: `INSERT INTO customers (id, workshop_id, full_name, phone, phone_display, address, notes)
          VALUES (?, ?, 'Tshepo Maritz (Sample Customer)', '+27836249726', '083 624 9726', '2996 Bluegumbosch, Phuthaditjhaba', 'Sample client for Toyota Hilux clutch overhaul')
          ON CONFLICT(id) DO UPDATE SET full_name = excluded.full_name, phone = excluded.phone, phone_display = excluded.phone_display`,
    args: [custId, workshopId],
  });

  // 3. Create / ensure Vehicle
  const vehId = 'veh-shelbez-hilux-3408';
  await client.execute({
    sql: `INSERT INTO vehicles (id, workshop_id, customer_id, registration, registration_display, make, model, year, mileage, color, notes)
          VALUES (?, ?, ?, 'FS44BBGP', 'FS 44 BB GP', 'Toyota', 'Hilux 2.4 GD-6 Single Cab', 2019, 164500, 'White', 'Sample invoice vehicle for clutch replacement')
          ON CONFLICT(id) DO UPDATE SET make = excluded.make, model = excluded.model, mileage = excluded.mileage`,
    args: [vehId, workshopId, custId],
  });

  // 4. Create / ensure Job INV-3408
  const jobId = 'job-shelbez-3408';
  await client.execute({
    sql: `INSERT INTO jobs (
            id, workshop_id, job_number, customer_id, vehicle_id,
            status, payment_status, customer_reported_problem, diagnosis_notes,
            expected_completion_date, created_by
          ) VALUES (?, ?, 'INV-3408', ?, ?, 'ready_for_collection', 'partially_paid',
            'Clutch kit replacement, pressure plate, release bearing, and flywheel skim',
            'Clutch disc worn down to rivets, flywheel showing minor heat spots. Flywheel precision skimmed and new LUK clutch kit installed with fresh 75W-90 transmission oil.',
            datetime('now'), ?)
          ON CONFLICT(id) DO UPDATE SET
            status = 'ready_for_collection',
            payment_status = 'partially_paid',
            customer_reported_problem = excluded.customer_reported_problem,
            diagnosis_notes = excluded.diagnosis_notes`,
    args: [jobId, workshopId, custId, vehId, userId],
  });

  // 5. Create Quote
  const quoteId = 'quote-shelbez-3408';
  const subtotalCents = 768500; // R7,685.00
  await client.execute({
    sql: `INSERT INTO quotes (
            id, job_id, workshop_id, revision_number, is_current,
            subtotal_cents, tax_cents, total_cents, tax_rate_percent, notes, created_by
          ) VALUES (?, ?, ?, 1, 1, ?, 0, ?, 15.0, 'Workmanship and parts guaranteed for 90 days or 5,000 km.', ?)
          ON CONFLICT(id) DO UPDATE SET
            is_current = 1,
            subtotal_cents = excluded.subtotal_cents,
            total_cents = excluded.total_cents`,
    args: [quoteId, jobId, workshopId, subtotalCents, subtotalCents, userId],
  });

  // Delete previous items if any
  await client.execute({
    sql: `DELETE FROM quote_items WHERE quote_id = ?`,
    args: [quoteId],
  });

  // Insert items
  const items = [
    {
      desc: 'LUK Heavy Duty Clutch Kit (Pressure Plate, Disc, Release Bearing)',
      type: 'part',
      qty: 1,
      unitPrice: 425000,
      totalPrice: 425000,
    },
    {
      desc: 'Castrol Syntrans 75W-90 Manual Transmission Fluid (3L)',
      type: 'part',
      qty: 3,
      unitPrice: 19500,
      totalPrice: 58500,
    },
    {
      desc: 'Transmission Removal, Clutch Kit Replacement & Re-fitment',
      type: 'labour',
      qty: 1,
      unitPrice: 220000,
      totalPrice: 220000,
    },
    {
      desc: 'Flywheel Machining & Precision Skimming',
      type: 'labour',
      qty: 1,
      unitPrice: 65000,
      totalPrice: 65000,
    },
  ];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    await client.execute({
      sql: `INSERT INTO quote_items (id, quote_id, workshop_id, item_type, description, quantity, unit_price_cents, total_price_cents, sort_order)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        randomUUID(),
        quoteId,
        workshopId,
        item.type,
        item.desc,
        item.qty,
        item.unitPrice,
        item.totalPrice,
        i,
      ],
    });
  }

  // Quote approval
  await client.execute({
    sql: `INSERT OR REPLACE INTO quote_approvals (id, quote_id, job_id, workshop_id, revision_number, approved_amount_cents, status, method, staff_id, notes)
          VALUES (?, ?, ?, ?, 1, ?, 'approved', 'whatsapp', ?, 'Client approved clutch replacement via WhatsApp voice/chat')`,
    args: ['appr-shelbez-3408', quoteId, jobId, workshopId, subtotalCents, userId],
  });

  // 6. Deposit Payment
  await client.execute({
    sql: `DELETE FROM payments WHERE job_id = ?`,
    args: [jobId],
  });

  await client.execute({
    sql: `INSERT INTO payments (id, job_id, workshop_id, receipt_number, amount_cents, payment_method, payment_date, reference, notes, recorded_by, is_reversed)
          VALUES (?, ?, ?, 'REC-3408', 450000, 'eft', datetime('now', '-1 day'), 'FNB-DEP-3408', 'Part deposit via FNB EFT for parts purchase', ?, 0)`,
    args: [randomUUID(), jobId, workshopId, userId],
  });

  console.log('Successfully seeded Shelbez Invoice #3408!');
}

seedShelbezInvoice()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
