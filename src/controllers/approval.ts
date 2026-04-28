import { Request, Response } from 'express';
import { ApprovalService } from '../services/approval.js';

export class ApprovalController {
    static async getPending(req: Request, res: Response) {
        try {
            const pendingContent = await ApprovalService.getPendingContent();
            return res.status(200).json({ data: pendingContent });
        } catch (error) {
            console.error('[ApprovalController.getPending]', error);
            return res.status(500).json({ error: 'Failed to fetch pending content' });
        }
    }

    static async review(req: Request, res: Response) {
        try {
            const principalId = req.user!.id;
            const contentId = parseInt(req.params.id as string, 10);
            const { status, rejection_reason } = req.body;

            if (isNaN(contentId)) {
                return res.status(400).json({ error: 'Invalid content ID' });
            }

            if (!['approved', 'rejected'].includes(status)) {
                return res.status(400).json({ error: 'Status must be approved or rejected' });
            }

            const result = await ApprovalService.reviewContent(
                contentId,
                principalId,
                status,
                rejection_reason,
            );

            return res.status(200).json({
                message: `Content successfully ${status}`,
                data: result,
            });
        } catch (error: any) {
            if (error.message === 'REJECTION_REASON_REQUIRED') {
                return res.status(400).json({ error: 'Rejection reason is mandatory' });
            }
            if (error.message === 'CONTENT_NOT_FOUND_OR_NOT_PENDING') {
                return res.status(404).json({ error: 'Content not found or already reviewed' });
            }
            console.error('[ApprovalController.review]', error);
            return res.status(500).json({ error: 'Internal server error during review process' });
        }
    }
}
