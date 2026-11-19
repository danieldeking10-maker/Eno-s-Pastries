- [x] Add Paystack config/env instructions (PAYSTACK_SECRET_KEY, PAYSTACK_PUBLIC_KEY)
- [x] Integrate Resend transactional email API (RESEND_API_KEY, RESEND_FROM_EMAIL)
- [x] Implement email templates: Order Confirmation, Payment Receipt, Admin New Order Alert, Order Status Update
- [x] Automate transactional email dispatch on order creation, Paystack payment verification, and status updates
- [x] Add Admin order email trigger button and `/api/email/send` testing/dispatch endpoint


- [ ] Update Prisma schema: store Paystack reference on Order (paystackReference)
- [ ] Create Paystack API route to initialize payment + create order in PENDING
- [ ] Update cart checkout to redirect to Paystack (pay now step)
- [ ] Create Paystack webhook route to verify payment and mark Order CONFIRMED
- [ ] Run Prisma migration
- [ ] Run Next.js dev server + verify checkout flow end-to-end

