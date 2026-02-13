# Avatar Upload Setup

## Supabase Storage Bucket

To enable avatar uploads, you need to create a storage bucket in Supabase:

1. Go to your Supabase project dashboard
2. Navigate to **Storage** in the left sidebar
3. Click **New bucket**
4. Name it: `avatars`
5. Set it as **Public** (so avatar images are publicly accessible)
6. Click **Create bucket**

## Storage Policies (Optional)

For better security, you can add policies to restrict uploads:

1. In the `avatars` bucket, go to **Policies**
2. Add the following policies:

### Allow authenticated users to upload their own avatars:
```sql
CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
```

### Allow public read access:
```sql
CREATE POLICY "Avatar images are publicly accessible"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'avatars');
```

### Allow users to update their own avatar:
```sql
CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
```

### Allow users to delete their own avatar:
```sql
CREATE POLICY "Users can delete their own avatar"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
```

## How it works

- Users can upload image files (max 2MB) as their profile avatar
- Files are automatically uploaded to Supabase Storage
- The public URL is saved to the user's `avatar_url` metadata
- Avatars are displayed in the navbar and settings modal
