// BongzMoto Core Repository Layer
import { getDbClient } from './client';
import {
  User,
  Workshop,
  Customer,
  Vehicle,
  Job,
  JobStatus,
  PaymentStatus,
  JobTask,
  JobAttachment,
  JobTranscript,
  Quote,
  QuoteItem,
  QuoteApproval,
  Payment,
  PaymentReversal,
  ActivityEvent,
  PublicQuoteToken,
  WorkshopMetrics,
  AttachmentCategory,
  ApprovalMethod,
  PaymentMethod,
} from '../types';
import {
  normalizeSouthAfricanPhone,
  formatPhoneDisplay,
  normalizeRegistration,
  formatRegistrationDisplay,
} from '../utils/formatters';
import { randomUUID } from 'crypto';

export class BongzMotoRepository {
  private db = getDbClient();

  // WORKSHOPS
  async getWorkshop(workshopId: string): Promise<Workshop | null> {
    const res = await this.db.execute({
      sql: `SELECT * FROM workshops WHERE id = ?`,
      args: [workshopId],
    });
    if (res.rows.length === 0) return null;
    return this.mapWorkshop(res.rows[0]);
  }

  async updateWorkshopSettings(
    workshopId: string,
    data: {
      name?: string;
      phone?: string;
      address?: string;
      tax_enabled?: boolean;
      tax_rate_percent?: number;
      vat_number?: string | null;
    }
  ): Promise<Workshop> {
    const current = await this.getWorkshop(workshopId);
    if (!current) throw new Error('Workshop not found');

    const normPhone = data.phone ? normalizeSouthAfricanPhone(data.phone) : current.phone;
    const dispPhone = data.phone ? formatPhoneDisplay(normPhone) : current.phone_display;

    await this.db.execute({
      sql: `UPDATE workshops SET 
              name = COALESCE(?, name),
              phone = ?,
              phone_display = ?,
              address = COALESCE(?, address),
              tax_enabled = COALESCE(?, tax_enabled),
              tax_rate_percent = COALESCE(?, tax_rate_percent),
              vat_number = ?,
              updated_at = datetime('now')
            WHERE id = ?`,
      args: [
        data.name ?? null,
        normPhone,
        dispPhone,
        data.address ?? null,
        data.tax_enabled !== undefined ? (data.tax_enabled ? 1 : 0) : null,
        data.tax_rate_percent ?? null,
        data.vat_number !== undefined ? data.vat_number : current.vat_number ?? null,
        workshopId,
      ],
    });

    const updated = await this.getWorkshop(workshopId);
    return updated!;
  }

  // USERS & STAFF
  async getUser(userId: string): Promise<User | null> {
    const res = await this.db.execute({
      sql: `SELECT * FROM users WHERE id = ?`,
      args: [userId],
    });
    if (res.rows.length === 0) return null;
    return res.rows[0] as unknown as User;
  }

  async listWorkshopStaff(workshopId: string): Promise<User[]> {
    const res = await this.db.execute({
      sql: `SELECT u.* FROM users u
            JOIN workshop_members wm ON wm.user_id = u.id
            WHERE wm.workshop_id = ?
            ORDER BY u.role DESC, u.full_name ASC`,
      args: [workshopId],
    });
    return res.rows as unknown as User[];
  }

  // CUSTOMERS
  async listCustomers(workshopId: string, query?: string): Promise<Customer[]> {
    let sql = `SELECT c.*, 
                (SELECT COUNT(*) FROM vehicles v WHERE v.customer_id = c.id) as vehicle_count,
                (SELECT COUNT(*) FROM jobs j WHERE j.customer_id = c.id) as job_count
               FROM customers c 
               WHERE c.workshop_id = ?`;
    const args: any[] = [workshopId];

    if (query && query.trim()) {
      const q = `%${query.trim()}%`;
      const norm = normalizeSouthAfricanPhone(query.trim());
      sql += ` AND (c.full_name LIKE ? OR c.phone LIKE ? OR c.phone_display LIKE ?)`;
      args.push(q, `%${norm}%`, q);
    }

    sql += ` ORDER BY c.created_at DESC`;

    const res = await this.db.execute({ sql, args });
    return res.rows as unknown as Customer[];
  }

  async findDuplicateCustomers(
    workshopId: string,
    phone: string,
    fullName: string,
    excludeCustomerId?: string
  ): Promise<{ byPhone: Customer[]; byName: Customer[] }> {
    const normPhone = normalizeSouthAfricanPhone(phone);

    const phoneRes = await this.db.execute({
      sql: `SELECT * FROM customers 
            WHERE workshop_id = ? AND phone = ? 
            ${excludeCustomerId ? 'AND id != ?' : ''}`,
      args: excludeCustomerId ? [workshopId, normPhone, excludeCustomerId] : [workshopId, normPhone],
    });

    const nameRes = await this.db.execute({
      sql: `SELECT * FROM customers 
            WHERE workshop_id = ? AND LOWER(full_name) = LOWER(?) 
            ${excludeCustomerId ? 'AND id != ?' : ''}`,
      args: excludeCustomerId ? [workshopId, fullName.trim(), excludeCustomerId] : [workshopId, fullName.trim()],
    });

    return {
      byPhone: phoneRes.rows as unknown as Customer[],
      byName: nameRes.rows as unknown as Customer[],
    };
  }

