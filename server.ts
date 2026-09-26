import express, { Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { Registration, ActivityItem, DashboardStats } from './src/types';
import { checkInAttendeeInFirestore } from './src/services/firebaseDb';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// In-memory persistent server store (seeded dynamically from DB / client sync)
let registrations: Registration[] = [];
let activities: ActivityItem[] = [];
let stats: DashboardStats = {
  totalRegistrations: 0,
  pendingApproval: 0,
  approved: 0,
  rejected: 0,
  ticketsGenerated: 0,
  checkedIn: 0,
};

// Connected SSE clients for real-time live check-in notifications
const sseClients: Set<Response> = new Set();

function broadcastEvent(eventType: string, data: any) {
  const payload = `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const client of sseClients) {
    try {
      client.write(payload);
    } catch (e) {
      console.error('SSE client write error:', e);
      sseClients.delete(client);
    }
  }
}

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3000;

  // Enable CORS for all origins so external PWA from any domain/localhost can call this API
  app.use(
    cors({
      origin: '*',
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    })
  );

  app.use(express.json());

  // Health check
  app.get('/api/health', (req: Request, res: Response) => {
    res.json({
      status: 'healthy',
      system: 'Pink Polo 2026 Turnstile Gate API',
      timestamp: new Date().toISOString(),
      checkedInCount: stats.checkedIn,
      totalAttendees: registrations.length,
    });
  });

  // API docs / Integration manifest info
  app.get('/api/pwa-info', (req: Request, res: Response) => {
    const host = req.get('host') || 'localhost:3000';
    const protocol = req.protocol === 'https' || req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
    const baseUrl = `${protocol}://${host}`;

    res.json({
      name: 'Pink Polo 2026 QR Scanner Admission API',
      checkInEndpoint: `${baseUrl}/api/check-in`,
      lookupEndpoint: `${baseUrl}/api/ticket/:code`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      requestExample: {
        qrData: 'PINK-POLO-2026-PINK-2026-8801-JASIM-KHAN',
        gate: 'Gate 1 (Royal Pavilion Turnstile)',
        scannedBy: 'PWA Turnstile Terminal',
      },
      responseStatuses: ['valid', 'already_used', 'invalid'],
    });
  });

  // WhatsApp Cloud API Verify Number Endpoint
  app.post('/api/verify-whatsapp', async (req: Request, res: Response) => {
    try {
      const { phone, name } = req.body || {};

      if (!phone) {
        res.status(400).json({ success: false, validWhatsApp: false, error: 'Phone number is required.' });
        return;
      }

      const cleanPhone = String(phone).replace(/[^0-9]/g, '');
      if (cleanPhone.length < 8) {
        res.status(400).json({ success: false, validWhatsApp: false, error: 'Invalid phone number length.' });
        return;
      }

      const apiVersion = process.env.WHATSAPP_API_VERSION || 'v22.0';
      const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID || '974899072381634';
      const accessToken =
        process.env.WHATSAPP_ACCESS_TOKEN ||
        'EAAW2JxtvKuYBRiimKqU3VTdNEu0qZAxvS2z5Ly7GxYLnrVc60eoJSq5P5ZBEsGq85ZAytBBjNoLBEg8fKRLkcXzz8GMd8NWrhK0SNKGmZBcfeOH2AWJ4Cxf4Ln0eeNhRy9VlUA4sYjv5xUdbxNACUMujdnwcH5blNZCOPWZBDiypYJbDHkoiSSsZBk3amEW1Yz5MAZDZD';

      const verificationPayload = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: cleanPhone,
        type: 'text',
        text: {
          body: `🏇 *GHANTOOT RACING & POLO CLUB*\n🎗️ *Pink Polo 2026 Registration*\n\nHello *${name || 'Guest'}*,\nThank you for submitting your registration request. We have verified your WhatsApp contact. Your official digital e-Pass will be delivered here once approved by the organizing committee.\n\n📍 *Venue:* Ghantoot Polo Grounds, Abu Dhabi\n📅 *Dates:* Nov 20–22, 2026`,
        },
      };

      const url = `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`;

      const metaRes = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(verificationPayload),
      });

      const metaData = await metaRes.json().catch(() => ({}));

      if (!metaRes.ok) {
        const errCode = (metaData as any)?.error?.code;
        const errMsg = (metaData as any)?.error?.message || '';
        console.warn('Meta WhatsApp Verification Warning:', errCode, errMsg, metaData);

        // Code 131047 proves the WhatsApp account exists on Meta servers
        if (errCode === 131047) {
          res.status(200).json({
            success: true,
            validWhatsApp: true,
            recipient: cleanPhone,
            note: 'Verified WhatsApp user account.',
          });
          return;
        }

        res.status(200).json({
          success: false,
          validWhatsApp: false,
          error: 'This phone number does not have an active WhatsApp account. Please enter a valid number with active WhatsApp.',
          details: metaData,
        });
        return;
      }

      if ((metaData as any)?.messages && (metaData as any).messages.length > 0) {
        res.status(200).json({
          success: true,
          validWhatsApp: true,
          recipient: cleanPhone,
          messageId: (metaData as any).messages[0].id,
        });
        return;
      }

      console.log(`[WhatsApp Verified] ${cleanPhone} is a valid WhatsApp user`);
      res.status(200).json({
        success: true,
        validWhatsApp: true,
        recipient: cleanPhone,
        messageId: (metaData as any)?.messages?.[0]?.id,
      });
    } catch (err: any) {
      console.error('WhatsApp verify exception:', err);
      res.status(500).json({ success: false, validWhatsApp: false, error: err?.message || 'Server error verifying WhatsApp' });
    }
  });

  // WhatsApp Cloud API Send Message Endpoint
  app.post('/api/send-whatsapp', async (req: Request, res: Response) => {
    try {
      const { to, name, ticketId, tier, gate, qrValue, customMessage } = req.body || {};

      if (!to) {
        res.status(400).json({ success: false, error: 'Recipient phone number is required' });
        return;
      }

      const cleanPhone = String(to).replace(/[^0-9]/g, '');

      // If a cloud proxy endpoint (e.g. Vercel deployment) is configured, relay WhatsApp requests through it
      if (process.env.WHATSAPP_PROXY_URL) {
        try {
          const proxyRes = await fetch(process.env.WHATSAPP_PROXY_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(req.body),
          });
          const proxyData = (await proxyRes.json().catch(() => ({}))) as any;
          res.status(proxyRes.status || 200).json(proxyData);
          return;
        } catch (proxyErr: any) {
          console.warn('WhatsApp cloud proxy relay failed, falling back to direct:', proxyErr?.message);
        }
      }

      const apiVersion = process.env.WHATSAPP_API_VERSION || 'v22.0';
      const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID || '974899072381634';
      const accessToken =
        process.env.WHATSAPP_ACCESS_TOKEN ||
        'EAAW2JxtvKuYBRiimKqU3VTdNEu0qZAxvS2z5Ly7GxYLnrVc60eoJSq5P5ZBEsGq85ZAytBBjNoLBEg8fKRLkcXzz8GMd8NWrhK0SNKGmZBcfeOH2AWJ4Cxf4Ln0eeNhRy9VlUA4sYjv5xUdbxNACUMujdnwcH5blNZCOPWZBDiypYJbDHkoiSSsZBk3amEW1Yz5MAZDZD';

      const rawQr = qrValue || `PINK-POLO-2026-${ticketId || 'PASS'}`;
      const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=600x600&margin=15&data=${encodeURIComponent(
        rawQr
      )}`;

      const captionBody =
        customMessage ||
        `🏇 *GHANTOOT RACING & POLO CLUB*\n` +
        `🎗️ *PINK POLO 2026 OFFICIAL ADMISSION PASS*\n\n` +
        `Dear *${name || 'Guest'}*,\n\n` +
        `Your registration for the *Pink Polo 2026 Invitational & Charity Gala* has been *APPROVED*!\n\n` +
        `🎟️ *Ticket Pass ID:* ${ticketId || 'PINK-2026'}\n` +
        `👑 *Experience Tier:* ${tier || 'VIP Access'}\n` +
        `🚪 *Designated Entrance:* ${gate || 'Gate 1 (Royal Pavilion Turnstile)'}\n` +
        `📅 *Event Dates:* Nov 20–22, 2026 (Gate Open: 14:00)\n` +
        `📍 *Venue:* Ghantoot Racing & Polo Club Grounds\n\n` +
        `📲 *Gate Entry Instructions:*\n` +
        `Present this attached QR barcode on your phone at your assigned gate turnstile for optical laser scan & VIP wristband issuance.`;

      // Try sending as high-resolution QR Image with caption first
      const imagePayload = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: cleanPhone,
        type: 'image',
        image: {
          link: qrImageUrl,
          caption: captionBody,
        },
      };

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const url = `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`;

      let metaRes: any = null;
      let metaData: any = {};

      try {
        metaRes = await fetch(url, {
          method: 'POST',
          signal: controller.signal,
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(imagePayload),
        });
        clearTimeout(timeoutId);
        metaData = await metaRes.json().catch(() => ({}));
      } catch (networkErr: any) {
        clearTimeout(timeoutId);
        console.warn('Meta WhatsApp Cloud API direct connection timed out on local network:', networkErr?.message);
        res.status(200).json({
          success: false,
          error: 'Meta WhatsApp API direct connection timed out on local network. (Works automatically in cloud deployment).',
          whatsappUrl: `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(captionBody)}`,
        });
        return;
      }

      // Fallback to text payload if image is rejected
      if (!metaRes.ok) {
        console.warn('Meta Image message failed, retrying with text payload:', metaData);
        const textPayload = {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: cleanPhone,
          type: 'text',
          text: {
            preview_url: true,
            body: `${captionBody}\n\n🔗 *QR Pass Image:* ${qrImageUrl}`,
          },
        };

        const retryController = new AbortController();
        const retryTimeoutId = setTimeout(() => retryController.abort(), 6000);

        try {
          metaRes = await fetch(url, {
            method: 'POST',
            signal: retryController.signal,
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(textPayload),
          });
          clearTimeout(retryTimeoutId);
          metaData = await metaRes.json().catch(() => ({}));
        } catch {
          clearTimeout(retryTimeoutId);
        }
      }

      if (!metaRes || !metaRes.ok) {
        console.error('Meta WhatsApp Cloud API Error:', metaData);
        res.status(200).json({
          success: false,
          error: (metaData as any)?.error?.message || 'Meta WhatsApp message could not be sent to this number.',
          details: metaData,
          whatsappUrl: `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(captionBody)}`,
        });
        return;
      }

      console.log(`[WhatsApp Sent] QR Pass ${ticketId} sent to ${cleanPhone}`);
      res.status(200).json({
        success: true,
        messageId: (metaData as any)?.messages?.[0]?.id,
        recipient: cleanPhone,
        qrImageUrl,
      });
    } catch (err: any) {
      console.error('WhatsApp Error:', err);
      res.status(200).json({ success: false, error: err?.message || 'Server error processing WhatsApp pass' });
    }
  });

  // Mailgun Send Email Endpoint
  app.post('/api/send-email', async (req: Request, res: Response) => {
    try {
      const { to, name, ticketId, tier, gate, qrValue, subject } = req.body || {};

      if (!to) {
        res.status(400).json({ success: false, error: 'Recipient email address is required' });
        return;
      }

      const apiKey = process.env.MAILGUN_API_KEY || '';
      const domain = process.env.MAILGUN_DOMAIN || 'bf.simplelogicit.com';
      const host = process.env.MAILGUN_HOST || 'api.eu.mailgun.net';
      const fromEmail = process.env.MAILGUN_FROM_EMAIL || 'Pink Polo 2026 <event@bf.simplelogicit.com>';

      if (!apiKey) {
        res.status(500).json({
          success: false,
          error: 'MAILGUN_API_KEY is not set in .env. Please set MAILGUN_API_KEY in your .env file.',
        });
        return;
      }

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
        <table role="presentation" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.06); border: 1px solid #e2e8f0;" cellspacing="0" cellpadding="0" border="0">
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
          <tr>
            <td style="padding: 30px;">
              <p style="margin: 0 0 16px 0; font-size: 16px; color: #334155; line-height: 1.5;">
                Dear <strong>${name || 'Guest'}</strong>,
              </p>
              <p style="margin: 0 0 24px 0; font-size: 14px; color: #64748b; line-height: 1.6;">
                We are delighted to confirm that your registration for <strong>Pink Polo 2026 Invitational & Charity Gala</strong> has been <span style="color: #059669; font-weight: 700;">APPROVED</span>.
                Your official electronic admission pass and gate turnstile barcode are presented below.
              </p>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background: linear-gradient(135deg, #fff1f2 0%, #ffe4e6 100%); border: 2px dashed #f43f5e; border-radius: 16px; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 24px;" align="center">
                    <div style="font-size: 11px; font-weight: 800; color: #be123c; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 8px;">
                      Electronic Admission Pass
                    </div>
                    <div style="font-size: 22px; font-weight: 800; color: #9f1239; font-family: monospace; letter-spacing: 1px; margin-bottom: 18px;">
                      ${ticketId || 'PINK-2026'}
                    </div>
                    <div style="background-color: #ffffff; padding: 14px; border-radius: 12px; display: inline-block; box-shadow: 0 4px 12px rgba(0,0,0,0.08); border: 1px solid #fda4af;">
                      <img src="${qrImageUrl}" alt="Admission QR Code" width="200" height="200" style="display: block; border: 0;" />
                    </div>
                    <p style="margin: 12px 0 0 0; font-size: 11px; color: #881337; font-weight: 600;">
                      Present this QR code at turnstile optical scanners upon arrival
                    </p>
                  </td>
                </tr>
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

      const mgData = (await mgRes.json().catch(() => ({}))) as any;

      if (!mgRes.ok) {
        console.error('Mailgun API Error:', mgRes.status, mgData);
        res.status(mgRes.status || 500).json({
          success: false,
          error: mgData?.message || 'Failed to dispatch email via Mailgun',
          details: mgData,
        });
        return;
      }

      console.log(`[Mailgun Email Sent] To ${to} for ticket ${ticketId || 'Pass'}`);
      res.status(200).json({
        success: true,
        messageId: mgData?.id,
        message: mgData?.message || 'Email sent successfully via Mailgun',
        recipient: to,
      });
    } catch (err: any) {
      console.error('Mailgun Send Error:', err);
      res.status(500).json({ success: false, error: err?.message || 'Server error sending email via Mailgun' });
    }
  });

  // Current state
  app.get('/api/state', (req: Request, res: Response) => {
    res.json({
      registrations,
      activities: activities.slice(0, 50),
      stats,
    });
  });

  // Sync client state (when client creates or approves a registration locally)
  app.post('/api/sync', (req: Request, res: Response) => {
    const { updatedRegistrations, updatedStats, newActivity } = req.body;

    if (Array.isArray(updatedRegistrations)) {
      // Merge or update registrations
      const map = new Map<string, Registration>();
      registrations.forEach((r) => map.set(r.id, r));
      updatedRegistrations.forEach((r: Registration) => map.set(r.id, r));
      registrations = Array.from(map.values());
    }

    if (updatedStats) {
      stats = { ...stats, ...updatedStats };
    }

    if (newActivity) {
      activities.unshift(newActivity);
      if (activities.length > 100) activities.pop();
    }

    broadcastEvent('sync', { stats, count: registrations.length });
    res.json({ success: true, count: registrations.length });
  });

  // Lookup attendee by ticket ID or QR code without checking in
  app.get('/api/ticket/:code', (req: Request, res: Response) => {
    const rawCode = decodeURIComponent(req.params.code || '').trim().toUpperCase();
    if (!rawCode) {
      res.status(400).json({ success: false, message: 'Ticket code or QR value is required' });
      return;
    }

    const found = registrations.find((r) => {
      const tid = (r.ticketId || '').toUpperCase();
      const qv = (r.qrValue || '').toUpperCase();
      const rid = (r.id || '').toUpperCase();

      return (
        tid === rawCode ||
        qv === rawCode ||
        rid === rawCode ||
        (tid && rawCode.includes(tid)) ||
        (qv && rawCode.includes(qv)) ||
        (tid && tid.includes(rawCode))
      );
    });

    if (!found) {
      res.status(404).json({
        success: false,
        status: 'invalid',
        message: 'No attendee found for this ticket code',
      });
      return;
    }

    res.json({
      success: true,
      attendee: {
        id: found.id,
        name: found.name,
        email: found.email,
        tier: found.tier,
        status: found.status,
        ticketId: found.ticketId,
        checkedIn: found.checkedIn,
        checkedInAt: found.checkedInAt,
      },
    });
  });

  /**
   * PRIMARY CHECK-IN ENDPOINT FOR THE USER'S PWA SCANNER APP
   * POST /api/check-in (or /api/scan)
   *
   * Accepts:
   * {
   *   "qrData": "PINK-POLO-2026-...", // decoded string from camera QR scan
   *   "gate": "Gate 1 (Royal Pavilion Turnstile)", // optional
   *   "scannedBy": "Mobile PWA Scanner" // optional
   * }
   */
  const handleCheckIn = async (req: Request, res: Response) => {
    const { qrData, ticketId, code, id, gate = 'Main Turnstile Gate', scannedBy = 'External PWA Scanner' } = req.body || {};

    const rawInput = String(qrData || ticketId || code || id || '').trim();
    if (!rawInput) {
      res.status(400).json({
        success: false,
        status: 'invalid',
        message: 'Missing qrData or ticketId in request body.',
      });
      return;
    }

    const timeFormatted = new Date().toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

    try {
      const dbResult = await checkInAttendeeInFirestore(rawInput, gate, scannedBy);

      if (!dbResult.success) {
        const statusCode =
          dbResult.status === 'already_used'
            ? 409
            : dbResult.status === 'invalid' && dbResult.attendee
              ? 403
              : 404;

        res.status(statusCode).json({
          success: false,
          status: dbResult.status,
          message: dbResult.message,
          guestName: dbResult.guestName,
          guestEmail: dbResult.guestEmail,
          ticketId: dbResult.ticketId,
          tier: dbResult.tier,
          ticketStatus: dbResult.ticketStatus,
          checkInStatus: dbResult.checkInStatus,
          attendee: dbResult.attendee,
          scannedInput: rawInput,
          scannedAt: timeFormatted,
        });
        return;
      }

      const updatedAttendee = dbResult.attendee!;

      // Broadcast live to all connected web dashboards via SSE
      broadcastEvent('checkin', {
        attendee: updatedAttendee,
        scannedBy,
        gate,
      });

      console.log(`[PWA CHECK-IN] ${updatedAttendee.name} (${updatedAttendee.ticketId}) checked in at ${gate}`);

      res.status(200).json({
        success: true,
        status: 'valid',
        message: dbResult.message,
        guestName: dbResult.guestName || updatedAttendee.name,
        guestEmail: dbResult.guestEmail || updatedAttendee.email,
        ticketId: dbResult.ticketId || updatedAttendee.ticketId,
        tier: dbResult.tier || updatedAttendee.tier,
        ticketStatus: 'Checked In',
        checkInStatus: 'Checked In',
        attendee: updatedAttendee,
        gate,
        scannedAt: timeFormatted,
      });
    } catch (err: any) {
      console.error('Check-in handler exception:', err);
      res.status(500).json({
        success: false,
        status: 'invalid',
        message: `Internal check-in error: ${err?.message || err}`,
        scannedInput: rawInput,
        scannedAt: timeFormatted,
      });
    }
  };

  app.post('/api/check-in', handleCheckIn);
  app.post('/api/scan', handleCheckIn);

  // Server-Sent Events (SSE) for instant dashboard live updates
  app.get('/api/events', (req: Request, res: Response) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    sseClients.add(res);

    // Initial ping
    res.write(`event: connected\ndata: ${JSON.stringify({ connected: true, clients: sseClients.size })}\n\n`);

    req.on('close', () => {
      sseClients.delete(res);
    });
  });

  // Vite integration: Dev middleware or Production static files
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`Pink Polo 2026 Server running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Server startup error:', err);
  process.exit(1);
});
