/**
 * Vercel Serverless Function: Send Official Admission Pass via Meta WhatsApp Cloud API
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
    const { to, name, ticketId, tier, gate, qrValue, customMessage } = req.body || {};

    if (!to) {
      return res.status(400).json({ success: false, error: 'Recipient phone number is required' });
    }

    // Clean phone number to digits only (e.g. +971 50 512 3456 -> 971505123456)
    const cleanPhone = String(to).replace(/[^0-9]/g, '');

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
        `🎟️ *Ticket ID:* ${ticketId || 'PINK-2026'}\n` +
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

    const url = `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`;

    let metaRes = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(imagePayload),
    });

    let metaData = await metaRes.json().catch(() => ({}));

    // If image fails, fallback to rich text with link
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

      metaRes = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(textPayload),
      });

      metaData = await metaRes.json().catch(() => ({}));
    }

    if (!metaRes.ok) {
      console.error('Meta WhatsApp Cloud API Error:', metaData);
      return res.status(metaRes.status || 500).json({
        success: false,
        error: metaData?.error?.message || 'Failed to dispatch WhatsApp message',
        details: metaData,
      });
    }

    return res.status(200).json({
      success: true,
      messageId: metaData?.messages?.[0]?.id,
      recipient: cleanPhone,
      qrImageUrl,
      details: metaData,
    });
  } catch (err) {
    console.error('WhatsApp Handler Exception:', err);
    return res.status(500).json({
      success: false,
      error: err?.message || 'Internal server error while sending WhatsApp',
    });
  }
}
