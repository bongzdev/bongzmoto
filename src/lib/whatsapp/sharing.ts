// BongzMoto WhatsApp Sharing & Integration Boundary
import { formatZAR, normalizeSouthAfricanPhone } from '../utils/formatters';

export type WhatsAppMessageType =
  | 'quotation'
  | 'approval_request'
  | 'progress_update'
  | 'ready_for_collection'
  | 'payment_reminder';

export interface WhatsAppMessageContext {
  customerName: string;
  customerPhone: string;
  vehicleMake: string;
  vehicleModel: string;
  vehicleRegistration: string;
  workshopName: string;
  jobNumber: string;
  quoteTotalCents?: number;
  outstandingBalanceCents?: number;
  publicQuoteUrl?: string;
  currentStatusLabel?: string;
}

/**
 * Builds standard South African township workshop messages
 */
export function buildWhatsAppMessage(
  type: WhatsAppMessageType,
  ctx: WhatsAppMessageContext
): string {
  const car = `${ctx.vehicleMake} ${ctx.vehicleModel} (${ctx.vehicleRegistration})`.trim();

  switch (type) {
    case 'quotation':
      return [
        `Good day ${ctx.customerName},`,
        `Here is your repair quotation for your ${car} from ${ctx.workshopName}.`,
        `Job Ref: ${ctx.jobNumber}`,
        ctx.quoteTotalCents ? `Total Amount: ${formatZAR(ctx.quoteTotalCents)}` : '',
        ctx.publicQuoteUrl ? `View your itemised quote: ${ctx.publicQuoteUrl}` : '',
        `Please review and reply to confirm if we may proceed with the parts and labour.`,
        `Thank you!`,
      ]
        .filter(Boolean)
        .join('\n\n');

    case 'approval_request':
      return [
        `Good day ${ctx.customerName},`,
        `We have inspected and diagnosed your ${car} at ${ctx.workshopName}.`,
        ctx.quoteTotalCents ? `Estimated repair cost: ${formatZAR(ctx.quoteTotalCents)}.` : '',
        ctx.publicQuoteUrl ? `View quote details: ${ctx.publicQuoteUrl}` : '',
        `Please let us know if you approve this work so we can order parts and begin repairs.`,
      ]
        .filter(Boolean)
        .join('\n\n');

    case 'progress_update':
      return [
        `Good day ${ctx.customerName},`,
        `Quick update regarding your ${car} (Job ${ctx.jobNumber}) at ${ctx.workshopName}:`,
        `Current Status: ${ctx.currentStatusLabel || 'In Progress'}.`,
        `Our mechanic is working on your vehicle. We will notify you once ready or if anything additional is required.`,
      ]
        .filter(Boolean)
        .join('\n\n');

    case 'ready_for_collection':
      return [
        `Dumelang / Good day ${ctx.customerName}! 🚗`,
        `Great news: Repairs on your ${car} are complete and your vehicle is ready for collection at ${ctx.workshopName}.`,
        ctx.outstandingBalanceCents !== undefined && ctx.outstandingBalanceCents > 0
          ? `Outstanding Balance: ${formatZAR(ctx.outstandingBalanceCents)}.`
          : `Balance: Settled in full.`,
        `Please visit the workshop during operating hours to collect. Job Ref: ${ctx.jobNumber}.`,
      ]
        .filter(Boolean)
        .join('\n\n');

    case 'payment_reminder':
      return [
        `Good day ${ctx.customerName},`,
        `Friendly reminder from ${ctx.workshopName} regarding the outstanding balance for your ${car} (Job ${ctx.jobNumber}).`,
        ctx.outstandingBalanceCents
          ? `Outstanding Balance: ${formatZAR(ctx.outstandingBalanceCents)}.`
          : '',
        `Kindly settle via Cash or EFT. Please let us know once paid so we can issue your receipt.`,
        `Thank you for your business!`,
      ]
        .filter(Boolean)
        .join('\n\n');
  }
}

/**
 * Generates the wa.me deep link with prefilled text
 * Normalizes phone to international format without the leading '+' for wa.me URL
 */
export function generateWhatsAppLink(
  type: WhatsAppMessageType,
  ctx: WhatsAppMessageContext
): { url: string; rawText: string; phone: string } {
  const normPhone = normalizeSouthAfricanPhone(ctx.customerPhone);
  // wa.me format requires digits only, no +
  const waPhone = normPhone.replace(/\D/g, '');
  const text = buildWhatsAppMessage(type, ctx);
  const encoded = encodeURIComponent(text);

  return {
    url: `https://wa.me/${waPhone}?text=${encoded}`,
    rawText: text,
    phone: normPhone,
  };
}

/**
 * FUTURE OFFICIAL WHATSAPP BUSINESS API INTEGRATION BOUNDARY
 *
 * ARCHITECTURAL SPECIFICATION:
 * When migrating to the official Meta WhatsApp Cloud API / Twilio WhatsApp:
 * 1. Webhook endpoint `/api/webhooks/whatsapp` receives inbound messages & status updates.
 * 2. Unassigned Messages Inbox:
 *    - Inbound messages MUST NOT be automatically attached to a job solely by customer phone number!
 *    - Rationale: In township workshops, a single customer (e.g. taxi fleet owner, family head)
 *      frequently has multiple vehicles / active jobs at the same time.
 *    - Therefore, inbound messages are routed to an "Unassigned Messages" triage inbox where
 *      the workshop manager or mechanic explicitly selects which active job the message belongs to.
 */
export interface FutureWhatsAppMessagePayload {
  messageId: string;
  fromPhone: string;
  timestamp: string;
  type: 'text' | 'audio' | 'image' | 'document';
  contentUrl?: string;
  textContent?: string;
}
