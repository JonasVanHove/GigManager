#!/usr/bin/env node
/**
 * Performance Profiling Script for GigManager v1.12.0
 * Measures bundle size, build time, runtime performance metrics
 * 
 * Usage: node scripts/profile-performance.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('\n🔍 GigManager v1.12.0 Performance Profiling\n');
console.log('='.repeat(60));

// 1. BUNDLE SIZE ANALYSIS
console.log('\n📦 1. Bundle Size Analysis\n');

try {
  const nextBuildOutput = fs.readFileSync('.next/build-manifest.json', 'utf-8');
  const buildManifest = JSON.parse(nextBuildOutput);
  
  console.log('✓ Build manifest analyzed');
  
  // Check for bundle size warnings
  const pageFiles = Object.entries(buildManifest.pages || {});
  const maxSize = 244 * 1024; // 244KB recommended max
  
  let totalSize = 0;
  let oversizedFiles = [];
  
  pageFiles.forEach(([page, files]) => {
    files.forEach(file => {
      if (typeof file === 'string' && file.endsWith('.js')) {
        const filePath = path.join('.next', file);
        if (fs.existsSync(filePath)) {
          const size = fs.statSync(filePath).size;
          totalSize += size;
          
          if (size > maxSize) {
            oversizedFiles.push({
              file: path.basename(file),
              size: (size / 1024).toFixed(2),
              kb: maxSize / 1024
            });
          }
        }
      }
    });
  });
  
  console.log(`\n  Total JavaScript: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);
  
  if (oversizedFiles.length > 0) {
    console.warn('\n⚠️  Files exceeding 244KB:');
    oversizedFiles.forEach(f => {
      console.warn(`  - ${f.file}: ${f.size}KB (max: ${f.kb}KB)`);
    });
  } else {
    console.log('\n✓ All files within size limits');
  }
} catch (error) {
  console.log('⚠️  Build manifest not found (run npm run build first)');
}

// 2. BUILD TIME
console.log('\n\n⏱️  2. Build Time Analysis\n');

const startTime = Date.now();
console.log('Running production build...');

try {
  execSync('npm run build', { stdio: 'pipe' });
  const buildTime = Date.now() - startTime;
  const minutes = Math.floor(buildTime / 60000);
  const seconds = ((buildTime % 60000) / 1000).toFixed(1);
  
  console.log(`✓ Build completed in: ${minutes}m ${seconds}s`);
  
  if (buildTime > 180000) {
    console.warn('⚠️  Build time exceeds 3 minutes');
  } else if (buildTime < 60000) {
    console.log('✓ Build time is optimal');
  }
} catch (error) {
  console.error('✗ Build failed');
}

// 3. CODE METRICS
console.log('\n\n📊 3. Code Metrics\n');

try {
  // Count TypeScript/JSX files
  const srcDir = 'src';
  const getFileCount = (dir, ext) => {
    let count = 0;
    const files = fs.readdirSync(dir, { recursive: true });
    files.forEach(file => {
      if (file.endsWith(ext)) count++;
    });
    return count;
  };
  
  const components = getFileCount(srcDir, '.tsx');
  const libs = getFileCount(srcDir, '.ts') - components;
  const apiRoutes = fs.readdirSync('src/app/api', { recursive: true })
    .filter(f => f.endsWith('route.ts')).length;
  
  console.log(`Components (.tsx): ${components}`);
  console.log(`Utilities (.ts): ${libs}`);
  console.log(`API Routes: ${apiRoutes}`);
  console.log(`\n✓ Codebase metrics collected`);
} catch (error) {
  console.log('⚠️  Could not collect code metrics');
}

// 4. DEPENDENCY ANALYSIS
console.log('\n\n📚 4. Dependencies Analysis\n');

try {
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf-8'));
  const depCount = Object.keys(pkg.dependencies).length;
  const devDepCount = Object.keys(pkg.devDependencies).length;
  
  console.log(`Production Dependencies: ${depCount}`);
  console.log(`Dev Dependencies: ${devDepCount}`);
  
  // Check for large dependencies
  const largePackages = [
    'moment', // Often criticized for size
    'lodash', // Large utility library
    'moment-timezone'
  ];
  
  const installedLarge = largePackages.filter(pkg => 
    pkg.dependencies[pkg] || pkg.devDependencies[pkg]
  );
  
  if (installedLarge.length > 0) {
    console.warn(`\n⚠️  Large packages installed:`);
    installedLarge.forEach(p => console.warn(`  - ${p}`));
  } else {
    console.log('\n✓ No known large packages detected');
  }
} catch (error) {
  console.log('⚠️  Could not analyze dependencies');
}

// 5. LIGHTHOUSE METRICS TARGETS
console.log('\n\n🎯 5. Lighthouse Performance Targets\n');
console.log('  Performance:  ≥ 90');
console.log('  Accessibility: ≥ 95');
console.log('  Best Practices: ≥ 90');
console.log('  SEO: ≥ 90');
console.log('\n  💡 Run: npm run build, then use PageSpeed Insights');
console.log('     https://pagespeed.web.dev/');

// 6. OPTIMIZATION RECOMMENDATIONS
console.log('\n\n💡 6. Optimization Recommendations\n');

const recommendations = [
  '✓ Use Next.js Image component for photo uploads',
  '✓ Implement virtualization for 100+ gig lists',
  '✓ Consider code splitting for PhotoAnnotationEditor',
  '✓ Lazy-load CalendarView (expensive library)',
  '✓ Monitor IndexedDB usage (photos can be large)',
  '✓ Use React.memo for GigCard when list is long',
  '✓ Implement requestIdleCallback for heavy computations'
];

recommendations.forEach(r => console.log('  ' + r));

// 7. RUNTIME PERFORMANCE CHECKLIST
console.log('\n\n⚡ 7. Runtime Performance Checklist\n');

const checklist = [
  '[ ] First Contentful Paint (FCP) < 1.8s',
  '[ ] Largest Contentful Paint (LCP) < 2.5s',
  '[ ] Cumulative Layout Shift (CLS) < 0.1',
  '[ ] Time to Interactive (TTI) < 3.8s',
  '[ ] Memory usage stable (no leaks)',
  '[ ] List scrolling 60fps (no jank)',
  '[ ] Modal open/close <100ms',
  '[ ] Filter changes <50ms',
  '[ ] Drawing canvas 60fps smoothly',
  '[ ] Network requests complete in <2s'
];

checklist.forEach(item => console.log('  ' + item));

// 8. DATABASE PERFORMANCE
console.log('\n\n🗄️  8. Database Performance Checklist\n');

const dbChecklist = [
  '[ ] Gig queries with indexes return <100ms',
  '[ ] Note queries return <50ms',
  '[ ] Bulk operations batch efficiently',
  '[ ] No N+1 query problems',
  '[ ] Connection pooling active',
  '[ ] Migration scripts fast (<5s)',
  '[ ] Backup/restore procedures documented'
];

dbChecklist.forEach(item => console.log('  ' + item));

// SUMMARY
console.log('\n\n' + '='.repeat(60));
console.log('\n✅ Performance Profiling Complete!\n');
console.log('Next Steps:');
console.log('  1. Review bundle sizes above');
console.log('  2. Run Lighthouse audit (npm run build, then PageSpeed Insights)');
console.log('  3. Test on throttled network (DevTools > Network)');
console.log('  4. Check dark mode performance');
console.log('  5. Verify mobile performance on real device\n');
