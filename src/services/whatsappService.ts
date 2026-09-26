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

import { parsePhoneNumberFromString, isValidPhoneNumber } from 'libphonenumber-js';

/**
 * Validates international phone number based on country code and digit count
 */
export function validateInternationalPhone(phone: string): {
  valid: boolean;
  formatted?: string;
  error?: string;
} {
  const raw = (phone || '').trim();
  if (!raw) {
    return { valid: false, error: 'Phone number is required.' };
  }

  // Ensure country code has '+' prefix
  const normalized = raw.startsWith('+') ? raw : `+${raw}`;

  try {
    const parsed = parsePhoneNumberFromString(normalized);
    if (!parsed || !parsed.isValid()) {
      return {
        valid: false,
        error: 'Please enter a valid phone number with the correct number of digits for your selected country.',
      };
    }

    return {
      valid: true,
      formatted: parsed.formatInternational(),
    };
  } catch {
    // Fallback digit count validation
    const digits = raw.replace(/[^0-9]/g, '');
    if (digits.length >= 8 && digits.length <= 15) {
      return { valid: true, formatted: normalized };
    }
    return {
      valid: false,
      error: 'Invalid phone number length. International numbers must contain between 8 and 15 digits.',
    };
  }
}

/**
 * Formats and validates phone number without requiring external WhatsApp API lookup
 */
export async function verifyWhatsAppNumber(phone: string, _name?: string): Promise<{
  valid: boolean;
  error?: string;
  recipient?: string;
}> {
  const result = validateInternationalPhone(phone);
  if (!result.valid) {
    return {
      valid: false,
      error: result.error || 'Please enter a valid phone number with correct digits.',
    };
  }

  return {
    valid: true,
    recipient: result.formatted || phone,
  };
}

