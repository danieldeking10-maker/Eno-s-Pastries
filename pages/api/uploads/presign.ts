// pages/api/uploads/presign.ts
import type { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();
  if (!process.env.AWS_S3_BUCKET) {
    return res.status(501).json({
      ok: false,
      message:
        'Presign not configured: AWS_S3_BUCKET not set. This is a stub endpoint for routing verification.',
    });
  }

  return res.status(200).json({
    ok: true,
    url: 'https://example-signed-url.local/test.jpg',
    key: 'test-placeholder.jpg',
    note: 'Replace this stub with your real presign logic (S3 signed URL).',
  });
}
