/**
 * Vercel Serverless Function: Check if phone number is registered on WhatsApp Cloud API
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
    const { phone, name } = req.body || {};

    if (!phone) {
      return res.status(400).json({
        success: false,
        validWhatsApp: false,
        error: 'Phone number is required for verification.',
      });
    }

    const cleanPhone = String(phone).replace(/[^0-9]/g, '');
    if (cleanPhone.length < 8) {
      return res.status(400).json({
        success: false,
        validWhatsApp: false,
        error: 'Invalid phone number length. Please include country code and mobile digits.',
      });
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
        body: `🏇 *Ghantoot Racing & Polo Club*\n🎗️ *Pink Polo 2026 Registration*\n\nHello *${name || 'Guest'}*,\nThank you for submitting your registration request. We have verified your WhatsApp contact. Your official e-Pass will be delivered here once approved by the organizing committee.`,
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
      const errCode = metaData?.error?.code;
      const subCode = metaData?.error?.error_subcode;
      const errMsg = metaData?.error?.message || '';
      console.warn('Meta WhatsApp Verification Warning:', errCode, subCode, errMsg);

      // Code 131047 ("Re-engagement message" / 24-hr window) or 131051 (Template requirement)
      // proves the WhatsApp account exists on Meta servers
      if (errCode === 131047 || errCode === 131051 || errCode === 131030) {
        return res.status(200).json({
          success: true,
          validWhatsApp: true,
          recipient: cleanPhone,
          note: 'Verified WhatsApp user (outside 24h window).',
        });
      }

      // Explicitly reject if number does not have WhatsApp or is invalid
      return res.status(200).json({
        success: false,
        validWhatsApp: false,
        error: 'This phone number does not have an active WhatsApp account. Please provide a number with active WhatsApp.',
        details: metaData,
      });
    }

    return res.status(200).json({
      success: true,
      validWhatsApp: true,
      recipient: cleanPhone,
      messageId: metaData?.messages?.[0]?.id,
    });
  } catch (err) {
    console.error('WhatsApp Verification Error:', err);
    return res.status(500).json({
      success: false,
      validWhatsApp: false,
      error: err?.message || 'Server error verifying WhatsApp number',
    });
  }
}
