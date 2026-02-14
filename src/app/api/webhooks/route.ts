import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getOrCreateUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

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

// GET /api/webhooks - List webhooks
export async function GET(request: NextRequest) {
  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) return authResult;
  const { user } = authResult as { user: { id: string } };

  try {
    const webhooks = await prisma.webhook.findMany({
      where: { userId: user.id },
      include: { logs: { take: 5, orderBy: { createdAt: "desc" } } },
    });

    return NextResponse.json({
      webhooks,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[GET /api/webhooks] Error:", msg);
    return NextResponse.json(
      { error: "Failed to fetch webhooks", details: msg },
      { status: 500 }
    );
  }
}

// POST /api/webhooks - Create webhook
export async function POST(request: NextRequest) {
  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) return authResult;
  const { user } = authResult as { user: { id: string } };

  try {
    const body = await request.json();
    const { url, provider, events, name, enabled = true } = body;

    if (!url || !provider || !Array.isArray(events) || events.length === 0) {
      return NextResponse.json(
        { error: "Missing required fields: url, provider, events" },
        { status: 400 }
      );
    }

    // Validate URL
    try {
      new URL(url);
    } catch {
      return NextResponse.json(
        { error: "Invalid webhook URL" },
        { status: 400 }
      );
    }

    const webhook = await prisma.webhook.create({
      data: {
        userId: user.id,
        url,
        provider,
        events,
        name: name || `${provider} Webhook`,
        enabled,
      },
    });

    return NextResponse.json({
      success: true,
      webhook,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[POST /api/webhooks] Error:", msg);
    return NextResponse.json(
      { error: "Failed to create webhook", details: msg },
      { status: 500 }
    );
  }
}

// PATCH /api/webhooks/:id - Update webhook
export async function PATCH(request: NextRequest) {
  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) return authResult;
  const { user } = authResult as { user: { id: string } };

  try {
    const { searchParams } = new URL(request.url);
    const webhookId = searchParams.get("id");

    if (!webhookId) {
      return NextResponse.json(
        { error: "Webhook ID required" },
        { status: 400 }
      );
    }

    // Verify webhook belongs to user
    const webhook = await prisma.webhook.findUnique({
      where: { id: webhookId },
    });

    if (!webhook) {
      return NextResponse.json(
        { error: "Webhook not found" },
        { status: 404 }
      );
    }

    if (webhook.userId !== user.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { enabled, events, name, url } = body;

    const updated = await prisma.webhook.update({
      where: { id: webhookId },
      data: {
        ...(enabled !== undefined && { enabled }),
        ...(events && { events }),
        ...(name && { name }),
        ...(url && { url }),
      },
    });

    return NextResponse.json({
      success: true,
      webhook: updated,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[PATCH /api/webhooks] Error:", msg);
    return NextResponse.json(
      { error: "Failed to update webhook", details: msg },
      { status: 500 }
    );
  }
}

// DELETE /api/webhooks/:id - Delete webhook
export async function DELETE(request: NextRequest) {
  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) return authResult;
  const { user } = authResult as { user: { id: string } };

  try {
    const { searchParams } = new URL(request.url);
    const webhookId = searchParams.get("id");

    if (!webhookId) {
      return NextResponse.json(
        { error: "Webhook ID required" },
        { status: 400 }
      );
    }

    // Verify webhook belongs to user
    const webhook = await prisma.webhook.findUnique({
      where: { id: webhookId },
    });

    if (!webhook) {
      return NextResponse.json(
        { error: "Webhook not found" },
        { status: 404 }
      );
    }

    if (webhook.userId !== user.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      );
    }

    // Delete associated logs first (if not cascading)
    await prisma.webhookLog.deleteMany({
      where: { webhookId },
    });

    await prisma.webhook.delete({
      where: { id: webhookId },
    });

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[DELETE /api/webhooks] Error:", msg);
    return NextResponse.json(
      { error: "Failed to delete webhook", details: msg },
      { status: 500 }
    );
  }
}
