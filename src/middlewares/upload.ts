import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { Request, Response, NextFunction } from 'express';

const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const DEFAULT_SIZE_LIMIT = (Number(process.env.FILE_SIZE_LIMIT) || 10) * 1024 * 1024;

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, `${file.fieldname}-${uniqueSuffix}${path.extname(file.originalname)}`);
    },
});

const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif'];

    if (allowedMimeTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('INVALID_FILE_TYPE'));
    }
};

const rawUpload = multer({
    storage,
    limits: { fileSize: DEFAULT_SIZE_LIMIT },
    fileFilter,
});

/**
 * File upload middleware manufacturer using Multer.
 *
 * Handles single file uploads, enforcing designated maximum file sizes and image MIME type validations.
 * Integrates error handling to ensure clients receive structured JSON error responses rather than HTML dumps.
 *
 * @param fieldName - The form-data key expected to hold the file.
 * @returns Express middleware function.
 */
export const uploadMiddleware = (fieldName: string) => {
    return (req: Request, res: Response, next: NextFunction) => {
        const uploadSingle = rawUpload.single(fieldName);

        uploadSingle(req, res, (err) => {
            if (err instanceof multer.MulterError) {
                return res.status(400).json({ error: `Upload error: ${err.message}` });
            } else if (err) {
                if (err.message === 'INVALID_FILE_TYPE') {
                    return res
                        .status(400)
                        .json({ error: 'Invalid file type. Only JPG, PNG, and GIF are allowed.' });
                }
                return res.status(400).json({ error: `Unknown upload error: ${err.message}` });
            }

            next();
        });
    };
};
