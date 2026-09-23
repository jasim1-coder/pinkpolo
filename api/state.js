export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  return res.status(200).json({
    success: true,
    status: 'online',
    message: 'Pink Polo 2026 Check-in API is active and ready for external scanner integrations.',
    endpoint: '/api/check-in',
    supportedMethods: ['POST', 'GET'],
  });
}
