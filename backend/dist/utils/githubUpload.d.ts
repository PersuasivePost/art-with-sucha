/**
 * Upload a single file to GitHub repository
 */
export declare function uploadFileToGitHub(file: Express.Multer.File, folder: 'sections' | 'products'): Promise<{
    key: string;
    url: string;
    metadata: any;
}>;
/**
 * Upload multiple files to GitHub repository
 */
export declare function uploadMultipleFilesToGitHub(files: Express.Multer.File[], folder: 'sections' | 'products'): Promise<Array<{
    key: string;
    url: string;
    metadata: any;
}>>;
/**
 * Delete a file from GitHub repository
 */
export declare function deleteFileFromGitHub(filePath: string): Promise<void>;
/**
 * Generate authenticated URL for GitHub-hosted image (private repo support)
 * Returns a backend proxy URL that will fetch from GitHub with authentication
 */
export declare function getGitHubImageUrl(key: string): string;
//# sourceMappingURL=githubUpload.d.ts.map