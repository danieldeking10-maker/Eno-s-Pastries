- [x] Add Paystack config/env instructions (PAYSTACK_SECRET_KEY, PAYSTACK_PUBLIC_KEY)


- [ ] Update Prisma schema: store Paystack reference on Order (paystackReference)
- [ ] Create Paystack API route to initialize payment + create order in PENDING
- [ ] Update cart checkout to redirect to Paystack (pay now step)
- [ ] Create Paystack webhook route to verify payment and mark Order CONFIRMED
- [ ] Run Prisma migration
- [ ] Run Next.js dev server + verify checkout flow end-to-end

