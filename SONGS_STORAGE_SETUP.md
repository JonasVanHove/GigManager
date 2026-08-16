# Songs Storage Setup

## Overview
The Notes / Sheet Music editor uploads drawings, photo annotations, and image attachments to Supabase Storage. Setlist items also use this same storage bucket for attachments.

To make uploads work, create a storage bucket named `songs` and add policies that allow authenticated users to upload, read, update, and delete their own files.

## Create the bucket

1. Open the Supabase Dashboard.
2. Go to `Storage`.
3. Click `New bucket`.
4. Name it `songs`.
5. **IMPORTANT**: Set it to **Public** so that public URLs work for attachments.
6. Click `Create bucket`.

## Add policies

If policies already exist, drop them first:

```sql
-- Drop existing policies if they exist
drop policy if exists "Users can upload songs attachments" on storage.objects;
drop policy if exists "Songs attachments are publicly readable" on storage.objects;
drop policy if exists "Users can update songs attachments" on storage.objects;
drop policy if exists "Users can delete songs attachments" on storage.objects;
```

Then create the policies:

```sql
-- Allow authenticated users to upload to the songs bucket
create policy "Users can upload songs attachments"
on storage.objects for insert
to authenticated
with check (bucket_id = 'songs');

-- Allow public read access (required for setlist attachments to display)
create policy "Songs attachments are publicly readable"
on storage.objects for select
to public
using (bucket_id = 'songs');

-- Allow authenticated users to update their own files in the songs bucket
create policy "Users can update songs attachments"
on storage.objects for update
to authenticated
using (bucket_id = 'songs');

-- Allow authenticated users to delete files from the songs bucket
create policy "Users can delete songs attachments"
on storage.objects for delete
to authenticated
using (bucket_id = 'songs');
```

## Setlist Attachments

Setlist items use the same `songs` storage bucket for attachments. The upload process:

1. File is uploaded to Supabase Storage bucket `songs` with filename: `setlist-item-{itemId}-{timestamp}.{ext}`
2. Public URL is obtained from Supabase Storage
3. Attachment record is created in `SetlistItemAttachment` table with the public URL

## Troubleshooting

### Attachments not displaying
- **Check bucket is public**: In Supabase Dashboard > Storage > songs bucket, ensure it's marked as Public
- **Check public read policy**: The policy "Songs attachments are publicly readable" must be set to `to public`, not `to authenticated`
- **Verify URL format**: The URL should be in format: `https://{project}.supabase.co/storage/v1/object/public/songs/{filename}`

### Uploads failing
- **Check Storage logs**: Go to Supabase Dashboard > Storage > songs > Logs to see error messages
- **Verify upload policy**: Ensure "Users can upload songs attachments" policy exists
- **Check file size**: Ensure files are under Supabase's size limits (typically 50MB for free tier)

### "Storage bucket 'songs' not found" error
- The bucket doesn't exist - create it following the steps above
- The bucket name is case-sensitive - must be exactly `songs` (lowercase)

### Permission denied errors
- Ensure all four policies (INSERT, SELECT, UPDATE, DELETE) are created
- Check that policies are enabled (green toggle in Supabase Dashboard)
- Verify you're authenticated when uploading

## Notes

- The bucket MUST be public for setlist attachments to display correctly
- If you want files to be visible without signed URLs, set the bucket to public
- If uploads still fail, check the Storage logs in Supabase for the exact error message
- The same bucket is used for both song attachments and setlist item attachments