  async createCustomer(
    workshopId: string,
    data: {
      full_name: string;
      phone: string;
      email?: string;
      address?: string;
      notes?: string;
    }
  ): Promise<Customer> {
    const id = randomUUID();
    const normPhone = normalizeSouthAfricanPhone(data.phone);
    const dispPhone = formatPhoneDisplay(normPhone);

    await this.db.execute({
      sql: `INSERT INTO customers (id, workshop_id, full_name, phone, phone_display, email, address, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        id,
        workshopId,
        data.full_name.trim(),
        normPhone,
        dispPhone,
        data.email?.trim() || null,
        data.address?.trim() || null,
        data.notes?.trim() || null,
      ],
    });

    const res = await this.db.execute({
      sql: `SELECT * FROM customers WHERE id = ?`,
      args: [id],
    });
    return res.rows[0] as unknown as Customer;
  }

  async getCustomer(workshopId: string, customerId: string): Promise<Customer | null> {
    const res = await this.db.execute({
      sql: `SELECT * FROM customers WHERE workshop_id = ? AND id = ?`,
      args: [workshopId, customerId],
    });
    if (res.rows.length === 0) return null;
    return res.rows[0] as unknown as Customer;
  }

  // VEHICLES
  async listVehicles(workshopId: string, query?: string): Promise<Vehicle[]> {
    let sql = `SELECT v.*, c.full_name as customer_name, c.phone_display as customer_phone,
                (SELECT COUNT(*) FROM jobs j WHERE j.vehicle_id = v.id) as job_count
               FROM vehicles v
               JOIN customers c ON c.id = v.customer_id
               WHERE v.workshop_id = ?`;
    const args: any[] = [workshopId];

    if (query && query.trim()) {
      const q = `%${query.trim()}%`;
      const normReg = `%${normalizeRegistration(query.trim())}%`;
      sql += ` AND (v.registration LIKE ? OR v.registration_display LIKE ? OR v.make LIKE ? OR v.model LIKE ? OR c.full_name LIKE ?)`;
      args.push(normReg, q, q, q, q);
    }

    sql += ` ORDER BY v.created_at DESC`;

    const res = await this.db.execute({ sql, args });
    return res.rows as unknown as Vehicle[];
  }

  async listCustomerVehicles(workshopId: string, customerId: string): Promise<Vehicle[]> {
    const res = await this.db.execute({
      sql: `SELECT v.*, (SELECT COUNT(*) FROM jobs j WHERE j.vehicle_id = v.id) as job_count
            FROM vehicles v
            WHERE v.workshop_id = ? AND v.customer_id = ?
            ORDER BY v.created_at DESC`,
      args: [workshopId, customerId],
    });
    return res.rows as unknown as Vehicle[];
  }

  async checkDuplicateVehicle(
    workshopId: string,
    registration: string,
    excludeVehicleId?: string
  ): Promise<Vehicle | null> {
    const norm = normalizeRegistration(registration);
    const sql = `SELECT v.*, c.full_name as customer_name 
                 FROM vehicles v
                 JOIN customers c ON c.id = v.customer_id
                 WHERE v.workshop_id = ? AND v.registration = ?
                 ${excludeVehicleId ? 'AND v.id != ?' : ''}`;
    const args = excludeVehicleId ? [workshopId, norm, excludeVehicleId] : [workshopId, norm];
    const res = await this.db.execute({ sql, args });
    if (res.rows.length === 0) return null;
    return res.rows[0] as unknown as Vehicle;
  }

  async createVehicle(
    workshopId: string,
    data: {
      customer_id: string;
      registration: string;
      make: string;
      model: string;
      year?: number;
      mileage?: number;
      vin?: string;
      engine_no?: string;
      color?: string;
      notes?: string;
    }
  ): Promise<Vehicle> {
    const id = randomUUID();
    const normReg = normalizeRegistration(data.registration);
    const dispReg = formatRegistrationDisplay(normReg);

    await this.db.execute({
      sql: `INSERT INTO vehicles (id, workshop_id, customer_id, registration, registration_display, make, model, year, mileage, vin, engine_no, color, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        id,
        workshopId,
        data.customer_id,
        normReg,
        dispReg,
        data.make.trim(),
        data.model.trim(),
        data.year || null,
        data.mileage || null,
        data.vin?.trim().toUpperCase() || null,
        data.engine_no?.trim() || null,
        data.color?.trim() || null,
        data.notes?.trim() || null,
      ],
    });

    const res = await this.db.execute({
      sql: `SELECT * FROM vehicles WHERE id = ?`,
      args: [id],
    });
    return res.rows[0] as unknown as Vehicle;
  }

  async getVehicle(workshopId: string, vehicleId: string): Promise<Vehicle | null> {
    const res = await this.db.execute({
      sql: `SELECT v.*, c.full_name as customer_name, c.phone_display as customer_phone
            FROM vehicles v
            JOIN customers c ON c.id = v.customer_id
            WHERE v.workshop_id = ? AND v.id = ?`,
      args: [workshopId, vehicleId],
    });
    if (res.rows.length === 0) return null;
    return res.rows[0] as unknown as Vehicle;
  }

  // JOBS
  /**
   * Generates next sequential job number safely for the workshop
   * e.g. JOB-0001, JOB-0002
   */
  async generateJobNumber(workshopId: string): Promise<string> {
    // Atomic read and increment using single transaction or atomic update
    const wRes = await this.db.execute({
      sql: `SELECT job_prefix, next_job_number FROM workshops WHERE id = ?`,
      args: [workshopId],
    });
    if (wRes.rows.length === 0) throw new Error('Workshop not found');

    const prefix = (wRes.rows[0].job_prefix as string) || 'JOB-';
    const nextNum = (wRes.rows[0].next_job_number as number) || 1;

    await this.db.execute({
      sql: `UPDATE workshops SET next_job_number = next_job_number + 1, updated_at = datetime('now') WHERE id = ?`,
      args: [workshopId],
    });

    const padded = String(nextNum).padStart(4, '0');
    return `${prefix}${padded}`;
  }

  async createJob(
    workshopId: string,
    userId: string,
    userName: string,
    data: {
      customer_id: string;
      vehicle_id: string;
      assigned_mechanic_id?: string;
      customer_reported_problem: string;
      expected_completion_date?: string;
      intake_notes?: string;
    }
  ): Promise<Job> {
    const id = randomUUID();
    const jobNumber = await this.generateJobNumber(workshopId);

    await this.db.execute({
      sql: `INSERT INTO jobs (
              id, workshop_id, job_number, customer_id, vehicle_id, 
              assigned_mechanic_id, status, payment_status, 
              customer_reported_problem, diagnosis_notes, expected_completion_date, 
              created_by
            ) VALUES (?, ?, ?, ?, ?, ?, 'received', 'unpaid', ?, ?, ?, ?)`,
      args: [
        id,
        workshopId,
        jobNumber,
        data.customer_id,
        data.vehicle_id,
        data.assigned_mechanic_id || null,
        data.customer_reported_problem.trim(),
        data.intake_notes?.trim() || null,
        data.expected_completion_date || null,
        userId,
      ],
    });

    // Add activity event
    await this.logActivity(
      id,
      workshopId,
      userId,
      userName,
      'job_created',
      `Job ${jobNumber} opened with status 'Received'`
    );

    const job = await this.getJob(workshopId, id);
    return job!;
  }

