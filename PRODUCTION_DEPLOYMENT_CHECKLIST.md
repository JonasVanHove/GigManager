# v1.12.0 Production Deployment Checklist

**Release Date:** May 2026  
**Version:** 1.12.0  
**Environment:** Production (Netlify)

---

## 1. Code Quality & Build

- [ ] `npm run build` succeeds with 0 errors
- [ ] `npm run build` completes in <3 minutes
- [ ] No TypeScript errors (`npm run lint`)
- [ ] No ESLint warnings in core components
- [ ] All tests passing: `npm test`
  - [ ] Filter logic tests ✓
  - [ ] API endpoint tests ✓
  - [ ] Notes validation tests ✓
- [ ] Git branch is clean (no uncommitted changes)
- [ ] All commits squashed/organized for release
- [ ] Version bumped in package.json: 1.11.21 → 1.12.0

---

## 2. Database & Migrations

- [ ] Prisma migrations generated: `prisma migrate dev`
- [ ] Schema includes PhotoNote model with all fields
- [ ] PhotoNote indexes created:
  - [ ] userId index (query performance)
  - [ ] linkedBand index (filtering)
  - [ ] createdAt index (sorting)
- [ ] Cascade delete configured (orphaned notes cleanup)
- [ ] Migration tested on staging database
- [ ] Rollback procedure documented
- [ ] Database backup taken before deployment
- [ ] Connection pooling active in Supabase settings

**Database Verification:**
```sql
SELECT * FROM "PhotoNote" LIMIT 1; -- Should work
CREATE INDEX IF NOT EXISTS idx_photonote_userid ON "PhotoNote"(userId);
CREATE INDEX IF NOT EXISTS idx_photonote_linkedband ON "PhotoNote"(linkedBand);
CREATE INDEX IF NOT EXISTS idx_photonote_createdat ON "PhotoNote"(createdAt);
```

---

## 3. API Endpoints

### Notes Endpoints
- [ ] `POST /api/notes` creates with all fields
  - [ ] Returns 201 status
  - [ ] Includes full note object in response
  - [ ] Persists to database
  - [ ] Auth token required
- [ ] `GET /api/notes` lists user's notes
  - [ ] Returns array, ordered by updatedAt DESC
  - [ ] Limited fields (no raw strokes)
  - [ ] Auth protected
- [ ] `GET /api/notes/[id]` retrieves single note
  - [ ] Auth checks ownership
  - [ ] Returns correct fields
  - [ ] 404 if not found
- [ ] `PUT /api/notes/[id]` updates note
  - [ ] Accepts partial updates
  - [ ] Returns updated object
  - [ ] Auth checks ownership
- [ ] `DELETE /api/notes/[id]` removes note
  - [ ] Returns 204 or {success: true}
  - [ ] Note no longer accessible
  - [ ] Auth checks ownership

### Band Members Endpoint
- [ ] `GET /api/band-members` returns available bands
  - [ ] PhotoAnnotationEditor dropdown populates
  - [ ] Returns { name: string }[] format
  - [ ] No errors on empty band list

### Error Handling
- [ ] All endpoints return proper HTTP status codes
- [ ] 400 Bad Request for invalid input
- [ ] 401 Unauthorized without token
- [ ] 403 Forbidden for ownership violations
- [ ] 404 Not Found for missing resources
- [ ] 500 Server errors logged to console
- [ ] 503 Service Unavailable handled gracefully (retry logic)

**Test Commands:**
```bash
# Create note
curl -X POST http://localhost:3000/api/notes \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"linkedBand":"Band A","notes":[],"strokes":[]}'

# List notes
curl http://localhost:3000/api/notes \
  -H "Authorization: Bearer TOKEN"

# Update note
curl -X PUT http://localhost:3000/api/notes/NOTE_ID \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"linkedBand":"Band B"}'

# Delete note
curl -X DELETE http://localhost:3000/api/notes/NOTE_ID \
  -H "Authorization: Bearer TOKEN"
```

---

## 4. Feature Verification

