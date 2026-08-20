# Prisma 7 Production Migration Plan

## Overview
This document outlines the production deployment strategy for upgrading from Prisma 5 to Prisma 7. The upgrade introduces breaking changes that require careful coordination during deployment.

## Pre-Deployment Checklist

### 1. Prerequisites
- [ ] All development environment tests pass
- [ ] Database backup completed
- [ ] Environment variables verified in production
- [ ] Deployment team briefed on rollback procedures
- [ ] Monitoring tools configured for migration validation

### 2. Environment Variables Verification
Ensure the following environment variables are set in production:
- `DATABASE_URL` - Transaction pooler (port 6543, pgbouncer=true)
- `DIRECT_URL` - Session pooler (port 5432, for migrations)

### 3. Pre-Deployment Testing
- [ ] Run unit tests: `npm run test`
- [ ] Run E2E tests: `npm run test:e2e`
- [ ] Verify build: `npm run build`
- [ ] Test Prisma client generation: `npm run db:generate`

## Deployment Steps

### Phase 1: Code Deployment (Zero Downtime)

#### Step 1: Deploy Code Changes
```bash
# Deploy the following changes to production:
# 1. Updated package.json with Prisma 7 dependencies
# 2. New prisma.config.ts file
# 3. Updated schema.prisma with new generator configuration
# 4. Updated Prisma client instantiation with driver adapter
# 5. Updated imports across the codebase
```

#### Step 2: Verify Environment
```bash
# In production environment, verify:
echo $DATABASE_URL
echo $DIRECT_URL
```

#### Step 3: Generate Prisma Client
```bash
# This will run automatically via postinstall script
npm install
# Or manually:
npm run db:generate
```

#### Step 4: Validate Generated Client
```bash
# Verify the client was generated to the correct location
ls -la prisma/generated/prisma/client
```

### Phase 2: Database Migration (Maintenance Window)

#### Step 5: Enable Maintenance Mode
```bash
# Put application in maintenance mode to prevent new connections
# This is critical for the migration process
```

#### Step 6: Create Database Backup
```bash
# Create a fresh backup before running migrations
# Use your preferred backup method for Supabase
```

#### Step 7: Deploy Database Migrations
```bash
# Run migrations in production
npm run db:migrate:deploy
```

#### Step 8: Verify Migration Status
```bash
# Check that all migrations are applied
npx prisma migrate status
```

#### Step 9: Test Database Connectivity
```bash
# Run a simple database query to verify connectivity
# This can be done via a health check endpoint
```

#### Step 10: Disable Maintenance Mode
```bash
# Resume normal application operations
```

### Phase 3: Post-Deployment Validation

#### Step 11: Health Checks
- [ ] Verify application responds to health checks
- [ ] Test database read operations
- [ ] Test database write operations
- [ ] Verify API endpoints are functioning
- [ ] Check for any error logs in application logs

#### Step 12: Monitoring
- [ ] Monitor database connection pool metrics
- [ ] Monitor API response times
- [ ] Monitor error rates
- [ ] Check for any unusual patterns in logs

## Rollback Procedure

### Immediate Rollback (Code Issues)
If issues are detected in Phase 1 (before database migration):

1. **Revert Code Changes**
   ```bash
   git revert <commit-hash>
   # Redeploy previous version
   ```

2. **Restore Previous Dependencies**
   ```bash
   npm install
   ```

3. **Generate Previous Client**
   ```bash
   npm run db:generate
   ```

### Database Rollback (Migration Issues)
If issues are detected in Phase 2 (after database migration):

1. **Restore Database Backup**
   ```bash
   # Restore from the backup created in Step 6
   ```

2. **Revert Code Changes**
   ```bash
   git revert <commit-hash>
   npm install
   npm run db:generate
   ```

3. **Verify Restoration**
   ```bash
   npx prisma migrate status
   ```

## Important Notes

### 1. Driver Adapter Configuration
The new Prisma 7 requires the `@prisma/adapter-pg` driver adapter. The client instantiation has been updated to use this adapter with the `DATABASE_URL` connection string.