  async listJobs(
    workshopId: string,
    options?: {
      status?: string;
      mechanicId?: string;
      query?: string;
      limit?: number;
      vehicleId?: string;
      customerId?: string;
    }
  ): Promise<Job[]> {
    let sql = `SELECT j.*, 
                c.full_name as customer_name, c.phone as customer_phone, c.phone_display as customer_phone_display,
                v.registration as vehicle_registration, v.registration_display as vehicle_registration_display,
                v.make as vehicle_make, v.model as vehicle_model, v.year as vehicle_year, v.mileage as vehicle_mileage,
                u.full_name as assigned_mechanic_name,
                (SELECT COALESCE(q.total_cents, 0) FROM quotes q WHERE q.job_id = j.id AND q.is_current = 1) as approved_amount_cents,
                (SELECT COALESCE(SUM(p.amount_cents), 0) FROM payments p WHERE p.job_id = j.id AND p.is_reversed = 0) as total_paid_cents
               FROM jobs j
               JOIN customers c ON c.id = j.customer_id
               JOIN vehicles v ON v.id = j.vehicle_id
               LEFT JOIN users u ON u.id = j.assigned_mechanic_id
               WHERE j.workshop_id = ?`;
    const args: any[] = [workshopId];

    if (options?.status && options.status !== 'all') {
      sql += ` AND j.status = ?`;
      args.push(options.status);
    }

    if (options?.mechanicId) {
      sql += ` AND j.assigned_mechanic_id = ?`;
      args.push(options.mechanicId);
    }

    if (options?.vehicleId) {
      sql += ` AND j.vehicle_id = ?`;
      args.push(options.vehicleId);
    }

    if (options?.customerId) {
      sql += ` AND j.customer_id = ?`;
      args.push(options.customerId);
    }

    if (options?.query && options.query.trim()) {
      const q = `%${options.query.trim()}%`;
      const normReg = `%${normalizeRegistration(options.query.trim())}%`;
      const normPhone = `%${normalizeSouthAfricanPhone(options.query.trim())}%`;
      sql += ` AND (
        j.job_number LIKE ? OR 
        c.full_name LIKE ? OR 
        c.phone LIKE ? OR 
        v.registration LIKE ? OR 
        v.registration_display LIKE ? OR 
        v.make LIKE ? OR 
        v.model LIKE ?
      )`;
      args.push(q, q, normPhone, normReg, q, q, q);
    }

    sql += ` ORDER BY j.created_at DESC`;

    if (options?.limit) {
      sql += ` LIMIT ?`;
      args.push(options.limit);
    }

    const res = await this.db.execute({ sql, args });
    return res.rows.map((r) => this.mapJob(r));
  }

  async getJob(workshopId: string, jobId: string): Promise<Job | null> {
    const res = await this.db.execute({
      sql: `SELECT j.*, 
              c.full_name as customer_name, c.phone as customer_phone, c.phone_display as customer_phone_display,
              v.registration as vehicle_registration, v.registration_display as vehicle_registration_display,
              v.make as vehicle_make, v.model as vehicle_model, v.year as vehicle_year, v.mileage as vehicle_mileage,
              u.full_name as assigned_mechanic_name,
              cr.full_name as creator_name,
              (SELECT COALESCE(q.total_cents, 0) FROM quotes q WHERE q.job_id = j.id AND q.is_current = 1) as approved_amount_cents,
              (SELECT COALESCE(SUM(p.amount_cents), 0) FROM payments p WHERE p.job_id = j.id AND p.is_reversed = 0) as total_paid_cents
            FROM jobs j
            JOIN customers c ON c.id = j.customer_id
            JOIN vehicles v ON v.id = j.vehicle_id
            LEFT JOIN users u ON u.id = j.assigned_mechanic_id
            LEFT JOIN users cr ON cr.id = j.created_by
            WHERE j.workshop_id = ? AND j.id = ?`,
      args: [workshopId, jobId],
    });

    if (res.rows.length === 0) return null;
    return this.mapJob(res.rows[0]);
  }

  async updateJobStatus(
    workshopId: string,
    jobId: string,
    userId: string,
    userName: string,
    newStatus: JobStatus,
    notes?: string
  ): Promise<Job> {
    const current = await this.getJob(workshopId, jobId);
    if (!current) throw new Error('Job not found');

    let readyDate = current.ready_date;
    let closedAt = current.closed_at;

    if (newStatus === 'ready_for_collection' && !readyDate) {
      readyDate = new Date().toISOString();
    }
    if (newStatus === 'closed' && !closedAt) {
      closedAt = new Date().toISOString();
    }

    await this.db.execute({
      sql: `UPDATE jobs SET 
              status = ?, 
              ready_date = ?, 
              closed_at = ?,
              closing_notes = COALESCE(?, closing_notes),
              updated_at = datetime('now')
            WHERE workshop_id = ? AND id = ?`,
      args: [newStatus, readyDate || null, closedAt || null, notes || null, workshopId, jobId],
    });

    await this.logActivity(
      jobId,
      workshopId,
      userId,
      userName,
      'status_changed',
      `Status changed from '${this.formatStatusLabel(current.status)}' to '${this.formatStatusLabel(newStatus)}'${notes ? `: ${notes}` : ''}`
    );

    return (await this.getJob(workshopId, jobId))!;
  }

