import { pool } from '../config/db.js';

/**
 * Manages the approval queue and state transitions for uploaded content.
 */
export class ApprovalService {
    /**
     * Retrieves paginated content pending administrative review.
     *
     * @param page - Target page index (1-based).
     * @param limit - Maximum number of records per page.
     * @returns Array of pending content rows attached to their uploader's name.
     */
    static async getPendingContent(page: number = 1, limit: number = 10) {
        const offset = (page - 1) * limit;

        const result = await pool.query(
            `SELECT c.id, c.title, c.description, c.subject, c.file_url, c.start_time, c.end_time, u.name as teacher_name
             FROM content c
             JOIN users u ON c.uploaded_by = u.id
             WHERE c.status = 'pending'
             ORDER BY c.created_at ASC
             LIMIT $1 OFFSET $2`,
            [limit, offset],
        );
        return result.rows;
    }

    /**
     * Transitions content state using optimistic concurrency control.
     *
     * Targets only rows currently marked as 'pending' mapping the state safely.
     *
     * @param contentId - Target record ID.
     * @param principalId - ID of the reviewing administrator.
     * @param status - The final decision ('approved' or 'rejected').
     * @param rejectionReason - Required text rationale if the status is 'rejected'.
     * @throws Error if content is missing, already processed, or lacks required rejection rationale.
     */
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
