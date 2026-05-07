Release process — GigsManager

Goal: bump the version, run tests/build, and push a release to GitHub with a tag.

Recommended steps (manual):

1. Update version (patch/minor/major)
   - Use npm script to bump automatically (preferred):
     - `npm run release` (default patch release)
     - Patch: npm run release:patch
     - Minor: npm run release:minor
     - Major: npm run release:major
   - These scripts run `scripts/bump-version.js` which updates package.json and package-lock.json.

2. Verify changes locally

```bash
# install deps
npm ci
# run lint/tests
npm run lint
npm run test
# build (this will regenerate versioned assets)
npm run build
```

3. Commit & push

If you used the release scripts, they call `git add -A`. Otherwise:

```bash
git add package.json package-lock.json src/lib/version.ts
git commit -m "chore(release): bump version to vX.Y.Z"
```

Push and tag (if not handled by postversion):

```bash
git push origin main
git tag -a vX.Y.Z -m "Release vX.Y.Z"
git push origin vX.Y.Z
```

4. Create GitHub Release

- Open the pushed tag in GitHub (https://github.com/your-org/your-repo/releases).
- Draft a release using the tag and include the changelog/notes.

5. Post-release steps

- Deploy to your hosting provider (Netlify, Vercel, etc.) if deploy isn't automatic.
- Notify team/channel.

Notes
- The repo contains convenience scripts:
  - `npm run release:auto` — attempts to automatically determine next version and apply it.
  - `npm run release:auto:dry` — dry-run of the auto release script.
- The canonical single-command flow (if scripts are configured correctly):

```bash
npm run release:patch
npm run build
# postversion runs git push & git push --tags automatically
```

If you want, I can add a `Makefile` or GitHub Actions workflow to automate tagging and releasing.
