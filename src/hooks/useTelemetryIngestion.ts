import { useState, useCallback } from 'react';

/**
 * Hook for managing multi-file telemetry uploads.
 */
export const useTelemetryIngestion = () => {
  const [isUploading, setIsUploading] = useState(false);

  const uploadFiles = useCallback(async (files: File[]) => {
    setIsUploading(true);
    try {
      const formData = new FormData();
      files.forEach((file) => formData.append('streams', file));

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Upload failed');
      return await response.json();
    } catch (err) {
      console.error('Telemetry upload error:', err);
      throw err;
    } finally {
      setIsUploading(false);
    }
  }, []);

  return { uploadFiles, isUploading };
};
