/**
 * Vercel Serverless Function: Send Official Admission Pass via Mailgun API
 */
export default async function handler(req, res) {
  // CORS configuration
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  }

  try {
    const { to, name, ticketId, tier, gate, qrValue, customMessage, subject } = req.body || {};

    if (!to) {
      return res.status(400).json({ success: false, error: 'Recipient email address is required' });
    }

    const apiKey = process.env.MAILGUN_API_KEY || '';
    const domain = process.env.MAILGUN_DOMAIN || 'bf.simplelogicit.com';
    const host = process.env.MAILGUN_HOST || 'api.eu.mailgun.net';
    const fromEmail = process.env.MAILGUN_FROM_EMAIL || 'Pink Polo 2026 <event@bf.simplelogicit.com>';

    const rawQr = qrValue || `PINK-POLO-2026-${ticketId || 'PASS'}`;
    const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&margin=10&data=${encodeURIComponent(
      rawQr
    )}`;

    const emailSubject = subject || `[OFFICIAL PASS] Pink Polo 2026 Admission - ${ticketId || 'Pass'}`;

    const htmlBody = `<!DOCTYPE html>
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
                Dear <strong>${name || 'Guest'}</strong>,
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
                      ${ticketId || 'PINK-2026'}
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
                          <strong style="font-size: 14px; color: #0f172a;">${tier || 'VIP Access'}</strong>
                        </td>
                        <td width="50%" style="padding: 6px 10px; vertical-align: top;">
                          <span style="font-size: 10px; font-weight: 700; color: #94a3b8; text-transform: uppercase; display: block;">Assigned Entry Gate</span>
                          <strong style="font-size: 14px; color: #e11d48;">${gate || 'Gate 1 (Royal Pavilion Turnstile)'}</strong>
                        </td>
                      </tr>
                      <tr>
                        <td width="50%" style="padding: 6px 10px; vertical-align: top;">
                          <span style="font-size: 10px; font-weight: 700; color: #94a3b8; text-transform: uppercase; display: block;">Guest Name</span>
                          <span style="font-size: 13px; color: #334155; font-weight: 600;">${name || 'Guest'}</span>
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
                      <li><strong>Arrival:</strong> Complimentary valet parking is available adjacent to <strong>${(gate || 'Gate 1').split(' ')[0]}</strong>.</li>
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

    // Dispatch to Mailgun REST API using standard HTTP URLSearchParams
    const mailgunEndpoint = `https://${host}/v3/${domain}/messages`;
    const authHeader = 'Basic ' + Buffer.from(`api:${apiKey}`).toString('base64');

    const formParams = new URLSearchParams();
    formParams.append('from', fromEmail);
    formParams.append('to', to);
    formParams.append('subject', emailSubject);
    formParams.append('html', htmlBody);

    const mgRes = await fetch(mailgunEndpoint, {
      method: 'POST',
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formParams.toString(),
    });

    const mgData = await mgRes.json().catch(() => ({}));

    if (!mgRes.ok) {
      console.error('Mailgun API Error:', mgRes.status, mgData);
      return res.status(mgRes.status || 500).json({
        success: false,
        error: mgData?.message || 'Failed to dispatch email via Mailgun',
        details: mgData,
      });
    }

    return res.status(200).json({
      success: true,
      messageId: mgData?.id,
      message: mgData?.message || 'Email sent successfully via Mailgun',
      recipient: to,
    });
  } catch (err) {
    console.error('Mailgun Handler Exception:', err);
    return res.status(500).json({
      success: false,
      error: err?.message || 'Internal server error while sending email via Mailgun',
    });
  }
}
