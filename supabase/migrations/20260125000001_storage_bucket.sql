-- Create storage bucket for venue images
INSERT INTO storage.buckets (id, name, public)
VALUES ('venue-images', 'venue-images', true);

-- RLS Policies for venue-images bucket
-- Allow authenticated users to upload images
CREATE POLICY "Authenticated users can upload venue images"
    ON storage.objects
    FOR INSERT
    WITH CHECK (
        bucket_id = 'venue-images' 
        AND auth.uid() IS NOT NULL
    );

-- Allow users to view images (public bucket)
CREATE POLICY "Anyone can view venue images"
    ON storage.objects
    FOR SELECT
    USING (bucket_id = 'venue-images');

-- Allow users to update their uploaded images
CREATE POLICY "Users can update venue images"
    ON storage.objects
    FOR UPDATE
    USING (
        bucket_id = 'venue-images' 
        AND auth.uid() IS NOT NULL
    );

-- Allow users to delete images
CREATE POLICY "Users can delete venue images"
    ON storage.objects
    FOR DELETE
    USING (
        bucket_id = 'venue-images' 
        AND auth.uid() IS NOT NULL
    );
