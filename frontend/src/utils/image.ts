export function resolveImageUrl(imagePath: string | null | undefined): string | null {
  if (!imagePath) return null;
  // If already a full URL (http/https), return as-is
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) return imagePath;

  // Normalize backend origin (prefer configured VITE_BACKEND_URL, fallback to window origin)
  const configuredBackend = (import.meta.env.VITE_BACKEND_URL as string) || '';
  // Remove any trailing '/api/github-image' that might be accidentally configured
  let backendOrigin = (configuredBackend || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5000'));
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
