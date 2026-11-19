import fs from 'fs'
import path from 'path'

export type OrderItemDetail = {
  productId?: string
  name?: string
  quantity: number
  price: number
  product?: {
    name?: string
    image?: string | null
  } | null
}

export type OrderEmailData = {
  id: string
  customerName?: string | null
  customerEmail?: string | null
  customerPhone?: string | null
  customerNote?: string | null
  orderType?: 'RETAIL' | 'WHOLESALE' | string
  deliveryType?: 'PICKUP' | 'DELIVERY' | string
  deliveryAddress?: string | null
  deliveryDate?: string | Date | null
  totalAmount: number
  subtotalAmount?: number
  wholesaleDiscount?: number
  status?: string
  paystackReference?: string | null
  paystackTransactionId?: string | null
  paidAt?: string | Date | null
  items?: OrderItemDetail[]
  createdAt?: string | Date | null
}

export type SendEmailResult = {
  success: boolean
  id?: string
  error?: string
}

/**
 * Fallback reader for environment variables from .env files
 */
function readEnvKey(key: string): string {
  if (typeof window !== 'undefined') return ''
  try {
    for (const filename of ['.env', '.env.local', '.env.example']) {
      const envPath = path.resolve(process.cwd(), filename)
      if (fs.existsSync(envPath)) {
        const content = fs.readFileSync(envPath, 'utf8')
        const lines = content.split('\n')
        for (const line of lines) {
          const trimmed = line.trim()
          if (trimmed && !trimmed.startsWith('#') && trimmed.startsWith(key + '=')) {
            const val = trimmed.substring(key.length + 1).replace(/['"\r]/g, '').trim()
            if (val) return val
          }
        }
      }
    }
  } catch {}
  return ''
}

export function getResendApiKey(): string {
  const envKey = (process.env.RESEND_API_KEY || '').replace(/[\s'"\r\n]/g, '')
  if (envKey && /^re_[A-Za-z0-9_]+$/.test(envKey)) return envKey
  const fileKey = readEnvKey('RESEND_API_KEY').replace(/[\s'"\r\n]/g, '')
  if (fileKey && /^re_[A-Za-z0-9_]+$/.test(fileKey)) return fileKey
  return ''
}

export function getSenderEmail(): string {
  const fromEnv = (process.env.RESEND_FROM_EMAIL || readEnvKey('RESEND_FROM_EMAIL') || '').trim()
  if (fromEnv) return fromEnv
  return "Eno's Pastries <onboarding@resend.dev>"
}

export function getAdminEmails(): string[] {
  const rawList = process.env.ADMIN_EMAILS || readEnvKey('ADMIN_EMAILS') || process.env.ADMIN_EMAIL || readEnvKey('ADMIN_EMAIL') || ''
  return rawList
    .split(',')
    .map((e) => e.trim())
    .filter((e) => e && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e))
}

export type TemplatePayload = {
  id: string
  variables?: Record<string, string | number>
}

/**
 * Base email dispatcher via Resend REST API
 */
export async function sendEmail({
  to,
  subject,
  html,
  text,
  template,
  replyTo,
}: {
  to: string | string[]
  subject?: string
  html?: string
  text?: string
  template?: TemplatePayload
  replyTo?: string
}): Promise<SendEmailResult> {
  const apiKey = getResendApiKey()
  if (!apiKey) {
    console.warn('[Resend] RESEND_API_KEY is not configured. Email skipped:', subject || template?.id)
    return { success: false, error: 'RESEND_API_KEY is missing' }
  }

  const recipients = Array.isArray(to) ? to.map((e) => e.trim()).filter(Boolean) : [to.trim()].filter(Boolean)
  if (recipients.length === 0) {
    return { success: false, error: 'No recipient email addresses provided' }
  }

  const from = getSenderEmail()

  try {
    const payload: Record<string, any> = {
      from,
      to: recipients,
    }

    if (template?.id) {
      payload.template = {
        id: template.id,
        variables: template.variables || {},
      }
    } else {
      if (subject) payload.subject = subject
      if (html) payload.html = html
      if (text) payload.text = text
    }

    if (replyTo) payload.reply_to = replyTo

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    const data = await response.json().catch(() => ({}))

    if (!response.ok) {
      const errMsg = data?.message || data?.error?.message || `HTTP ${response.status} ${response.statusText}`
      console.error('[Resend Error]', { status: response.status, message: errMsg, recipients })
      return { success: false, error: errMsg }
    }

    return { success: true, id: data.id }
  } catch (error: any) {
    console.error('[Resend Exception]', error)
    return { success: false, error: error?.message || 'Network error sending email' }
  }
}

// -------------------------------------------------------------
// Helper Formatters
// -------------------------------------------------------------

function formatGHS(amount: number): string {
  return `GH₵ ${(Number(amount) || 0).toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatDate(dateVal?: string | Date | null): string {
  if (!dateVal) return 'Not specified'
  try {
    const d = new Date(dateVal)
    if (Number.isNaN(d.getTime())) return String(dateVal)
    return d.toLocaleDateString('en-GB', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return String(dateVal)
  }
}

function getItemName(item: OrderItemDetail): string {
  return item.product?.name || item.name || 'Pastry Item'
}

// -------------------------------------------------------------
// HTML Email Templates
// -------------------------------------------------------------

/**
 * Customer Order Confirmation Email Template
 */
export function renderOrderConfirmationTemplate(order: OrderEmailData): { subject: string; html: string; text: string } {
  const shortId = order.id ? order.id.slice(0, 8).toUpperCase() : 'PENDING'
  const customerName = order.customerName || 'Valued Customer'
  const isPaid = order.status === 'CONFIRMED' || Boolean(order.paidAt)

  const itemsList = order.items && order.items.length > 0 ? order.items : []
  const totalQuantity = itemsList.reduce((sum, item) => sum + (Number(item.quantity) || 1), 0)
  const isWholesale = order.orderType === 'WHOLESALE' || totalQuantity > 15
  const rawSubtotal = order.subtotalAmount || itemsList.reduce((sum, item) => sum + (Number(item.price) || 0) * (Number(item.quantity) || 1), 0)
  const wholesaleDiscount = order.wholesaleDiscount ?? (isWholesale && totalQuantity > 15 ? Math.round(rawSubtotal * 0.10 * 100) / 100 : 0)

  const subject = isWholesale && totalQuantity > 15
    ? `Order Confirmation #${shortId} (Wholesale 10% Off) - Eno's Pastries`
    : `Order Confirmation #${shortId} - Eno's Pastries`

  const itemsHtml = itemsList
    .map((item) => {
      const name = getItemName(item)
      const qty = item.quantity || 1
      const price = Number(item.price) || 0
      const subtotal = price * qty
      return `
        <tr>
          <td style="padding: 12px 16px; border-bottom: 1px solid #F3F4F6; font-size: 14px; color: #1F2937;">
            <strong>${name}</strong>
          </td>
          <td style="padding: 12px 16px; border-bottom: 1px solid #F3F4F6; font-size: 14px; color: #4B5563; text-align: center;">
            ${qty}
          </td>
          <td style="padding: 12px 16px; border-bottom: 1px solid #F3F4F6; font-size: 14px; color: #4B5563; text-align: right;">
            ${formatGHS(price)}
          </td>
          <td style="padding: 12px 16px; border-bottom: 1px solid #F3F4F6; font-size: 14px; font-weight: 600; color: #1F2937; text-align: right;">
            ${formatGHS(subtotal)}
          </td>
        </tr>
      `
    })
    .join('')

  const itemsText = itemsList
    .map((item) => `- ${getItemName(item)} x${item.quantity} (${formatGHS(item.price)} each) = ${formatGHS(item.price * item.quantity)}`)
    .join('\n')

  const deliveryTypeLabel = order.deliveryType === 'DELIVERY' ? 'Doorstep Delivery' : 'In-Store Pickup'
  const statusBadgeBg = isPaid ? '#DEF7EC' : '#FEF08A'
  const statusBadgeColor = isPaid ? '#03543F' : '#854D0E'
  const statusBadgeText = isPaid ? 'Payment Confirmed' : 'Payment Pending'

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #FAF7F2; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1F2937;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #FAF7F2; padding: 32px 16px;">
    <tr>
      <td align="center">
        <!-- Main Card -->
        <table role="presentation" width="100%" style="max-width: 600px; background-color: #FFFFFF; border-radius: 16px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05); overflow: hidden; border: 1px solid #F0ECE4;">
          
          <!-- Header Banner -->
          <tr>
            <td style="background: linear-gradient(135deg, #78350F 0%, #B45309 50%, #D97706 100%); padding: 36px 32px; text-align: center;">
              <h1 style="margin: 0; font-size: 28px; font-weight: 800; color: #FFFFFF; letter-spacing: -0.5px;">Eno's Pastries</h1>
              <p style="margin: 8px 0 0; font-size: 14px; color: #FEF3C7; font-weight: 500;">Freshly Baked with Passion & Love 🥐</p>
            </td>
          </tr>

          <!-- Confirmation Title -->
          <tr>
            <td style="padding: 32px 32px 16px; text-align: center;">
              <div style="display: inline-block; padding: 6px 14px; border-radius: 9999px; background-color: ${statusBadgeBg}; color: ${statusBadgeColor}; font-size: 13px; font-weight: 700; margin-bottom: 12px;">
                ${statusBadgeText}
              </div>
              <h2 style="margin: 0 0 8px; font-size: 22px; color: #1F2937;">Thank You for Your Order, ${customerName}!</h2>
              <p style="margin: 0; font-size: 14px; color: #6B7280; line-height: 1.5;">
                We have received your order <strong>#${shortId}</strong>. Our kitchen is getting everything ready fresh for you.
              </p>
            </td>
          </tr>

          <!-- Order Summary Details -->
          <tr>
            <td style="padding: 16px 32px;">
              <table role="presentation" width="100%" style="background-color: #FDFBF7; border-radius: 12px; border: 1px solid #F3EFE6; padding: 16px;">
                <tr>
                  <td style="padding: 6px 12px; font-size: 13px; color: #6B7280; width: 40%;">Order Number:</td>
                  <td style="padding: 6px 12px; font-size: 13px; font-weight: 700; color: #1F2937;">#${shortId}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 12px; font-size: 13px; color: #6B7280;">Date:</td>
                  <td style="padding: 6px 12px; font-size: 13px; color: #1F2937;">${formatDate(order.createdAt || new Date())}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 12px; font-size: 13px; color: #6B7280;">Fulfillment:</td>
                  <td style="padding: 6px 12px; font-size: 13px; font-weight: 600; color: #92400E;">${deliveryTypeLabel}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 12px; font-size: 13px; color: #6B7280;">Order Type:</td>
                  <td style="padding: 6px 12px; font-size: 13px; font-weight: 700; color: ${isWholesale && totalQuantity > 15 ? '#047857' : '#1F2937'};">
                    ${isWholesale && totalQuantity > 15 ? 'Wholesale (10% Discount Applied for >15 items)' : 'Retail'}
                  </td>
                </tr>
                ${order.deliveryAddress ? `
                <tr>
                  <td style="padding: 6px 12px; font-size: 13px; color: #6B7280;">Delivery Address:</td>
                  <td style="padding: 6px 12px; font-size: 13px; color: #1F2937;">${order.deliveryAddress}</td>
                </tr>` : ''}
                ${order.customerPhone ? `
                <tr>
                  <td style="padding: 6px 12px; font-size: 13px; color: #6B7280;">Contact Phone:</td>
                  <td style="padding: 6px 12px; font-size: 13px; color: #1F2937;">${order.customerPhone}</td>
                </tr>` : ''}
                ${order.paystackReference ? `
                <tr>
                  <td style="padding: 6px 12px; font-size: 13px; color: #6B7280;">Payment Reference:</td>
                  <td style="padding: 6px 12px; font-size: 12px; font-family: monospace; color: #4B5563;">${order.paystackReference}</td>
                </tr>` : ''}
              </table>
            </td>
          </tr>

          ${isWholesale && totalQuantity > 15 ? `
          <!-- Wholesale Discount Banner -->
          <tr>
            <td style="padding: 0 32px 12px;">
              <div style="background-color: #ECFDF5; border: 1px solid #A7F3D0; border-radius: 8px; padding: 12px 16px; font-size: 13px; color: #065F46;">
                <strong>🎉 10% Wholesale Discount Applied!</strong> Because your order contains ${totalQuantity} items (more than 15 items), you received a 10% discount on your order (-${formatGHS(wholesaleDiscount)}).
              </div>
            </td>
          </tr>` : ''}

          <!-- Items Table -->
          <tr>
            <td style="padding: 16px 32px;">
              <h3 style="margin: 0 0 12px; font-size: 16px; color: #1F2937;">Ordered Items</h3>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse: collapse; width: 100%; border: 1px solid #E5E7EB; border-radius: 8px; overflow: hidden;">
                <thead>
                  <tr style="background-color: #F9FAFB;">
                    <th style="padding: 10px 16px; text-align: left; font-size: 12px; font-weight: 600; color: #4B5563; text-transform: uppercase; border-bottom: 1px solid #E5E7EB;">Item</th>
                    <th style="padding: 10px 16px; text-align: center; font-size: 12px; font-weight: 600; color: #4B5563; text-transform: uppercase; border-bottom: 1px solid #E5E7EB;">Qty</th>
                    <th style="padding: 10px 16px; text-align: right; font-size: 12px; font-weight: 600; color: #4B5563; text-transform: uppercase; border-bottom: 1px solid #E5E7EB;">Price</th>
                    <th style="padding: 10px 16px; text-align: right; font-size: 12px; font-weight: 600; color: #4B5563; text-transform: uppercase; border-bottom: 1px solid #E5E7EB;">Total</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemsHtml || '<tr><td colspan="4" style="padding: 16px; text-align: center; color: #6B7280;">Pastry selection</td></tr>'}
                </tbody>
                <tfoot>
                  ${wholesaleDiscount > 0 ? `
                  <tr style="background-color: #F9FAFB;">
                    <td colspan="3" style="padding: 10px 16px; font-size: 14px; color: #4B5563; text-align: right;">Subtotal (${totalQuantity} items):</td>
                    <td style="padding: 10px 16px; font-size: 14px; font-weight: 600; color: #1F2937; text-align: right;">${formatGHS(rawSubtotal)}</td>
                  </tr>
                  <tr style="background-color: #ECFDF5;">
                    <td colspan="3" style="padding: 10px 16px; font-size: 14px; font-weight: 700; color: #065F46; text-align: right;">Wholesale Discount (10% off for >15 qty):</td>
                    <td style="padding: 10px 16px; font-size: 14px; font-weight: 700; color: #059669; text-align: right;">-${formatGHS(wholesaleDiscount)}</td>
                  </tr>
                  ` : ''}
                  <tr style="background-color: #FFFBEB;">
                    <td colspan="3" style="padding: 14px 16px; font-size: 15px; font-weight: 700; color: #78350F; text-align: right;">${wholesaleDiscount > 0 ? 'Discounted Total Amount:' : 'Total Amount:'}</td>
                    <td style="padding: 14px 16px; font-size: 16px; font-weight: 800; color: #92400E; text-align: right;">${formatGHS(order.totalAmount)}</td>
                  </tr>
                </tfoot>
              </table>
            </td>
          </tr>

          ${order.customerNote ? `
          <!-- Customer Note -->
          <tr>
            <td style="padding: 0 32px 16px;">
              <div style="background-color: #F3F4F6; border-radius: 8px; padding: 12px 16px; font-size: 13px; color: #4B5563;">
                <strong>Special Note:</strong> "${order.customerNote}"
              </div>
            </td>
          </tr>` : ''}

          <!-- Support & Footer Note -->
          <tr>
            <td style="padding: 24px 32px 36px; text-align: center; border-top: 1px solid #F3F4F6;">
              <p style="margin: 0 0 8px; font-size: 14px; color: #4B5563;">
                Have questions or need to make changes? Reach out to us directly.
              </p>
              <p style="margin: 0; font-size: 12px; color: #9CA3AF;">
                Eno's Pastries &bull; Fresh pastries, cakes, pies, and catering
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `

  const text = `
Eno's Pastries - Order Confirmation #${shortId}

Thank you for your order, ${customerName}!
We have received your order and are preparing it fresh for you.

Order Details:
Order Number: #${shortId}
Date: ${formatDate(order.createdAt || new Date())}
Status: ${statusBadgeText}
Fulfillment: ${deliveryTypeLabel}
${order.deliveryAddress ? `Delivery Address: ${order.deliveryAddress}\n` : ''}${order.customerPhone ? `Contact Phone: ${order.customerPhone}\n` : ''}${order.paystackReference ? `Payment Reference: ${order.paystackReference}\n` : ''}
Items:
${itemsText}

Total Amount: ${formatGHS(order.totalAmount)}

${order.customerNote ? `Special Note: ${order.customerNote}\n` : ''}
Thank you for choosing Eno's Pastries!
  `.trim()

  return { subject, html, text }
}

/**
 * Admin Notification Email for New Orders
 */
export function renderAdminOrderNotificationTemplate(order: OrderEmailData): { subject: string; html: string; text: string } {
  const shortId = order.id ? order.id.slice(0, 8).toUpperCase() : 'NEW'
  const isPaid = order.status === 'CONFIRMED' || Boolean(order.paidAt)
  const prefix = isPaid ? '💰 PAID ORDER' : '🔔 NEW ORDER'
  const subject = `${prefix} #${shortId} - ${formatGHS(order.totalAmount)} (${order.customerName || 'Customer'})`

  const itemsList = order.items && order.items.length > 0 ? order.items : []
  const itemsRows = itemsList
    .map(
      (item) => `
      <tr>
        <td style="padding: 8px 12px; border-bottom: 1px solid #E5E7EB; font-size: 14px; font-weight: 600; color: #1F2937;">${getItemName(item)}</td>
        <td style="padding: 8px 12px; border-bottom: 1px solid #E5E7EB; font-size: 14px; text-align: center; color: #1F2937;">${item.quantity}</td>
        <td style="padding: 8px 12px; border-bottom: 1px solid #E5E7EB; font-size: 14px; text-align: right; color: #1F2937;">${formatGHS(item.price * item.quantity)}</td>
      </tr>
    `
    )
    .join('')

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin: 0; padding: 24px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #F3F4F6;">
  <div style="max-width: 600px; margin: 0 auto; background: #FFFFFF; border-radius: 12px; padding: 24px; border: 1px solid #E5E7EB;">
    <div style="background-color: ${isPaid ? '#065F46' : '#92400E'}; color: #FFFFFF; padding: 12px 16px; border-radius: 8px; font-weight: 700; font-size: 16px;">
      ${prefix} - ${formatGHS(order.totalAmount)}
    </div>

    <h2 style="margin: 16px 0 8px; font-size: 20px; color: #111827;">Order #${shortId}</h2>

    <div style="background-color: #F9FAFB; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
      <p style="margin: 4px 0; font-size: 14px;"><strong>Customer:</strong> ${order.customerName || 'N/A'}</p>
      <p style="margin: 4px 0; font-size: 14px;"><strong>Email:</strong> <a href="mailto:${order.customerEmail || ''}">${order.customerEmail || 'N/A'}</a></p>
      <p style="margin: 4px 0; font-size: 14px;"><strong>Phone:</strong> <a href="tel:${order.customerPhone || ''}">${order.customerPhone || 'N/A'}</a></p>
      <p style="margin: 4px 0; font-size: 14px;"><strong>Fulfillment:</strong> ${order.deliveryType === 'DELIVERY' ? 'Delivery' : 'Pickup'}</p>
      ${order.deliveryAddress ? `<p style="margin: 4px 0; font-size: 14px;"><strong>Delivery Address:</strong> ${order.deliveryAddress}</p>` : ''}
      ${order.customerNote ? `<p style="margin: 4px 0; font-size: 14px; color: #B45309;"><strong>Note:</strong> ${order.customerNote}</p>` : ''}
      ${order.paystackReference ? `<p style="margin: 4px 0; font-size: 13px; color: #4B5563;"><strong>Paystack Ref:</strong> ${order.paystackReference}</p>` : ''}
    </div>

    <h3 style="margin: 12px 0 8px; font-size: 15px; color: #374151;">Items to Prepare:</h3>
    <table width="100%" cellspacing="0" cellpadding="0" style="border-collapse: collapse; border: 1px solid #E5E7EB; margin-bottom: 16px;">
      <thead>
        <tr style="background: #F3F4F6;">
          <th style="padding: 8px 12px; text-align: left; font-size: 12px; color: #4B5563;">Item</th>
          <th style="padding: 8px 12px; text-align: center; font-size: 12px; color: #4B5563;">Qty</th>
          <th style="padding: 8px 12px; text-align: right; font-size: 12px; color: #4B5563;">Subtotal</th>
        </tr>
      </thead>
      <tbody>${itemsRows}</tbody>
    </table>

    <div style="font-size: 16px; font-weight: 700; color: #111827; text-align: right; margin-bottom: 20px;">
      Total: ${formatGHS(order.totalAmount)}
    </div>

    <div style="text-align: center;">
      <a href="/admin/orders" style="display: inline-block; background-color: #D97706; color: #FFFFFF; text-decoration: none; font-weight: 600; font-size: 14px; padding: 10px 24px; border-radius: 8px;">
        Open Admin Orders Dashboard
      </a>
    </div>
  </div>
</body>
</html>
  `

  const text = `
${prefix} #${shortId}
Total: ${formatGHS(order.totalAmount)}
Customer: ${order.customerName || 'N/A'} (${order.customerPhone || 'No Phone'}, ${order.customerEmail || 'No Email'})
Fulfillment: ${order.deliveryType || 'PICKUP'}
${order.deliveryAddress ? `Address: ${order.deliveryAddress}\n` : ''}
Items:
${itemsList.map((i) => `- ${getItemName(i)} x${i.quantity} (${formatGHS(i.price * i.quantity)})`).join('\n')}
  `.trim()

  return { subject, html, text }
}

/**
 * Payment Receipt Email for Paystack Success
 */
export function renderPaymentReceiptTemplate(order: OrderEmailData, transaction?: any): { subject: string; html: string; text: string } {
  const shortId = order.id ? order.id.slice(0, 8).toUpperCase() : 'PAID'
  const subject = `Payment Receipt - Order #${shortId} - Eno's Pastries`
  const reference = transaction?.reference || order.paystackReference || 'Verified'
  const customerName = order.customerName || 'Customer'

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin: 0; padding: 24px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #FAF7F2;">
  <div style="max-width: 560px; margin: 0 auto; background: #FFFFFF; border-radius: 16px; padding: 32px; border: 1px solid #F0ECE4; box-shadow: 0 4px 12px rgba(0,0,0,0.04);">
    <div style="text-align: center; margin-bottom: 24px;">
      <h1 style="margin: 0; color: #78350F; font-size: 24px; font-weight: 800;">Eno's Pastries</h1>
      <div style="display: inline-block; margin-top: 12px; padding: 6px 16px; border-radius: 9999px; background: #DEF7EC; color: #03543F; font-size: 13px; font-weight: 700;">
        ✓ Payment Verified & Received
      </div>
    </div>

    <p style="font-size: 15px; color: #374151;">Hello ${customerName},</p>
    <p style="font-size: 14px; color: #4B5563; line-height: 1.5;">
      Your payment for order <strong>#${shortId}</strong> has been successfully processed via Paystack. Thank you!
    </p>

    <div style="background: #F9FAFB; border-radius: 10px; padding: 18px; margin: 20px 0; border: 1px solid #E5E7EB;">
      <table width="100%" style="font-size: 14px;">
        <tr>
          <td style="color: #6B7280; padding: 4px 0;">Amount Paid:</td>
          <td style="font-weight: 700; color: #065F46; text-align: right;">${formatGHS(order.totalAmount)}</td>
        </tr>
        <tr>
          <td style="color: #6B7280; padding: 4px 0;">Payment Reference:</td>
          <td style="font-family: monospace; font-size: 12px; text-align: right; color: #374151;">${reference}</td>
        </tr>
        <tr>
          <td style="color: #6B7280; padding: 4px 0;">Payment Method:</td>
          <td style="text-align: right; color: #374151;">${transaction?.channel ? String(transaction.channel).toUpperCase() : 'Paystack Checkout'}</td>
        </tr>
        <tr>
          <td style="color: #6B7280; padding: 4px 0;">Date Paid:</td>
          <td style="text-align: right; color: #374151;">${formatDate(order.paidAt || new Date())}</td>
        </tr>
      </table>
    </div>

    <p style="font-size: 13px; color: #6B7280; text-align: center; margin-top: 24px;">
      Need assistance? Contact our team anytime.
    </p>
  </div>
</body>
</html>
  `

  const text = `
Payment Receipt - Eno's Pastries
Order: #${shortId}
Amount Paid: ${formatGHS(order.totalAmount)}
Reference: ${reference}
Date: ${formatDate(order.paidAt || new Date())}

Your payment has been successfully verified!
  `.trim()

  return { subject, html, text }
}

/**
 * Order Status Update Notification (e.g. PREPARING, READY, DELIVERED)
 */
export function renderOrderStatusUpdateTemplate(
  order: OrderEmailData,
  newStatus: string,
  customNote?: string
): { subject: string; html: string; text: string } {
  const shortId = order.id ? order.id.slice(0, 8).toUpperCase() : ''
  const customerName = order.customerName || 'Customer'

  let statusTitle = `Order Status Update: ${newStatus}`
  let statusMessage = `Your order status has been updated to ${newStatus}.`
  let badgeColor = '#3B82F6'

  switch (newStatus) {
    case 'CONFIRMED':
      statusTitle = 'Order Confirmed!'
      statusMessage = 'Your order is confirmed and scheduled for our kitchen team.'
      badgeColor = '#059669'
      break
    case 'PREPARING':
      statusTitle = 'Fresh in the Oven! 🥐'
      statusMessage = 'Our bakers are currently preparing your pastries fresh in our kitchen.'
      badgeColor = '#D97706'
      break
    case 'READY':
      statusTitle = order.deliveryType === 'DELIVERY' ? 'Packed & Ready for Dispatch! 📦' : 'Ready for Pickup! 🎂'
      statusMessage =
        order.deliveryType === 'DELIVERY'
          ? 'Your order is neatly packed and ready for delivery to your doorstep.'
          : 'Your freshly baked pastries are boxed and waiting for your pickup at our bakery!'
      badgeColor = '#10B981'
      break
    case 'DELIVERED':
      statusTitle = 'Delivered & Complete! ✨'
      statusMessage = 'Your order has been completed. We hope you love every bite!'
      badgeColor = '#4B5563'
      break
    case 'CANCELLED':
      statusTitle = 'Order Cancelled'
      statusMessage = 'Your order has been cancelled. If you believe this is an error, please reach out to us.'
      badgeColor = '#DC2626'
      break
  }

  const subject = `${statusTitle} - Order #${shortId} - Eno's Pastries`

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin: 0; padding: 24px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #FAF7F2;">
  <div style="max-width: 560px; margin: 0 auto; background: #FFFFFF; border-radius: 16px; padding: 32px; border: 1px solid #F0ECE4;">
    <div style="text-align: center; margin-bottom: 24px;">
      <h1 style="margin: 0; color: #78350F; font-size: 24px; font-weight: 800;">Eno's Pastries</h1>
      <div style="display: inline-block; margin-top: 12px; padding: 6px 16px; border-radius: 9999px; background: ${badgeColor}; color: #FFFFFF; font-size: 13px; font-weight: 700;">
        ${statusTitle}
      </div>
    </div>

    <p style="font-size: 15px; color: #1F2937;">Hello ${customerName},</p>
    <p style="font-size: 15px; color: #4B5563; line-height: 1.6;">
      ${statusMessage}
    </p>

    ${customNote ? `
    <div style="background: #FFFBEB; border-left: 4px solid #D97706; padding: 12px 16px; border-radius: 4px; margin: 20px 0; font-size: 14px; color: #92400E;">
      ${customNote}
    </div>` : ''}

    <div style="background: #FDFBF7; border-radius: 10px; padding: 16px; margin: 20px 0; border: 1px solid #F3EFE6;">
      <p style="margin: 4px 0; font-size: 13px; color: #6B7280;">Order: <strong>#${shortId}</strong></p>
      <p style="margin: 4px 0; font-size: 13px; color: #6B7280;">Fulfillment: <strong>${order.deliveryType === 'DELIVERY' ? 'Delivery' : 'Pickup'}</strong></p>
      ${order.deliveryAddress ? `<p style="margin: 4px 0; font-size: 13px; color: #6B7280;">Address: <strong>${order.deliveryAddress}</strong></p>` : ''}
    </div>

    <p style="font-size: 13px; color: #9CA3AF; text-align: center; margin-top: 24px;">
      Eno's Pastries &bull; Thank you for your support!
    </p>
  </div>
</body>
</html>
  `

  const text = `
Eno's Pastries - ${statusTitle}
Order: #${shortId}
Hello ${customerName},
${statusMessage}
${customNote ? `\nNote: ${customNote}\n` : ''}
Fulfillment: ${order.deliveryType || 'Pickup'}
  `.trim()

  return { subject, html, text }
}

/**
 * Branded Custom Message Template (for custom emails, promotions, inquiries)
 */
export function renderCustomMessageTemplate({
  customerName,
  title,
  message,
  actionUrl,
  actionText,
}: {
  customerName?: string
  title: string
  message: string
  actionUrl?: string
  actionText?: string
}): { subject: string; html: string; text: string } {
  const subject = `${title} - Eno's Pastries`

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin: 0; padding: 24px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #FAF7F2;">
  <div style="max-width: 580px; margin: 0 auto; background: #FFFFFF; border-radius: 16px; padding: 32px; border: 1px solid #F0ECE4;">
    <div style="text-align: center; margin-bottom: 24px;">
      <h1 style="margin: 0; color: #78350F; font-size: 24px; font-weight: 800;">Eno's Pastries</h1>
      <p style="margin: 4px 0 0; font-size: 13px; color: #B45309;">Baked Fresh with Love</p>
    </div>

    <h2 style="font-size: 20px; color: #1F2937; margin: 0 0 16px;">${title}</h2>

    ${customerName ? `<p style="font-size: 15px; color: #374151;">Hello ${customerName},</p>` : ''}

    <div style="font-size: 15px; color: #4B5563; line-height: 1.6; margin-bottom: 24px; white-space: pre-line;">
      ${message}
    </div>

    ${actionUrl && actionText ? `
    <div style="text-align: center; margin: 28px 0;">
      <a href="${actionUrl}" style="display: inline-block; background-color: #D97706; color: #FFFFFF; text-decoration: none; font-weight: 600; font-size: 15px; padding: 12px 28px; border-radius: 8px;">
        ${actionText}
      </a>
    </div>` : ''}

    <div style="border-top: 1px solid #F3F4F6; padding-top: 20px; text-align: center; font-size: 12px; color: #9CA3AF;">
      Eno's Pastries &bull; Ghana
    </div>
  </div>
</body>
</html>
  `

  const text = `
Eno's Pastries
${title}
${customerName ? `Hello ${customerName},\n` : ''}
${message}
${actionUrl ? `\nLink: ${actionUrl}` : ''}
  `.trim()

  return { subject, html, text }
}

// -------------------------------------------------------------
// High-Level Dispatchers
// -------------------------------------------------------------

/**
 * Send customer order confirmation email (uses Resend account template 'order-confirmation' with automatic fallback)
 */
export async function sendOrderConfirmationEmail(
  order: OrderEmailData,
  options: { preferResendTemplate?: boolean } = { preferResendTemplate: true }
): Promise<SendEmailResult> {
  const email = order.customerEmail?.trim()
  if (!email) {
    return { success: false, error: 'Customer has no email address' }
  }

  if (options.preferResendTemplate !== false) {
    const totalQuantity = (order.items || []).reduce((sum, item) => sum + (Number(item.quantity) || 1), 0)
    const isWholesale = order.orderType === 'WHOLESALE' || totalQuantity > 15
    const shortId = order.id ? order.id.slice(0, 8).toUpperCase() : 'PENDING'
    const firstName = order.customerName ? order.customerName.split(' ')[0] : 'Customer'
    const rawItemsSummary =
      (order.items || [])
        .map((i) => `${i.quantity}x ${getItemName(i)}`)
        .join(', ') || 'Pastry items'
    const itemsSummary = (isWholesale && totalQuantity > 15)
      ? `${rawItemsSummary} • (10% Wholesale Discount Applied on ${totalQuantity} items)`
      : rawItemsSummary
    const totalDisplay = (isWholesale && totalQuantity > 15)
      ? `${formatGHS(order.totalAmount)} (Includes 10% Wholesale Discount)`
      : formatGHS(order.totalAmount)

    const templateResult = await sendEmail({
      to: email,
      template: {
        id: 'order-confirmation',
        variables: {
          first_name: firstName,
          order_id: shortId,
          order_date: formatDate(order.createdAt || new Date()),
          order_items: itemsSummary,
          order_total: totalDisplay,
          delivery_address:
            order.deliveryAddress ||
            (order.deliveryType === 'PICKUP' ? 'In-Store Pickup' : 'Accra, Ghana'),
          company_address: "Eno's Pastries, Accra, Ghana",
          order_url: 'https://enospastries.com/order-history',
        },
      },
    })

    if (templateResult.success) {
      return templateResult
    }
    console.warn('[Resend Template Fallback] Order confirmation using in-code HTML template:', templateResult.error)
  }

  const { subject, html, text } = renderOrderConfirmationTemplate(order)
  return await sendEmail({ to: email, subject, html, text })
}

/**
 * Send admin team new order alert
 */
export async function sendAdminOrderNotification(order: OrderEmailData): Promise<SendEmailResult> {
  const adminEmails = getAdminEmails()
  if (adminEmails.length === 0) {
    return { success: false, error: 'No admin emails configured in ADMIN_EMAILS' }
  }

  const { subject, html, text } = renderAdminOrderNotificationTemplate(order)
  return await sendEmail({ to: adminEmails, subject, html, text })
}

/**
 * Send payment receipt email (uses Resend account template 'payment-receipt' with automatic fallback)
 */
export async function sendPaymentReceiptEmail(
  order: OrderEmailData,
  transaction?: any,
  options: { preferResendTemplate?: boolean } = { preferResendTemplate: true }
): Promise<SendEmailResult> {
  const email = order.customerEmail?.trim()
  if (!email) {
    return { success: false, error: 'Customer has no email address' }
  }

  if (options.preferResendTemplate !== false) {
    const shortId = order.id ? order.id.slice(0, 8).toUpperCase() : 'PAID'
    const reference = transaction?.reference || order.paystackReference || 'Verified'
    const channel = transaction?.channel ? String(transaction.channel).toUpperCase() : 'Paystack Checkout'
    const totalQuantity = (order.items || []).reduce((sum, item) => sum + (Number(item.quantity) || 1), 0)
    const isWholesale = order.orderType === 'WHOLESALE' || totalQuantity > 15
    const amountDisplay = isWholesale && totalQuantity > 15
      ? `${formatGHS(order.totalAmount)} (Wholesale 10% Off)`
      : formatGHS(order.totalAmount)

    const templateResult = await sendEmail({
      to: email,
      template: {
        id: 'payment-receipt',
        variables: {
          CUSTOMER_NAME: order.customerName || 'Valued Customer',
          ORDER_ID: shortId,
          AMOUNT_PAID: amountDisplay,
          PAYMENT_REF: reference,
          PAYMENT_METHOD: channel,
          PAID_AT: formatDate(order.paidAt || new Date()),
        },
      },
    })

    if (templateResult.success) {
      return templateResult
    }
    console.warn('[Resend Template Fallback] Payment receipt using in-code HTML template:', templateResult.error)
  }

  const { subject, html, text } = renderPaymentReceiptTemplate(order, transaction)
  return await sendEmail({ to: email, subject, html, text })
}

/**
 * Send order status update email (uses Resend account template 'order-status-update' with automatic fallback)
 */
export async function sendOrderStatusUpdateEmail(
  order: OrderEmailData,
  newStatus: string,
  customNote?: string,
  options: { preferResendTemplate?: boolean } = { preferResendTemplate: true }
): Promise<SendEmailResult> {
  const email = order.customerEmail?.trim()
  if (!email) {
    return { success: false, error: 'Customer has no email address' }
  }

  let statusTitle = `Order Status: ${newStatus}`
  let statusMessage = `Your order status has been updated to ${newStatus}.`

  switch (newStatus) {
    case 'CONFIRMED':
      statusTitle = 'Order Confirmed!'
      statusMessage = 'Your order is confirmed and scheduled for our kitchen team.'
      break
    case 'PREPARING':
      statusTitle = 'Fresh in the Oven! 🥐'
      statusMessage = 'Our bakers are currently preparing your pastries fresh in our kitchen.'
      break
    case 'READY':
      statusTitle = order.deliveryType === 'DELIVERY' ? 'Packed & Ready for Dispatch! 📦' : 'Ready for Pickup! 🎂'
      statusMessage =
        order.deliveryType === 'DELIVERY'
          ? 'Your order is neatly packed and ready for delivery to your doorstep.'
          : 'Your freshly baked pastries are boxed and waiting for your pickup at our bakery!'
      break
    case 'DELIVERED':
      statusTitle = 'Delivered & Complete! ✨'
      statusMessage = 'Your order has been completed. We hope you love every bite!'
      break
    case 'CANCELLED':
      statusTitle = 'Order Cancelled'
      statusMessage = 'Your order has been cancelled. If you believe this is an error, please reach out to us.'
      break
  }

  if (options.preferResendTemplate !== false) {
    const shortId = order.id ? order.id.slice(0, 8).toUpperCase() : ''
    const templateResult = await sendEmail({
      to: email,
      template: {
        id: 'order-status-update',
        variables: {
          CUSTOMER_NAME: order.customerName || 'Customer',
          ORDER_ID: shortId,
          STATUS_TITLE: statusTitle,
          STATUS_MESSAGE: statusMessage,
          DELIVERY_TYPE: order.deliveryType === 'DELIVERY' ? 'Doorstep Delivery' : 'In-Store Pickup',
          DELIVERY_ADDRESS: order.deliveryAddress || 'Store Pickup',
          CUSTOM_NOTE: customNote ? `Note: ${customNote}` : '',
        },
      },
    })

    if (templateResult.success) {
      return templateResult
    }
    console.warn('[Resend Template Fallback] Status update using in-code HTML template:', templateResult.error)
  }

  const { subject, html, text } = renderOrderStatusUpdateTemplate(order, newStatus, customNote)
  return await sendEmail({ to: email, subject, html, text })
}

/**
 * Send welcome email using Resend account template 'welcome-enos-pastries'
 */
export async function sendWelcomeEmail(email: string, firstName?: string): Promise<SendEmailResult> {
  return await sendEmail({
    to: email,
    template: {
      id: 'welcome-enos-pastries',
      variables: {
        first_name: firstName || 'there',
      },
    },
  })
}
