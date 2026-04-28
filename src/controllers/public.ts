import { Request, Response } from 'express';
import { SchedulingService } from '../services/scheduling.js';

export class PublicController {
    static async getLiveContent(req: Request, res: Response) {
        try {
            const teacherId = parseInt(req.params.teacher_id as string, 10);
            const subjectFilter = req.query.subject as string | undefined;

            if (isNaN(teacherId)) {
                return res.status(200).json({});
            }

            const activeContent = await SchedulingService.getActiveContent(
                teacherId,
                subjectFilter,
            );

            if (!activeContent || activeContent.length === 0) {
                return res.status(200).json({});
            }

            if (subjectFilter && activeContent.length === 1) {
                return res.status(200).json(activeContent[0]);
            }

            return res.status(200).json({ data: activeContent });
        } catch (error) {
            console.error('[PublicController.getLiveContent]', error);
            return res
                .status(500)
                .json({ error: 'Internal server error while fetching live content' });
        }
    }
}
