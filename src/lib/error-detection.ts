/**
 * Utility functions to detect and classify errors
 */

/**
 * Detects if an error is a database connection/availability error
 */
export function isDbConnectionError(error: unknown): boolean {
  if (!error) return false;

  const errorStr = String(error).toLowerCase();
  const errorMsg = error instanceof Error ? error.message.toLowerCase() : "";

  // Check string patterns
  if (
    errorStr.includes("connection") ||
    errorStr.includes("database connection unavailable") ||
    errorStr.includes("prisma init failed") ||
    errorStr.includes("prisma client unavailable") ||
    errorStr.includes("timeout") ||
    errorStr.includes("pool") ||
    errorStr.includes("econnrefused") ||
    errorStr.includes("service unavailable") ||
    errorStr.includes("missing database_url") ||
    errorMsg.includes("connection") ||
    errorMsg.includes("database connection unavailable") ||
    errorMsg.includes("prisma init failed") ||
    errorMsg.includes("prisma client unavailable") ||
    errorMsg.includes("missing database_url") ||
    errorMsg.includes("timeout")
  ) {
    return true;
  }

  // Check Prisma error codes
  const prismaCode = (error as any)?.code;
  if (
    prismaCode === "P1001" || // Cannot reach database server
    prismaCode === "P1002" || // The database server was reached but timed out
    prismaCode === "P2024"    // Timed out fetching a new connection from the pool
  ) {
    return true;
  }

  return false;
}

/**
 * Gets the appropriate HTTP status code for an error
 */
export function getErrorStatusCode(error: unknown): number {
  if (isDbConnectionError(error)) {
    return 503; // Service Unavailable
  }
  return 500; // Internal Server Error
}

/**
 * Formats an error for API responses
 */
export function formatErrorResponse(error: unknown) {
  const errorMsg = error instanceof Error ? error.message : String(error);
  const isDbError = isDbConnectionError(error);

  return {
    error: isDbError ? "Service temporarily unavailable" : "Failed to process request",
    details: errorMsg,
    type: isDbError ? "database_unavailable" : "service_error",
  };
}
