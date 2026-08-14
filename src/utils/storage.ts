/**
 * Safe LocalStorage and Image Compression Utilities
 * Ensures data is instantly and reliably persisted without exceeding localStorage quotas.
 */

export const safeStorage = {
  get: <T>(key: string, defaultValue: T): T => {
    try {
      const item = localStorage.getItem(key);
      if (item === null || item === undefined || item === '') {
        return defaultValue;
      }
      return JSON.parse(item) as T;
    } catch (e) {
      console.warn(`[safeStorage] Error reading key "${key}":`, e);
      return defaultValue;
    }
  },

  getString: (key: string, defaultValue: string): string => {
    try {
      const item = localStorage.getItem(key);
      if (item === null || item === undefined) {
        return defaultValue;
      }
      return item;
    } catch (e) {
      console.warn(`[safeStorage] Error reading string key "${key}":`, e);
      return defaultValue;
    }
  },

  set: <T>(key: string, value: T): boolean => {
    try {
      const serialized = typeof value === 'string' ? value : JSON.stringify(value);
      localStorage.setItem(key, serialized);
      return true;
    } catch (e) {
      console.error(`[safeStorage] Failed to save key "${key}" to localStorage:`, e);
      return false;
    }
  },

  remove: (key: string): void => {
    try {
      localStorage.removeItem(key);
    } catch (e) {
      console.error(`[safeStorage] Error removing key "${key}":`, e);
    }
  },
};

/**
 * Resizes and compresses image files (such as QR codes or camera screenshots)
 * to compact Data URLs (max width/height 600px, 0.85 quality) to ensure fast loading
 * and guaranteed persistence in localStorage.
 */
export const compressImageFile = (
  file: File,
  maxWidth = 600,
  maxHeight = 600,
  quality = 0.85
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.onload = (readerEvent) => {
      const img = new Image();
      img.onerror = () => reject(new Error('Failed to load image'));
      img.onload = () => {
        let { width, height } = img;

        if (width > maxWidth || height > maxHeight) {
          if (width > height) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(readerEvent.target?.result as string);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        // For QR codes and graphics, PNG or high-quality JPEG
        const mimeType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
        const compressedDataUrl = canvas.toDataURL(mimeType, quality);
        resolve(compressedDataUrl);
      };
      img.src = readerEvent.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
};
