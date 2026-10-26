import { Platform } from 'react-native';
import { supabase, isSupabaseConfigured } from '@/shared/lib/supabase';
import { resolveServiceUrl } from '@/shared/api/client';

export interface MediaUploadResponse {
  url: string;
  relativeUrl: string;
  fileName: string;
  size: number;
}

function base64ToUint8Array(base64: string): Uint8Array {
  const binaryString = atob(base64.replace(/\s/g, ''));
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function resolveBase64(uri: string, existingBase64?: string): Promise<string | undefined> {
  if (existingBase64 && existingBase64.trim().length > 0) {
    return existingBase64;
  }
  try {
    const res = await fetch(uri);
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        if (typeof result === 'string') {
          const comma = result.indexOf(',');
          resolve(comma >= 0 ? result.substring(comma + 1) : result);
        } else {
          resolve(undefined);
        }
      };
      reader.onerror = () => resolve(undefined);
      reader.readAsDataURL(blob);
    });
  } catch {
    return undefined;
  }
}

/**
 * Uploads a local photo (from camera capture or picker) to Supabase Cloud Storage (primary)
 * or to the local backend as a fallback.
 * Returns the public URL.
 */
export async function uploadMediaToBackend(
  uri: string,
  base64?: string
): Promise<string> {
  const ext = uri.endsWith('.png') ? 'png' : 'jpg';
  const mimeType = ext === 'png' ? 'image/png' : 'image/jpeg';
  const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${ext}`;
  const effectiveBase64 = await resolveBase64(uri, base64);

  // 1. Try Supabase Storage first (Cloud storage accessible by everyone globally)
  if (isSupabaseConfigured && effectiveBase64) {
    try {
      const fileBytes = base64ToUint8Array(effectiveBase64);
      const { data, error } = await supabase.storage
        .from('contributions-media')
        .upload(fileName, fileBytes, {
          contentType: mimeType,
          upsert: true,
        });

      if (!error && data) {
        const { data: publicUrlData } = supabase.storage
          .from('contributions-media')
          .getPublicUrl(fileName);

        if (publicUrlData?.publicUrl) {
          return publicUrlData.publicUrl;
        }
      }
    } catch (e) {
      console.warn('[uploadMediaToBackend] Supabase storage upload failed, falling back to backend', e);
    }
  }

  // 2. Fallback to backend upload if Supabase Storage failed or offline
  const baseUrl = resolveServiceUrl(5256, process.env.EXPO_PUBLIC_API_URL);
  if (effectiveBase64) {
    try {
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
      console.warn('[uploadMediaToBackend] Base64 backend upload failed, trying FormData fallback', e);
    }
  }

  // 3. FormData fallback
  try {
    const formData = new FormData();
    const cleanUri = Platform.OS === 'android' ? uri : uri.replace('file://', '');

    formData.append('file', {
      uri: cleanUri,
      name: fileName,
      type: mimeType,
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

  // Fallback: return original uri if all uploads failed
  return uri;
}