### Photo Notes
- [ ] Upload photo functionality works
- [ ] Band dropdown populates from database
- [ ] Fullscreen drawing mode toggles
- [ ] Drawing strokes render smoothly
- [ ] Color picker changes ink color
- [ ] Line width slider adjusts stroke width
- [ ] Undo button removes last stroke
- [ ] Clear button erases all drawing
- [ ] Save button persists to database
- [ ] Loading state shows during save
- [ ] Toast notification confirms save
- [ ] Notes reload correctly after page refresh
- [ ] Multiple notes per gig supported

### Filters (AllGigsTab)
- [ ] Charity filter works correctly
  - [ ] Only checked: shows charity gigs only
  - [ ] Only tentative checked: shows tentative only
  - [ ] Both checked: shows all
  - [ ] Both unchecked: shows regular only
- [ ] Payment status filters work
- [ ] Artist filters work
- [ ] Combinations work (AND logic)
- [ ] Filter count displays correctly
- [ ] "Clear all" resets filters

### Filters (CalendarView)
- [ ] Charity filter same as AllGigsTab
- [ ] Tentative filter added and working
- [ ] Payment filters present
- [ ] Calendar updates when filters change
- [ ] Event colors reflect gig type

### Calendar Navigation
- [ ] Today button jumps to current date
- [ ] Month dropdown shows 5-year range
- [ ] Previous/Next arrows navigate correctly
- [ ] Year dropdown independent of month
- [ ] All navigation persists selected month/year
- [ ] Calendar events display for selected period

---

## 5. Performance & Optimization

### Build Performance
- [ ] Production build time: <3 minutes
- [ ] Bundle size monitoring
  - [ ] No unexpected growth
  - [ ] Main chunk <244KB
  - [ ] Vendor chunks analyzed

### Runtime Performance
- [ ] First Contentful Paint (FCP) <1.8s
- [ ] Largest Contentful Paint (LCP) <2.5s
- [ ] Cumulative Layout Shift (CLS) <0.1
- [ ] Time to Interactive (TTI) <3.8s
- [ ] List scrolling smooth (60fps)
- [ ] Modal animations smooth
- [ ] No memory leaks detected
- [ ] IndexedDB storage limits reasonable

### Network Performance
- [ ] API responses <500ms
- [ ] CSS/JS compressed
- [ ] Images optimized
- [ ] 503 retry logic working
- [ ] Offline mode graceful

**Test Commands:**
```bash
# Lighthouse audit
npm run build
# Use Chrome DevTools > Lighthouse

# Bundle analysis
npm run build
# Analyze .next/build-manifest.json

# Performance profiling
node scripts/profile-performance.js
```

---

## 6. Security & Authentication

- [ ] Auth tokens validated on all protected routes
- [ ] Ownership checks on note endpoints
- [ ] No sensitive data in logs
- [ ] No SQL injection vulnerabilities
- [ ] CORS properly configured
- [ ] Environment variables secured
  - [ ] DATABASE_URL not exposed
  - [ ] API keys not in frontend code
  - [ ] Supabase keys properly scoped
- [ ] Rate limiting considered
- [ ] XSS protections in place
- [ ] CSRF tokens if applicable

---

## 7. Browser & Device Compatibility

### Desktop Browsers
- [ ] Chrome/Edge (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)

### Mobile Browsers
- [ ] Chrome Mobile
- [ ] Safari iOS
- [ ] Firefox Mobile
- [ ] Samsung Internet

### Devices Tested
- [ ] Desktop (Windows/Mac/Linux)
- [ ] iPhone (iOS latest)
- [ ] Android phone
- [ ] iPad/Tablet
- [ ] Low-end device (throttled network)

### Responsive Design
- [ ] Mobile (<480px) layouts correct
- [ ] Tablet (768px-1024px) optimized
- [ ] Desktop (>1024px) full experience
- [ ] No horizontal scrolling
- [ ] Touch targets ≥44px
- [ ] Fullscreen drawing works on mobile

---

## 8. Accessibility

