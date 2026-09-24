/**
 * WhatsApp Cloud API Service
 * Handles dispatching official Pink Polo 2026 QR admission passes via Meta WhatsApp Cloud API.
 */

export interface SendWhatsAppTicketParams {
  toPhone: string;
  attendeeName: string;
  ticketId: string;
  tier: string;
  gate: string;
  qrValue?: string;
  customMessage?: string;
}

export interface WhatsAppResponse {
  success: boolean;
  messageId?: string;
  error?: string;
  recipient?: string;
  fallbackUrl?: string;
}

/**
 * Format helper for assigned gate turnstiles
 */
export function getGateForTier(tier: string): string {
  if (tier.includes('VIP')) return 'Gate 1 (Royal Pavilion Turnstile)';
  if (tier.includes('Clubhouse')) return 'Gate 2 (Clubhouse South Entry)';
  if (tier.includes('Garden')) return 'Gate 3 (Garden Terrace Gate)';
  return 'Gate 4 (Grandstand East Turnstile)';
}

/**
 * Dispatches an official QR ticket pass notification via WhatsApp Cloud API
 */
export async function sendWhatsAppTicketPass(params: SendWhatsAppTicketParams): Promise<WhatsAppResponse> {
  const cleanPhone = (params.toPhone || '').replace(/[^0-9]/g, '');

  const fallbackMsg = encodeURIComponent(
    `*Pink Polo 2026 Official Admission Pass*\n\n` +
      `Dear ${params.attendeeName},\n` +
      `Your registration for the Pink Polo 2026 Charity Gala has been *APPROVED*!\n\n` +
      `🎟️ *Ticket Pass ID:* ${params.ticketId}\n` +
      `👑 *Experience Tier:* ${params.tier}\n` +
      `🚪 *Assigned Gate:* ${params.gate}\n` +
      `📅 *Dates:* Nov 20–22, 2026 (14:00 Daily)\n` +
      `📍 *Venue:* Al Rayyan Grounds, Doha\n\n` +
      `Present your verified digital QR barcode at your gate turnstile for fast-track VIP wristband entry.`
  );
  const fallbackUrl = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${fallbackMsg}`;

  if (!cleanPhone) {
    return {
      success: false,
      error: 'Invalid or missing phone number.',
      fallbackUrl,
    };
  }

  try {
    const response = await fetch('/api/send-whatsapp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: cleanPhone,
        name: params.attendeeName,
        ticketId: params.ticketId,
        tier: params.tier,
        gate: params.gate,
        qrValue: params.qrValue,
        customMessage: params.customMessage,
      }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok || !data.success) {
      console.warn('WhatsApp Cloud API Server Warning:', data?.error || response.statusText);
      return {
        success: false,
        error: data?.error || `Failed with HTTP status ${response.status}`,
        recipient: cleanPhone,
        fallbackUrl,
      };
    }

    return {
      success: true,
      messageId: data.messageId,
      recipient: cleanPhone,
      fallbackUrl,
    };
  } catch (err: any) {
    console.error('WhatsApp API Network Exception:', err);
    return {
      success: false,
      error: err?.message || 'Network communication error',
      recipient: cleanPhone,
      fallbackUrl,
    };
  }
}
