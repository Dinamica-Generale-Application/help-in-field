/**
 * Image compression utility — uses Canvas API to resize and compress images.
 */

export interface CompressedImage {
  dataUrl: string;
  size: number;
}

/**
 * Compresses an image file to JPEG with a maximum width and quality setting.
 *
 * @param file - The image File to compress
 * @param maxWidth - Maximum width in pixels (default: 1920)
 * @param quality - JPEG quality 0-1 (default: 0.8)
 * @returns Promise resolving to { dataUrl, size }
 */
export function compressImage(
  file: File,
  maxWidth = 1920,
  quality = 0.8,
): Promise<CompressedImage> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      let { width, height } = img;

      // Scale down if wider than maxWidth
      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Cannot get canvas 2D context'));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);

      const dataUrl = canvas.toDataURL('image/jpeg', quality);
      // Approximate size: base64 is ~4/3 of binary, data URL header is small
      const size = Math.round((dataUrl.length * 3) / 4);

      resolve({ dataUrl, size });
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };

    img.src = url;
  });
}
