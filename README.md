# Freemarket - Multi-Vendor Marketplace for Malawi

A Next.js + Supabase marketplace platform for physical products.

## Setup

### 1. Environment Variables

Copy `.env.local.example` to `.env.local` and fill in:

```bash
cp .env.local.example .env.local
```

Required variables:
- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anon key
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key for admin operations
- `PAYCHANGU_SECRET_KEY` - PayChangu API secret
- `PAYCHANGU_PUBLIC_KEY` - PayChangu public key
- `PAYCHANGU_WEBHOOK_SECRET` - Webhook signature secret
- `RESEND_API_KEY` - Resend email API key (optional, for notifications)
- `NEXT_PUBLIC_APP_URL` - Your app URL (e.g., `http://localhost:3000` for dev)

### 2. Supabase Setup

Link your Supabase project and push migrations:

```bash
supabase login
supabase init
supabase db push
```

Or run migrations manually in Supabase SQL editor.

### 3. Storage Buckets

Create two buckets in Supabase Storage:
- `product-images` (public) - for product photos
- `id-documents` (private) - for vendor ID verification

### 4. Deploy

```bash
npm run build
npm start
```

## Features

- Multi-vendor marketplace with role-based access
- Product listing with categories, search, filters
- Shopping cart with localStorage persistence
- PayChangu payment integration
- Order tracking with notes thread
- Dispute resolution system
- Vendor payouts (3-day hold)
- Reviews and ratings
- Admin dashboard

## Webhooks

Set up PayChangu webhook to: `https://your-app.com/api/webhooks/paychangu`

## Payouts

Configure Supabase Edge Function cron:
- `process-payouts` function runs daily to process scheduled payouts

## Tech Stack

- Next.js 14 (App Router)
- Supabase (PostgreSQL + Auth + Storage)
- PayChangu (Payments)
- Tailwind CSS
- TypeScript
- Zustand (Cart state)