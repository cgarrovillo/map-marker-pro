-- Add color column to signage_types table
ALTER TABLE public.signage_types 
ADD COLUMN IF NOT EXISTS color text;

-- Add color column to signage_sub_types table
ALTER TABLE public.signage_sub_types 
ADD COLUMN IF NOT EXISTS color text;

-- Add comment for documentation
COMMENT ON COLUMN public.signage_types.color IS 'HEX color code for this signage type (e.g., #3B82F6)';
COMMENT ON COLUMN public.signage_sub_types.color IS 'HEX color code for this sub-type. If null, inherits from parent signage type';