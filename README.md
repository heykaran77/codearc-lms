# CodeArc - Learning Management System

A full-stack LMS built with Node.js, Express, React, and Drizzle ORM, featuring Role-Based Access Control (RBAC) and automated certification.

## Tech Stack

- **Backend**: Node.js, Express, TypeScript, Drizzle ORM, PostgreSQL.
- **Frontend**: React, Vite, TailwindCSS.
- **Database**: PostgreSQL (Supabase).
- **Authentication**: JWT & BCrypt.

## Features

1.  **Role-Based Access Control (RBAC)**:

    - **Admins**: Manage users, approve mentors, view platform stats.
    - **Mentors**: Create courses, manage chapters, review student work.
    - **Students**: Enroll in courses, track progress, download certificates.

2.  **Course Management**:

    - Detailed chapter sequencing.
    - Support for video and image content.

3.  **Progress & Certification**:
    - Sequential chapter unlocking.
    - Automated PDF certificate generation upon 100% completion.

## Setup Instructions

1.  **Server**:

    ```bash
    cd server
    npm install
    cp .env.example .env  # Configure DATABASE_URL and JWT_SECRET
    npm run db:push       # Push schema to DB
    npm run dev           # Start backend on port 5000
    ```

2.  **Client**:
    ```bash
    cd client
    npm install
    npm run dev           # Start frontend on port 5173
    ```

## My AI Usage

- **AI Tools Used**: Claude
- **Other Tools Used**: VS Code, Other Libraries

* **Work Split**: ~70% Manual / ~30% AI Assisted
* **Manual Work (70%)**:
  - Designed and implemented the core business logic, including the sequential learning enforcement and role-based access control (RBAC).
  - Built and styled the majority of the React frontend to ensure a custom, premium aesthetic outside of the initial scaffolding.
  - Wrote the complex logic for certificate generation (PDFKit integration) and the review system workflow.
* **AI Usage (30%)**:
  - **Drizzle ORM Setup**: Since I was new to Drizzle, I used AI to help define the initial schema (tables, relations) to ensure best practices.
  - **Scaffolding**: Used AI to quickly generate the boilerplate for repetitive CRUD controllers and basic UI component structures (like forms and modals).
* **Reflection**:
  - This hybrid approach allowed me to focus deeply on the unique features of the application (like the "Activity" tracking and "Upcoming Lessons" logic) while offloading the setup of the ORM and standard boilerplate to the AI.
