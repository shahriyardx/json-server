-- Create a partial unique index so filenames are unique only among active (non-deleted) files
CREATE UNIQUE INDEX "json_file_user_id_filename_key" ON "json_file" ("userId", "filename") WHERE "deletedAt" IS NULL;
