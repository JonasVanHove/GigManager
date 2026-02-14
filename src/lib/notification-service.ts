import { prisma } from "@/lib/prisma";

export type NotificationType = "payment_received" | "band_paid" | "gig_added" | "gig_updated";

export interface CreateNotificationParams {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  actionUrl?: string;
  actionLabel?: string;
}

/**
 * Create a notification in the database
 */
export async function createNotification({
  userId,
  type,
  title,
  message,
  actionUrl,
  actionLabel,
}: CreateNotificationParams) {
  try {
    const notification = await prisma.notification.create({
      data: {
        userId,
        type,
        title,
        message,
        status: "unread",
        actionUrl,
        actionLabel,
      },
    });
    return notification;
  } catch (error) {
    console.error("[createNotification] Error:", error);
    throw error;
  }
}

/**
 * Notify user when payment is received for a gig
 */
export async function notifyPaymentReceived(
  userId: string,
  gigId: string,
  bandName: string,
  amount: number
) {
  return createNotification({
    userId,
    type: "payment_received",
    title: "Payment Received",
    message: `Payment of $${amount.toFixed(2)} received from ${bandName}`,
    actionUrl: `/gigs/${gigId}`,
    actionLabel: "View Gig",
  });
}

/**
 * Notify user when band has been marked as paid
 */
export async function notifyBandPaid(
  userId: string,
  bandName: string,
  totalAmount: number,
  gigCount: number
) {
  return createNotification({
    userId,
    type: "band_paid",
    title: "Band Payment Sent",
    message: `Marked ${gigCount} gig${gigCount !== 1 ? "s" : ""} as paid for ${bandName} (${totalAmount.toFixed(2)} total)`,
  });
}

/**
 * Notify user when a new gig is added
 */
export async function notifyGigAdded(
  userId: string,
  gigId: string,
  bandName: string,
  date: Date,
  amount: number
) {
  const dateStr = new Date(date).toLocaleDateString();
  return createNotification({
    userId,
    type: "gig_added",
    title: "New Gig Added",
    message: `${bandName} on ${dateStr} (${amount.toFixed(2)})`,
    actionUrl: `/gigs/${gigId}`,
    actionLabel: "View Gig",
  });
}

/**
 * Notify user when a gig is updated
 */
export async function notifyGigUpdated(
  userId: string,
  gigId: string,
  bandName: string,
  change: string
) {
  return createNotification({
    userId,
    type: "gig_updated",
    title: "Gig Updated",
    message: `${bandName}: ${change}`,
    actionUrl: `/gigs/${gigId}`,
    actionLabel: "View Gig",
  });
}

/**
 * Get unread notification count for user
 */
export async function getUnreadCount(userId: string) {
  try {
    const count = await prisma.notification.count({
      where: {
        userId,
        status: "unread",
      },
    });
    return count;
  } catch (error) {
    console.error("[getUnreadCount] Error:", error);
    return 0;
  }
}