  async updateJobDiagnosis(
    workshopId: string,
    jobId: string,
    userId: string,
    userName: string,
    notes: string
  ): Promise<Job> {
    await this.db.execute({
      sql: `UPDATE jobs SET diagnosis_notes = ?, updated_at = datetime('now') WHERE workshop_id = ? AND id = ?`,
      args: [notes, workshopId, jobId],
    });

    await this.logActivity(jobId, workshopId, userId, userName, 'diagnosis_updated', 'Diagnosis notes updated');
    return (await this.getJob(workshopId, jobId))!;
  }

  async assignJobMechanic(
    workshopId: string,
    jobId: string,
    userId: string,
    userName: string,
    mechanicId: string | null
  ): Promise<Job> {
    let mechanicName = 'Unassigned';
    if (mechanicId) {
      const mech = await this.getUser(mechanicId);
      if (mech) mechanicName = mech.full_name;
    }

    await this.db.execute({
      sql: `UPDATE jobs SET assigned_mechanic_id = ?, updated_at = datetime('now') WHERE workshop_id = ? AND id = ?`,
      args: [mechanicId || null, workshopId, jobId],
    });

    await this.logActivity(jobId, workshopId, userId, userName, 'mechanic_assigned', `Assigned to ${mechanicName}`);
    return (await this.getJob(workshopId, jobId))!;
  }

  // TASKS
  async listJobTasks(workshopId: string, jobId: string): Promise<JobTask[]> {
    const res = await this.db.execute({
      sql: `SELECT * FROM job_tasks WHERE workshop_id = ? AND job_id = ? ORDER BY created_at ASC`,
      args: [workshopId, jobId],
    });
    return res.rows as unknown as JobTask[];
  }

  async addJobTask(workshopId: string, jobId: string, description: string): Promise<JobTask> {
    const id = randomUUID();
    await this.db.execute({
      sql: `INSERT INTO job_tasks (id, job_id, workshop_id, description, is_completed) VALUES (?, ?, ?, ?, 0)`,
      args: [id, jobId, workshopId, description.trim()],
    });
    const res = await this.db.execute({ sql: `SELECT * FROM job_tasks WHERE id = ?`, args: [id] });
    return res.rows[0] as unknown as JobTask;
  }

  async toggleJobTask(workshopId: string, taskId: string, isCompleted: boolean): Promise<void> {
    await this.db.execute({
      sql: `UPDATE job_tasks SET is_completed = ?, updated_at = datetime('now') WHERE workshop_id = ? AND id = ?`,
      args: [isCompleted ? 1 : 0, workshopId, taskId],
    });
  }

  // ATTACHMENTS & VOICE NOTES
  async listJobAttachments(workshopId: string, jobId: string): Promise<JobAttachment[]> {
    const res = await this.db.execute({
      sql: `SELECT a.*, u.full_name as uploaded_by_name 
            FROM job_attachments a
            LEFT JOIN users u ON u.id = a.uploaded_by
            WHERE a.workshop_id = ? AND a.job_id = ?
            ORDER BY a.created_at DESC`,
      args: [workshopId, jobId],
    });
    return res.rows as unknown as JobAttachment[];
  }

