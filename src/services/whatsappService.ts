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

  if (!cleanPhone) {
    return {
      success: false,
      error: 'Invalid or missing phone number.',
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
      };
    }

    return {
      success: true,
      messageId: data.messageId,
      recipient: cleanPhone,
    };
  } catch (err: any) {
    console.error('WhatsApp API Network Exception:', err);
    return {
      success: false,
      error: err?.message || 'Network communication error',
      recipient: cleanPhone,
    };
  }
}

/**
 * Checks whether a phone number is registered on WhatsApp Cloud API
 */
export async function verifyWhatsAppNumber(phone: string, name?: string): Promise<{
  valid: boolean;
  error?: string;
  recipient?: string;
}> {
  const cleanPhone = (phone || '').replace(/[^0-9]/g, '');
  if (!cleanPhone || cleanPhone.length < 8) {
    return { valid: false, error: 'Please enter a valid phone number with country code.' };
  }

  try {
    const response = await fetch('/api/verify-whatsapp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ phone: cleanPhone, name }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok || !data.validWhatsApp) {
      return {
        valid: false,
        error: data.error || 'This phone number does not have an active WhatsApp account. Please check your number.',
      };
    }

    return {
      valid: true,
      recipient: cleanPhone,
    };
  } catch (err: any) {
    console.error('WhatsApp verify network error:', err);
    // On unexpected network failures, allow graceful fallback
    return { valid: true, recipient: cleanPhone };
  }
}

