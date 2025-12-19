# Internship LMS (RBAC-Based)

A full-stack Learning Management System built with Node.js, Express, React, and Drizzle ORM.

## Tech Stack

- **Backend**: Node.js, Express, TypeScript, Drizzle ORM, PostgreSQL.
- **Frontend**: React, Vite, TailwindCSS, Lucide Icons.
- **Database**: PostgreSQL (Supabase compatible).

## Setup

1.  **Server**:

    - `cd server`
    - `npm install`
    - Copy `.env.example` to `.env` (or create one) and set `DATABASE_URL`.
    - Run migrations: `npm run db:push` (or `db:generate` + `db:migrate`).
    - Start: `npm run dev`

2.  **Client**:
    - `cd client`
    - `npm install`
    - Start: `npm run dev`

## AI Usage Requirement (My AI Usage)

- **AI Tools Used**: Google Antigravity Agent.
- **How AI Was Used**:
  - Setting up the project structure (folders, configuration).
  - Writing boilerplate code for Authentication and CRUD operations.
  - Implementing the Drizzle Schema and RBAC middleware.
  - Creating the React frontend components.
- **Reflection**:
  - AI helped enforce consistent coding styles and rapid prototyping.
  - It allowed for quick validation of logic (like sequential chapter access) by generating testable code blocks.

## Features

- **Strict RBAC**: Student, Mentor, Admin roles.
- **Sequential Learning**: Chapters must be completed in order.
- **Certification**: Automated PDF certificate upon completion.