  async addJobAttachment(
    workshopId: string,
    jobId: string,
    userId: string,
    userName: string,
    data: {
      file_path: string;
      file_name: string;
      file_size: number;
      mime_type: string;
      category: AttachmentCategory;
      caption?: string;
    }
  ): Promise<JobAttachment> {
    const id = randomUUID();
    await this.db.execute({
      sql: `INSERT INTO job_attachments (id, job_id, workshop_id, file_path, file_name, file_size, mime_type, category, caption, uploaded_by)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        id,
        jobId,
        workshopId,
        data.file_path,
        data.file_name,
        data.file_size,
        data.mime_type,
        data.category,
        data.caption || null,
        userId,
      ],
    });

    const isAudio = data.mime_type.startsWith('audio/');
    const eventType = isAudio ? 'voice_note_added' : 'attachment_added';
    const desc = isAudio
      ? `Voice note recorded/uploaded (${data.file_name})`
      : `Attachment added: ${data.file_name} [${data.category}]`;

    await this.logActivity(jobId, workshopId, userId, userName, eventType, desc);

    const res = await this.db.execute({ sql: `SELECT * FROM job_attachments WHERE id = ?`, args: [id] });
    return res.rows[0] as unknown as JobAttachment;
  }

  async getAttachment(attachmentId: string): Promise<JobAttachment | null> {
    const res = await this.db.execute({
      sql: `SELECT * FROM job_attachments WHERE id = ?`,
      args: [attachmentId],
    });
    if (res.rows.length === 0) return null;
    return res.rows[0] as unknown as JobAttachment;
  }

  // TRANSCRIPTS
  async getJobTranscripts(workshopId: string, jobId: string): Promise<JobTranscript[]> {
    const res = await this.db.execute({
      sql: `SELECT * FROM job_transcripts WHERE workshop_id = ? AND job_id = ? ORDER BY created_at DESC`,
      args: [workshopId, jobId],
    });
    return res.rows as unknown as JobTranscript[];
  }

  async saveTranscript(
    workshopId: string,
    jobId: string,
    userId: string,
    userName: string,
    data: {
      attachment_id?: string;
      audio_duration_seconds?: number;
      raw_transcript: string;
      structured_issue?: string;
      structured_checks?: string;
      structured_findings?: string;
      structured_next_steps?: string;
    }
  ): Promise<JobTranscript> {
    const id = randomUUID();
    await this.db.execute({
      sql: `INSERT INTO job_transcripts (
              id, job_id, attachment_id, workshop_id, audio_duration_seconds,
              raw_transcript, structured_issue, structured_checks,
              structured_findings, structured_next_steps, status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft_review_required')`,
      args: [
        id,
        jobId,
        data.attachment_id || null,
        workshopId,
        data.audio_duration_seconds || null,
        data.raw_transcript,
        data.structured_issue || null,
        data.structured_checks || null,
        data.structured_findings || null,
        data.structured_next_steps || null,
      ],
    });

    await this.logActivity(
      jobId,
      workshopId,
      userId,
      userName,
      'transcript_created',
      'AI voice transcript draft generated (review required)'
    );

    const res = await this.db.execute({ sql: `SELECT * FROM job_transcripts WHERE id = ?`, args: [id] });
    return res.rows[0] as unknown as JobTranscript;
  }

  async markTranscriptReviewed(
    workshopId: string,
    transcriptId: string,
    userId: string,
    userName: string,
    editedTranscript?: string
  ): Promise<void> {
    await this.db.execute({
      sql: `UPDATE job_transcripts SET 
              status = 'reviewed',
              reviewed_by = ?,
              reviewed_at = datetime('now'),
              raw_transcript = COALESCE(?, raw_transcript)
            WHERE workshop_id = ? AND id = ?`,
      args: [userId, editedTranscript || null, workshopId, transcriptId],
    });

    const res = await this.db.execute({
      sql: `SELECT job_id FROM job_transcripts WHERE id = ?`,
      args: [transcriptId],
    });
    if (res.rows.length > 0) {
      await this.logActivity(
        res.rows[0].job_id as string,
        workshopId,
        userId,
        userName,
        'transcript_reviewed',
        'Voice transcript reviewed and verified by mechanic'
      );
    }
  }

  // QUOTES & REVISIONS
  async getCurrentQuote(workshopId: string, jobId: string): Promise<Quote | null> {
    const res = await this.db.execute({
      sql: `SELECT q.*, u.full_name as creator_name 
            FROM quotes q 
            LEFT JOIN users u ON u.id = q.created_by
            WHERE q.workshop_id = ? AND q.job_id = ? AND q.is_current = 1`,
      args: [workshopId, jobId],
    });
    if (res.rows.length === 0) return null;

    const quote = res.rows[0] as unknown as Quote;
    quote.items = await this.getQuoteItems(workshopId, quote.id);
    quote.approval = await this.getQuoteApproval(workshopId, quote.id);
    return quote;
  }

  async listQuoteRevisions(workshopId: string, jobId: string): Promise<Quote[]> {
    const res = await this.db.execute({
      sql: `SELECT q.*, u.full_name as creator_name 
            FROM quotes q 
            LEFT JOIN users u ON u.id = q.created_by
            WHERE q.workshop_id = ? AND q.job_id = ?
            ORDER BY q.revision_number DESC`,
      args: [workshopId, jobId],
    });

    const quotes = res.rows as unknown as Quote[];
    for (const q of quotes) {
      q.items = await this.getQuoteItems(workshopId, q.id);
      q.approval = await this.getQuoteApproval(workshopId, q.id);
    }
    return quotes;
  }

  async getQuoteItems(workshopId: string, quoteId: string): Promise<QuoteItem[]> {
    const res = await this.db.execute({
      sql: `SELECT * FROM quote_items WHERE workshop_id = ? AND quote_id = ? ORDER BY sort_order ASC, id ASC`,
      args: [workshopId, quoteId],
    });
    return res.rows as unknown as QuoteItem[];
  }

  async getQuoteApproval(workshopId: string, quoteId: string): Promise<QuoteApproval | null> {
    const res = await this.db.execute({
      sql: `SELECT qa.*, u.full_name as staff_name 
            FROM quote_approvals qa
            LEFT JOIN users u ON u.id = qa.staff_id
            WHERE qa.workshop_id = ? AND qa.quote_id = ?`,
      args: [workshopId, quoteId],
    });
    if (res.rows.length === 0) return null;
    return res.rows[0] as unknown as QuoteApproval;
  }

  /**
   * Creates a quotation revision.
   * If a current quote exists, it checks if it was approved:
   * Any change to an approved scope requires a new revision number and marks the previous one as no longer current.
   */
  async saveQuoteRevision(
    workshopId: string,
    jobId: string,
    userId: string,
    userName: string,
    data: {
      items: {
        item_type: 'part' | 'labour';
        description: string;
        quantity: number;
        unit_price_cents: number;
      }[];
      notes?: string;
      validity_date?: string;
    }
  ): Promise<Quote> {
    const current = await this.getCurrentQuote(workshopId, jobId);
    const workshop = await this.getWorkshop(workshopId);
    const taxRate = workshop?.tax_enabled ? Number(workshop.tax_rate_percent || 15) : 0;

    let revisionNumber = 1;

    if (current) {
      // If there's an existing quote, create a new revision
      revisionNumber = current.revision_number + 1;

      // Mark current quote as no longer current
      await this.db.execute({
        sql: `UPDATE quotes SET is_current = 0 WHERE id = ?`,
        args: [current.id],
      });
    }

    // Calculate subtotal
    let subtotalCents = 0;
    const computedItems = data.items.map((it, idx) => {
      const lineTotal = Math.round(it.quantity * it.unit_price_cents);
      subtotalCents += lineTotal;
      return {
        ...it,
        total_price_cents: lineTotal,
        sort_order: idx + 1,
      };
    });

    const taxCents = taxRate > 0 ? Math.round((subtotalCents * taxRate) / 100) : 0;
    const grandTotalCents = subtotalCents + taxCents;

    const newQuoteId = randomUUID();

    await this.db.execute({
      sql: `INSERT INTO quotes (
              id, job_id, workshop_id, revision_number, is_current,
              subtotal_cents, tax_cents, total_cents, tax_rate_percent,
              notes, validity_date, created_by
            ) VALUES (?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        newQuoteId,
        jobId,
        workshopId,
        revisionNumber,
        subtotalCents,
        taxCents,
        grandTotalCents,
        taxRate,
        data.notes || null,
        data.validity_date || null,
        userId,
      ],
    });

    // Insert items
    for (const item of computedItems) {
      const itemId = randomUUID();
      await this.db.execute({
        sql: `INSERT INTO quote_items (
                id, quote_id, workshop_id, item_type, description,
                quantity, unit_price_cents, total_price_cents, sort_order
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          itemId,
          newQuoteId,
          workshopId,
          item.item_type,
          item.description.trim(),
          item.quantity,
          item.unit_price_cents,
          item.total_price_cents,
          item.sort_order,
        ],
      });
    }

    // If previous quote was approved, creating a new revision means approval is reset!
    // Update job status to awaiting_approval if previously in_progress or diagnosing
    await this.db.execute({
      sql: `UPDATE jobs SET status = 'awaiting_approval', updated_at = datetime('now') WHERE id = ?`,
      args: [jobId],
    });

    const logText = current
      ? `Quote revised to Revision ${revisionNumber} (Total: R ${(grandTotalCents / 100).toFixed(2)}). Fresh customer approval required.`
      : `Initial quotation prepared: Rev ${revisionNumber} (Total: R ${(grandTotalCents / 100).toFixed(2)})`;

    await this.logActivity(jobId, workshopId, userId, userName, 'quote_created', logText);

    return (await this.getCurrentQuote(workshopId, jobId))!;
  }

