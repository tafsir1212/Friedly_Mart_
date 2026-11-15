import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';
import { extname, posix } from 'path';

@Injectable()
export class SupabaseStorageService {
  readonly isProduction: boolean;
  private readonly client: SupabaseClient | null;
  private readonly bucketName: string | null;
  private readonly nidBucketName: string | null;
  private nidBucketPrivacyCheck: Promise<void> | null = null;

  constructor(config: ConfigService) {
    this.isProduction = config.get<string>('NODE_ENV') === 'production';

    if (!this.isProduction) {
      this.client = null;
      this.bucketName = null;
      this.nidBucketName = null;
      return;
    }

    const url = this.requireConfig(config, 'SUPABASE_URL');
    const serviceRoleKey = this.requireConfig(
      config,
      'SUPABASE_SERVICE_ROLE_KEY',
    );
    this.bucketName = this.requireConfig(config, 'SUPABASE_STORAGE_BUCKET');
    this.nidBucketName = this.requireConfig(config, 'SUPABASE_NID_BUCKET');
    if (this.bucketName === this.nidBucketName) {
      throw new Error(
        'SUPABASE_NID_BUCKET must be separate from the public image bucket',
      );
    }
    this.client = createClient(url, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  async storeImage(
    file: Express.Multer.File,
    folder: string,
  ): Promise<{ filename: string; publicUrl?: string }> {
    return this.storeImageInBucket(file, folder, this.bucketName);
  }

  async storeNidImage(file: Express.Multer.File): Promise<{ filename: string }> {
    if (!this.isProduction) {
      if (!file.filename) {
        throw new InternalServerErrorException(
          'Local upload did not produce a filename',
        );
      }

      return { filename: file.filename };
    }

    await this.ensureNidBucketIsPrivate();
    const stored = await this.storeImageInBucket(file, '', this.nidBucketName);
    return { filename: stored.filename };
  }

  private async storeImageInBucket(
    file: Express.Multer.File,
    folder: string,
    bucketName: string | null,
  ): Promise<{ filename: string; publicUrl?: string }> {
    if (!this.isProduction) {
      if (!file.filename) {
        throw new InternalServerErrorException(
          'Local upload did not produce a filename',
        );
      }

      return { filename: file.filename };
    }

    if (!file.buffer || !this.client || !bucketName) {
      throw new InternalServerErrorException(
        'Image upload is not configured correctly',
      );
    }

    const extension = posix.extname(file.originalname.replace(/\\/g, '/'));
    const filename = `${randomUUID()}${extension.toLowerCase()}`;
    const objectPath = folder ? posix.join(folder, filename) : filename;
    const { error } = await this.client.storage
      .from(bucketName)
      .upload(objectPath, file.buffer, {
        contentType: file.mimetype,
        upsert: false,
        cacheControl: '3600',
      });

    if (error) {
      throw new InternalServerErrorException(
        'Supabase Storage image upload failed',
        { cause: error },
      );
    }

    return {
      filename,
      publicUrl:
        bucketName === this.bucketName
          ? this.getPublicUrl(objectPath)
          : undefined,
    };
  }

  getPublicUrl(requestedPath: string): string | undefined {
    const objectPath = this.normalizeObjectPath(requestedPath);
    if (
      !objectPath ||
      !objectPath.includes('/') ||
      !this.client ||
      !this.bucketName
    ) {
      return undefined;
    }

    return this.client.storage
      .from(this.bucketName)
      .getPublicUrl(objectPath).data.publicUrl;
  }

  async getNidSignedUrl(filename: string): Promise<string> {
    const objectPath = this.normalizeObjectPath(filename);
    if (
      !objectPath ||
      objectPath.includes('/') ||
      !this.client ||
      !this.nidBucketName
    ) {
      throw new NotFoundException('Seller NID image not found');
    }

    await this.ensureNidBucketIsPrivate();
    const { data, error } = await this.client.storage
      .from(this.nidBucketName)
      .createSignedUrl(objectPath, 300);
    if (error || !data?.signedUrl) {
      throw new NotFoundException('Seller NID image is unavailable');
    }

    return data.signedUrl;
  }

  private async ensureNidBucketIsPrivate(): Promise<void> {
    if (!this.client || !this.nidBucketName) {
      throw new InternalServerErrorException(
        'Private seller NID storage is not configured',
      );
    }

    if (!this.nidBucketPrivacyCheck) {
      this.nidBucketPrivacyCheck = this.client.storage
        .listBuckets()
        .then(({ data, error }) => {
          if (error) {
            throw new InternalServerErrorException(
              'Unable to verify seller NID bucket privacy',
              { cause: error },
            );
          }

          const bucket = data.find(
            (candidate) => candidate.name === this.nidBucketName,
          );
          if (!bucket || bucket.public) {
            throw new InternalServerErrorException(
              'SUPABASE_NID_BUCKET must exist and be private',
            );
          }
        });
    }

    await this.nidBucketPrivacyCheck;
  }

  private requireConfig(config: ConfigService, name: string): string {
    const value = config.get<string>(name)?.trim();
    if (!value) {
      throw new Error(`${name} is required when NODE_ENV is production`);
    }
    return value;
  }

  private normalizeObjectPath(requestedPath: string): string | undefined {
    let decodedPath: string;
    try {
      decodedPath = decodeURIComponent(requestedPath);
    } catch {
      return undefined;
    }

    if (decodedPath.includes('\\') || decodedPath.startsWith('/')) {
      return undefined;
    }

    const segments = decodedPath.split('/');
    if (
      segments.length === 0 ||
      segments.some(
        (segment) =>
          segment.length === 0 || segment === '.' || segment === '..',
      )
    ) {
      return undefined;
    }

    return segments.join('/');
  }
}
