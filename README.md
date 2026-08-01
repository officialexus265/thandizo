# thandizo

Transparent project funding platform. People can fund community projects with full transparency (progress bars, donor lists, gallery).

## Features (Phase 1)

- Public landing page with project cards (horizontal desktop / vertical mobile)
- Project detail page with stats, progress, recent donations, fund form
- Gallery page (images + videos)
- Public donations list for transparency
- Donation form with communication preference (Email / SMS / Both / None)
- PayChangu Standard Checkout integration
- Automatic thank-you messages (SMS via httpsms + Email)
- Secure admin panel with 2FA (TOTP)
- Create / list projects, pin projects, multi-currency (MWK, USD, GBP, EUR)
- Cloudinary for media
- Brand: charcoal + dark red + green, signature “Inu ndi thandizo lathu”

## Tech Stack

- Next.js 15 (App Router) + TypeScript + Tailwind CSS
- Prisma + PostgreSQL (Neon recommended)
- NextAuth.js (credentials + TOTP 2FA)
- Cloudinary
- PayChangu
- httpsms (SMS)
- Vercel (recommended hosting)

## Quick Start

### 1. Clone / open the project

```bash
cd thandizo
npm install
```

### 2. Environment variables

Copy `.env.example` to `.env` and fill in:

```bash
cp .env.example .env
```

Required:

- `DATABASE_URL` – Neon PostgreSQL connection string
- `NEXTAUTH_URL` – http://localhost:3000 (or your domain)
- `NEXTAUTH_SECRET` – generate with `openssl rand -base64 32`
- `ADMIN_EMAIL` / `ADMIN_PASSWORD` – first admin credentials
- `CLOUDINARY_*` – your Cloudinary keys
- `PAYCHANGU_SECRET_KEY` – your live/test secret
- `HTTPSMS_API_KEY` – for SMS
- `HTTPSMS_FROM=Thandizo`
- Optional: `RESEND_API_KEY` for transactional email

### 3. Database

```bash
npx prisma db push
npx prisma db seed   # creates the first admin + site settings
```

### 4. Run

```bash
npm run dev
```

Open http://localhost:3000

Admin: http://localhost:3000/admin/login

### 5. Deploy to Vercel

1. Push to GitHub
2. Import project on Vercel
3. Add all environment variables
4. Deploy

Vercel will automatically run the build. After first deploy, run the seed once (via Vercel CLI or a one-time script).

## Project Structure (key parts)

```
src/
  app/
    page.tsx                 # Landing
    project/[slug]/page.tsx  # Project detail + fund
    gallery/[slug]/page.tsx  # Gallery
    donations/page.tsx       # Public donation list
    admin/                   # Protected admin
    api/                     # Auth, donations, PayChangu callback
  components/
  lib/                       # prisma, auth, paychangu, cloudinary, notifications
prisma/
  schema.prisma
  seed.ts
```

## Next Steps (Phase 2)

- Full project edit + media upload UI in admin
- Admin donation list + filters
- 2FA setup page (QR code)
- Site settings (logo upload)
- Admin push notifications to donors
- Webhook hardening

## Notes

- PayChangu callback always verifies the transaction server-side before marking SUCCESS.
- Donors choose how they want to be contacted; thank-you is sent only on successful payment.
- Signature on every message: “Inu ndi thandizo lathu”

Built for transparency and trust.