  // APPROVALS
  async recordQuoteApproval(
    workshopId: string,
    jobId: string,
    quoteId: string,
    userId: string,
    userName: string,
    data: {
      status: 'approved' | 'rejected';
      method: ApprovalMethod;
      notes?: string;
      attachment_id?: string;
    }
  ): Promise<QuoteApproval> {
    const quoteRes = await this.db.execute({
      sql: `SELECT * FROM quotes WHERE workshop_id = ? AND id = ?`,
      args: [workshopId, quoteId],
    });
    if (quoteRes.rows.length === 0) throw new Error('Quote not found');
    const quote = quoteRes.rows[0];

    const approvalId = randomUUID();
    const approvedAmount = data.status === 'approved' ? (quote.total_cents as number) : 0;

    await this.db.execute({
      sql: `INSERT INTO quote_approvals (
              id, quote_id, job_id, workshop_id, revision_number,
              approved_amount_cents, status, method, staff_id, notes, attachment_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        approvalId,
        quoteId,
        jobId,
        workshopId,
        quote.revision_number,
        approvedAmount,
        data.status,
        data.method,
        userId,
        data.notes || null,
        data.attachment_id || null,
      ],
    });

    // Update job status accordingly
    const newStatus: JobStatus = data.status === 'approved' ? 'in_progress' : 'diagnosing';
    await this.db.execute({
      sql: `UPDATE jobs SET status = ?, updated_at = datetime('now') WHERE id = ?`,
      args: [newStatus, jobId],
    });

    const methodDesc =
      data.method === 'verbal'
        ? 'Verbally recorded (not digitally verified)'
        : data.method === 'whatsapp'
        ? 'WhatsApp confirmation'
        : data.method === 'signed'
        ? 'Signed work order'
        : data.method;

    const logDesc =
      data.status === 'approved'
        ? `Quote Rev ${quote.revision_number} APPROVED (R ${(approvedAmount / 100).toFixed(2)}) via ${methodDesc}`
        : `Quote Rev ${quote.revision_number} REJECTED via ${methodDesc}`;

    await this.logActivity(jobId, workshopId, userId, userName, 'quote_approval', logDesc);

    const res = await this.db.execute({
      sql: `SELECT qa.*, u.full_name as staff_name FROM quote_approvals qa
            LEFT JOIN users u ON u.id = qa.staff_id
            WHERE qa.id = ?`,
      args: [approvalId],
    });
    return res.rows[0] as unknown as QuoteApproval;
  }

  // PAYMENTS & RECEIPTS
  /**
   * Generates next sequential receipt number safely for the workshop
   * e.g. REC-0001
   */
  async generateReceiptNumber(workshopId: string): Promise<string> {
    const wRes = await this.db.execute({
      sql: `SELECT receipt_prefix, next_receipt_number FROM workshops WHERE id = ?`,
      args: [workshopId],
    });
    if (wRes.rows.length === 0) throw new Error('Workshop not found');

    const prefix = (wRes.rows[0].receipt_prefix as string) || 'REC-';
    const nextNum = (wRes.rows[0].next_receipt_number as number) || 1;

    await this.db.execute({
      sql: `UPDATE workshops SET next_receipt_number = next_receipt_number + 1, updated_at = datetime('now') WHERE id = ?`,
      args: [workshopId],
    });

    const padded = String(nextNum).padStart(4, '0');
    return `${prefix}${padded}`;
  }

  async listJobPayments(workshopId: string, jobId: string): Promise<Payment[]> {
    const res = await this.db.execute({
      sql: `SELECT p.*, u.full_name as recorded_by_name 
            FROM payments p 
            LEFT JOIN users u ON u.id = p.recorded_by
            WHERE p.workshop_id = ? AND p.job_id = ?
            ORDER BY p.created_at DESC`,
      args: [workshopId, jobId],
    });

    const payments = res.rows as unknown as Payment[];
    for (const p of payments) {
      if (p.is_reversed) {
        const revRes = await this.db.execute({
          sql: `SELECT pr.*, u.full_name as recorded_by_name 
                FROM payment_reversals pr
                LEFT JOIN users u ON u.id = pr.recorded_by
                WHERE pr.payment_id = ?`,
          args: [p.id],
        });
        if (revRes.rows.length > 0) {
          p.reversal = revRes.rows[0] as unknown as PaymentReversal;
        }
      }
    }
    return payments;
  }

  async recordPayment(
    workshopId: string,
    jobId: string,
    userId: string,
    userName: string,
    data: {
      amount_cents: number;
      payment_method: PaymentMethod;
      payment_date?: string;
      reference?: string;
      notes?: string;
      idempotency_key?: string;
    }
  ): Promise<Payment> {
    if (data.amount_cents <= 0) {
      throw new Error('Payment amount must be greater than zero');
    }

    // Check idempotency to prevent duplicate payments on double click
    if (data.idempotency_key) {
      const existing = await this.db.execute({
        sql: `SELECT * FROM payments WHERE idempotency_key = ?`,
        args: [data.idempotency_key],
      });
      if (existing.rows.length > 0) {
        return existing.rows[0] as unknown as Payment;
      }
    }

    const receiptNumber = await this.generateReceiptNumber(workshopId);
    const paymentId = randomUUID();

    await this.db.execute({
      sql: `INSERT INTO payments (
              id, job_id, workshop_id, receipt_number, amount_cents,
              payment_method, payment_date, reference, notes,
              recorded_by, idempotency_key, is_reversed
            ) VALUES (?, ?, ?, ?, ?, ?, COALESCE(?, datetime('now')), ?, ?, ?, ?, 0)`,
      args: [
        paymentId,
        jobId,
        workshopId,
        receiptNumber,
        data.amount_cents,
        data.payment_method,
        data.payment_date || null,
        data.reference || null,
        data.notes || null,
        userId,
        data.idempotency_key || null,
      ],
    });

    // Recalculate job payment status
    await this.recalculateJobPaymentStatus(workshopId, jobId);

    await this.logActivity(
      jobId,
      workshopId,
      userId,
      userName,
      'payment_recorded',
      `Payment of R ${(data.amount_cents / 100).toFixed(2)} recorded (${data.payment_method.toUpperCase()}). Receipt: ${receiptNumber}`
    );

    const res = await this.db.execute({
      sql: `SELECT p.*, u.full_name as recorded_by_name FROM payments p 
            LEFT JOIN users u ON u.id = p.recorded_by 
            WHERE p.id = ?`,
      args: [paymentId],
    });
    return res.rows[0] as unknown as Payment;
  }

  async reversePayment(
    workshopId: string,
    jobId: string,
    paymentId: string,
    userId: string,
    userName: string,
    reason: string
  ): Promise<PaymentReversal> {
    const pRes = await this.db.execute({
      sql: `SELECT * FROM payments WHERE workshop_id = ? AND id = ?`,
      args: [workshopId, paymentId],
    });
    if (pRes.rows.length === 0) throw new Error('Payment not found');
    const payment = pRes.rows[0];

    if (payment.is_reversed) throw new Error('Payment is already reversed');

    // Mark payment reversed
    await this.db.execute({
      sql: `UPDATE payments SET is_reversed = 1 WHERE id = ?`,
      args: [paymentId],
    });

    // Record reversal
    const revId = randomUUID();
    await this.db.execute({
      sql: `INSERT INTO payment_reversals (id, payment_id, job_id, workshop_id, reason, recorded_by)
            VALUES (?, ?, ?, ?, ?, ?)`,
      args: [revId, paymentId, jobId, workshopId, reason.trim(), userId],
    });

    // Recalculate job payment status
    await this.recalculateJobPaymentStatus(workshopId, jobId);

    await this.logActivity(
      jobId,
      workshopId,
      userId,
      userName,
      'payment_reversed',
      `Reversed payment ${payment.receipt_number} (R ${((payment.amount_cents as number) / 100).toFixed(2)}): ${reason}`
    );

    const res = await this.db.execute({
      sql: `SELECT * FROM payment_reversals WHERE id = ?`,
      args: [revId],
    });
    return res.rows[0] as unknown as PaymentReversal;
  }

  private async recalculateJobPaymentStatus(workshopId: string, jobId: string): Promise<PaymentStatus> {
    // Get approved quote amount
    const quoteRes = await this.db.execute({
      sql: `SELECT total_cents FROM quotes WHERE job_id = ? AND is_current = 1`,
      args: [jobId],
    });
    const agreedCents = quoteRes.rows.length > 0 ? (quoteRes.rows[0].total_cents as number) : 0;

    // Get total paid (excluding reversed)
    const paidRes = await this.db.execute({
      sql: `SELECT COALESCE(SUM(amount_cents), 0) as total_paid FROM payments WHERE job_id = ? AND is_reversed = 0`,
      args: [jobId],
    });
    const totalPaidCents = paidRes.rows[0].total_paid as number;

    let newStatus: PaymentStatus = 'unpaid';
    if (totalPaidCents === 0) {
      newStatus = 'unpaid';
    } else if (agreedCents > 0 && totalPaidCents > agreedCents) {
      newStatus = 'overpaid';
    } else if (agreedCents > 0 && totalPaidCents === agreedCents) {
      newStatus = 'paid';
    } else {
      newStatus = 'partially_paid';
    }

    await this.db.execute({
      sql: `UPDATE jobs SET payment_status = ?, updated_at = datetime('now') WHERE id = ?`,
      args: [newStatus, jobId],
    });

    return newStatus;
  }

  // ACTIVITY LOG
  async logActivity(
    jobId: string,
    workshopId: string,
    actorId: string | null,
    actorName: string,
    eventType: string,
    description: string,
    metadata?: any
  ): Promise<void> {
    const id = randomUUID();
    await this.db.execute({
      sql: `INSERT INTO activity_events (id, job_id, workshop_id, actor_id, actor_name, event_type, description, metadata_json)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        id,
        jobId,
        workshopId,
        actorId || null,
        actorName,
        eventType,
        description,
        metadata ? JSON.stringify(metadata) : null,
      ],
    });
  }

  async listJobActivity(workshopId: string, jobId: string): Promise<ActivityEvent[]> {
    const res = await this.db.execute({
      sql: `SELECT * FROM activity_events WHERE workshop_id = ? AND job_id = ? ORDER BY created_at DESC`,
      args: [workshopId, jobId],
    });
    return res.rows as unknown as ActivityEvent[];
  }

  // PUBLIC QUOTE TOKENS
  async createPublicQuoteToken(workshopId: string, jobId: string, quoteId: string): Promise<string> {
    const token = randomUUID().replace(/-/g, '') + randomUUID().replace(/-/g, '');
    const id = randomUUID();
    // Default 14 days expiration
    const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();

    await this.db.execute({
      sql: `INSERT INTO public_quote_tokens (id, quote_id, job_id, workshop_id, token, expires_at)
            VALUES (?, ?, ?, ?, ?, ?)`,
      args: [id, quoteId, jobId, workshopId, token, expiresAt],
    });

    return token;
  }

  /**
   * Retrieves sanitized public quote data by token.
   * STRICT SECURITY BOUNDARY:
   * Excludes internal notes, transcripts, private attachments, mechanic assignments, or other jobs.
   */
  async getPublicQuoteByToken(token: string): Promise<{
    quote: Quote;
    workshop: {
      name: string;
      phone: string;
      phone_display: string;
      address: string;
      vat_number?: string | null;
    };
    customer: {
      full_name: string;
    };
    vehicle: {
      make: string;
      model: string;
      registration_display: string;
      year?: number | null;
    };
    job_number: string;
  } | null> {
    const tokenRes = await this.db.execute({
      sql: `SELECT * FROM public_quote_tokens 
            WHERE token = ? AND revoked_at IS NULL AND expires_at > datetime('now')`,
      args: [token],
    });
    if (tokenRes.rows.length === 0) return null;

    const row = tokenRes.rows[0];
    const quoteId = row.quote_id as string;
    const jobId = row.job_id as string;
    const workshopId = row.workshop_id as string;

    const quoteRes = await this.db.execute({
      sql: `SELECT * FROM quotes WHERE id = ? AND workshop_id = ?`,
      args: [quoteId, workshopId],
    });
    if (quoteRes.rows.length === 0) return null;
    const quote = quoteRes.rows[0] as unknown as Quote;
    quote.items = await this.getQuoteItems(workshopId, quoteId);

    const workshop = await this.getWorkshop(workshopId);
    if (!workshop) return null;

    const job = await this.getJob(workshopId, jobId);
    if (!job) return null;

    return {
      quote,
      workshop: {
        name: workshop.name,
        phone: workshop.phone,
        phone_display: workshop.phone_display,
        address: workshop.address,
        vat_number: workshop.tax_enabled ? workshop.vat_number : null,
      },
      customer: {
        full_name: job.customer_name || 'Customer',
      },
      vehicle: {
        make: job.vehicle_make || '',
        model: job.vehicle_model || '',
        registration_display: job.vehicle_registration_display || job.vehicle_registration || '',
        year: job.vehicle_year,
      },
      job_number: job.job_number,
    };
  }

  // WORKSHOP METRICS (Owner only)
  async getWorkshopMetrics(workshopId: string): Promise<WorkshopMetrics> {
    const jobsRes = await this.db.execute({
      sql: `SELECT status, COUNT(*) as count FROM jobs WHERE workshop_id = ? GROUP BY status`,
      args: [workshopId],
    });

    let active_jobs = 0;
    let awaiting_approval = 0;
    let waiting_for_parts = 0;
    let ready_for_collection = 0;

    for (const row of jobsRes.rows) {
      const status = row.status as JobStatus;
      const cnt = row.count as number;
      if (status !== 'closed' && status !== 'cancelled') {
        active_jobs += cnt;
      }
      if (status === 'awaiting_approval') awaiting_approval = cnt;
      if (status === 'waiting_for_parts') waiting_for_parts = cnt;
      if (status === 'ready_for_collection') ready_for_collection = cnt;
    }

    // Calculate total revenue and outstanding balance
    const finRes = await this.db.execute({
      sql: `SELECT 
              COALESCE(SUM(p.amount_cents), 0) as total_revenue
            FROM payments p
            WHERE p.workshop_id = ? AND p.is_reversed = 0`,
      args: [workshopId],
    });
    const total_revenue_cents = finRes.rows[0].total_revenue as number;

    // Total agreed on active jobs minus total paid on active jobs
    const balRes = await this.db.execute({
      sql: `SELECT 
              SUM(
                CASE 
                  WHEN (COALESCE(q.total_cents, 0) - COALESCE(pd.paid_cents, 0)) > 0 
                  THEN (COALESCE(q.total_cents, 0) - COALESCE(pd.paid_cents, 0))
                  ELSE 0 
                END
              ) as total_outstanding
            FROM jobs j
            LEFT JOIN quotes q ON q.job_id = j.id AND q.is_current = 1
            LEFT JOIN (
              SELECT job_id, SUM(amount_cents) as paid_cents 
              FROM payments 
              WHERE is_reversed = 0 
              GROUP BY job_id
            ) pd ON pd.job_id = j.id
            WHERE j.workshop_id = ? AND j.status NOT IN ('closed', 'cancelled')`,
      args: [workshopId],
    });
    const total_outstanding_cents = (balRes.rows[0]?.total_outstanding as number) || 0;

    return {
      active_jobs,
      awaiting_approval,
      waiting_for_parts,
      ready_for_collection,
      total_outstanding_cents,
      total_revenue_cents,
    };
  }

  // EXPORT DATA (Owner only)
  async exportWorkshopData(workshopId: string): Promise<any> {
    const workshop = await this.getWorkshop(workshopId);
    const customers = await this.listCustomers(workshopId);
    const vehicles = await this.listVehicles(workshopId);
    const jobs = await this.listJobs(workshopId);
    const paymentsRes = await this.db.execute({
      sql: `SELECT * FROM payments WHERE workshop_id = ?`,
      args: [workshopId],
    });

    return {
      exported_at: new Date().toISOString(),
      workshop,
      customers,
      vehicles,
      jobs,
      payments: paymentsRes.rows,
    };
  }

  // HELPERS
  private mapWorkshop(row: any): Workshop {
    return {
      ...row,
      tax_enabled: Boolean(row.tax_enabled),
      next_job_number: Number(row.next_job_number),
      next_receipt_number: Number(row.next_receipt_number),
    };
  }

  private mapJob(row: any): Job {
    const approvedAmount = Number(row.approved_amount_cents || 0);
    const totalPaid = Number(row.total_paid_cents || 0);
    const balance = approvedAmount > 0 ? approvedAmount - totalPaid : 0;

    return {
      ...row,
      approved_amount_cents: approvedAmount,
      total_paid_cents: totalPaid,
      balance_cents: balance,
    };
  }

  private formatStatusLabel(status: string): string {
    const map: Record<string, string> = {
      received: 'Received',
      diagnosing: 'Diagnosing',
      awaiting_approval: 'Awaiting Approval',
      waiting_for_parts: 'Waiting for Parts',
      in_progress: 'In Progress',
      ready_for_collection: 'Ready for Collection',
      closed: 'Closed',
      cancelled: 'Cancelled',
    };
    return map[status] || status;
  }
}

// Singleton repository
export const repo = new BongzMotoRepository();
