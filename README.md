# CodeArc - Learning Management System

![Status](https://img.shields.io/badge/Status-Active-brightgreen) ![Version](https://img.shields.io/badge/Version-1.0.0-blue) ![License](https://img.shields.io/badge/License-MIT-orange)

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

- **Work Split**: ~70% Manual / ~30% AI Assisted
- **Manual Work (70%)**:
  - **Database & Drizzle Architecture**: Designed the core relational schema and handled the majority of the Drizzle ORM implementation, including complex table relations and schema migrations.
  - **Core Business Logic**: Engineered the sequential learning unlocking system, role-based access control (RBAC), and automated enrollment workflows.
  - **Frontend Development**: Developed and polished the React frontend to ensure a premium user experience, focusing on responsive design and interactive components.
  - **Custom Systems**: Built the automated PDF certificate generation engine and the comprehensive mentor review dashboard.
- **AI Usage (30%)**:
  - **Drizzle Deep-Dive**: Since I am transitioning into the Drizzle ecosystem, I leveraged AI for ~30% of the ORM work—primarily for syntax validation of advanced queries and optimizing relational joins.
  - **Boilerplate & Scaffolding**: Used AI to accelerate development by generating standard CRUD controllers and initial component skeletons.
- **Reflection**:
  - This collaborative approach allowed me to maintain full control over the application's architecture and "unique-selling-point" features while utilizing AI as a powerful pair-programmer for rapid prototyping and syntax verification.
