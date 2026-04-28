import { Request, Response } from 'express';
import { ContentService } from '../services/content.js';

export class ContentController {
    static async upload(req: Request, res: Response) {
        try {
            const teacherId = req.user!.id;

            const file = req.file;
            if (!file) {
                return res.status(400).json({ error: 'File is required' });
            }

            const { title, description, subject, start_time, end_time, duration } = req.body;

            if (!title || !subject) {
                return res.status(400).json({ error: 'Title and subject are mandatory' });
            }

            const fileUrl = `/uploads/${file.filename}`;
            const parsedDuration = duration ? parseInt(duration, 10) : undefined;
            if (parsedDuration !== undefined && isNaN(parsedDuration)) {
                return res.status(400).json({ error: 'Duration must be a valid integer' });
            }

            const result = await ContentService.uploadContent({
                teacherId,
                title,
                description,
                subject,
                fileUrl,
                fileType: file.mimetype,
                fileSize: file.size,
                startTime: start_time,
                endTime: end_time,
                duration: parsedDuration,
            });

            return res.status(201).json(result);
        } catch (error) {
            console.error('[ContentController.upload]', error);
            return res.status(500).json({ error: 'Internal server error during upload' });
        }
    }
}
