/**
 * Storage Adapter - Unified interface for file uploads
 * Automatically switches between GitHub and Backblaze based on configuration
 */

import { uploadFileToB2, uploadMultipleFilesToB2, generateSignedUrl } from './upload.js';
import { 
  uploadFileToGitHub, 
  uploadMultipleFilesToGitHub, 
  getGitHubImageUrl 
} from './githubUpload.js';

// Determine which storage to use based on environment variable
const useGitHub = process.env.USE_GITHUB_STORAGE === 'true';

console.log(`🔧 Storage Mode: ${useGitHub ? 'GitHub' : 'Backblaze B2'}`);

/**
 * Upload a single file to the configured storage
 */
export async function uploadFile(
  file: Express.Multer.File,
  folder: 'sections' | 'products'
): Promise<{ key: string; url: string; metadata: any }> {
  if (useGitHub) {
    return await uploadFileToGitHub(file, folder);
  } else {
    return await uploadFileToB2(file, folder);
  }
}

/**
 * Upload multiple files to the configured storage
 */
export async function uploadMultipleFiles(
  files: Express.Multer.File[],
  folder: 'sections' | 'products'
): Promise<Array<{ key: string; url: string; metadata: any }>> {
  if (useGitHub) {
    return await uploadMultipleFilesToGitHub(files, folder);
  } else {
    return await uploadMultipleFilesToB2(files, folder);
  }
}

/**
 * Get public URL for an image
 * For Backblaze: generates signed URL
 * For GitHub: returns raw GitHub URL
 */
export async function getImageUrl(key: string, expiresIn: number = 3600): Promise<string> {
  if (useGitHub) {
    return getGitHubImageUrl(key);
  } else {
    return await generateSignedUrl(key, expiresIn);
  }
}

/**
 * Get multiple image URLs
 */
export async function getMultipleImageUrls(
  keys: string[],
  expiresIn: number = 3600
): Promise<string[]> {
  if (useGitHub) {
    return keys.map(key => getGitHubImageUrl(key));
  } else {
    const urlPromises = keys.map(key => generateSignedUrl(key, expiresIn));
    return Promise.all(urlPromises);
  }
}

/**
 * Check if currently using GitHub storage
 */
export function isUsingGitHub(): boolean {
  return useGitHub;
}

/**
 * Get storage type for logging/debugging
 */
export function getStorageType(): 'github' | 'backblaze' {
  return useGitHub ? 'github' : 'backblaze';
}
