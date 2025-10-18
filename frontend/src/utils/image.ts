export function resolveImageUrl(imagePath: string | null | undefined): string | null {
  if (!imagePath) return null;
  // If already a full URL (http/https), return as-is
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    // Handle GitHub "blob" UI links like:
    // https://github.com/PersuasivePost/art-with-sucha-images/blob/main/sections/91a34cc8-....jpeg
    // Convert them to backend proxy URLs: <backend>/api/github-image/sections/....jpeg
    try {
      const u = new URL(imagePath);
      // raw.githubusercontent.com is already a raw image host - return as-is
      if (u.hostname === 'raw.githubusercontent.com') return imagePath;

      if (u.hostname === 'github.com') {
        // look for '/blob/' in pathname
        const blobIndex = u.pathname.indexOf('/blob/');
        if (blobIndex !== -1) {
          // extract the path after /blob/<branch>/... -> remove branch segment
          const afterBlob = u.pathname.substring(blobIndex + '/blob/'.length); // e.g. 'main/sections/xxx.jpeg'
          const parts = afterBlob.split('/');
          if (parts.length >= 2) {
            parts.shift(); // drop branch name
            const repoPath = parts.join('/');
            const configuredBackend = (import.meta.env.VITE_BACKEND_URL as string) || 'https://art-with-sucha.onrender.com';
            let backendOrigin = configuredBackend || 'https://art-with-sucha.onrender.com';
            backendOrigin = backendOrigin.replace(/\/$/, '');
            backendOrigin = backendOrigin.replace(/\/api\/github-image\/?$/i, '');
            return `${backendOrigin}/api/github-image/${repoPath}`;
          }
        }
      }
    } catch (e) {
      // fallthrough to return as-is
      console.debug('resolveImageUrl: failed to parse URL', e);
    }

    return imagePath;
  }

  // Normalize backend origin - ALWAYS use backend, never frontend origin
  const configuredBackend = (import.meta.env.VITE_BACKEND_URL as string) || 'https://art-with-sucha.onrender.com';
  // Remove any trailing '/api/github-image' that might be accidentally configured
  let backendOrigin = configuredBackend || 'https://art-with-sucha.onrender.com';
  backendOrigin = backendOrigin.replace(/\/$/, '');
  backendOrigin = backendOrigin.replace(/\/api\/github-image\/?$/i, '');

  // Strip leading slashes from imagePath
  let stripped = imagePath.replace(/^\/+/, '');

  // If imagePath already begins with the proxy prefix, remove it and re-add exactly once below
  if (stripped.startsWith('api/github-image/')) {
    stripped = stripped.substring('api/github-image/'.length);
    return `${backendOrigin}/api/github-image/${stripped}`;
  }

  // If imagePath begins with 'image/' or 'products/' or 'sections/' treat appropriately
  if (stripped.startsWith('image/') || stripped.startsWith('products/') || stripped.startsWith('sections/')) {
    // If it's an explicit /image redirect path (starting with image/), use /image/:key
    if (stripped.startsWith('image/')) {
      const key = stripped.substring('image/'.length);
      return `${backendOrigin}/image/${encodeURIComponent(key)}`;
    }

    // For storage keys (products/... or sections/...), use the backend proxy
    return `${backendOrigin}/api/github-image/${stripped}`;
  }

  // Fallback: treat as a raw key and use /image/:key
  return `${backendOrigin}/image/${encodeURIComponent(stripped)}`;
}
