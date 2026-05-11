# Root Cause Analysis: Netlify 500 Errors on /api/settings and /api/gigs

## Primary Root Causes

### 1. **Missing Runtime Environment Variables** (CRITICAL)
- `NEXT_PUBLIC_SUPABASE_URL` not set on Netlify
- `SUPABASE_SERVICE_ROLE_KEY` not set on Netlify
- This causes `getSupabaseAdmin()` to return a stub client that always fails
- The stub returns `{ error: { status: 500, code: "NO_SERVICE_KEY" } }`

**Fix**: Set environment variables in Netlify Dashboard → Site Settings → Build & Deploy → Environment

### 2. **Unhandled Import Failures**
- `getOrCreateUser()` does a dynamic import: `const { prisma } = await import("@/lib/prisma")`
- If this import fails, the function throws unhandled
- No try/catch at the route level catches this

**Fix**: Validate imports with error boundaries

### 3. **Helper Function Failures Without Fallback**
- `recordMetric()` and `measureAsync()` in gigs route are called without wrapping
- If these fail, they propagate as 500 errors
- No graceful degradation

**Fix**: Wrap calls in try/catch or make non-fatal

### 4. **POST Handler Missing Top-Level Error Boundary**
- `/api/gigs` POST only has error handling for `request.json()` parsing
- Database operations, validation, and Prisma operations have no outer try/catch
- Any unhandled exception becomes a 500

**Fix**: Add comprehensive outer try/catch

### 5. **Prisma Initialization Failure** (Conditional)
- If Prisma can't connect to database, it throws
- The check `if (!prisma)` doesn't prevent all initialization errors
- Async initialization errors in `getOrCreateUser()` are unhandled

**Fix**: Wrap all Prisma operations in try/catch

### 6. **Missing Null/Undefined Checks**
- `requireAuth()` in settings route doesn't validate that `supabaseAdmin` is usable
- Variables like `user` could be undefined in auth results
- No guards against malformed JWT payloads

**Fix**: Add defensive null checks throughout

## HTTP 500 vs Proper Error Responses

Current behavior:
```
GET /api/settings → 500 (unhandled exception)
GET /api/gigs → 500 (unhandled exception)
```

Should be:
```
GET /api/settings → 200 { ...defaults } (graceful degradation)
GET /api/gigs → 200 { data: [], total: 0, degraded: true } (graceful degradation)
GET /api/settings (no token) → 401 { error: "Unauthorized" }
GET /api/gigs (no token) → 401 { error: "Unauthorized" }
POST /api/gigs (db unavailable) → 503 { error: "Service temporarily unavailable" }
```

## Security/Reliability Implications

1. **Secrets exposed in error responses** - Current code logs full error messages which might expose internal details
2. **No request validation** - POST handlers don't validate input types before use
3. **No timeout handling** - Database queries could hang indefinitely
4. **Memory leaks** - In-memory auth cache grows unbounded if not cleaned

## Files Affected

- `/api/settings/route.ts` - Missing environment variable validation
- `/api/gigs/route.ts` - Helper function failures unhandled, POST missing outer error boundary
- `/lib/supabase-admin.ts` - Returns stub on missing env vars
- `/lib/auth-helpers.ts` - Dynamic import failures unhandled
- `/lib/prisma.ts` - Initialization errors could propagate

## Minimum Viable Fixes (in order of priority)

1. ✅ **Set environment variables on Netlify** (must-have)
2. ✅ **Wrap all route handlers in outer try/catch** (must-have)
3. ✅ **Validate environment variables at route start** (should-have)
4. ✅ **Wrap helper function calls** (should-have)
5. ✅ **Return graceful degraded responses instead of 500s** (should-have)
