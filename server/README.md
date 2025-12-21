# CodeArc - Server

The Node.js backend for the CodeArc Learning Management System, handling core business logic, database management via Drizzle ORM, and secure authentication.

## 🚀 Overview

The CodeArc server is a robust REST API designed for efficiency, scalability, and type-safety.

- **Runtime**: [Node.js](https://nodejs.org/)
- **Framework**: [Express](https://expressjs.com/)
- **ORM**: [Drizzle ORM](https://orm.drizzle.team/)
- **Database**: [PostgreSQL](https://www.postgresql.org/) (Supabase)
- **Language**: [TypeScript](https://www.typescriptlang.org/)

## 🛠️ Performance & Tech

1.  **Drizzle ORM**: Leveraging 70% manual architecture design for high-performance relational queries and type-safe schema management.
2.  **RBAC System**: Centralized middleware for Role-Based Access Control, ensuring secure access for Students, Mentors, and Admins.
3.  **PDF Generation**: Automated certification engine using PDFKit.
4.  **JWT Auth**: Secure, stateless authentication with BCrypt hashing for sensitive data.

## 📦 Installation

```bash
# From the root directory
cd server

# Install dependencies
npm install

# Configure Environment
cp .env.example .env  # Add your DATABASE_URL and JWT_SECRET

# Database Setup
npm run db:push       # Push schema to the database
npm run dev           # Start the development server
```

## 🧩 Scripts

- `npm run dev`: Starts the server with `tsx` watch mode.
- `npm run db:push`: Syncs the Drizzle schema with the database.
- `npm run db:generate`: Generates SQL migrations (if needed).
- `npm run build`: Compiles TypeScript to JavaScript.

## 🗃️ Database Schema

The database relies on a highly relational structure including:

- `users`: Profiles and role management.
- `courses` & `chapters`: Hierarchical content structure.
- `enrollments`: Progress tracking and completion status.
- `reviews`: Peer and mentor feedback loop.

---

_Part of the CodeArc Full-Stack Ecosystem._
