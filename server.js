// Render.com sets PORT env var — standalone Next.js server reads it automatically.
// This shim ensures HOSTNAME is always bound to 0.0.0.0 so the port scan succeeds.
process.env.HOSTNAME = '0.0.0.0';
process.env.PORT = process.env.PORT || '3000';

require('./.next/standalone/server.js');
