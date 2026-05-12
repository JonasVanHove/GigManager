import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrCreateUser } from "@/lib/auth-helpers";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { isDbConnectionError, getErrorStatusCode, formatErrorResponse } from "@/lib/error-detection";

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

  try {
    const user = await getOrCreateUser(
      data.user.id,
      data.user.email || "",
      data.user.user_metadata?.name
    );
    return { user };
  } catch (dbErr) {
    const statusCode = getErrorStatusCode(dbErr);
    const errorResponse = formatErrorResponse(dbErr);
    return NextResponse.json(errorResponse, { status: statusCode });
  }
}

// GET /api/notes/[id] - Retrieve a specific note
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireAuth(req);
    if (authResult instanceof NextResponse) return authResult;
    const { user } = authResult as { user: { id: string } };

    const { id } = await context.params;

    const note = await prisma.photoNote.findUnique({
      where: { id },
    });

    if (!note) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (note.userId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json(note, { status: 200 });
  } catch (err) {
    const statusCode = getErrorStatusCode(err);
    const errorResponse = formatErrorResponse(err);
    return NextResponse.json(errorResponse, { status: statusCode });
  }
}

// PUT /api/notes/[id] - Update a note
export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireAuth(req);
    if (authResult instanceof NextResponse) return authResult;
    const { user } = authResult as { user: { id: string } };

    const { id } = await context.params;
    const body = await req.json();

    // Check ownership
    const existing = await prisma.photoNote.findUnique({
      where: { id },
      select: { userId: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (existing.userId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const {
      photoUrl,
      photoName,
      photoNatural,
      photoPos,
      photoScale,
      notes,
      strokes,
      linkedBand,
      noteType,
    } = body;

    const updated = await prisma.photoNote.update({
      where: { id },
      data: {
        photoUrl,
        photoName,
        photoNatural,
        photoPos,
        photoScale,
        notes,
        strokes,
        linkedBand,
        noteType,
      },
    });

    return NextResponse.json(updated, { status: 200 });
  } catch (err) {
    const statusCode = getErrorStatusCode(err);
    const errorResponse = formatErrorResponse(err);
    return NextResponse.json(errorResponse, { status: statusCode });
  }
}

// DELETE /api/notes/[id] - Delete a note
export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireAuth(req);
    if (authResult instanceof NextResponse) return authResult;
    const { user } = authResult as { user: { id: string } };

    const { id } = await context.params;

    const existing = await prisma.photoNote.findUnique({
      where: { id },
      select: { userId: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (existing.userId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.photoNote.delete({ where: { id } });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    const statusCode = getErrorStatusCode(err);
    const errorResponse = formatErrorResponse(err);
    return NextResponse.json(errorResponse, { status: statusCode });
  }
}
