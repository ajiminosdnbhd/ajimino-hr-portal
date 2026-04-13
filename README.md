# AJIMINO SDN. BHD. — HR Portal

A complete HR management portal built with Next.js 14, Supabase, and Tailwind CSS.

## Features

- **Dashboard** — Stats overview + full year calendar with Selangor public holidays
- **Room Booking** — Monthly calendar with colored room dots, conflict detection
- **Leave Management** — Apply leave, balance tracking, MC receipt upload, approval workflows
- **Company Policies** — Publish policies with PDF attachments, target specific departments
- **Payslips** — Upload/download payslip PDFs per staff per month
- **User Management** — Create/edit/delete staff accounts with role-based access

## Tech Stack

- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- Supabase (Auth, Database, Storage)
- @supabase/ssr

## Setup

### 1. Clone and install

```bash
git clone <your-repo-url>
cd ajimino-hr
npm install
```

### 2. Environment variables

Create `.env.local` (already included):

```
NEXT_PUBLIC_SUPABASE_URL=https://lpfkgmochjivrpfqpbak.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
```

### 3. Run database schema

1. Go to your Supabase Dashboard > SQL Editor
2. Copy and run the contents of `schema.sql`

### 4. Create storage buckets

In Supabase Dashboard > Storage, create 3 **public** buckets:

- `receipts` — MC receipt uploads
- `policy-attachments` — Policy PDF attachments
- `payslips` — Staff payslip PDFs

### 5. Create first admin user

In Supabase Dashboard > Authentication > Users, create a user manually. Then in SQL Editor:

```sql
INSERT INTO public.profiles (id, name, department, role, al_entitled, ml_entitled)
VALUES ('<user-uuid>', 'Admin Name', 'Management', 'management', 14, 14);
```

### 6. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Deploy to Vercel

1. Push to GitHub
2. Import project in Vercel
3. Add environment variables in Vercel dashboard
4. Deploy

## Roles

| Department | Role       | Permissions                          |
|------------|------------|--------------------------------------|
| Management | management | Full access, leave auto-approved     |
| HR         | hr         | Manage users, approve staff leave    |
| Others     | staff      | Self-service (booking, leave, view)  |

## Approval Hierarchy

- **Management leave** — Auto-approved (exempt)
- **HR leave** — Management approves
- **Staff leave** — HR or Management approves

## Rooms

| Room                | Capacity |
|---------------------|----------|
| Big Meeting Room    | 20       |
| Small Meeting Room  | 8        |
| Discussion Room     | 4        |
