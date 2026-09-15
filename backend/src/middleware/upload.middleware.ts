import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { env } from '../config/env';
import { AppError } from '../utils/response';

const ALLOWED = new Set([
  '.png', '.jpg', '.jpeg', '.webp', '.pdf', '.psd', '.ai', '.fig', '.zip',
]);

const uploadDir = path.resolve(env.upload.dir);
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const base = path.basename(file.originalname, ext).replace(/[^a-z0-9-_]/gi, '_');
    cb(null, `${Date.now()}_${base}${ext}`);
  },
});

/** Multer instance with type + size validation for design uploads. */
export const upload = multer({
  storage,
  limits: { fileSize: env.upload.maxSizeMb * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED.has(ext)) {
      return cb(new AppError(400, `Unsupported file type "${ext}".`, 'INVALID_FILE'));
    }
    cb(null, true);
  },
});
