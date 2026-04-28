import type { MigrationBuilder } from 'node-pg-migrate';
/* eslint-disable camelcase */

export const shorthands = undefined;

export async function up(pgm: MigrationBuilder): Promise<void> {
    // Users Table
    pgm.sql(`
    CREATE TABLE users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(50) CHECK (role IN ('principal', 'teacher')) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

    // Content Table
    pgm.sql(`
    CREATE TABLE content (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        subject VARCHAR(100) NOT NULL,
        file_url TEXT NOT NULL,
        file_type VARCHAR(10) NOT NULL,
        file_size INT NOT NULL,
        uploaded_by INT REFERENCES users(id) ON DELETE CASCADE,
        status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('uploaded', 'pending', 'approved', 'rejected')),
        rejection_reason TEXT,
        approved_by INT REFERENCES users(id) ON DELETE SET NULL,
        approved_at TIMESTAMP,
        start_time TIMESTAMP,
        end_time TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

    // Content Slots Table
    pgm.sql(`
    CREATE TABLE content_slots (
        id SERIAL PRIMARY KEY,
        subject VARCHAR(100) UNIQUE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

    // Content Schedule Table
    pgm.sql(`
    CREATE TABLE content_schedule (
        id SERIAL PRIMARY KEY,
        content_id INT REFERENCES content(id) ON DELETE CASCADE,
        slot_id INT REFERENCES content_slots(id) ON DELETE CASCADE,
        rotation_order INT NOT NULL,
        duration INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

    // Performance Indexes
    pgm.sql(`
    CREATE INDEX idx_content_status ON content(status);
    CREATE INDEX idx_content_subject ON content(subject);
    CREATE INDEX idx_schedule_slot ON content_schedule(slot_id);
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
    pgm.sql(`DROP INDEX IF EXISTS idx_schedule_slot;`);
    pgm.sql(`DROP INDEX IF EXISTS idx_content_subject;`);
    pgm.sql(`DROP INDEX IF EXISTS idx_content_status;`);
    pgm.sql(`DROP TABLE IF EXISTS content_schedule CASCADE;`);
    pgm.sql(`DROP TABLE IF EXISTS content_slots CASCADE;`);
    pgm.sql(`DROP TABLE IF EXISTS content CASCADE;`);
    pgm.sql(`DROP TABLE IF EXISTS users CASCADE;`);
}
