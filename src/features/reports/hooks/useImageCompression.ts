import { useState, useCallback } from 'react';
import { compressImage, type CompressedImage } from '@/utils/image';

interface UseImageCompressionReturn {
  isCompressing: boolean;
  compress: (file: File) => Promise<CompressedImage>;
}

/**
 * Hook per la compressione immagini via Canvas API.
 * Max 1920px larghezza, JPEG quality 80%.
 */
export function useImageCompression(): UseImageCompressionReturn {
  const [isCompressing, setIsCompressing] = useState(false);

  const compress = useCallback(async (file: File): Promise<CompressedImage> => {
    setIsCompressing(true);
    try {
      const result = await compressImage(file, 1920, 0.8);
      return result;
    } finally {
      setIsCompressing(false);
    }
  }, []);

  return { isCompressing, compress };
}
