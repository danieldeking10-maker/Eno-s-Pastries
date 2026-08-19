# Production Deployment Guide - Eno's Pastries

## ✅ Pre-Deployment Checklist

### Environment Setup
- [ ] Create `.env.production` with all required variables
- [ ] Verify DATABASE_URL points to production database (PostgreSQL recommended over SQLite)
- [ ] Set PAYSTACK_SECRET_KEY and PAYSTACK_PUBLIC_KEY
- [ ] Configure NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY for frontend
- [ ] Set PAYSTACK_WEBHOOK_SECRET for payment callbacks
- [ ] Add NEXT_PUBLIC_GOOGLE_MAPS_PLATFORM_KEY if using delivery maps
- [ ] Set NODE_ENV=production

### Security Checks
- [ ] All API routes have error handling
- [ ] Input validation on all endpoints
- [ ] Database queries use parameterized statements (Prisma handles this)
- [ ] No sensitive data logged to console in production
- [ ] CORS headers configured if needed
- [ ] Rate limiting implemented (consider adding)
- [ ] SSL/TLS enabled on hosting platform

### Database Preparation
- [ ] PostgreSQL database created and accessible
- [ ] DATABASE_URL environment variable set
- [ ] Prisma migrations applied: `prisma migrate deploy`
- [ ] Database backed up before deployment
- [ ] Connection pool configured appropriately

### Favicon & Assets
- [ ] Favicon files verified in `/public/favicon.png` and `/public/favicon.ico`
- [ ] All product images URLs are accessible
- [ ] Static assets optimized
- [ ] CDN configured if needed

### Payment Gateway
- [ ] Paystack merchant account active
- [ ] Live API keys configured (not test keys)
- [ ] Webhook URL configured in Paystack dashboard: `https://yourdomain.com/api/paystack/callback`
- [ ] Payment callback endpoint implemented and tested
- [ ] Test transaction completed successfully

---

## 🚀 Deployment Steps

### Option 1: Deploy to Vercel (Recommended for Next.js)

```bash
# 1. Connect your GitHub repository to Vercel
# https://vercel.com/new

# 2. In Vercel Dashboard, set Environment Variables:
PAYSTACK_SECRET_KEY=<your_secret_key>
PAYSTACK_PUBLIC_KEY=<your_public_key>
NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=<your_public_key>
PAYSTACK_WEBHOOK_SECRET=<your_webhook_secret>
DATABASE_URL=<your_postgresql_url>
NODE_ENV=production
NEXT_PUBLIC_GOOGLE_MAPS_PLATFORM_KEY=<optional>

# 3. Deploy button will trigger automatically on push to main
# Vercel runs: npm install, npm run build, npm start
```

### Option 2: Deploy to Render

```bash
# 1. Create new Web Service on Render
# Connect your GitHub repository

# 2. Set Build Command: npm run build
# 3. Set Start Command: npm start
# 4. Set Port: 3000

# 5. Add Environment Variables (same as above)

# 6. Deploy
```

### Option 3: Deploy to Railway

```bash
# 1. Connect GitHub repository
# 2. Add PostgreSQL plugin
# 3. Set Environment Variables
# 4. Railway auto-deploys on push
```

### Option 4: Self-Hosted (VPS/Docker)

```bash
# 1. Clone repository
git clone https://github.com/danieldeking10-maker/Eno-s-Pastries.git
cd Eno-s-Pastries

# 2. Install dependencies
npm install

# 3. Set environment variables
cp .env.production .env.local
# Edit .env.local with your production values

# 4. Run database migrations
npx prisma migrate deploy

# 5. Build the application
npm run build

# 6. Start the server
npm start

# For production with PM2:
npm install -g pm2
pm2 start 'npm start' --name 'enos-pastries'
pm2 save
pm2 startup
```

---

## 📊 Database Migration

### From SQLite to PostgreSQL (Recommended)

```bash
# 1. Create new PostgreSQL database
# Get connection string from your hosting provider

# 2. Update DATABASE_URL in .env.production

# 3. Run migrations
npx prisma migrate deploy

# 4. (Optional) Seed data if needed
npx prisma db seed

# 5. Verify data integrity
npx prisma studio  # Visual database browser
```

---

## 🔒 Security Configuration