### 2. Connection Pool Changes
Prisma 7 uses the underlying Node.js database driver's connection pool settings, which may differ from Prisma 6 defaults. If you experience timeout issues, configure the adapter to match v6 behavior:

```typescript
const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
  connectionTimeout: 5000, // 5 seconds (v6 default)
});
```

### 3. SSL Certificate Validation
SSL certificate defaults have changed in Prisma 7. If you encounter SSL errors, you may need to:

```typescript
const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});
```

### 4. Generated Client Location
The Prisma client is now generated at `./prisma/generated/prisma/client` instead of `node_modules/@prisma/client`. All imports have been updated to reflect this change.

### 5. Migration Command Changes
- `prisma migrate dev` - Development migrations (uses DIRECT_URL)
- `prisma migrate deploy` - Production migrations (uses DIRECT_URL)
- `prisma.config.ts` - Required for all migration operations

## CI/CD Integration

### GitHub Actions / Netlify Configuration
Update your CI/CD pipeline to:

1. **Generate Client During Build**
   ```yaml
   - run: npm install
   - run: npm run db:generate
   ```

2. **Deploy Migrations in Production**
   ```yaml
   - run: npm run db:migrate:deploy
   ```

3. **Set Environment Variables**
   ```yaml
   env:
     DATABASE_URL: ${{ secrets.DATABASE_URL }}
     DIRECT_URL: ${{ secrets.DIRECT_URL }}
   ```

## Post-Migration Monitoring

### Key Metrics to Monitor
1. Database connection pool utilization
2. Query response times
3. Error rates (especially database-related errors)
4. Memory usage (driver adapters may have different memory profiles)

### Alert Thresholds
- Connection pool usage > 80%
- Query response time > 2s (p95)
- Error rate > 1%
- Memory usage > 90% of allocated limit

## Support and Troubleshooting

### Common Issues

#### Issue: Client Import Errors
**Solution**: Ensure all imports use the new path `../../generated/prisma/client` instead of `@prisma/client`.

#### Issue: Migration Fails with Shadow Database Error
**Solution**: This is expected in production. Use `prisma migrate deploy` instead of `prisma migrate dev`.

#### Issue: Connection Timeouts
**Solution**: Configure connection timeout in the driver adapter (see Important Notes #2).

#### Issue: SSL Certificate Errors
**Solution**: Configure SSL settings in the driver adapter (see Important Notes #3).

### Emergency Contacts
- Database Administrator: [Contact Info]
- DevOps Team: [Contact Info]
- Development Team: [Contact Info]

## Completion Checklist

### Deployment
- [ ] Code changes deployed
- [ ] Prisma client generated
- [ ] Database migrations applied
- [ ] Application health checks passing
- [ ] Monitoring showing normal operation

### Validation
- [ ] Unit tests passing
- [ ] Integration tests passing
- [ ] E2E tests passing
- [ ] Manual testing completed
- [ ] Performance benchmarks validated

### Documentation
- [ ] Runbook updated
- [ ] Team notified of changes
- [ ] Monitoring alerts configured
- [ ] Rollback procedure tested

## Appendix

### Migration Timeline
- **Estimated Deployment Time**: 15-30 minutes
- **Maintenance Window**: 30-60 minutes (including rollback buffer)
- **Monitoring Period**: 24 hours post-deployment

### Changed Files
1. `package.json` - Updated dependencies
2. `tsconfig.json` - Updated module configuration
3. `prisma.config.ts` - New configuration file
4. `prisma/schema.prisma` - Updated generator configuration
5. `src/lib/prisma.ts` - Updated client instantiation
6. `prisma/seed.ts` - Updated client instantiation
7. Multiple API files - Updated import paths

### References
- [Prisma 7 Upgrade Guide](https://www.prisma.io/docs/guides/upgrade-prisma-orm/v7)
- [Prisma Config Reference](https://www.prisma.io/docs/orm/reference/prisma-config-reference)
- [Driver Adapter Documentation](https://www.prisma.io/docs/orm/prisma-client/setup-and-configuration/databases-connections/driver-adapters)
