/**
 * Debug script to identify userId mismatches
 * Run with: npx ts-node debug-userid-mismatch.ts
 */

import { prisma } from "@/lib/prisma";

async function debugUserIdMismatch() {
  try {
    console.log("🔍 Checking for userId mismatches...\n");

    // Get all users
    const allUsers = await prisma.user.findMany({
      include: { _count: { select: { gigs: true } } },
    });

    console.log(`📊 Total users: ${allUsers.length}\n`);

    allUsers.forEach((user) => {
      console.log(`User: ${user.email}`);
      console.log(`  Prisma ID: ${user.id}`);
      console.log(`  Supabase ID: ${user.supabaseId}`);
      console.log(`  Gigs linked: ${user._count.gigs}`);
      console.log("");
    });

    // Check for orphaned gigs (gigs with non-existent userId)
    console.log("\n🔎 Checking for orphaned gigs...\n");
    
    const allGigs = await prisma.gig.findMany();
    const validUserIds = new Set(allUsers.map((u) => u.id));
    const orphanedGigs = allGigs.filter((g) => !validUserIds.has(g.userId));

    if (orphanedGigs.length > 0) {
      console.log(`⚠️  Found ${orphanedGigs.length} orphaned gigs:`);
      orphanedGigs.forEach((gig) => {
        console.log(`  - Gig "${gig.eventName}" references userId: ${gig.userId}`);
      });
    } else {
      console.log("✅ No orphaned gigs found");
    }

    // Show user with most gigs
    console.log("\n📈 User with most gigs:");
    const userWithMostGigs = allUsers.reduce((max, user) =>
      user._count.gigs > max._count.gigs ? user : max
    );
    console.log(
      `  ${userWithMostGigs.email}: ${userWithMostGigs._count.gigs} gigs`
    );

    // If user count is small, show summary
    if (allUsers.length <= 5) {
      console.log("\n📋 Summary for joneke39@hotmail.com:");
      const targetUser = allUsers.find((u) => u.email === "joneke39@hotmail.com");
      if (targetUser) {
        console.log(`  Prisma ID: ${targetUser.id}`);
        console.log(`  Supabase ID: ${targetUser.supabaseId}`);
        console.log(`  Gigs: ${targetUser._count.gigs}`);
      } else {
        console.log("  User not found in database");
      }
    }
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

debugUserIdMismatch();