- [ ] Keyboard navigation works (Tab, Enter, Space)
- [ ] Screen reader announces UI correctly
- [ ] Color contrast ratios sufficient (WCAG AA)
- [ ] Focus indicators visible
- [ ] Alt text on images present
- [ ] Form labels associated with inputs
- [ ] Error messages descriptive
- [ ] Loading states announced
- [ ] Modal focus trap working
- [ ] Semantic HTML used

---

## 9. Dark Mode Testing

- [ ] All components visible in dark mode
- [ ] Text readable (sufficient contrast)
- [ ] Backgrounds properly styled
- [ ] Buttons/inputs visible
- [ ] Modals display correctly
- [ ] Photos render well over dark bg
- [ ] Animations smooth in dark mode
- [ ] No color bleeding

---

## 10. Error Handling & Edge Cases

- [ ] Empty lists show appropriate message
- [ ] 404 pages graceful
- [ ] Network errors show retry option
- [ ] 503 errors trigger auto-retry
- [ ] Offline detection works
- [ ] Large file uploads rejected safely
- [ ] Rapid filter clicks handled smoothly
- [ ] Concurrent saves don't conflict
- [ ] Drawing canvas handles rapid input
- [ ] No console errors in production

---

## 11. Deployment Steps

### Pre-Deployment
- [ ] All changes committed to main branch
- [ ] Version tag created: `git tag v1.12.0`
- [ ] Release notes written
- [ ] Staging deployment verified
- [ ] QA sign-off obtained

### Deployment
- [ ] Push to main branch
- [ ] Netlify build starts automatically
- [ ] Build completes successfully
- [ ] Site deploys to production
- [ ] DNS/CDN verified
- [ ] SSL certificate valid

### Post-Deployment
- [ ] Site loads in production
- [ ] Features work end-to-end
- [ ] Database migrations applied
- [ ] Analytics tracking active
- [ ] Error monitoring active
- [ ] Performance monitoring active
- [ ] User communication sent (if needed)

---

## 12. Monitoring & Observability

### Error Monitoring
- [ ] Sentry/similar error tracking active
- [ ] Errors properly categorized
- [ ] Team alerts configured

### Performance Monitoring
- [ ] Core Web Vitals tracked
- [ ] API response times monitored
- [ ] Database performance tracked
- [ ] Memory usage watched

### User Analytics
- [ ] Conversion tracking active
- [ ] Feature usage measured
- [ ] User flow tracked

---

## 13. Documentation

- [ ] README.md updated with v1.12.0 features
- [ ] API documentation current
- [ ] Database schema documented
- [ ] Deployment procedure documented
- [ ] Rollback procedure documented
- [ ] Known issues logged
- [ ] Migration guide for users provided

---

## 14. Sign-Off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Developer | | | |
| QA | | | |
| Product Owner | | | |
| DevOps/SRE | | | |

---

## Rollback Plan

If deployment fails:

1. **Immediate Actions:**
   - [ ] Revert DNS if needed
   - [ ] Trigger rollback to v1.11.21
   - [ ] Verify previous version works
   - [ ] Notify stakeholders

2. **Post-Rollback Investigation:**
   - [ ] Identify root cause
   - [ ] Review error logs
   - [ ] Document findings
   - [ ] Plan fix

3. **Retry:**
   - [ ] Apply fixes
   - [ ] Redeploy to staging
   - [ ] Full QA re-test
   - [ ] Attempted production deployment

**Rollback Command:**
```bash
git checkout v1.11.21
npm run build
# Deploy via Netlify or manual
```

---

## Release Notes Template

```markdown
# v1.12.0 Release Notes

## ✨ New Features
- Photo annotation with drawing mode
- Band linking for notes
- Enhanced filtering (charity/tentative)
- Calendar date navigation (month/year dropdowns)

## 🐛 Bug Fixes
- Fixed charity/tentative filter logic
- Improved 503 error handling

## 📈 Performance
- Optimized bundle size
- Improved filter responsiveness

## 🔒 Security
- Enhanced auth validation

## 🙏 Thanks
Special thanks to testers and contributors!
```

---

**Status:** ⏳ Pending Deployment  
**Last Updated:** 2026-05-12  
**Next Review:** After v1.12.0 deployment
