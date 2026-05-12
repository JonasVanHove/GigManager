/**
 * Fix script to link orphaned gigs to the correct user by email/supabaseId
 * This helps when gigs were created with an old userId
 */

import { prisma } from "@/lib/prisma";

async function fixOrphanedGigs() {
  try {
    console.log("🔧 Attempting to fix orphaned gigs...\n");

    // Get all users with supabaseId and count
    const allUsers = await prisma.user.findMany({
      include: { _count: { select: { gigs: true } } },
    });

    // Get all gigs
    const allGigs = await prisma.gig.findMany();
    const validUserIds = new Set(allUsers.map((u) => u.id));

    // Find orphaned gigs
    const orphanedGigs = allGigs.filter((g) => !validUserIds.has(g.userId));

    if (orphanedGigs.length === 0) {
      console.log("✅ No orphaned gigs found - nothing to fix!");
      return;
    }

    console.log(`Found ${orphanedGigs.length} orphaned gigs\n`);

    // Try to match gigs to users
    // Strategy: If there's only one user, assign all orphaned gigs to them
    // (This is usually the case for self-hosted instances)

    if (allUsers.length === 1) {
      const targetUser = allUsers[0];
      console.log(
        `📌 Only one user in system: ${targetUser.email}`
      );
      console.log(`   Linking ${orphanedGigs.length} gigs to this user...\n`);

      // Update all orphaned gigs
      const result = await prisma.gig.updateMany({
        where: { id: { in: orphanedGigs.map((g) => g.id) } },
        data: { userId: targetUser.id },
      });

      console.log(`✅ Successfully linked ${result.count} gigs!\n`);
      console.log(`📊 User ${targetUser.email} now has ${result.count} additional gigs`);
      console.log(`   Total gigs after fix: ${allUsers[0]._count.gigs + result.count}`);

      return result.count;
    }

    // If multiple users, ask for manual intervention
    console.log("⚠️  Multiple users in system. Please manually specify target user.\n");
    console.log("Available users:");
    allUsers.forEach((user, idx) => {
      console.log(`  ${idx}: ${user.email} (Prisma ID: ${user.id})`);
    });

    console.log("\n");
    console.log("Example: To fix all gigs for user 0, run:");
    console.log(`  UPDATE gig SET "userId" = '${allUsers[0].id}' WHERE "userId" NOT IN (SELECT id FROM "User");`);

  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

fixOrphanedGigs();
