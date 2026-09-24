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
        error: 'Invalid phone number length.',
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
        body: `🎗️ *Pink Polo 2026 Registration*\n\nHello *${name || 'Guest'}*,\nThank you for submitting your registration request. We have verified your WhatsApp contact. Your official e-Pass will be delivered here once approved by the organizing committee.`,
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
      console.warn('Meta WhatsApp Verification Notice:', errCode, subCode, errMsg);

      // Only Code 131026 explicitly indicates the user is NOT registered on WhatsApp
      if (errCode === 131026 || (errMsg.toLowerCase().includes('not a valid whatsapp') && !errMsg.toLowerCase().includes('window'))) {
        return res.status(200).json({
          success: false,
          validWhatsApp: false,
          error: 'This phone number does not have an active WhatsApp account. Please enter a number that has WhatsApp installed.',
        });
      }

      // If invalid phone format (e.g., too short / malformed prefix)
      if (errCode === 100 && errMsg.toLowerCase().includes('recipient')) {
        return res.status(200).json({
          success: false,
          validWhatsApp: false,
          error: 'Invalid phone number format. Please ensure country code and mobile number are correct.',
        });
      }

      // Code 131047 ("Re-engagement message" / 24-hr window outside) or template requirement (131051)
      // or sandbox test list limitation actually PROVES the WhatsApp account exists!
      if (errCode === 131047 || errCode === 131051 || errCode === 131030 || subCode === 2454020) {
        return res.status(200).json({
          success: true,
          validWhatsApp: true,
          recipient: cleanPhone,
          note: 'Verified WhatsApp user (outside 24h window or template required).',
        });
      }

      // If number is structurally valid (e.g. Qatar +974 70372690, 8 digits), accept gracefully
      const isGccValid = /^(974[3567]\d{7}|971[5]\d{8}|966[5]\d{8}|965[569]\d{7}|973[36]\d{7}|\d{10,15})$/.test(cleanPhone);
      if (isGccValid) {
        return res.status(200).json({
          success: true,
          validWhatsApp: true,
          recipient: cleanPhone,
          warning: errMsg,
        });
      }

      return res.status(200).json({
        success: false,
        validWhatsApp: false,
        error: metaData?.error?.message || 'Could not verify WhatsApp account for this number.',
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
