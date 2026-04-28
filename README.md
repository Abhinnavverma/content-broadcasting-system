# Content Broadcasting System - Backend

A sophisticated, stateless Node.js backend API designed to schedule, approve, and broadcast educational content (images/videos) to students in real-time. Built with TypeScript, Express, and PostgreSQL.

## Features
* **Stateless Rotation Engine**: Calculates active content on-the-fly using modulo mathematics, entirely eliminating the need for expensive background workers or CRON jobs.
* **Role-Based Access Control**: Strict separation between `teacher` (uploading) and `principal` (approval) workflows using stateless JWTs.
* **Optimistic Concurrency**: Database-level locks prevent race conditions during content approval and scheduling.

## 🛠 Prerequisites
* [Node.js](https://nodejs.org/en/) (v20 or higher)
* [Docker Desktop](https://www.docker.com/products/docker-desktop/) (for the PostgreSQL database)
* Git / Git Bash (Recommended for Windows users)

## Zero-to-Run Setup Guide

**1. Install Dependencies**
\`\`\`bash
npm install
\`\`\`

**2. Environment Configuration**
Create a `.env` file in the root directory and add the following:
\`\`\`env
PORT=3000
JWT_SECRET=super_secret_key_change_in_production
FILE_SIZE_LIMIT=10

# Database Configuration
POSTGRES_USER=admin
POSTGRES_PASSWORD=rootpassword
POSTGRES_DB=broadcasting_system
DATABASE_URL=postgres://admin:rootpassword@localhost:5433/broadcasting_system
\`\`\`

**3. Start the Database**
Spin up the isolated PostgreSQL container in the background:
\`\`\`bash
docker-compose up -d
\`\`\`

**4. Run Database Migrations**
Initialize the database schemas and required indexes:
\`\`\`bash
npm run migrate
\`\`\`

**5. Start the Development Server**
\`\`\`bash
npm run dev
\`\`\`
The server should now be running on `http://localhost:3000`.

## 🧪 Testing the APIs
You can test the system's health by hitting:
`GET http://localhost:3000/health`

For a full breakdown of the architectural decisions and API flows, please refer to the [architecture-notes.md](./architecture-notes.md).