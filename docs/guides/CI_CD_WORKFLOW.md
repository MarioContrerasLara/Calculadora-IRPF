# CI/CD Workflow & Automatic Tagging

## Quick Overview

Your new automated CI/CD pipeline:

```
Feature branch push → Tests run (1,361 tests) → Manual testing on server 
→ Approve & merge PR → Auto-tag created → Deploy to production
```

## The Process

### 1️⃣ Push to Feature Branch
```bash
git checkout feature/actualizacion-salarial
git push origin feature/actualizacion-salarial
```

**What happens automatically:**
- 🤖 GitHub Actions runs `test.yml`
- 🧪 Executes 1,361 tests (1,344 existing + 17 new)
- 📊 Shows results in PR checks

### 2️⃣ Deploy Feature to Your Server
```bash
# On your server
git fetch origin feature/actualizacion-salarial
git checkout feature/actualizacion-salarial
sudo systemctl restart nginx
```

### 3️⃣ Manual Testing (You)
Use the [TESTING_CHECKLIST.md](TESTING_CHECKLIST.md)

### 4️⃣ Approve & Merge PR (You)
```
GitHub.com → PR #1 → [Approve] → [Merge]
```

**What happens automatically:**
- 🤖 GitHub Actions runs `auto-tag.yml`
- 🏷️ Gets last tag (v1.0.0)
- 📈 Increments version (v1.0.1)
- ✅ Creates & pushes tag
- 🚫 NO Release created (optional, manual)

### 5️⃣ Deploy to Production (You)
```bash
# On production server
git checkout main
git pull origin main
git describe --tags  # Verify: v1.0.1
sudo systemctl restart nginx
```

## GitHub Actions Workflows

### `.github/workflows/test.yml`

**Runs on:**
- Push to `feature/*` branches
- Pull requests to `main` or `develop`

**Executes:**
- `python3 tests/test_irpf.py` (1,344 tests)
- `python3 tests/test_actualizacion_salarial.py` (17 tests)

**Reports:**
- Green ✅ or red ❌ in PR checks
- Blocks merge if tests fail

### `.github/workflows/auto-tag.yml`

**Runs on:**
- Push to `main` branch only (after merge)

**Does:**
- Reads last tag (e.g., v1.0.0)
- Increments patch version (→ v1.0.1)
- Creates annotated tag with message
- Pushes tag to GitHub repository

**Does NOT:**
- Create Release (manual if desired)
- Deploy automatically
- Skip on any branch except main

## Manual Controls (You Keep)

✅ When to deploy to server  
✅ When to test manually  
✅ When to approve PR  
✅ When to merge  
✅ When to deploy to production  
✅ Whether to create Release

## Checking Status

### Tests Running
```
GitHub.com → Actions tab → See workflow progress
```

### PR Checks
```
GitHub.com → PR #1 → Scroll to "Checks" section
See: ✅ Test - All tests passed (or ❌ failed)
```

### After Merge
```
GitHub.com → Actions tab → See "Auto Tag on Merge" running
GitHub.com → Tags → See new tag (v1.0.1)
```

## If Something Fails

### Test Failures
1. See error in Actions tab
2. Fix code locally
3. Push to feature branch
4. Tests run again automatically

### Need to Rollback After Merge
```bash
# Quickly revert the merge
git revert <merge-commit-hash> -m 1
git push origin main

# (Optional) Delete the tag
git push origin :refs/tags/v1.0.1
```

## Configuration

Both workflows are already configured and live in:
- `.github/workflows/test.yml`
- `.github/workflows/auto-tag.yml`

No additional setup needed! They work with default GitHub Actions permissions.

## Timeline Example

```
Day 1 - 8:00 AM
Push to feature branch
↓
8:05 AM - GitHub Actions tests run
↓
Day 2 - 10:00 AM - You
Test on server manually
↓
10:35 AM - You
Approve PR
↓
10:36 AM - GitHub Actions
Auto-creates tag v1.0.1
↓
11:00 AM - You  
Deploy v1.0.1 to production
↓
Feature live ✨
```

## Status: ✅ Ready

Everything is configured. Your workflow is:

1. **Develop & Test** - GitHub Actions handles
2. **Manual Testing** - You handle
3. **Approval** - You handle
4. **Merge** - You handle
5. **Auto-Tag** - GitHub Actions handles
6. **Deployment** - You handle

---

**For more details, see:**
- [TESTING_CHECKLIST.md](TESTING_CHECKLIST.md) — Manual testing guide
- [FEATURE_ACTUALIZACION_SALARIAL.md](FEATURE_ACTUALIZACION_SALARIAL.md) — Feature summary
