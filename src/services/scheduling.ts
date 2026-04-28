import { pool } from '../config/db.js';

export class SchedulingService {
    static async getActiveContent(teacherId: number, subjectFilter?: string) {
        let query = `
            SELECT c.id, c.title, c.description, c.subject, c.file_url, c.file_type, 
                   cs.duration, cs.rotation_order
            FROM content c
            JOIN content_schedule cs ON c.id = cs.content_id
            WHERE c.uploaded_by = $1 
              AND c.status = 'approved'
              AND c.start_time IS NOT NULL 
              AND c.end_time IS NOT NULL
              AND NOW() >= c.start_time 
              AND NOW() <= c.end_time
        `;

        const params: any[] = [teacherId];

        if (subjectFilter) {
            query += ` AND LOWER(c.subject) = $2`;
            params.push(subjectFilter.toLowerCase().trim());
        }

        query += ` ORDER BY c.subject, cs.rotation_order ASC`;

        const result = await pool.query(query, params);
        const validItems = result.rows;

        if (validItems.length === 0) {
            return null;
        }

        const itemsBySubject: { [key: string]: any[] } = {};
        for (const item of validItems) {
            if (!itemsBySubject[item.subject]) {
                itemsBySubject[item.subject] = [];
            }
            itemsBySubject[item.subject].push(item);
        }

        const activeContent: any[] = [];
        const currentTimestampMs = Date.now();

        for (const subject in itemsBySubject) {
            const items = itemsBySubject[subject];

            const cycleTimeMs = items.reduce(
                (sum, item) => sum + Math.max(1, item.duration) * 60000,
                0,
            );

            if (cycleTimeMs === 0) {
                continue;
            }

            const offset = currentTimestampMs % cycleTimeMs;

            let runningSum = 0;
            for (const item of items) {
                runningSum += Math.max(1, item.duration) * 60000;
                if (offset < runningSum) {
                    activeContent.push({
                        id: item.id,
                        title: item.title,
                        description: item.description,
                        subject: item.subject,
                        file_url: item.file_url,
                        file_type: item.file_type,
                    });
                    break;
                }
            }
        }

        return activeContent;
    }
}
