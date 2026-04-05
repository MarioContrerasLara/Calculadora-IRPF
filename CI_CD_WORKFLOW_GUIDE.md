# CI/CD Workflow: Feature Testing & Auto-Tagging

## Overview

This workflow automates testing and tagging while keeping manual control of approvals:

```
📝 Push to feature branch
    ↓
🧪 GitHub Actions: Run tests
    ↓
🖥️ Manual testing on server (you)
    ↓
✅ Ready? Create PR (or approve existing)
    ↓
🤖 GitHub Actions: Validate PR tests pass
    ↓
👤 You: Approve PR manually
    ↓
🔀 Merge to main
    ↓
🏷️ GitHub Actions: Auto-create git tag
    ↓
✅ Done (tag created, no release)
```

## GitHub Actions Workflows

### 1. **test.yml** - Runs on Feature Branches & PRs

**Trigger:** Any push to feature branches or pull requests to main

**What it does:**
- Checks out code
- Runs existing test suite (`test_irpf.py`)
- Runs salary adjustment tests (`test_actualizacion_salarial.py`)
- Reports results

**Status:** ✅ Shows green/red in PR checks

### 2. **auto-tag.yml** - Runs on Merge to Main

**Trigger:** Push to main branch (only happens on merge)

**What it does:**
- Gets last git tag (e.g., v1.0.0)
- Increments patch version (v1.0.0 → v1.0.1)
- Creates new tag automatically
- **Does NOT create Release** (manual step if needed)

**Result:** New tag pushed to GitHub, visible in git history

## Complete Workflow for Your Feature

### Step 1: Deploy Feature to Server (You)

```bash
# On your server
cd /path/to/repo
git fetch origin feature/actualizacion-salarial
git checkout feature/actualizacion-salarial
# Reload web server
sudo systemctl restart nginx
```

### Step 2: GitHub Actions Validates Code

**Automatic** - You don't need to do anything. GitHub Actions runs:
- Runs all tests
- Reports in feature branch commit

**Check here:** Go to GitHub → Actions tab → see test results

### Step 3: Manual Testing on Server (You)

Test the feature manually:
- ✅ UI appears correctly
- ✅ Add/remove adjustments works
- ✅ Calculations correct
- ✅ Works with bonuses
- ✅ Works with especie
- ✅ SS and IRPF correct

Use the [DEPLOYMENT_TESTING_PLAN.md](DEPLOYMENT_TESTING_PLAN.md) checklist.

### Step 4: Everything Good? Approve & Merge (You)

**Option A: PR Already Exists (Recommended)**

```
GitHub → Pull Requests → #1
  ↓
[Approve button] (click)
  ↓
[Merge pull request] (click)
```

**Option B: No PR Yet**

```bash
# Create PR from GitHub web interface:
GitHub → feature/actualizacion-salarial branch
  ↓
"Create pull request" button
  ↓
Review & Merge
```

### Step 5: Auto-Tag Happens (Automatic)

**Automatic** - GitHub Actions detects merge to main:

- Increments version (v1.0.0 → v1.0.1)
- Creates tag: `v1.0.1`
- Pushes to GitHub
- **NO Release created** (you can do manually if needed)

**Check here:** GitHub → Tags or run `git tag -l`

### Step 6: Deploy to Production (You)

```bash
# On production server
cd /path/to/repo
git checkout main
git pull origin main
# Verify new tag exists
git describe --tags
# Reload web server
sudo systemctl restart nginx
```

## GitHub Actions Status Badges

### In PR Checks

When you open/update a PR, you'll see:
```
✅ Test — All tests passed
```
or
```
❌ Test — Some tests failed
```

Click the details to see what failed.

### In Commit History

Each commit shows test status:
```
📝 Your commit message
  ✅ Test passed
  ↓
  🏷️ Auto-tagged as v1.0.1 (when merged to main)
```

## Important Notes

### ⚠️ Auto-Tagging Rules

