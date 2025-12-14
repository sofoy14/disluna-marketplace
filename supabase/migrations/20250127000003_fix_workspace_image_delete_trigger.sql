-- Fix the delete_old_workspace_image trigger to handle errors gracefully
-- This prevents workspace deletion from failing due to storage deletion issues

CREATE OR REPLACE FUNCTION delete_old_workspace_image()
RETURNS TRIGGER
LANGUAGE 'plpgsql'
SECURITY DEFINER
AS $$
DECLARE
  status INT;
  content TEXT;
BEGIN
  -- Only try to delete if there's actually an image path
  IF TG_OP = 'DELETE' AND OLD.image_path IS NOT NULL AND OLD.image_path <> '' THEN
    BEGIN
      SELECT
        INTO status, content
        result.status, result.content
        FROM public.delete_storage_object_from_bucket('workspace_images', OLD.image_path) AS result;
      IF status <> 200 THEN
        RAISE WARNING 'Could not delete workspace image: % %', status, content;
      END IF;
    EXCEPTION
      WHEN OTHERS THEN
        -- Silently ignore errors when deleting storage objects
        -- This prevents the workspace deletion from failing due to storage/network issues
        -- The workspace will still be deleted even if the image deletion fails
        RAISE WARNING 'Error deleting workspace image (ignored): %', SQLERRM;
    END;
  END IF;
  
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;
