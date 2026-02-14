import { prisma } from "@/lib/prisma";
import {
  formatDiscordMessage,
  formatN8nMessage,
} from "@/lib/webhooks";

export type WebhookEventType = "payment_received" | "band_paid" | "gig_added" | "gig_updated";

export interface WebhookPayload {
  event: WebhookEventType;
  timestamp: Date;
  userId: string;
  data: Record<string, unknown>;
}

/**
 * Send webhooks for a specific event
 */
export async function sendWebhooksForEvent(
  userId: string,
  eventType: WebhookEventType,
  data: Record<string, unknown>
) {
  try {
    // Get all enabled webhooks for this user
    const webhooks = await prisma.webhook.findMany({
      where: {
        userId,
        enabled: true,
        events: {
          has: eventType,
        },
      },
    });

    if (webhooks.length === 0) {
      return;
    }

    const payload: WebhookPayload = {
      event: eventType,
      timestamp: new Date(),
      userId,
      data,
    };

    // Send to each webhook
    for (const webhook of webhooks) {
      await sendWebhookWithRetry(webhook.id, webhook.provider, webhook.url, eventType, data);
    }
  } catch (error) {
    console.error("[sendWebhooksForEvent] Error:", error);
  }
}

/**
 * Send webhook with retry logic
 */
async function sendWebhookWithRetry(
  webhookId: string,
  provider: string,
  url: string,
  eventType: WebhookEventType,
  data: Record<string, unknown>,
  attempt = 1
): Promise<void> {
  const maxAttempts = 3;

  try {
    let response: Response;
    let responseData;

    if (provider === "discord") {
      // Format for Discord
      const discordPayload = formatDiscordPayload(eventType, data);
      response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(discordPayload),
      });
      responseData = `HTTP ${response.status}`;
    } else {
      // Send as JSON for custom webhooks
      const payload = {
        event: eventType,
        timestamp: new Date(),
        data,
      };
      response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      responseData = await response.text();
    }

    // Log the webhook delivery
    await prisma.webhookLog.create({
      data: {
        webhookId,
        event: eventType,
        statusCode: response.status,
        response: responseData,
        data: JSON.stringify(data),
        success: response.ok,
      },
    });

    if (!response.ok && attempt < maxAttempts) {
      // Retry on failure (backoff: 1s, 2s, 4s)
      const delay = Math.pow(2, attempt - 1) * 1000;
      setTimeout(
        () => sendWebhookWithRetry(webhookId, provider, url, eventType, data, attempt + 1),
        delay
      );
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);

    // Log the failed attempt
    await prisma.webhookLog.create({
      data: {
        webhookId,
        event: eventType,
        statusCode: 0,
        error: errorMsg,
        data: JSON.stringify(data),
        success: false,
      },
    });

    // Retry if not max attempts
    if (attempt < maxAttempts) {
      const delay = Math.pow(2, attempt - 1) * 1000;
      setTimeout(
        () => sendWebhookWithRetry(webhookId, provider, url, eventType, data, attempt + 1),
        delay
      );
    }
  }
}

/**
 * Format message for Discord
 */
function formatDiscordPayload(eventType: WebhookEventType, data: Record<string, unknown>) {
  return formatDiscordMessage(
    eventType as any, // Map to supported event type
    data
  );
}

/**
 * Notify on payment received
 */
export async function webhookPaymentReceived(
  userId: string,
  bandName: string,
  amount: number,
  date?: string
) {
  return sendWebhooksForEvent(userId, "payment_received", {
    bandName,
    amount,
    date: date || new Date().toISOString(),
  });
}

/**
 * Notify on band paid
 */
export async function webhookBandPaid(
  userId: string,
  bandName: string,
  amount: number,
  gigCount: number
) {
  return sendWebhooksForEvent(userId, "band_paid", {
    bandName,
    amount,
    gigCount,
  });
}

/**
 * Notify on gig added
 */
export async function webhookGigAdded(
  userId: string,
  bandName: string,
  date: string,
  amount: number
) {
  return sendWebhooksForEvent(userId, "gig_added", {
    bandName,
    date,
    amount,
  });
}

/**
 * Notify on gig updated
 */
export async function webhookGigUpdated(
  userId: string,
  bandName: string,
  change: string
) {
  return sendWebhooksForEvent(userId, "gig_updated", {
    bandName,
    change,
  });
}
