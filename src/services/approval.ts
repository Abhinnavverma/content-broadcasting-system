import { pool } from '../config/db.js';

export class ApprovalService {
    static async getPendingContent() {
        const result = await pool.query(
            `SELECT c.id, c.title, c.description, c.subject, c.file_url, c.start_time, c.end_time, u.name as teacher_name
             FROM content c
             JOIN users u ON c.uploaded_by = u.id
             WHERE c.status = 'pending'
             ORDER BY c.created_at ASC`,
        );
        return result.rows;
    }

    static async reviewContent(
        contentId: number,
        principalId: number,
        status: 'approved' | 'rejected',
        rejectionReason?: string,
    ) {
        if (status === 'rejected' && !rejectionReason) {
            throw new Error('REJECTION_REASON_REQUIRED');
        }

        const result = await pool.query(
            `UPDATE content 
             SET status = $1, 
                 rejection_reason = $2, 
                 approved_by = $3, 
                 approved_at = NOW()
             WHERE id = $4 AND status = 'pending'
             RETURNING id, title, status`,
            [status, status === 'rejected' ? rejectionReason : null, principalId, contentId],
        );

        if (result.rows.length === 0) {
            throw new Error('CONTENT_NOT_FOUND_OR_NOT_PENDING');
        }

        return result.rows[0];
    }
}
