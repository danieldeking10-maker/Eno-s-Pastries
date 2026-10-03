import crypto from 'crypto'

/**
 * Resolves the public application origin from incoming request headers.
 * Avoids non-routable 0.0.0.0 addresses and preserves the actual host/protocol
 * accessed by the client or configured in the environment.
 */
export function getAppOrigin(request: Request): string {
  // Check explicit public app URL if defined
  if (process.env.NEXT_PUBLIC_APP_URL?.trim()) {
    return process.env.NEXT_PUBLIC_APP_URL.trim().replace(/\/+$/, '')
  }

  const forwardedHost = request.headers.get('x-forwarded-host')
  const host = forwardedHost || request.headers.get('host')
  const forwardedProto = request.headers.get('x-forwarded-proto')
  const proto = forwardedProto || (host?.includes('localhost') || host?.includes('127.0.0.1') ? 'http' : 'https')

  if (host && !host.startsWith('0.0.0.0')) {
    return `${proto}://${host}`
  }

  try {
    const parsed = new URL(request.url)
    if (parsed.hostname === '0.0.0.0') {
      return `${parsed.protocol}//localhost${parsed.port ? `:${parsed.port}` : ''}`
    }
    return parsed.origin
  } catch {
    return 'http://localhost:3000'
  }
}

/**
 * Convert Ghana Cedis (GH₵) or currency amount to minor units (pesewas/kobo).
 */
export function toMinorUnit(amount: number): number {
  return Math.round(Math.max(0, amount) * 100)
}

/**
 * Verify Paystack webhook HMAC-SHA512 signature.
 */
export function verifyPaystackSignature(
  rawBody: string,
  signature: string | null,
  secretKey: string
): boolean {
  if (!signature || !secretKey || !rawBody) return false
  try {
    const hash = crypto
      .createHmac('sha512', secretKey)
      .update(rawBody)
      .digest('hex')
    return hash.toLowerCase() === signature.toLowerCase()
  } catch (err) {
    console.error('Signature verification error:', err)
    return false
  }
}
