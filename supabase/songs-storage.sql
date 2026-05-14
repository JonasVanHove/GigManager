-- Songs Storage Setup for Supabase
-- Run this in the Supabase SQL editor.

-- Create the songs bucket if it does not exist.
insert into storage.buckets (id, name, public)
values ('songs', 'songs', true)
on conflict (id) do nothing;

-- Allow authenticated users to upload attachments for notes / sheet music.
create policy "Users can upload songs attachments"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'songs');

-- Allow authenticated users to read songs attachments.
create policy "Songs attachments are readable"
on storage.objects
for select
to authenticated
using (bucket_id = 'songs');

-- Allow authenticated users to update songs attachments.
create policy "Users can update songs attachments"
on storage.objects
for update
to authenticated
using (bucket_id = 'songs');

-- Allow authenticated users to delete songs attachments.
create policy "Users can delete songs attachments"
on storage.objects
for delete
to authenticated
using (bucket_id = 'songs');
