/**
 * Environment variable validation for production
 */

export function validateEnv() {
  const requiredEnvs = [
    'DATABASE_URL',
  ];

  const missingEnvs = requiredEnvs.filter((env) => !process.env[env]);

  if (missingEnvs.length > 0) {
    console.error(
      'Missing required environment variables:',
      missingEnvs.join(', ')
    );
  }

  // Optional: Warn about Paystack configuration in production
  if (
    process.env.NODE_ENV === 'production' &&
    !process.env.PAYSTACK_SECRET_KEY
  ) {
    console.warn(
      'WARNING: PAYSTACK_SECRET_KEY is not set. Payments will operate in demo mode.'
    );
  }
}

export const config = {
  paystackSecretKey: process.env.PAYSTACK_SECRET_KEY || '',
  paystackPublicKey: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || '',
  paystackWebhookSecret: process.env.PAYSTACK_WEBHOOK_SECRET || '',
  databaseUrl: process.env.DATABASE_URL || 'file:./dev.db',
  googleMapsKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_PLATFORM_KEY || '',
  nodeEnv: process.env.NODE_ENV || 'development',
};
