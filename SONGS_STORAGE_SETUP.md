# Songs Storage Setup

## Overview
The Notes / Sheet Music editor uploads drawings, photo annotations, and image attachments to Supabase Storage.

To make uploads work, create a storage bucket named `songs` and add policies that allow authenticated users to upload, read, update, and delete their own files.

## Create the bucket

1. Open the Supabase Dashboard.
2. Go to `Storage`.
3. Click `New bucket`.
4. Name it `songs`.
5. Set it to public if you want direct public URLs for attachments.

## Add policies

Run this in the Supabase SQL editor:

```sql
-- Allow authenticated users to upload to the songs bucket
create policy "Users can upload songs attachments"
on storage.objects for insert
to authenticated
with check (bucket_id = 'songs');

-- Allow authenticated users to read files from the songs bucket
create policy "Songs attachments are publicly readable"
on storage.objects for select
to authenticated
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

## Notes

- If you want files to be visible without signed URLs, set the bucket to public.
- If uploads still fail, check the Storage logs in Supabase for the exact error message.