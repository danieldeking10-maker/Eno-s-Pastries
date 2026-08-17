// pages/api/webhooks/payments.ts
import type { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();
  console.log('Received payment webhook (stub) at', new Date().toISOString(), 'body:', req.body);
  return res.status(200).json({ ok: true, note: 'Webhook stub received' });
}
