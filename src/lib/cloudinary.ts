export interface UploadResult {
  url: string;
  mediaType: 'image' | 'video';
  source: 'cloudinary' | 'firestore';
}

const CLOUD_NAME = (import.meta.env.VITE_CLOUDINARY_CLOUD_NAME as string | undefined)?.trim() || '';
const UPLOAD_PRESET =
  (import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET as string | undefined)?.trim() || 'wisgaium';

export function isCloudinaryConfigured(): boolean {
  return Boolean(CLOUD_NAME && UPLOAD_PRESET);
}

/**
 * Compresses an uploaded image file cleanly via canvas so it stays well under
 * Firestore's 1MB document ceiling if Cloudinary env vars are not yet set.
 */
async function compressImageForFirestore(file: File, maxDim = 960, quality = 0.78): Promise<string> {
  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('Could not decode selected image.'));
      el.src = objectUrl;
    });

    const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
    const targetW = Math.max(1, Math.round(img.width * scale));
    const targetH = Math.max(1, Math.round(img.height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas compression unavailable in this browser.');
    ctx.drawImage(img, 0, 0, targetW, targetH);

    let dataUrl = canvas.toDataURL('image/jpeg', quality);
    // If still slightly large, step down quality so Firestore write always succeeds
    if (dataUrl.length > 340_000) {
      dataUrl = canvas.toDataURL('image/jpeg', 0.56);
    }
    if (dataUrl.length > 380_000) {
      throw new Error(
        'This photo is too large to upload. Please select a smaller image.',
      );
    }
    return dataUrl;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

/**
 * Uploads an image or video directly to Cloudinary via unsigned upload (preset `wisgaium`).
 * If Cloudinary cloud name is not configured yet, compresses real images for direct
 * Firestore persistence so profile pictures & posts save cleanly.
 */
export async function uploadMedia(file: File): Promise<UploadResult> {
  const isVideo = file.type.startsWith('video/');
  const mediaType: 'image' | 'video' = isVideo ? 'video' : 'image';

  if (isCloudinaryConfigured()) {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', UPLOAD_PRESET);
      formData.append('folder', 'vibegram');

      const endpoint = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/${mediaType}/upload`;
      const res = await fetch(endpoint, {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        const data = (await res.json()) as { secure_url?: string };
        if (data.secure_url) {
          return {
            url: data.secure_url,
            mediaType,
            source: 'cloudinary',
          };
        }
      }
      if (isVideo) {
        throw new Error('Could not upload your video. Please try again.');
      }
    } catch (err) {
      if (isVideo) {
        throw err instanceof Error ? err : new Error('Could not upload your video. Please try again.');
      }
    }
  }

  if (isVideo) {
    throw new Error(
      'Video uploads require Cloudinary configuration. Please select a photo or configure VITE_CLOUDINARY_CLOUD_NAME.',
    );
  }

  const compressedUrl = await compressImageForFirestore(file);
  return {
    url: compressedUrl,
    mediaType: 'image',
    source: 'firestore',
  };
}

/**
 * Uploads a recorded voice clip Blob to Cloudinary when configured.
 * Returns an empty string if Cloudinary is not configured so the voice waveform
 * metadata still saves cleanly to Firestore.
 */
export async function uploadAudioBlob(blob: Blob): Promise<string> {
  if (!isCloudinaryConfigured() || blob.size === 0) return '';

  const formData = new FormData();
  formData.append('file', blob, `voice_${Date.now()}.webm`);
  formData.append('upload_preset', UPLOAD_PRESET);
  formData.append('folder', 'vibegram_audio');

  const endpoint = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/video/upload`;
  const res = await fetch(endpoint, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) return '';
  const data = (await res.json()) as { secure_url?: string };
  return data.secure_url || '';
}
