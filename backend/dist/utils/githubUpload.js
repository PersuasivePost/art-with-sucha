import { Octokit } from '@octokit/rest';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
// Initialize Octokit client for GitHub API
const getOctokit = () => {
    const token = process.env.GITHUB_TOKEN;
    if (!token) {
        throw new Error('GITHUB_TOKEN is not configured in environment variables');
    }
    return new Octokit({ auth: token });
};
/**
 * Upload a single file to GitHub repository
 */
export async function uploadFileToGitHub(file, folder) {
    try {
        const octokit = getOctokit();
        const owner = process.env.GITHUB_REPO_OWNER || '';
        const repo = process.env.GITHUB_REPO_NAME || '';
        const branch = process.env.GITHUB_REPO_BRANCH || 'main';
        if (!owner || !repo) {
            throw new Error('GitHub repository configuration is incomplete');
        }
        // Generate unique file key
        const fileExtension = path.extname(file.originalname);
        const fileName = `${uuidv4()}${fileExtension}`;
        const filePath = `${folder}/${fileName}`;
        // Convert buffer to base64 for GitHub API
        const contentBase64 = file.buffer.toString('base64');
        // Create commit message
        const commitMessage = `Add ${folder} image: ${file.originalname}`;
        // Upload file to GitHub
        const response = await octokit.repos.createOrUpdateFileContents({
            owner,
            repo,
            path: filePath,
            message: commitMessage,
            content: contentBase64,
            branch,
        });
        // Generate raw GitHub URL for the image
        const url = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${filePath}`;
        console.log(`✅ Uploaded ${filePath} to GitHub successfully`);
        return {
            key: filePath,
            url,
            metadata: {
                originalName: file.originalname,
                size: file.size,
                mimeType: file.mimetype,
                uploadedAt: new Date().toISOString(),
                sha: response.data.content?.sha,
            },
        };
    }
    catch (error) {
        console.error('Error uploading file to GitHub:', error);
        if (error.status === 401) {
            throw new Error('GitHub authentication failed. Check your GITHUB_TOKEN');
        }
        if (error.status === 404) {
            throw new Error('GitHub repository not found. Check GITHUB_REPO_OWNER and GITHUB_REPO_NAME');
        }
        throw new Error(`Failed to upload file to GitHub: ${error.message}`);
    }
}
/**
 * Upload multiple files to GitHub repository
 */
export async function uploadMultipleFilesToGitHub(files, folder) {
    // Upload files sequentially to avoid rate limiting
    const results = [];
    for (const file of files) {
        const result = await uploadFileToGitHub(file, folder);
        results.push(result);
    }
    return results;
}
/**
 * Delete a file from GitHub repository
 */
export async function deleteFileFromGitHub(filePath) {
    try {
        const octokit = getOctokit();
        const owner = process.env.GITHUB_REPO_OWNER || '';
        const repo = process.env.GITHUB_REPO_NAME || '';
        const branch = process.env.GITHUB_REPO_BRANCH || 'main';
        // Get the current file to retrieve its SHA (required for deletion)
        const fileData = await octokit.repos.getContent({
            owner,
            repo,
            path: filePath,
            ref: branch,
        });
        if ('sha' in fileData.data) {
            await octokit.repos.deleteFile({
                owner,
                repo,
                path: filePath,
                message: `Delete image: ${filePath}`,
                sha: fileData.data.sha,
                branch,
            });
            console.log(`🗑️  Deleted ${filePath} from GitHub successfully`);
        }
    }
    catch (error) {
        console.error('Error deleting file from GitHub:', error);
        // Don't throw error if file doesn't exist
        if (error.status !== 404) {
            throw new Error(`Failed to delete file from GitHub: ${error.message}`);
        }
    }
}
/**
 * Generate authenticated URL for GitHub-hosted image (private repo support)
 * Returns a backend proxy URL that will fetch from GitHub with authentication
 */
export function getGitHubImageUrl(key) {
    const owner = process.env.GITHUB_REPO_OWNER || '';
    const repo = process.env.GITHUB_REPO_NAME || '';
    const branch = process.env.GITHUB_REPO_BRANCH || 'main';
    // If the key is already a proxy path or a full URL, return as-is
    if (!key)
        return '';
    if (key.startsWith('http://') || key.startsWith('https://'))
        return key;
    if (key.startsWith('/api/github-image') || key.startsWith('/image') || key.startsWith('/')) {
        // already a proxy path or already starts with slash
        return key;
    }
    // For private repos, return backend proxy endpoint for the given key
    return `/api/github-image/${key}`;
}
//# sourceMappingURL=githubUpload.js.map