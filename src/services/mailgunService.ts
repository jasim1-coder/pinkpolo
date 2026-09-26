export interface SendMailgunTicketParams {
  toEmail: string;
  attendeeName: string;
  ticketId: string;
  tier: string;
  assignedGate: string;
  qrValue: string;
  subject?: string;
  notes?: string;
}

/**
 * Sends a real admission email with the scannable QR pass via Mailgun API backend.
 */
export async function sendTicketEmailViaMailgun(params: SendMailgunTicketParams): Promise<{
  success: boolean;
  messageId?: string;
  error?: string;
}> {
  try {
    const response = await fetch('/api/send-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: params.toEmail,
        name: params.attendeeName,
        ticketId: params.ticketId,
        tier: params.tier,
        gate: params.assignedGate,
        qrValue: params.qrValue,
        subject: params.subject,
      }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok || !data.success) {
      return {
        success: false,
        error: data.error || `Error ${response.status}: Failed to send email via Mailgun`,
      };
    }

    return {
      success: true,
      messageId: data.messageId,
    };
  } catch (err: any) {
    console.error('Mailgun API request failed:', err);
    return {
      success: false,
      error: err?.message || 'Network error communicating with email service',
    };
  }
}
