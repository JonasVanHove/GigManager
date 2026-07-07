# Concert Mode - Database Integration Guide

This guide explains how to add proper database support for Concert Mode attachments after the mock implementation is working.

## Current State: Mock Attachments

Currently, Concert Mode uses mock data for testing:
- Mock attachments defined in `src/lib/attachment-utils.ts`
- Images loaded from `public/images/`
- No database persistence

## Step 1: Create Database Model

Add this to `prisma/schema.prisma`:

```prisma
model SetlistItemAttachment {
  id              String  @id @default(cuid())
  setlistItemId   String
  url             String  @db.Text          // S3/Supabase URL
  type            String  @default("image")  // 'image' | 'score' | 'lyrics' | 'chords' | 'pdf'
  title           String?
  description     String?
  mimeType        String  @default("image/png")
  fileSize        Int     @default(0)       // Bytes
  order           Int     @default(0)
  uploadedAt      DateTime @default(now())
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  setlistItem     SetlistItem @relation(fields: [setlistItemId], references: [id], onDelete: Cascade)
  
  @@index([setlistItemId])
  @@unique([setlistItemId, order])
}

// Update SetlistItem relation
model SetlistItem {
  id          String   @id @default(cuid())
  setlistId   String
  order       Int
  type        String
  title       String?
  notes       String?
  chords      String?
  tuning      String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  setlist     Setlist  @relation(fields: [setlistId], references: [id], onDelete: Cascade)
  
  // Add this relation:
  attachments SetlistItemAttachment[]  // ← NEW

  @@index([setlistId, order])
}
```

## Step 2: Create Migration

```bash
npx prisma migrate dev --name add_setlist_item_attachments
```

This will:
1. Generate migration file
2. Create table in database
3. Update Prisma client

## Step 3: Implement API Routes

### GET /api/setlist-items/:itemId/attachments

```typescript
// src/app/api/setlist-items/[itemId]/attachments/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrCreateUser } from "@/lib/auth-helpers";
import { supabaseAdmin } from "@/lib/supabase-admin";

async function requireAuth(request: NextRequest) {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = authHeader.slice(7);
  const { data, error } = await supabaseAdmin.auth.getUser(token);

  if (error || !data.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return { userId: data.user.id };
}

export async function GET(
  request: NextRequest,
  { params }: { params: { itemId: string } }
) {
  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) return authResult;

    // Verify user owns this setlist item
    const item = await prisma.setlistItem.findUnique({
      where: { id: params.itemId },
      include: {
        setlist: true,
      },
    });

    if (!item || item.setlist.userId !== authResult.userId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Fetch attachments
    const attachments = await prisma.setlistItemAttachment.findMany({
      where: { setlistItemId: params.itemId },
      orderBy: { order: "asc" },
    });

    return NextResponse.json(attachments);
  } catch (error) {
    console.error("GET attachments error:", error);
    return NextResponse.json(
      { error: "Failed to fetch attachments" },
      { status: 500 }
    );
  }
}
```

### POST /api/setlist-items/:itemId/attachments

```typescript
// Upload endpoint (requires file upload to S3/Supabase)

export async function POST(
  request: NextRequest,
  { params }: { params: { itemId: string } }
) {
  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) return authResult;

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const type = formData.get("type") as string;
    const title = formData.get("title") as string;
    const description = formData.get("description") as string | null;

    if (!file || !type || !title) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Upload to Supabase Storage
    const fileName = `attachments/${params.itemId}/${Date.now()}-${file.name}`;
    
    // TODO: Implement S3/Supabase upload
    const url = await uploadToSupabase(file, fileName);

    // Get highest order for this item
    const maxOrder = await prisma.setlistItemAttachment.aggregate({
      where: { setlistItemId: params.itemId },
      _max: { order: true },
    });

    // Create attachment record
    const attachment = await prisma.setlistItemAttachment.create({
      data: {
        setlistItemId: params.itemId,
        url,
        type,
        title,
        description: description || null,
        mimeType: file.type,
        fileSize: file.size,
        order: (maxOrder._max.order || 0) + 1,
      },
    });

    return NextResponse.json(attachment, { status: 201 });
  } catch (error) {
    console.error("POST attachment error:", error);
    return NextResponse.json(
      { error: "Failed to upload attachment" },
      { status: 500 }
    );
  }
}
```

### DELETE /api/attachments/:attachmentId

```typescript
// src/app/api/attachments/[attachmentId]/route.ts

export async function DELETE(
  request: NextRequest,
  { params }: { params: { attachmentId: string } }
) {
  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) return authResult;

    // Verify ownership
    const attachment = await prisma.setlistItemAttachment.findUnique({
      where: { id: params.attachmentId },
      include: {
        setlistItem: {
          include: { setlist: true },
        },
      },
    });

    if (!attachment || attachment.setlistItem.setlist.userId !== authResult.userId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Delete from storage
    // TODO: Delete from S3/Supabase

    // Delete record
    await prisma.setlistItemAttachment.delete({
      where: { id: params.attachmentId },
    });

    return NextResponse.json(null, { status: 204 });
  } catch (error) {
    console.error("DELETE attachment error:", error);
    return NextResponse.json(
      { error: "Failed to delete attachment" },
      { status: 500 }
    );
  }
}
```

