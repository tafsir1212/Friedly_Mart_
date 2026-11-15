import { diskStorage, memoryStorage } from 'multer';

export function createUploadStorage(
  localOptions: Parameters<typeof diskStorage>[0],
): ReturnType<typeof diskStorage> {
  return process.env.NODE_ENV === 'production'
    ? memoryStorage()
    : diskStorage(localOptions);
}

export function productionImageLimits() {
  return process.env.NODE_ENV === 'production'
    ? { fileSize: 2 * 1024 * 1024 }
    : undefined;
}
