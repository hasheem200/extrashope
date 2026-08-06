# ExtraShope — Digital Marketplace Platform

A full-featured e-commerce marketplace for buying and selling digital
products (social media accounts, software keys, subscriptions, and
similar instant-delivery goods). Built with Node.js, Express, and
MongoDB, with support for local or Cloudinary-based image storage,
Resend/Gmail-based email delivery, and a complete admin control panel.

---

## Table of Contents

1. [Tech Stack](#tech-stack)
2. [Getting Started](#getting-started)
3. [Environment Variables](#environment-variables)
4. [Project Structure](#project-structure)
5. [Features by Role](#features-by-role)
   - [Buyer](#buyer-features)
   - [Seller](#seller-features)
   - [Admin](#admin-features)
6. [Security](#security)
7. [Image & File Storage](#image--file-storage)
8. [Email & Notifications](#email--notifications)
9. [Backup & Restore](#backup--restore)
10. [Deployment](#deployment)
11. [API Reference](#api-reference)
12. [Troubleshooting](#troubleshooting)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Node.js, Express |
| Database | MongoDB (via Mongoose) |
| Auth | JWT (JSON Web Tokens), bcrypt password hashing |
| Frontend | Plain HTML/CSS/JavaScript (no framework) — one file per page |
| Image processing | Sharp (resize + compress on upload) |
| Image/file storage | Local disk **or** Cloudinary (switchable in Admin Settings) |
| Email | Resend (HTTP API) **or** Gmail SMTP (switchable/fallback) |
| Payments | Manual crypto payment (wallet address + QR code + payment-proof upload), admin-verified |

---

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Set up your database

The app needs a MongoDB connection string. By default it falls back to
a connection string already in `server.js`, but you should set your
own via the `MONGO_URI` environment variable (see below) — especially
since a real credential has been sitting in this codebase and should
be rotated.

### 3. Run it

```bash
npm run dev     # with nodemon, auto-restarts on file changes
# or
npm start        # plain node
```

The server starts on port `5001` by default (or whatever `PORT` is set
to — see below). Visit `http://localhost:5001`.

### 4. Create your first admin account

There's no special "make me admin" button — sign up normally through
the site (`/register`, or the register form built into `/login`),
which creates a `buyer` or `seller` account. Then, either:

- Manually edit that user's `role` field to `"admin"` directly in
  MongoDB (Atlas dashboard, Compass, or `mongosh`), **or**
- If you already have one admin account, use **Admin → Manage Users →
  Admin** button on the account you want to promote.

---

## Environment Variables

None of these are strictly required to boot the app (there are
built-in fallbacks for local development), but setting them properly
is required for a secure, correctly-configured production deployment.

Create a `.env` file locally (see `.env.example`), or set these in
your hosting platform's dashboard (e.g. Railway → Variables):

| Variable | Purpose | Required? |
|---|---|---|
| `MONGO_URI` | MongoDB connection string | Recommended (falls back to a hardcoded one otherwise — rotate that password) |
| `PORT` | Port the server listens on | No — most hosts set this automatically |
| `NODE_ENV` | Set to `production` on your live server | Recommended (enables the HTTPS-redirect safety net) |

Everything else (SMTP credentials, Resend API key, Cloudinary
credentials, payment wallet address, commission rate, site branding,
etc.) is configured **inside the app itself**, from the Admin panel —
not via environment variables. See [Admin Features](#admin-features)
below.

---

## Project Structure

```
amazon-pro/
├── server.js                 # App entry point — middleware, routes, DB connection
├── config/
│   ├── jwtSecret.js           # Auto-generates & persists a random JWT signing secret in the DB
│   └── mailerFactory.js       # Unified email sender (Resend → Gmail SMTP fallback)
├── middleware/
│   └── auth.js                # verifyToken, requireRole, requireSelfOrAdmin
├── models/                    # Mongoose schemas (User, Product, Order, Settings, etc.)
├── routes/                    # One file per API resource (see API Reference below)
├── utils/
│   ├── notifyAdmin.js         # Sends admin a copy of platform events (withdraws, orders, support)
│   ├── notifyUserByEmail.js   # Sends buyers/sellers a copy of their own notifications
│   └── sendEmail.js           # Generic one-off email helper
└── public/                    # All frontend pages (plain HTML/JS/CSS, one file per page)
```

**Frontend conventions worth knowing:**
- Every page loads `js/auth-fetch.js` (auto-attaches the login token to
  API calls), `js/ui-helpers.js` (`toast()` and loading spinner
  helpers), and `js/seo.js` (`setSeoTags()` and `injectCustomHtml()`
  for meta tags / custom head-footer code).
- Clean URLs: `/product`, `/cart`, `/admin` etc. all work without
  `.html` — the server resolves them automatically, and old `.html`
  links redirect (301) to the clean version.
- Admin pages are protected two ways: `admin-protect.js` (or
  `requireRole("admin")` from `js/auth.js`) on the frontend, **and**
  `requireRole("admin")` middleware on every backend route — the
  frontend check is just for UX (instant redirect), the backend check
  is what actually enforces security.

---

## Features by Role

### Buyer Features

- Browse products by category, search (with live suggestions
  dropdown), and promoted/sponsored listings
- Product pages with reviews and star ratings
- Cart with coupon code support
- Checkout via crypto payment: shows the seller's configured wallet
  address, QR code (scan to pay), and network — buyer uploads a
  payment-proof screenshot
- Order history (`/orders`) — tracks status (Pending → Approved) and
  shows delivered login/password once approved
- Wishlist
- **Automatic email notifications** at their registered email —
  no setup needed:
  - Order approved (includes delivery credentials if it was an
    instant-delivery digital product)
- Downloads page for any downloadable purchases
- Support chat to contact a seller or admin

### Seller Features

*(Everything a Buyer has, plus:)*

- **Seller Dashboard** — sales overview, wallet balance
- **Add/Edit Products** — name, price, category, image (auto-resized
  & compressed on upload), and for digital-goods products, a pool of
  login:password lines (`stockData`) that get dispensed one-by-one as
  orders are approved
- **My Products** — manage listings, delete, view status
- **Promotions** — pay to promote a product (shows in the homepage
  hero banner and gets priority placement)
- **Shop Settings** — store name, description, logo, and banner
  (editing one field never wipes the others — verified safe)
- **Selling Wallet / Withdraws** — request a payout; balance updates
  immediately, admin reviews and approves/rejects
- **Reviews** — see reviews left on their products
- **Notifications** — in-app notification center
- **Automatic email notifications** at their registered email — no
  setup needed:
  - Withdraw request submitted / approved / rejected
  - New sale ("You Made a Sale!") the moment a buyer orders their
    product
  - Order approved ("You Got Paid!") with the amount credited

### Admin Features

Everything above, plus full platform control from `/admin`:

| Page | What it does |
|---|---|
| **Manage Users** | List, search (nickname/email/role/status — all at once), promote/demote role, block (temporary or permanent, with reason)/unblock, delete. Actions are laid out in a single scrollable row per user. |
| **Products Manager** | View/edit/delete any product across all sellers |
| **Orders** | View all orders, approve (releases stock credentials + pays the seller + credits your commission) or delete |
| **Withdraws (Pending)** | Review and approve/reject seller withdrawal requests |
| **Admin Withdraws** | Withdraw your own accumulated commission earnings |
| **Support** | View and reply to support tickets from buyers/sellers |
| **Ads** | Approve/reject banner ad submissions from advertisers |
| **Banner Prices** | Set pricing for each ad placement (top, mobile, long, rectangle, large) |
| **Payment Settings** | Configure the crypto payment method shown at checkout: name, description, wallet address, network, button text, **logo** (shown to buyers), **QR code** (buyers can scan to pay instead of copying the address), and the **Notification Email** field (see below) |
| **Website Settings** | Site name/icon/favicon, meta description & keywords (SEO), Open Graph/Twitter card data, custom Head HTML / Footer HTML (injected site-wide — e.g. Google verification tags, analytics scripts), SMTP/Resend email config, **Storage Settings** (Local vs Cloudinary), commission rate |
| **File Manager** | Full cPanel-style manager — folders, upload, rename, move, bulk delete, search, sort. Automatically manages whichever storage backend is configured (Local or Cloudinary) — see below |
| **Backup & Restore** | One-click full database export (JSON download) and restore (with a typed "RESTORE" confirmation before it overwrites anything) |
| **Analytics stats** | Buyer/seller counts, ads revenue, admin wallet balance |

---

## Security

Security was the first and most extensive pass on this codebase.
Highlights:

- **Every API route requires the correct role.** Nothing is
  admin-only "by convention" — it's enforced server-side with
  `verifyToken` + `requireRole("admin")` middleware, regardless of
  what the frontend UI shows or hides.
- **JWT secret is auto-generated and stored in the database** —
  never hardcoded, never guessable.
- **Passwords** use bcrypt hashing and are marked `select:false` on
  the schema, so they're never accidentally included in an API
  response, even if a route forgets to exclude them explicitly.
- **File uploads are locked down**: only real image files (checked
  by both extension *and* MIME type) for product photos; the general
  File Manager blocks executable/server-script extensions (`.php`,
  `.exe`, `.sh`, `.js`, etc.) outright.
- **Path traversal is impossible** in the File Manager — every
  folder path is sanitized so `../../etc` (or any variant) can never
  escape the intended storage location, tested against 9+ attack
  patterns.
- **Secrets never leak through public API responses** — SMTP
  password, Resend API key, Cloudinary API secret, JWT secret,
  admin's payment notification email, and users' private data are
  all stripped from any endpoint a regular visitor can call. Several
  of these were found leaking in earlier passes and fixed (see
  history below).
- **Ownership checks** — a seller can only edit/delete their own
  products and view their own orders/withdraws; `requireSelfOrAdmin`
  middleware ensures nobody can view or modify another user's private
  data.

---

## Image & File Storage

Two interchangeable backends, switched from **Admin → Website
Settings → Storage Settings**:

### Local
Images save to `public/uploads` (product photos) and
`public/manage` (File Manager). Works out of the box, no setup
needed — the default.

### Cloudinary
Set **Storage Type = Cloudinary** and fill in your Cloud Name, API
Key, and API Secret (from your Cloudinary dashboard). Once
configured:
- All new product/logo/banner uploads go straight to Cloudinary
  (in an `extrashope` folder) instead of the local disk
- Images are still resized/compressed by Sharp *before* upload
- The optional **Upload Preset** field applies your Cloudinary
  upload preset if you've set one up (leave blank for signed
  uploads, which is the default and requires no preset)
- **File Manager automatically switches too** — once Cloudinary is
  configured, the File Manager lists, uploads to, renames, moves,
  and deletes from the *same* Cloudinary folder your product photos
  are really stored in, instead of an empty local folder. No
  separate configuration needed for this — it reads the same Storage
  Settings.

**Copying a file's link** (via the 📋 button in File Manager) always
produces the correct, complete URL regardless of backend — this used
to break for Cloudinary files specifically (producing a garbled
`http://yoursitehttps://res.cloudinary.com/...` link) and has been
fixed and tested.

---

## Email & Notifications

### Sending emails
Configured in **Admin → Website Settings → Email Settings**:
- **Resend** (recommended) — an HTTP-based email API that works
  reliably on hosts like Railway/Render that block outbound SMTP
  traffic. Just needs an API key from resend.com.
- **Gmail SMTP** — a fallback/alternative if you'd rather use a
  Gmail address directly. Requires a Gmail **App Password** (not your
  regular password).

The mailer automatically prefers Resend if configured, and falls back
to trying Gmail SMTP on both port 465 and 587 if not — with
short timeouts so a blocked port fails fast with a clear log message
instead of hanging.

### Platform notifications (fully automatic)
Every buyer and seller automatically receives professional-looking
email notifications **at their registered account email** — nothing
to connect or configure on their end:

- **Buyers**: order approved (with delivery credentials, if
  applicable)
- **Sellers**: withdraw request/approved/rejected, new sale, order
  approved (payout confirmation)
- **Admin**: set a "Notification Email" in **Admin → Payment
  Settings** to get a copy of every withdraw request, new order, and
  new support ticket

All of this is designed so a failed email **never** breaks the real
action that triggered it (a withdraw request still succeeds even if
the notification email fails to send) — this is tested, not assumed.

---

## Backup & Restore

**Admin → Backup & Restore**:

- **Export**: downloads a single JSON file containing every
  collection (users, products, orders, settings, wallets, etc.) —
  treat this file as sensitive, since it includes SMTP/API
  credentials and (hashed) user passwords.
- **Restore**: upload a previously-exported file and type `RESTORE`
  to confirm. This **replaces** the current contents of every
  collection found in the file. It's resilient — if one collection
  fails to restore, the others still complete, and you'll see exactly
  which one had a problem.

This only backs up the **database**. Uploaded images/files
(`public/uploads`, `public/manage`, or your Cloudinary account) are
not included — back those up separately if you're on Local storage.

---

## Deployment

This project is set up to work well on PaaS platforms like Railway,
Render, or similar (not a traditional VPS requiring manual
Apache/Nginx setup — the platform handles SSL/HTTPS/reverse-proxying
for you).

**Checklist:**
- [ ] Set `MONGO_URI` in your host's environment variables (and
      rotate the database password if you haven't already)
- [ ] Set `NODE_ENV=production`
- [ ] After deploying, configure Website Settings (site name, email
      provider, storage backend) and Payment Settings from the admin
      panel — these live in the database, not in code, so they carry
      over across deploys automatically once set
- [ ] Visit `/health` to confirm the server is up (it responds
      without touching the database, so it works even during a
      temporary DB outage)
- [ ] Test the full flow once: register → add a product (seller) →
      place an order (buyer) → approve it (admin) — confirms
      auth, uploads, and email are all working end to end

---

## API Reference

All routes are prefixed with `/api`. 🔒 = requires login, 👑 =
admin only, 🔐 = owner-or-admin only.

| Resource | Routes |
|---|---|
| **Users** | `POST /users/register`, `POST /users/login`, `GET /users` 👑, `GET /users/:nickname`, `GET /users/wallet/:nickname`, `GET/PUT /users/store/:nickname` 🔐, `PUT /users/:id/role` 👑, `PUT /users/:id/block` 👑, `DELETE /users/:id` 👑 |
| **Products** | `GET /products`, `GET /products/:id`, `POST /products` 🔒, `PUT /products/:id` 🔐, `DELETE /products/:id` 🔐, `PUT /products/promote/:id` 🔐, `GET /products/promoted/list` |
| **Orders** | `GET /orders` 🔒 (own orders, or all if admin), `POST /orders` 🔒, `PUT /orders/:id` 👑, `DELETE /orders/:id` 👑 |
| **Wallet** | `GET /wallet/:seller` 🔐, `POST /wallet/add` 👑, `POST /wallet/promote` 🔒 |
| **Withdraws** | `POST /withdraws` 🔒, `GET /withdraws` 👑, `GET /withdraws/:seller` 🔐, `PUT /withdraws/:id/complete` 👑, `PUT /withdraws/:id/reject` 👑 |
| **Admin Withdraws** | All routes 👑 |
| **Notifications** | `GET /notifications/:user` 🔐, `PUT /notifications/read/:user` 🔐 |
| **Password** | `POST /password/forgot`, `POST /password/verify-code`, `POST /password/reset` |
| **Reviews** | `POST /reviews` 🔒, `GET /reviews/:productId` |
| **Settings** | `GET /settings` (public, secrets stripped), `GET /settings/full` 👑, `PUT /settings/site` 👑, `PUT /settings` 👑 |
| **Payment Settings** | `GET /payment-settings` (public, notification email stripped), `GET /payment-settings/full` 👑, `PUT /payment-settings` 👑 |
| **File Manager** | All routes 👑 — `GET /file-manager/files`, `POST /file-manager/upload`, `POST /file-manager/folder`, `PUT /file-manager/rename`, `PUT /file-manager/move`, `DELETE /file-manager/files/:name`, `POST /file-manager/delete-bulk` |
| **Backup** | `GET /backup/export` 👑, `POST /backup/import` 👑 |
| **Upload** | `POST /upload` 🔒 (any logged-in user — used for product images, logos, banners, payment proof) |
| **Support** | `POST /support` (public — anyone can submit), `GET /support` 👑, `PUT /support/:id` 👑 |
| **Ads** | `POST /ads` 🔒, `GET /ads` 👑, `PUT /ads/:id` 👑, `GET /ads/live` (public) |
| **Banner Prices** | `GET /banner-prices` (public), `PUT /banner-prices` 👑 |
| **Robots / Sitemap** | `GET /robots.txt`, `GET /sitemap.xml` (public, SEO) |
| **Health** | `GET /health` (public, no DB dependency) |

---

## Troubleshooting

**Emails aren't sending** — Check Admin → Website Settings → Email
Settings. Resend is recommended over Gmail SMTP on hosts like Railway
that commonly block outbound SMTP traffic entirely; if you see
`Could not send email on either port 465 or 587` in your server logs,
that confirms SMTP is blocked and you should switch to Resend.

**Images/logo showing as broken (404)** — This means the actual file
was deleted from storage while the database still references its old
filename — re-upload the image from the relevant settings/product
page. This can't be fixed by code since the original file content is
gone; the app does gracefully show a placeholder image instead of a
broken-image icon when this happens.

**"Access Denied" as an admin** — Confirm your account's `role`
field is actually `"admin"` in the database (Manage Users page will
show it), and that you're logged in with a fresh token (login again
if you promoted your own account mid-session — the token doesn't
update automatically).

**File Manager showing an empty folder** — Check Storage Settings;
if it's set to Cloudinary but your Cloud Name/API Key/Secret are
wrong or missing, it silently has nothing to show. Verify your
credentials match your Cloudinary dashboard exactly.

**Local `npm run dev` can't find modules** — Run `npm install` first;
`node_modules` is never included in project zips/exports (kept out of
git on purpose) and needs to be installed fresh in each environment.
