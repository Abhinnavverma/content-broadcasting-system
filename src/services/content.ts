import { pool } from '../config/db.js';

interface UploadPayload {
    teacherId: number;
    title: string;
    description?: string;
    subject: string;
    fileUrl: string;
    fileType: string;
    fileSize: number;
    startTime?: string;
    endTime?: string;
    duration?: number;
}

export class ContentService {
    static async uploadContent(payload: UploadPayload) {
        const client = await pool.connect();

        try {
            await client.query('BEGIN');

            const normalizedSubject = payload.subject.toLowerCase().trim();
            const duration = payload.duration || 5;

            const contentResult = await client.query(
                `INSERT INTO content 
                (title, description, subject, file_url, file_type, file_size, uploaded_by, status, start_time, end_time) 
                VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', $8, $9) RETURNING id`,
                [
                    payload.title,
                    payload.description || null,
                    normalizedSubject,
                    payload.fileUrl,
                    payload.fileType,
                    payload.fileSize,
                    payload.teacherId,
                    payload.startTime || null,
                    payload.endTime || null,
                ],
            );

            const contentId = contentResult.rows[0].id;

            let slotResult = await client.query(`SELECT id FROM content_slots WHERE subject = $1`, [
                normalizedSubject,
            ]);

            if (slotResult.rows.length === 0) {
                slotResult = await client.query(
                    `INSERT INTO content_slots (subject) VALUES ($1) RETURNING id`,
                    [normalizedSubject],
                );
            }

            const slotId = slotResult.rows[0].id;

            const orderResult = await client.query(
                `SELECT COALESCE(MAX(rotation_order), 0) + 1 AS next_order FROM content_schedule WHERE slot_id = $1 FOR UPDATE`,
                [slotId],
            );
            const nextOrder = orderResult.rows[0].next_order;

            await client.query(
                `INSERT INTO content_schedule (content_id, slot_id, rotation_order, duration) 
                 VALUES ($1, $2, $3, $4)`,
                [contentId, slotId, nextOrder, duration],
            );

            await client.query('COMMIT');

            return {
                message: 'Content uploaded successfully and is pending approval',
                contentId,
            };
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }
}
