import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { requireSuperAdminUser } from "@/lib/superadmin-access";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface AdminAuthUser {
  id: string;
  email?: string | null;
  user_metadata?: {
    name?: string;
    avatar_url?: string;
  };
}

export async function GET(request: NextRequest) {
  try {
    const result = await requireSuperAdminUser(request);
    if ("error" in result) return result.error;

    const adminClient = getSupabaseAdmin();
    const authUsers = new Map<string, AdminAuthUser>();

    if (adminClient.auth && adminClient.auth.admin && typeof adminClient.auth.admin.listUsers === "function") {
      const { data, error } = await adminClient.auth.admin.listUsers({ page: 1, perPage: 1000 });

      if (error) {
        console.warn("[GET /api/superadmin/users] Supabase listUsers error:", error.message);
      } else {
        for (const authUser of (data?.users ?? []) as AdminAuthUser[]) {
          authUsers.set(authUser.id, authUser);
        }
      }
    } else {
      console.warn("[GET /api/superadmin/users] Supabase admin listUsers unavailable; returning Prisma user data only");
    }

    const users = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        supabaseId: true,
        email: true,
        name: true,
        superAdmin: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            bandMembers: true,
            gigs: true,
            investments: true,
            setlists: true,
            songs: true,
          },
        },
      },
    });

    return NextResponse.json({
      users: users.map((user) => {
        const authUser = authUsers.get(user.supabaseId);
        return {
          id: user.id,
          supabaseId: user.supabaseId,
          email: authUser?.email || user.email,
          name: authUser?.user_metadata?.name || user.name,
          avatarUrl: authUser?.user_metadata?.avatar_url || null,
          superAdmin: user.superAdmin,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
          counts: user._count,
        };
      }),
    });
  } catch (error) {
    console.error("GET /api/superadmin/users error:", error);
    return NextResponse.json({ error: "Failed to load users" }, { status: 500 });
  }
}