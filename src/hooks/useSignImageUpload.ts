import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface UseSignImageUploadReturn {
  uploading: boolean;
  error: string | null;
  /** Upload a file to Supabase Storage. Returns the public URL on success. */
  uploadImage: (
    id: string,
    folder: 'sign-types' | 'sign-sub-types',
    file: File,
  ) => Promise<string | null>;
  /** Delete a file from Supabase Storage by its public URL. */
  deleteImage: (imageUrl: string) => Promise<void>;
}

/**
 * Storage-only hook for sign type images.
 * Handles uploading/deleting files in the `venue-images` bucket.
 * Does NOT write to the database — callers should use the
 * optimistic-update methods from useSignageTypes / useSignageSubTypes.
 */
export function useSignImageUpload(): UseSignImageUploadReturn {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const uploadImage = useCallback(
    async (
      id: string,
      folder: 'sign-types' | 'sign-sub-types',
      file: File,
    ): Promise<string | null> => {
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

        const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg';
        const filePath = `${folder}/${id}/${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('venue-images')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data } = supabase.storage
          .from('venue-images')
          .getPublicUrl(filePath);

        return data.publicUrl;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to upload image';
        setError(message);
        console.error('Error uploading sign type image:', err);
        return null;
      } finally {
        setUploading(false);
      }
    },
    [],
  );

  const deleteImage = useCallback(async (imageUrl: string): Promise<void> => {
    try {
      const urlParts = imageUrl.split('/venue-images/');
      if (urlParts.length === 2) {
        const filePath = urlParts[1];
        await supabase.storage.from('venue-images').remove([filePath]);
      }
    } catch (err) {
      console.error('Error deleting sign type image:', err);
    }
  }, []);

  return { uploading, error, uploadImage, deleteImage };
}
