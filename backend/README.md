# MarkOps Backend — Node.js + Express + TypeScript + Prisma

REST API + Socket.IO for the Marketing Operations & Performance Management System.

## Stack
- **Node.js + Express + TypeScript** (no NestJS)
- **MySQL 8+** via **Prisma ORM**
- **Socket.IO** for real-time events
- **JWT** auth (access + rotating refresh tokens), **bcryptjs**
- **Zod** validation, **Helmet**, **CORS**, **express-rate-limit**, **Multer**, **node-cron**

## Prerequisites
- Node.js 20+ and MySQL 8+ running locally.

## Setup

```bash
# 1. Install
npm install

# 2. Configure
cp .env.example .env
#    set DATABASE_URL="mysql://user:pass@localhost:3306/markops" and the JWT secrets

# 3. Create the schema (Prisma owns it)
npx prisma generate
npx prisma migrate dev --name init      # or: npx prisma db push  (no migration history)

# 4. Seed demo data
npm run seed

# 5. Run
npm run dev        # tsx watch  → http://localhost:5000/api
```

Production:
```bash
npm run build && npm start
```

## Demo accounts
All seeded accounts use password `Password123!`:

| Role               | Email                    |
|--------------------|--------------------------|
| Admin              | `admin@markops.dev`      |
| DM Manager         | `manager@markops.dev`    |
| Digital Marketing  | `marketing@markops.dev`  |
| Designers          | `arun@ / divya@ / karthik@markops.dev` |
| Telecallers        | `priya@ / sneha@ / vikram@markops.dev` |
| Conversion Manager | `conversion@markops.dev` |

## Scripts
| Script | Purpose |
|--------|---------|
| `npm run dev` | Watch-mode dev server (tsx) |
| `npm run build` | `prisma generate` + `tsc` → `dist/` |
| `npm start` | Run compiled server |
| `npm run seed` | Load demo data |
| `npm test` | Jest unit + e2e tests |
| `npm run prisma:studio` | Browse the DB |
| `npm run prisma:migrate` | Create/apply a dev migration |

## Layout
```
src/
  server.ts app.ts          bootstrap + express app
  config/    env, socket
  database/  prisma client, seed
  middleware/ auth, permission, role, validation, upload, error
  routes/    one router per domain + index (mounts /api)
  controllers/ thin request→service→response
  services/  business logic (Prisma, transactions, socket, audit)
  validators/ Zod schemas
  utils/     jwt, password, response envelope, calculations, csv, pagination
  jobs/      node-cron: meta-sync, daily-performance, overdue, follow-ups
  socket/    events + emit helpers
  common/    rbac catalogue, task workflow state machine
prisma/schema.prisma        all models, enums, indexes
```

## Meta integration
Runs in **mock mode** until `META_ACCESS_TOKEN` + `META_AD_ACCOUNT_ID` are set — the app is
fully usable for development and demos. A scheduled job syncs every 15 minutes; authorized
users can trigger `POST /api/ads/sync`.

See [../docs](../docs) for API, database, RBAC, business rules, and architecture.
