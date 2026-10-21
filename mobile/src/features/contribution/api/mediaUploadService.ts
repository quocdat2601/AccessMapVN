import { Platform } from 'react-native';
import { resolveServiceUrl } from '@/shared/api/client';

export interface MediaUploadResponse {
  url: string;
  relativeUrl: string;
  fileName: string;
  size: number;
}

/**
 * Uploads a local photo (from camera capture or picker) to the backend.
 * Uses base64 if available, or multipart FormData as fallback.
 * Returns the public URL served by the backend.
 */
export async function uploadMediaToBackend(
  uri: string,
  base64?: string
): Promise<string> {
  const baseUrl = resolveServiceUrl(5256, process.env.EXPO_PUBLIC_API_URL);

  // 1. If base64 is available, upload directly via JSON (fastest and most reliable on RN)
  if (base64) {
    try {
      const fileName = uri.split('/').pop() || `photo_${Date.now()}.jpg`;
      const response = await fetch(`${baseUrl}/api/v1/media/upload-base64`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          fileName,
          base64Data: base64,
        }),
      });

      if (response.ok) {
        const data = (await response.json()) as MediaUploadResponse;
        if (data.url) return data.url;
      }
    } catch (e) {
      console.warn('[uploadMediaToBackend] Base64 upload failed, trying FormData fallback', e);
    }
  }

  // 2. FormData fallback
  try {
    const formData = new FormData();
    const cleanUri = Platform.OS === 'android' ? uri : uri.replace('file://', '');
    const fileName = uri.split('/').pop() || `photo_${Date.now()}.jpg`;

    formData.append('file', {
      uri: cleanUri,
      name: fileName,
      type: uri.endsWith('.png') ? 'image/png' : 'image/jpeg',
    } as any);

    const response = await fetch(`${baseUrl}/api/v1/media/upload`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
      },
      body: formData,
    });

    if (response.ok) {
      const data = (await response.json()) as MediaUploadResponse;
      if (data.url) return data.url;
    }
  } catch (e) {
    console.warn('[uploadMediaToBackend] FormData upload failed', e);
  }

  // Fallback: return original uri if server upload failed
  return uri;
}
