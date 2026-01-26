import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface UseSignImageUploadReturn {
  uploading: boolean;
  error: string | null;
  uploadSignImage: (annotationId: string, side: 1 | 2, file: File) => Promise<string | null>;
  deleteSignImage: (imageUrl: string) => Promise<void>;
}

export function useSignImageUpload(): UseSignImageUploadReturn {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const uploadSignImage = useCallback(
    async (annotationId: string, side: 1 | 2, file: File): Promise<string | null> => {
      setUploading(true);
      setError(null);

      try {
        // Validate file type
        const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (!validTypes.includes(file.type)) {
          throw new Error('Invalid file type. Please upload a JPEG, PNG, GIF, or WebP image.');
        }

        // Validate file size (max 5MB)
        const maxSize = 5 * 1024 * 1024;
        if (file.size > maxSize) {
          throw new Error('File too large. Maximum size is 5MB.');
        }

        // Create file path: signs/{annotationId}/side{side}/{timestamp}.{ext}
        const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg';
        const filePath = `signs/${annotationId}/side${side}/${Date.now()}.${fileExt}`;

        // Upload to Supabase storage
        const { error: uploadError } = await supabase.storage
          .from('venue-images')
          .upload(filePath, file);

        if (uploadError) {
          throw uploadError;
        }

        // Get public URL
        const { data } = supabase.storage
          .from('venue-images')
          .getPublicUrl(filePath);

        return data.publicUrl;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to upload image';
        setError(message);
        console.error('Error uploading sign image:', err);
        return null;
      } finally {
        setUploading(false);
      }
    },
    []
  );

  const deleteSignImage = useCallback(async (imageUrl: string): Promise<void> => {
    try {
      // Extract the file path from the URL
      // URL format: https://{project}.supabase.co/storage/v1/object/public/venue-images/{path}
      const urlParts = imageUrl.split('/venue-images/');
      if (urlParts.length !== 2) {
        console.error('Invalid image URL format');
        return;
      }

      const filePath = urlParts[1];

      const { error: deleteError } = await supabase.storage
        .from('venue-images')
        .remove([filePath]);

      if (deleteError) {
        console.error('Error deleting sign image:', deleteError);
      }
    } catch (err) {
      console.error('Error deleting sign image:', err);
    }
  }, []);

  return {
    uploading,
    error,
    uploadSignImage,
    deleteSignImage,
  };
}
