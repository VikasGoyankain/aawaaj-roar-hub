/**
 * ImageKit upload utility (client-side via REST API)
 *
 * ⚠️  The private key is only used here server-side in a real production app.
 *     For this project the key is stored in VITE_IMAGEKIT_PRIVATE_KEY and
 *     used directly from the browser since there is no backend server.
 *     Keep this in mind when scaling.
 */

const UPLOAD_URL = 'https://upload.imagekit.io/api/v1/files/upload';

const getAuthHeader = (): string => {
  const key = import.meta.env.VITE_IMAGEKIT_PRIVATE_KEY as string;
  // ImageKit basic auth: base64(privateKey + ":")
  return 'Basic ' + btoa(`${key}:`);
};

export interface ImageKitUploadResult {
  url: string;         // CDN URL — save this to Supabase
  fileId: string;
  name: string;
  filePath: string;
  thumbnailUrl: string;
}

/**
 * Upload a File to ImageKit and return the result.
 * @param file     The File object to upload
 * @param fileName Desired file name (e.g., "avatar_userId.jpg")
 * @param folder   Folder path inside ImageKit (default: /aawaaj/avatars)
 */
export async function uploadToImageKit(
  file: File,
  fileName: string,
  folder = '/aawaaj/avatars'
): Promise<ImageKitUploadResult> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('fileName', fileName);
  formData.append('folder', folder);
  formData.append('useUniqueFileName', 'true');

  const res = await fetch(UPLOAD_URL, {
    method: 'POST',
    headers: { Authorization: getAuthHeader() },
    body: formData,
  });

  if (!res.ok) {
    let msg = `ImageKit upload failed (${res.status})`;
    try {
      const err = await res.json();
      msg = err.message || msg;
    } catch {
      // ignore JSON parse failure
    }
    throw new Error(msg);
  }

  return res.json() as Promise<ImageKitUploadResult>;
}
