import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { productionImageLimits } from './multer-storage';
import { SupabaseStorageService } from './supabase-storage.service';

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(),
}));

describe('SupabaseStorageService', () => {
  const upload = jest.fn();
  const getPublicUrl = jest.fn();
  const createSignedUrl = jest.fn();
  const from = jest.fn(() => ({ upload, getPublicUrl, createSignedUrl }));
  const listBuckets = jest.fn();
  const client = {
    storage: { from, listBuckets },
  } as unknown as SupabaseClient;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(createClient).mockReturnValue(client);
    upload.mockResolvedValue({ error: null });
    getPublicUrl.mockImplementation((path: string) => ({
      data: { publicUrl: `https://storage.example/${path}` },
    }));
    createSignedUrl.mockResolvedValue({
      data: { signedUrl: 'https://storage.example/signed/nid.png' },
      error: null,
    });
    listBuckets.mockResolvedValue({
      data: [{ name: 'private-nid', public: false }],
      error: null,
    });
  });

  it('uploads to a unique object path and returns its public URL', async () => {
    const service = new SupabaseStorageService(
      new ConfigService({
        NODE_ENV: 'production',
        SUPABASE_URL: 'https://project.example',
        SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key',
        SUPABASE_STORAGE_BUCKET: 'test-images',
        SUPABASE_NID_BUCKET: 'private-nid',
      }),
    );
    const file = {
      originalname: 'product.JPG',
      mimetype: 'image/jpeg',
      buffer: Buffer.from('image'),
    } as Express.Multer.File;

    const stored = await service.storeImage(file, 'products');

    expect(stored.filename).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.jpg$/i,
    );
    expect(stored.publicUrl).toBe(
      `https://storage.example/products/${stored.filename}`,
    );
    expect(upload).toHaveBeenCalledWith(
      `products/${stored.filename}`,
      file.buffer,
      expect.objectContaining({
        contentType: 'image/jpeg',
        upsert: false,
      }),
    );
  });

  it('stores NID images in the separate private bucket without public URLs', async () => {
    const service = new SupabaseStorageService(
      new ConfigService({
        NODE_ENV: 'production',
        SUPABASE_URL: 'https://project.example',
        SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key',
        SUPABASE_STORAGE_BUCKET: 'public-images',
        SUPABASE_NID_BUCKET: 'private-nid',
      }),
    );
    const file = {
      originalname: 'nid.png',
      mimetype: 'image/png',
      buffer: Buffer.from('image'),
    } as Express.Multer.File;

    const stored = await service.storeNidImage(file);

    expect(stored.filename).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.png$/i,
    );
    expect(from).toHaveBeenCalledWith('private-nid');
    expect(listBuckets).toHaveBeenCalledTimes(1);
    expect(upload).toHaveBeenCalledWith(
      stored.filename,
      file.buffer,
      expect.objectContaining({ upsert: false }),
    );
    expect(getPublicUrl).not.toHaveBeenCalled();
    expect(service.getPublicUrl(stored.filename)).toBeUndefined();
  });

  it('creates short-lived signed URLs only from the private NID bucket', async () => {
    const service = new SupabaseStorageService(
      new ConfigService({
        NODE_ENV: 'production',
        SUPABASE_URL: 'https://project.example',
        SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key',
        SUPABASE_STORAGE_BUCKET: 'public-images',
        SUPABASE_NID_BUCKET: 'private-nid',
      }),
    );

    await expect(service.getNidSignedUrl('nid.png')).resolves.toBe(
      'https://storage.example/signed/nid.png',
    );
    expect(from).toHaveBeenCalledWith('private-nid');
    expect(listBuckets).toHaveBeenCalledTimes(1);
    expect(createSignedUrl).toHaveBeenCalledWith('nid.png', 300);
  });

  it('refuses NID access when its bucket is public', async () => {
    listBuckets.mockResolvedValue({
      data: [{ name: 'private-nid', public: true }],
      error: null,
    });
    const service = new SupabaseStorageService(
      new ConfigService({
        NODE_ENV: 'production',
        SUPABASE_URL: 'https://project.example',
        SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key',
        SUPABASE_STORAGE_BUCKET: 'public-images',
        SUPABASE_NID_BUCKET: 'private-nid',
      }),
    );

    await expect(service.getNidSignedUrl('nid.png')).rejects.toThrow(
      'SUPABASE_NID_BUCKET must exist and be private',
    );
    expect(createSignedUrl).not.toHaveBeenCalled();
  });

  it('keeps local filenames and rejects unsafe storage paths', async () => {
    const service = new SupabaseStorageService(
      new ConfigService({ NODE_ENV: 'development' }),
    );

    await expect(
      service.storeImage(
        { filename: 'legacy.jpg' } as Express.Multer.File,
        'profile',
      ),
    ).resolves.toEqual({ filename: 'legacy.jpg' });
    expect(service.getPublicUrl('../legacy.jpg')).toBeUndefined();
    await expect(service.getNidSignedUrl('../nid.png')).rejects.toThrow();
    expect(createClient).not.toHaveBeenCalled();
  });
});

describe('productionImageLimits', () => {
  const originalNodeEnv = process.env.NODE_ENV;

  afterEach(() => {
    if (originalNodeEnv === undefined) {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = originalNodeEnv;
    }
  });

  it('limits production profile uploads to 2 MiB', () => {
    process.env.NODE_ENV = 'production';
    expect(productionImageLimits()).toEqual({ fileSize: 2 * 1024 * 1024 });
  });

  it('leaves local development uploads unlimited', () => {
    process.env.NODE_ENV = 'development';
    expect(productionImageLimits()).toBeUndefined();
  });
});
