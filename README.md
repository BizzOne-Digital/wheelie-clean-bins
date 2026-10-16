# Wheelie Clean Bins — Website & Admin

Next.js 15 (App Router) · TypeScript · Tailwind CSS v4 · MongoDB/Mongoose · Stripe Checkout

Public pages: `/`, `/about`, `/services`, `/pricing`, `/faq`, `/booking`, `/contact` (plus `/booking/confirmation`).
Admin: `/admin` (login at `/admin/login`) — bookings, subscriptions, customers, inquiries, page content, services, pricing, FAQs, media, settings.

---

## 1. Local setup

```bash
npm install
cp .env.example .env.local      # then fill in the values below
npm run seed                    # loads default content (safe to re-run)
ADMIN_EMAIL=you@example.com ADMIN_PASSWORD='a-long-unique-password' npm run admin:create
npm run dev
```

| Variable | Required | Purpose |
|---|---|---|
| `MONGODB_URI` | Yes | MongoDB connection string (MongoDB Atlas recommended) |
| `NEXT_PUBLIC_SITE_URL` | Yes | Public URL, e.g. `https://www.example.com` — used for Stripe redirects, sitemap and OG tags |
| `SESSION_SECRET` | Yes | Random string, 32+ characters (`node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`) |
| `STRIPE_SECRET_KEY` | For card payments | Stripe secret key (`sk_live_…` / `sk_test_…`) |
| `STRIPE_WEBHOOK_SECRET` | For card payments | Signing secret of the webhook endpoint (`whsec_…`) |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | Only for `admin:create` | Read by the CLI script only. Remove after use. |

Without a database the public pages still render using the default content, but booking, contact and admin are disabled with a clear message.

## 2. Seeding

`npm run seed` inserts settings, page content, the two regional plans, services and FAQs **only if they do not exist**. It never overwrites admin edits, so it is safe to run on every deploy.

## 3. Initial admin

There are no default credentials. Create the first admin (becomes `owner`) with `npm run admin:create` as shown above. Running it again for the same email resets that password. Passwords must be 12+ characters.

Security: bcrypt hashing, DB-backed sessions in HTTP-only `SameSite=Lax` cookies (Secure in production), 12-hour expiry, login throttling (5 attempts / 15 min per email, 20 per IP), server-side auth on every admin page, server action and API route, and an audit log of admin changes.

## 4. Stripe payments

1. Add `STRIPE_SECRET_KEY` to the environment.
2. In Stripe Dashboard → Developers → Webhooks, add endpoint `https://YOUR_DOMAIN/api/stripe/webhook` with events:
   `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`, `checkout.session.expired`, `invoice.paid`, `invoice.payment_failed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`.
3. Copy the signing secret into `STRIPE_WEBHOOK_SECRET`.
4. Local testing: `stripe listen --forward-to localhost:3000/api/stripe/webhook`.

How billing works:
- **Monthly** → Stripe subscription (recurring monthly). Can be switched to a one-month payment in Settings.
- **3 / 6 / 12 months** → one-time prepaid payment, no automatic renewal.
- **Debit/credit** both use Stripe Checkout (Visa/Mastercard debit cards). Payment methods are controlled in the Stripe Dashboard.
- Bookings are marked **paid only by verified webhooks** (idempotent per event). Returning to the success page never marks a booking paid.
- Without Stripe keys, card bookings are saved as “payment setup needed” and the customer is told no payment was taken.
- **E-Transfer** bookings stay pending until an admin records the payment on the booking page (amount + reference, audit-logged). EMT recipient and instructions are set in Admin → Settings.
- Prices are always recalculated on the server (`src/lib/pricing.ts`); client totals are ignored. Card data never touches this app.

Pricing rules (editable in Admin → Pricing / Settings):
- York, Durham, Peel, Halton: $14.99/mo, up to 3 bins, $3 per extra bin per monthly visit.
- Toronto, Scarborough: $14.99/mo, up to 2 bins, $5 per extra bin per monthly visit.
- 12-month bonus: customer chooses one free extra clean or one month free. By default “one month free” waives one month of the **base** price only; extra-bin charges still apply. Toggle in Settings.
- Tax is **off** by default. Enable it in Settings once you have confirmed your tax obligations.

## 5. Image uploads (serverless-safe)

- All admin uploads are stored in MongoDB (`StoredUpload`) — never on disk — and served from `/api/uploads/{folder}/{filename}` with immutable caching. They survive redeploys.
- Validates admin session, same-origin, folder whitelist (`products`, `gallery`, `pages`, `misc`), real file signature (JPEG/PNG/WebP/GIF) and an 8MB limit.
- **Host body limit:** Vercel functions accept at most 4.5MB per request. The admin uploader automatically splits files larger than 3MB into sequential 3MB chunks (temporary `UploadChunk` documents, auto-expire after 1 hour), so 8MB uploads work on Vercel. The final URL contract is unchanged.
- Replaced or removed images are deleted only after the owning document saves and nothing else references them. Unsaved uploads are cleaned up conservatively via Admin → Media → “Clean up unused” (older than 7 days).
- MongoDB documents are limited to 16MB; the 8MB cap stays well below that.

## 6. Deployment (Vercel)

1. Create a MongoDB Atlas cluster; allow access from Vercel (`0.0.0.0/0` or Atlas integration).
2. Import the repo into Vercel, set the environment variables above for Production.
3. Deploy, then run `npm run seed` and `npm run admin:create` once from your machine with the production `MONGODB_URI`.
4. Add the Stripe webhook (section 4) pointing at the production domain.

## 7. Before going live

- **Logo:** `public/brand/logo.png` is a temporary, low-resolution crop of the logo taken from the design reference. Upload the original logo file in **Admin → Settings → Brand** (or replace `public/brand/logo.png`).
- Set the EMT recipient and instructions in Admin → Settings.
- Confirm tax handling before enabling tax.
- Review all page copy in Admin → Pages.

## Scripts

`npm run dev` · `npm run build` · `npm start` · `npm run typecheck` · `npm run lint` · `npm run seed` · `npm run admin:create`