- **Only runs on merge to main** (feature branches don't create tags)
- **Automatic version increment**:
  - v1.0.0 → v1.0.1 (patch bump)
  - Never creates releases (tags only)
  - Timestamp: When merge happens

### ✅ Manual Controls You Keep

- ✅ You decide when to approve PR
- ✅ You decide when to merge
- ✅ You manually test on server
- ✅ You decide when to deploy to production

### 🚫 What's Automated

- 🤖 Test execution (always)
- 🤖 Version bumping (always on merge)
- 🤖 Tag creation (always on merge)
- 🚫 NOT: Release creation
- 🚫 NOT: Deployment to production
- 🚫 NOT: Approval (you do this)

## If Tests Fail

### In Test Workflow (On Feature Branch)

If tests fail in GitHub Actions:

1. See failure in Actions tab
2. Click details to see what failed
3. Fix the code locally
4. Push to feature branch
5. GitHub Actions runs again automatically
6. Repeat until tests pass

### In PR

PR will show ❌ if tests fail. Don't merge until green ✅.

## Commands You Can Run Anytime

### Check Git Tags

```bash
git tag -l
# Lists all tags

git describe --tags --abbrev=0
# Shows current tag
```

### Manual Tag Creation (if needed)

```bash
# Usually not needed (auto-created), but if you want:
git tag -a v1.0.2 -m "Manual tag"
git push origin v1.0.2
```

### Manual Release Creation (optional)

```bash
# If you want a Release after the tag:
gh release create v1.0.1 \
  --title "Version 1.0.1" \
  --notes "Salary adjustment feature" \
  --generate-notes
```

## File Locations

### GitHub Actions Configuration
```
.github/workflows/
├── test.yml              ← Runs tests on feature branches & PRs
└── auto-tag.yml          ← Creates tags on merge to main
```

### Test Files
```
tests/
├── test_irpf.py                          ← Existing tests (1,344 tests)
└── test_actualizacion_salarial.py        ← New feature tests (17 tests)
```

## Timeline Example

### For Your Salary Adjustment Feature

```
Day 1 - Development
  08:00 - Push to feature/actualizacion-salarial
  08:05 - GitHub Actions runs tests ✅
  08:10 - Deploy feature branch to server
  
Day 2 - Manual Testing
  10:00 - Test salary adjustments on server
  10:30 - All working ✅
  10:35 - Approve PR #1 on GitHub
  10:36 - Merge PR #1 to main
  10:37 - GitHub Actions auto-creates tag v1.0.1 🏷️
  10:40 - Deploy main to production
  11:00 - Users have new feature ✨
```

## Monitoring

### GitHub Actions Dashboard

```
GitHub → Your Repo → Actions tab
```

Shows:
- Test workflow results
- Auto-tag workflow results
- Build history
- Any failures with details

### Watch for Notifications

GitHub sends notifications:
- ✅ Tests passed
- ❌ Tests failed
- 🏷️ Tag created
- 📝 Mentions / reviews on PR

## Troubleshooting

### Tests Pass Locally But Fail in GitHub Actions?

1. Check Python version in Actions (3.8+)
2. Check if all dependencies installed
3. Add pip install step if needed

### Tag Not Created After Merge?

1. Check Actions tab for auto-tag.yml workflow
2. If failed, see error log
3. Can manually create tag: `git tag v1.0.1 && git push origin v1.0.1`

### Need to Push Feature Branch to Server?

```bash
# After setting workflows, still manually deploy:
git checkout feature/actualizacion-salarial
git pull origin feature/actualizacion-salarial
# Run tests locally if you want: python3 tests/test_actualizacion_salarial.py
# Then reload server
```

## When to Create Releases

If you want actual GitHub Releases (with notes, downloads):

After merge and tag is auto-created:
```bash
gh release create v1.0.1 \
  --title "Version 1.0.1 - Salary Adjustments" \
  --notes "Features: Salary adjustments, multi-level support, etc."
```

Or do it manually on GitHub web interface:
```
GitHub → Tags → v1.0.1 → Create Release
```

## Summary

| What | Who | When |
|------|-----|------|
| Run tests | GitHub Actions 🤖 | On every push to feature |
| Manual test | You 👤 | After deploy to server |
| Approve PR | You 👤 | When ready to merge |
| Merge PR | You 👤 | When tests pass + approval ready |
| Create tag | GitHub Actions 🤖 | Automatically after merge |
| Create release | You 👤 | Optional, manual |

---

**Status:** CI/CD workflows set up ✅  
**Next:** Push workflows to main and test the process  
**Manual:** You control each approval step