### Environment Variables to Keep Secret
```
PAYSTACK_SECRET_KEY          # Never expose
PAYSTACK_WEBHOOK_SECRET      # Never expose
DATABASE_URL                  # Never expose
```

### Public Environment Variables (Safe to expose)
```
NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY
NEXT_PUBLIC_GOOGLE_MAPS_PLATFORM_KEY
NODE_ENV=production
```

### Enable HTTPS
- All hosting platforms provide free HTTPS
- Set Strict-Transport-Security header
- Redirect HTTP → HTTPS

### Secure Headers (Already configured in next.config.ts)
- X-Content-Type-Options: nosniff
- X-Frame-Options: SAMEORIGIN
- X-XSS-Protection: 1; mode=block

---

## 🧪 Testing Before Production

### Test Checkout Flow
1. Add products to cart
2. Proceed to checkout
3. Fill in customer details
4. Verify Paystack payment initialization
5. Complete test payment (use Paystack test credentials)
6. Verify order appears in admin dashboard
7. Check order status updates work

### Test Admin Features
1. Login to admin dashboard
2. Create/edit/delete products
3. View all orders
4. Update order statuses
5. Scan QR codes (if using)
6. Print receipts

### Performance Testing
1. Use Lighthouse in Chrome DevTools
2. Test on slow 3G network
3. Verify Core Web Vitals
4. Check mobile responsiveness

---

## 📈 Monitoring & Maintenance

### Setup Error Monitoring
```bash
# Add Sentry for error tracking (optional)
npm install @sentry/nextjs
```

### Regular Backups
- Enable automatic daily database backups
- Store backups in secure cloud storage
- Test backup restoration monthly

### Performance Monitoring
- Use Vercel Analytics if on Vercel
- Monitor database query performance
- Set up alerts for errors and downtime

### Log Monitoring
- Check application logs daily
- Set up log aggregation (e.g., LogRocket, Datadog)
- Alert on errors and suspicious activity

---

## 🔧 Troubleshooting Common Issues

### Build Failures
```bash
# Clear dependencies and rebuild
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Database Connection Issues
```bash
# Verify DATABASE_URL format
# Should be: postgresql://user:password@host:port/database

# Test connection
npx prisma db execute --stdin < /dev/null
```

### Payment Not Initializing
- Verify PAYSTACK_SECRET_KEY is set correctly
- Check Paystack API status: status.paystack.com
- Verify webhook URL in Paystack dashboard
- Check application logs for specific error

### Favicon Not Showing
- Verify files exist: `/public/favicon.png` and `/public/favicon.ico`
- Clear browser cache
- Hard refresh (Ctrl+F5 or Cmd+Shift+R)
- Check network tab in DevTools for 404 errors

---

## 📝 Post-Deployment

### Verify Deployment
1. Visit production URL
2. Check homepage loads correctly
3. Verify favicon displays
4. Test product browsing
5. Test cart functionality
6. Test checkout process
7. Check admin dashboard
8. Verify orders are saved to database

### Setup Domain
1. Configure custom domain in hosting platform
2. Update DNS records
3. Enable SSL/TLS certificate
4. Test HTTPS access

### Monitor First 24 Hours
- Watch for errors in logs
- Monitor database performance
- Test all critical user journeys
- Have team on standby for issues

---

## 📞 Support & Resources

- **Vercel Docs**: https://vercel.com/docs
- **Next.js Docs**: https://nextjs.org/docs
- **Prisma Docs**: https://www.prisma.io/docs/
- **Paystack Docs**: https://paystack.com/developers
- **GitHub Issues**: https://github.com/danieldeking10-maker/Eno-s-Pastries/issues

---

## ✨ Key Features Verified for Production

✅ Favicon configuration in layout.tsx  
✅ Comprehensive error handling in all API routes  
✅ Input validation on checkout form  
✅ Database error handling with fallbacks  
✅ Paystack payment gateway integration  
✅ Demo mode for missing API keys  
✅ Order status management  
✅ Product management API  
✅ Security headers in next.config.ts  
✅ Environment variable validation  
✅ Loading states and disabled buttons during processing  
✅ Proper HTTP status codes  
✅ Detailed error messages for debugging  

---

**Last Updated**: 2026-08-19  
**Status**: ✅ Ready for Production
