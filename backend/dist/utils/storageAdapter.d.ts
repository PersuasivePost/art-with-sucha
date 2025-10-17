/**
 * Storage Adapter - Unified interface for file uploads
 * Automatically switches between GitHub and Backblaze based on configuration
 */
/**
 * Upload a single file to the configured storage
 */
export declare function uploadFile(file: Express.Multer.File, folder: 'sections' | 'products'): Promise<{
    key: string;
    url: string;
    metadata: any;
}>;
/**
 * Upload multiple files to the configured storage
 */
export declare function uploadMultipleFiles(files: Express.Multer.File[], folder: 'sections' | 'products'): Promise<Array<{
    key: string;
    url: string;
    metadata: any;
}>>;
/**
 * Get public URL for an image
 * For Backblaze: generates signed URL
 * For GitHub: returns raw GitHub URL
 */
export declare function getImageUrl(key: string, expiresIn?: number): Promise<string>;
/**
 * Get multiple image URLs
 */
export declare function getMultipleImageUrls(keys: string[], expiresIn?: number): Promise<string[]>;
/**
 * Check if currently using GitHub storage
 */
export declare function isUsingGitHub(): boolean;
/**
 * Get storage type for logging/debugging
 */
export declare function getStorageType(): 'github' | 'backblaze';
//# sourceMappingURL=storageAdapter.d.ts.map