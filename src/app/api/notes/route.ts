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

// GET /api/notes - List all notes for current user
export async function GET(req: NextRequest) {
  try {
    const authResult = await requireAuth(req);
    if (authResult instanceof NextResponse) return authResult;
    const { user } = authResult as { user: { id: string } };

    const notes = await prisma.photoNote.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        linkedBand: true,
        photoName: true,
        notes: true,
        noteType: true,
        updatedAt: true,
        createdAt: true,
      },
    });

    return NextResponse.json(notes, { status: 200 });
  } catch (err) {
    const statusCode = getErrorStatusCode(err);
    const errorResponse = formatErrorResponse(err);
    return NextResponse.json(errorResponse, { status: statusCode });
  }
}

// POST /api/notes - Create a new note
export async function POST(req: NextRequest) {
  try {
    const authResult = await requireAuth(req);
    if (authResult instanceof NextResponse) return authResult;
    const { user } = authResult as { user: { id: string } };

    const body = await req.json();
    const {
      photoUrl,
      photoName,
      photoNatural,
      photoPos,
      photoScale,
      notes,
      strokes,
      linkedBand,
      noteType = "photo",
    } = body;

    const newNote = await prisma.photoNote.create({
      data: {
        userId: user.id,
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

    return NextResponse.json(newNote, { status: 201 });
  } catch (err) {
    const statusCode = getErrorStatusCode(err);
    const errorResponse = formatErrorResponse(err);
    return NextResponse.json(errorResponse, { status: statusCode });
  }
}
