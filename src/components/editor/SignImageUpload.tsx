import { useRef, useState, useCallback } from 'react';
import { Upload, X, ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

interface SignImageUploadProps {
  imageUrl: string | undefined;
  uploading: boolean;
  onUpload: (file: File) => void;
  onRemove: () => void;
  /** Hint shown below the label */
  description?: string;
  /** Alt text for the preview image */
  alt?: string;
}

export function SignImageUpload({
  imageUrl,
  uploading,
  onUpload,
  onRemove,
  description,
  alt = 'Sign image',
}: SignImageUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onUpload(file);
    // Reset so the same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);

      const file = e.dataTransfer.files?.[0];
      if (file && ACCEPTED_TYPES.includes(file.type)) {
        onUpload(file);
      }
    },
    [onUpload],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  return (
    <>
      {/* Drop zone wraps the preview / placeholder area */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onClick={() => !uploading && fileInputRef.current?.click()}
        className="cursor-pointer"
      >
        {imageUrl ? (
          <div
            className={cn(
              'relative group rounded-md border-2 transition-colors',
              isDragOver
                ? 'border-primary bg-primary/5'
                : 'border-transparent',
            )}
          >
            <img
              src={imageUrl}
              alt={alt}
              className="w-full h-40 object-cover rounded-md border border-border"
            />
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onRemove();
              }}
              className={cn(
                'absolute top-2 right-2 p-1 rounded-full',
                'bg-destructive text-destructive-foreground',
                'opacity-0 group-hover:opacity-100 transition-opacity',
              )}
              title="Remove image"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div
            className={cn(
              'w-full h-40 rounded-md border-2 border-dashed flex flex-col items-center justify-center transition-colors',
              isDragOver
                ? 'border-primary bg-primary/5'
                : 'border-border bg-muted/30',
            )}
          >
            {isDragOver ? (
              <>
                <Upload className="w-8 h-8 text-primary mb-2" />
                <span className="text-xs font-medium text-primary">Drop image here</span>
              </>
            ) : (
              <>
                <ImageIcon className="w-8 h-8 text-muted-foreground/50 mb-2" />
                <span className="text-xs text-muted-foreground">
                  {description || 'No image'}
                </span>
                <span className="text-xs text-muted-foreground/60 mt-1">
                  Click or drag &amp; drop
                </span>
              </>
            )}
          </div>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        onChange={handleFileChange}
        className="hidden"
      />

      <Button
        variant="outline"
        size="sm"
        className="w-full"
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
      >
        <Upload className="w-4 h-4 mr-2" />
        {uploading ? 'Uploading...' : imageUrl ? 'Change Image' : 'Upload Image'}
      </Button>
    </>
  );
}
