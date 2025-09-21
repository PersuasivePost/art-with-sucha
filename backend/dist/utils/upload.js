import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
// Initialize S3 client for Backblaze B2
const s3Client = new S3Client({
    region: process.env.B2_REGION || 'us-west-004',
    endpoint: process.env.B2_ENDPOINT || '',
    credentials: {
        accessKeyId: process.env.B2_APPLICATION_KEY_ID || '',
        secretAccessKey: process.env.B2_APPLICATION_KEY || '',
    },
    forcePathStyle: true, // Required for B2
});
/**
 * Upload a single file to Backblaze B2
 */
export async function uploadFileToB2(file, folder) {
    try {
        // Generate unique file key
        const fileExtension = path.extname(file.originalname);
        const fileName = `${uuidv4()}${fileExtension}`;
        const key = `${folder}/${fileName}`;
        // Upload to B2
        const command = new PutObjectCommand({
            Bucket: process.env.B2_BUCKET_NAME || '',
            Key: key,
            Body: file.buffer,
            ContentType: file.mimetype,
            Metadata: {
                originalName: file.originalname,
                uploadedAt: new Date().toISOString(),
            },
        });
        await s3Client.send(command);
        // Generate public URL (won't work for private bucket, but we'll use signed URLs)
        const url = `${process.env.B2_ENDPOINT}/${process.env.B2_BUCKET_NAME}/${key}`;
        return {
            key,
            url,
            metadata: {
                originalName: file.originalname,
                size: file.size,
                mimeType: file.mimetype,
                uploadedAt: new Date().toISOString(),
            },
        };
    }
    catch (error) {
        console.error('Error uploading file to B2:', error);
        throw new Error('Failed to upload file');
    }
}
/**
 * Upload multiple files to Backblaze B2
 */
export async function uploadMultipleFilesToB2(files, folder) {
    const uploadPromises = files.map(file => uploadFileToB2(file, folder));
    return Promise.all(uploadPromises);
}
/**
 * Generate signed URL for private bucket access
 */
export async function generateSignedUrl(key, expiresIn = 3600) {
    try {
        const command = new GetObjectCommand({
            Bucket: process.env.B2_BUCKET_NAME || '',
            Key: key,
        });
        const signedUrl = await getSignedUrl(s3Client, command, { expiresIn });
        return signedUrl;
    }
    catch (error) {
        console.error('Error generating signed URL:', error);
        throw new Error('Failed to generate signed URL');
    }
}
/**
 * Get signed URLs for multiple keys
 */
export async function generateMultipleSignedUrls(keys, expiresIn = 3600) {
    const urlPromises = keys.map(key => generateSignedUrl(key, expiresIn));
    return Promise.all(urlPromises);
}
//# sourceMappingURL=upload.js.map