## Step 4: Update Attachment Utils

Replace mock implementation with real API calls:

```typescript
// src/lib/attachment-utils.ts

export async function fetchAttachments(
  itemId: string,
  token: string
): Promise<Attachment[]> {
  try {
    const res = await fetch(`/api/setlist-items/${itemId}/attachments`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    if (!res.ok) {
      throw new Error('Failed to fetch attachments');
    }
    
    return res.json();
  } catch (err) {
    console.error('Failed to fetch attachments:', err);
    return [];
  }
}

export async function uploadAttachment(
  itemId: string,
  file: File,
  type: AttachmentType,
  title: string,
  description?: string,
  token?: string
): Promise<Attachment> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('type', type);
  formData.append('title', title);
  if (description) formData.append('description', description);

  const res = await fetch(`/api/setlist-items/${itemId}/attachments`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData
  });

  if (!res.ok) {
    throw new Error('Failed to upload attachment');
  }

  return res.json();
}

export async function deleteAttachment(
  attachmentId: string,
  token: string
): Promise<void> {
  const res = await fetch(`/api/attachments/${attachmentId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!res.ok) {
    throw new Error('Failed to delete attachment');
  }
}
```

## Step 5: Add Upload UI to SetlistsTab

```typescript
// In SetlistsTab component, add attachment management:

const handleUploadAttachment = async (itemId: string, file: File) => {
  try {
    const token = await getAccessToken();
    if (!token) return;

    // Determine attachment type based on file
    const type = file.type.startsWith('image/') ? 'image' : 'pdf';

    await uploadAttachment(
      itemId,
      file,
      type,
      file.name,
      undefined,
      token
    );

    // Reload setlist
    await loadSetlists();
  } catch (err) {
    setError(err instanceof Error ? err.message : 'Upload failed');
  }
};

// Add file input to item editor
<input
  type="file"
  accept="image/*,.pdf"
  onChange={(e) => {
    if (e.target.files?.[0]) {
      handleUploadAttachment(item.id, e.target.files[0]);
    }
  }}
  className="..."
/>
```

## Step 6: Test End-to-End

1. Create a setlist with items
2. Try uploading an attachment
3. Verify it appears in Concert Mode
4. Test deletion
5. Test reordering

## Storage Options

### Option A: Supabase Storage

```typescript
import { supabaseClient } from '@/lib/supabase';

async function uploadToSupabase(file: File, path: string) {
  const { data, error } = await supabaseClient.storage
    .from('setlist-attachments')
    .upload(path, file);

  if (error) throw error;
  
  return supabaseClient.storage
    .from('setlist-attachments')
    .getPublicUrl(data.path).data.publicUrl;
}
```

### Option B: AWS S3

```typescript
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const s3 = new S3Client({ region: process.env.AWS_REGION });

async function uploadToS3(file: File, key: string) {
  const command = new PutObjectCommand({
    Bucket: process.env.AWS_BUCKET,
    Key: key,
    Body: file,
    ContentType: file.type,
  });

  await s3.send(command);
  
  return `https://${process.env.AWS_BUCKET}.s3.amazonaws.com/${key}`;
}
```

## Security Considerations

1. **Verify Ownership**: Always check user owns the setlist
2. **File Type Validation**: Only allow images and PDFs
3. **File Size Limits**: Enforce max 10MB per file
4. **Rate Limiting**: Limit uploads per user
5. **Virus Scanning**: Scan uploaded files for malware
6. **URL Expiration**: Use signed URLs for private storage

```typescript
// Add file validation
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

if (file.size > MAX_FILE_SIZE) {
  throw new Error('File too large (max 10MB)');
}

if (!ALLOWED_TYPES.includes(file.type)) {
  throw new Error('Invalid file type');
}
```

## Testing with Database

### Reset Database
```bash
npx prisma db push --skip-generate
```

### Create Test Data
```typescript
// In a test script
const attachment = await prisma.setlistItemAttachment.create({
  data: {
    setlistItemId: 'test-item-id',
    url: 'https://example.com/sheet.png',
    type: 'score',
    title: 'Test Sheet',
    mimeType: 'image/png',
    fileSize: 100000,
    order: 1,
  },
});
```

## Migration Path

1. ✅ **Phase 1** (Complete): Mock implementation works
2. **Phase 2** (Next): Add database model
3. **Phase 3** (Next): Implement API endpoints
4. **Phase 4** (Next): Add upload UI
5. **Phase 5** (Next): Connect frontend to API

## Troubleshooting Database Issues

### Migration Failed
```bash
# Check status
npx prisma migrate status

# Resolve conflicts
npx prisma migrate resolve --rolled-back <migration_name>
```

### Data Not Persisting
1. Verify API endpoints return correct data
2. Check Prisma relation is correct
3. Verify token/auth works in API

### Performance Issues
1. Add indexes to `setlistItemId` ✅ (Already added in schema)
2. Use pagination for large attachment lists
3. Cache attachment lists in frontend

## See Also

- `CONCERT_MODE_IMPLEMENTATION.md` - Architecture overview
- `CONCERT_MODE_QUICK_START.md` - Testing guide
- `src/lib/attachment-utils.ts` - Attachment utilities
- `src/app/api/notes/route.ts` - Reference API implementation
