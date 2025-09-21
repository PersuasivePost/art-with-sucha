/**
 * Upload a single file to Backblaze B2
 */
export declare function uploadFileToB2(file: Express.Multer.File, folder: 'sections' | 'products'): Promise<{
    key: string;
    url: string;
    metadata: any;
}>;
/**
 * Upload multiple files to Backblaze B2
 */
export declare function uploadMultipleFilesToB2(files: Express.Multer.File[], folder: 'sections' | 'products'): Promise<Array<{
    key: string;
    url: string;
    metadata: any;
}>>;
/**
 * Generate signed URL for private bucket access
 */
export declare function generateSignedUrl(key: string, expiresIn?: number): Promise<string>;
/**
 * Get signed URLs for multiple keys
 */
export declare function generateMultipleSignedUrls(keys: string[], expiresIn?: number): Promise<string[]>;
//# sourceMappingURL=upload.d.ts.map