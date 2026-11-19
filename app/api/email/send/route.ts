import { NextResponse } from 'next/server'
import { hasAdminSession } from '@/lib/auth'
import prisma from '@/lib/prisma'
import {
  getResendApiKey,
  getSenderEmail,
  getAdminEmails,
  sendEmail,
  sendOrderConfirmationEmail,
  sendOrderStatusUpdateEmail,
  renderCustomMessageTemplate,
} from '@/lib/email'

export async function GET() {
  const apiKey = getResendApiKey()
  const isConfigured = Boolean(apiKey)
  const maskedKey = apiKey ? `${apiKey.slice(0, 6)}...${apiKey.slice(-4)}` : null
  const fromEmail = getSenderEmail()
  const adminEmails = getAdminEmails()

  const availableTemplates = [
    { alias: 'order-confirmation', name: 'Order Confirmation', purpose: 'Customer order placement' },
    { alias: 'payment-receipt', name: 'Payment Receipt', purpose: 'Paystack verified payment receipt' },
    { alias: 'order-status-update', name: 'Order Status Update', purpose: 'Baking/Ready/Delivery notification' },
    { alias: 'welcome-enos-pastries', name: 'Welcome Eno\'s Pastries', purpose: 'Customer welcome email' },
  ]

  return NextResponse.json({
    resendConfigured: isConfigured,
    apiKey: maskedKey,
    fromEmail,
    adminEmails,
    templates: availableTemplates,
  })
}

export async function POST(request: Request) {
  try {
    const isAdmin = await hasAdminSession()
    if (!isAdmin) {
      return NextResponse.json({ error: 'Admin authentication required' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const { type = 'test', to, subject, message, orderId, status, customNote } = body

    if (!to && type !== 'admin_alert') {
      return NextResponse.json({ error: 'Recipient "to" is required' }, { status: 400 })
    }

    if (type === 'test') {
      const testSubject = subject || "Eno's Pastries - Test Email from Resend"
      const { html, text } = renderCustomMessageTemplate({
        title: 'Resend Email Service Test',
        customerName: 'Valued Baker / Admin',
        message:
          message ||
          'Your Resend integration with Eno\'s Pastries is active and working properly!\n\nAll transactional emails for order placement, Paystack payment receipts, and bakery status updates will now be delivered via Resend.',
      })

      const result = await sendEmail({
        to,
        subject: testSubject,
        html,
        text,
      })

      if (!result.success) {
        return NextResponse.json({ error: result.error || 'Failed to send test email' }, { status: 500 })
      }

      return NextResponse.json({ success: true, id: result.id, message: 'Test email sent successfully' })
    }

    if (type === 'custom') {
      if (!subject || !message) {
        return NextResponse.json({ error: 'Subject and message are required for custom emails' }, { status: 400 })
      }

      const { html, text } = renderCustomMessageTemplate({
        title: subject,
        message,
      })

      const result = await sendEmail({ to, subject, html, text })
      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 500 })
      }
      return NextResponse.json({ success: true, id: result.id })
    }

    if (type === 'template') {
      const templateId = body?.templateId || body?.template
      if (!templateId) {
        return NextResponse.json({ error: 'templateId is required' }, { status: 400 })
      }

      const result = await sendEmail({
        to,
        template: {
          id: templateId,
          variables: body?.variables || {},
        },
      })

      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 500 })
      }

      return NextResponse.json({ success: true, id: result.id })
    }

    if (type === 'order_confirmation' || type === 'status_update') {
      if (!orderId) {
        return NextResponse.json({ error: 'orderId is required' }, { status: 400 })
      }

      let order: any = null
      try {
        order = await prisma.order.findUnique({
          where: { id: orderId },
          include: { items: { include: { product: true } } },
        })
      } catch {}

      if (!order) {
        const { getOrderByIdFromSupabase } = await import('@/lib/supabase-service')
        order = await getOrderByIdFromSupabase(orderId)
      }

      if (!order) {
        return NextResponse.json({ error: 'Order not found' }, { status: 404 })
      }

      let result
      if (type === 'order_confirmation') {
        result = await sendOrderConfirmationEmail(order)
      } else {
        result = await sendOrderStatusUpdateEmail(order, status || order.status, customNote)
      }

      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 500 })
      }

      return NextResponse.json({ success: true, id: result.id })
    }

    return NextResponse.json({ error: 'Invalid email dispatch type' }, { status: 400 })
  } catch (error: any) {
    console.error('Email API route error:', error)
    return NextResponse.json({ error: error?.message || 'Internal server error' }, { status: 500 })
  }
}
