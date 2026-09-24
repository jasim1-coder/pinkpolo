import { getAccessToken } from './googleAuth';

interface SendTicketEmailParams {
  toEmail: string;
  attendeeName: string;
  ticketId: string;
  tier: string;
  assignedGate: string;
  qrValue: string;
  notes?: string;
}

/**
 * Encodes a string into Base64URL format safe for the Gmail API.
 */
function toBase64Url(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Builds a beautiful, luxury HTML email for Pink Polo 2026.
 */
function buildHtmlPassEmail(params: SendTicketEmailParams): string {
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&margin=10&data=${encodeURIComponent(
    params.qrValue
  )}`;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Pink Polo 2026 - Official Admission Pass</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0f172a;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f8fafc; padding: 30px 15px;">
    <tr>
      <td align="center">
        <!-- Container Card -->
        <table role="presentation" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.06); border: 1px solid #e2e8f0;" cellspacing="0" cellpadding="0" border="0">
          
          <!-- Header Banner -->
          <tr>
            <td style="background-color: #090d16; padding: 32px 30px; text-align: center; border-bottom: 3px solid #e11d48;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td align="center">
                    <div style="font-size: 13px; font-weight: 800; color: #fb7185; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 8px;">
                      GHANTOOT RACING & POLO CLUB
                    </div>
                    <span style="display: inline-block; background-color: #e11d48; color: #ffffff; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 2px; padding: 4px 14px; border-radius: 999px; margin-bottom: 12px;">
                      🎗️ Pink Polo 2026 Charity Gala
                    </span>
                    <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">
                      Official Admission Pass
                    </h1>
                    <p style="margin: 6px 0 0 0; color: #94a3b8; font-size: 13px;">
                      Nov 20–22, 2026 · Ghantoot Racing & Polo Club Grounds
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body Content -->
          <tr>
            <td style="padding: 30px;">
              <p style="margin: 0 0 16px 0; font-size: 16px; color: #334155; line-height: 1.5;">
                Dear <strong>${params.attendeeName}</strong>,
              </p>
              <p style="margin: 0 0 24px 0; font-size: 14px; color: #64748b; line-height: 1.6;">
                We are delighted to confirm that your registration for <strong>Pink Polo 2026 Invitational & Charity Gala</strong> has been <span style="color: #059669; font-weight: 700;">APPROVED</span>.
                Your official electronic admission pass and gate turnstile barcode are presented below.
              </p>

              <!-- Ticket Pass Card -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background: linear-gradient(135deg, #fff1f2 0%, #ffe4e6 100%); border: 2px dashed #f43f5e; border-radius: 16px; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 24px;" align="center">
                    <!-- Ticket Pass Badge -->
                    <div style="font-size: 11px; font-weight: 800; color: #be123c; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 8px;">
                      Electronic Admission Pass
                    </div>
                    <div style="font-size: 22px; font-weight: 800; color: #9f1239; font-family: monospace; letter-spacing: 1px; margin-bottom: 18px;">
                      ${params.ticketId}
                    </div>

                    <!-- Scannable QR Code -->
                    <div style="background-color: #ffffff; padding: 14px; border-radius: 12px; display: inline-block; box-shadow: 0 4px 12px rgba(0,0,0,0.08); border: 1px solid #fda4af;">
                      <img src="${qrImageUrl}" alt="Admission QR Code" width="200" height="200" style="display: block; border: 0;" />
                    </div>
                    
                    <p style="margin: 12px 0 0 0; font-size: 11px; color: #881337; font-weight: 600;">
                      Present this QR code at turnstile optical scanners upon arrival
                    </p>
                  </td>
                </tr>

                <!-- Details Grid -->
                <tr>
                  <td style="padding: 0 24px 20px 24px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #ffffff; border-radius: 12px; padding: 16px; border: 1px solid #fecdd3;">
                      <tr>
                        <td width="50%" style="padding: 6px 10px; vertical-align: top;">
                          <span style="font-size: 10px; font-weight: 700; color: #94a3b8; text-transform: uppercase; display: block;">Access Tier</span>
                          <strong style="font-size: 14px; color: #0f172a;">${params.tier}</strong>
                        </td>
                        <td width="50%" style="padding: 6px 10px; vertical-align: top;">
                          <span style="font-size: 10px; font-weight: 700; color: #94a3b8; text-transform: uppercase; display: block;">Assigned Entry Gate</span>
                          <strong style="font-size: 14px; color: #e11d48;">${params.assignedGate}</strong>
                        </td>
                      </tr>
                      <tr>
                        <td width="50%" style="padding: 6px 10px; vertical-align: top;">
                          <span style="font-size: 10px; font-weight: 700; color: #94a3b8; text-transform: uppercase; display: block;">Guest Name</span>
                          <span style="font-size: 13px; color: #334155; font-weight: 600;">${params.attendeeName}</span>
                        </td>
                        <td width="50%" style="padding: 6px 10px; vertical-align: top;">
                          <span style="font-size: 10px; font-weight: 700; color: #94a3b8; text-transform: uppercase; display: block;">Grounds Opening</span>
                          <span style="font-size: 13px; color: #334155; font-weight: 600;">14:00 Daily</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- What Happens Next Guide -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f1f5f9; border-radius: 12px; padding: 18px; margin-bottom: 24px;">
                <tr>
                  <td>
                    <h3 style="margin: 0 0 10px 0; font-size: 13px; font-weight: 800; color: #0f172a; text-transform: uppercase; letter-spacing: 0.5px;">
                      📋 Event Arrival Instructions
                    </h3>
                    <ul style="margin: 0; padding-left: 20px; font-size: 12px; color: #475569; line-height: 1.7;">
                      <li><strong>Save this pass:</strong> Keep this email or save the QR image to your phone's photo library.</li>
                      <li><strong>Arrival:</strong> Complimentary valet parking is available adjacent to <strong>${params.assignedGate.split(' ')[0]}</strong>.</li>
                      <li><strong>Turnstile Scan:</strong> Place your screen directly under the laser turnstile reader. The gate unlocks automatically.</li>
                      <li><strong>Wristband:</strong> Event stewards will provide your hospitality accreditation badge immediately upon entry.</li>
                    </ul>
                  </td>
                </tr>
              </table>

              <p style="margin: 0; font-size: 12px; color: #64748b; line-height: 1.5; text-align: center;">
                For any inquiries or VIP concierge requests, please reply directly to this email or visit our information desk at the grounds.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 20px 30px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0 0 4px 0; font-size: 13px; font-weight: 800; color: #1e293b;">
                GHANTOOT RACING & POLO CLUB · نادي غنتوت لسباق الخيل والبولو
              </p>
              <p style="margin: 0 0 6px 0; font-size: 12px; font-weight: 700; color: #e11d48;">
                Pink Polo 2026 Organizing Committee
              </p>
              <p style="margin: 0; font-size: 11px; color: #94a3b8;">
                Supporting Breast Cancer Awareness & Equestrian Excellence
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Sends a real admission email with the scannable QR pass via Gmail API.
 */
export async function sendRealApprovalEmail(params: SendTicketEmailParams): Promise<{
  success: boolean;
  messageId?: string;
  error?: string;
}> {
  try {
    const accessToken = await getAccessToken();
    if (!accessToken) {
      return {
        success: false,
        error: 'NO_AUTH_TOKEN: Google authorization is required to send real emails.',
      };
    }

    const subject = `[OFFICIAL PASS] Pink Polo 2026 Admission - ${params.ticketId}`;
    const htmlBody = buildHtmlPassEmail(params);

    // Build standard RFC 2822 message
    const rfcMessage = [
      `To: ${params.toEmail}`,
      'From: me',
      `Subject: =?utf-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`,
      'MIME-Version: 1.0',
      'Content-Type: text/html; charset=utf-8',
      '',
      htmlBody,
    ].join('\r\n');

    const base64UrlMessage = toBase64Url(rfcMessage);

    const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        raw: base64UrlMessage,
      }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      console.error('Gmail API Error Response:', errData);
      return {
        success: false,
        error: errData?.error?.message || `Gmail API Error: ${response.status} ${response.statusText}`,
      };
    }

    const result = await response.json();
    return {
      success: true,
      messageId: result.id,
    };
  } catch (err: any) {
    console.error('Failed to send real email via Gmail API:', err);
    return {
      success: false,
      error: err?.message || 'Unknown network error when communicating with Gmail API.',
    };
  }
}

export const sendTicketEmailViaGmail = sendRealApprovalEmail;
