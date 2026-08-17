// pages/api/uploads/server-upload.ts
import type { NextApiRequest, NextApiResponse } from 'next';

export const config = { api: { bodyParser: false } };

export default function handler(_: NextApiRequest, res: NextApiResponse) {
  return res.status(501).json({
    ok: false,
    message: 'Server-upload endpoint not implemented on production yet. This stub confirms route exists.',
  });
}
