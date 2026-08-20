import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getOrCreateUser } from "@/lib/auth-helpers";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { Document, HeadingLevel, Packer, Paragraph, TextRun } from "docx";
import { getSpecialBlockDisplayLabel } from "@/lib/setlist-special-blocks";

export const runtime = "nodejs";

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

  const user = await getOrCreateUser(
    data.user.id,
    data.user.email || "",
    data.user.user_metadata?.name
  );

  return { user };
}

function safeFileName(value: string) {
  return value.replace(/[^a-z0-9-_ ]/gi, "").trim().replace(/\s+/g, "-");
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) return authResult;
  const { user } = authResult as { user: { id: string } };

  try {
    const includeChords = request.nextUrl.searchParams.get("includeChords") === "1";
    const includeTuning = request.nextUrl.searchParams.get("includeTuning") === "1";
    const includeImages = request.nextUrl.searchParams.get("includeImages") !== "0";
    const locale = request.nextUrl.searchParams.get("locale") || "nl";

    const setlist = await prisma.setlist.findFirst({
      where: { id: params.id, userId: user.id },
      include: { items: { orderBy: { order: "asc" } } },
    });

    if (!setlist) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Fetch user songs and image attachments for setlist items
    const userSongs = await prisma.$queryRaw<Array<{ id: string; title: string }>>(Prisma.sql`
      SELECT id, title FROM songs WHERE "userId" = ${user.id} AND "deletedAt" IS NULL
    `).catch(() => []);

    const songAttachments = await prisma.$queryRaw<Array<{ songId: string; public_url: string; caption: string | null }>>(Prisma.sql`
      SELECT sa."songId", sa.public_url, sa.caption
      FROM song_attachments sa
      INNER JOIN songs s ON s.id = sa."songId"
      WHERE s."userId" = ${user.id} AND sa."deletedAt" IS NULL
    `).catch(() => []);

    const attachmentsBySongTitle = new Map<string, Array<{ public_url: string; caption: string | null }>>();
    const attachmentsBySongId = new Map<string, Array<{ public_url: string; caption: string | null }>>();

    for (const att of songAttachments) {
      const listId = attachmentsBySongId.get(att.songId) ?? [];
      listId.push(att);
      attachmentsBySongId.set(att.songId, listId);

      const songObj = userSongs.find((s) => s.id === att.songId);
      if (songObj) {
        const titleKey = songObj.title.toLowerCase().trim();
        const listTitle = attachmentsBySongTitle.get(titleKey) ?? [];
        listTitle.push(att);
        attachmentsBySongTitle.set(titleKey, listTitle);
      }
    }

    const paragraphs: Paragraph[] = [
      new Paragraph({
        text: setlist.title,
        heading: HeadingLevel.HEADING_1,
      }),
    ];

    if (setlist.description) {
      paragraphs.push(
        new Paragraph({
          text: setlist.description,
        })
      );
    }

    paragraphs.push(new Paragraph({ text: "" }));

    const items = setlist.items as Array<{
      id: string;
      type: string;
      title: string | null;
      notes: string | null;
      chords: string | null;
      tuning: string | null;
    }>;

    let songNumber = 0;
    items.forEach((item) => {
      if (item.type === "note") {
        const title = item.title?.trim() || "";
        if (title) {
          paragraphs.push(
            new Paragraph({
              children: [
                new TextRun({ text: getSpecialBlockDisplayLabel(title, locale), bold: true }),
              ],
            })
          );
        }
        const noteText = item.notes?.trim();
        if (noteText) {
          paragraphs.push(
            new Paragraph({
              children: [new TextRun({ text: noteText, italics: true })],
            })
          );
        }
        paragraphs.push(new Paragraph({ text: "" }));
        return;
      }

      songNumber++;
      const label = "Song";
      const title = item.title?.trim() || "Untitled";
      const headerText = `${songNumber}. ${title}`;

      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({ text: headerText, bold: true }),
          ],
        })
      );

      if (includeTuning && item.tuning?.trim()) {
        paragraphs.push(
          new Paragraph({
            children: [
              new TextRun({ text: "Tuning: ", bold: true }),
              new TextRun({ text: item.tuning.trim() }),
            ],
          })
        );
      }

      if (includeChords && item.chords?.trim()) {
        paragraphs.push(
          new Paragraph({
            children: [
              new TextRun({ text: "Chords: ", bold: true }),
              new TextRun({ text: item.chords.trim() }),
            ],
          })
        );
      }

      if (item.notes?.trim()) {
        paragraphs.push(
          new Paragraph({
            children: [
              new TextRun({ text: "Notes: ", bold: true }),
              new TextRun({ text: item.notes.trim() }),
            ],
          })
        );
      }

      if (includeImages && title) {
        const itemAttachments = attachmentsBySongId.get(item.id) ?? attachmentsBySongTitle.get(title.toLowerCase().trim()) ?? [];
        if (itemAttachments.length > 0) {
          itemAttachments.forEach((att, attIdx) => {
            paragraphs.push(
              new Paragraph({
                children: [
                  new TextRun({ text: `  📷 Image Sheet #${attIdx + 1}: `, bold: true }),
                  new TextRun({ text: att.public_url }),
                  ...(att.caption ? [new TextRun({ text: ` (${att.caption})`, italics: true })] : []),
                ],
              })
            );
          });
        }
      }

      paragraphs.push(new Paragraph({ text: "" }));
    });

    const doc = new Document({
      sections: [
        {
          children: paragraphs,
        },
      ],
    });

    const buffer = await Packer.toBuffer(doc);
    const arrayBuffer = new Uint8Array(buffer);
    const filename = `${safeFileName(setlist.title || "setlist")}.docx` || "setlist.docx";

    return new NextResponse(arrayBuffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("GET /api/setlists/[id]/export error:", error);
    return NextResponse.json(
      { error: "Failed to export setlist" },
      { status: 500 }
    );
  }
}
