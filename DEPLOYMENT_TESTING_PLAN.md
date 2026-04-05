# Deployment Plan: Salary Adjustment Feature Testing

## Testing Strategy

### Phase 1: Pre-Deployment Verification ✅
- [x] Code changes reviewed
- [x] 17 unit tests passed locally
- [x] No breaking changes
- [x] Backward compatible

### Phase 2: Server Deployment (IN PROGRESS)

Your options for testing before merging:

#### Option A: Deploy Feature Branch to Staging (Recommended)
```bash
# On server, checkout feature branch
git fetch origin feature/actualizacion-salarial
git checkout feature/actualizacion-salarial
# Server runs with salary adjustment feature active
# (Keep main branch untouched as backup)
```

#### Option B: Deploy Feature Branch to Production with Rollback Plan
```bash
# Same as Option A but on production server
# Keep main branch tag (v1.0.0) available for quick rollback
git checkout feature/actualizacion-salarial
# After testing, either:
#   - Merge: git checkout main && git pull
#   - Rollback: git checkout main (reverts to v1.0.0)
```

#### Option C: Merge to Main AFTER Testing
```bash
# 1. Deploy feature branch to server → test → verify
# 2. Once confirmed working → approve PR #1
# 3. Merge to main
# 4. Pull latest main on server
```

## Testing Checklist

### 1. UI Testing
- [ ] New "📈 Actualización salarial" section appears
- [ ] Section expands/collapses correctly
- [ ] "＋ Añadir cambio salarial" button works
- [ ] Can add multiple adjustments
- [ ] Can delete adjustments with ✕ button

### 2. Functionality Testing
Test Cases:
```
✓ Single adjustment (July raise from €30k to €36k)
  - Verify annual gross = €33,500 (not €36,000)
  - Check SS increased appropriately
  - Check IRPF reflects higher income

✓ Multiple adjustments
  - Jan-Apr: €24,000
  - May-Aug: €30,000
  - Sep-Dec: €36,000
  - Verify total = €31,500

✓ Adjustment + Bonus same month
  - June adjustment to €36,000
  - June bonus: €2,000
  - Verify June shows both

✓ Non-retroactive behavior
  - Adjust June salary
  - Verify Jan-May unaffected
  - Only Jun-Dec changed
```

### 3. Integration Testing
- [ ] Works with bonus puntuales
- [ ] Works with retribución en especie
- [ ] SS calculations correct (min/max capping)
- [ ] IRPF calculations correct
- [ ] Monthly view shows adjustments clearly
- [ ] All totals (SS, IRPF, Neto, Coste) updated correctly
- [ ] 14 pagas configuration works
- [ ] Different grupos de cotización work

### 4. Edge Cases
- [ ] Very high salary (€150,000+)
- [ ] Very low salary
- [ ] Solo adjustment (January)
- [ ] Many adjustments (6+ different levels)
- [ ] Decimal values work
- [ ] Comma/period decimal separators both work

## How to Deploy to Server

### Quick Deployment to server.mario.gal

```bash
# SSH to server
ssh user@server.mario.gal

# Go to app directory
cd /path/to/app

# Method 1: Fetch and checkout feature branch
git fetch origin feature/actualizacion-salarial
git checkout feature/actualizacion-salarial

# Method 2: Or create staging environment
git status
# Verify you're running the feature branch

# Reload web server if needed
sudo systemctl restart nginx  # or apache2
# or if using Node.js:
sudo systemctl restart calculadora-irpf
```

### Verification After Deployment

```bash
# On server, verify files are correct
ls -la index.html js/app.js
git log --oneline -3  # Should show salary adjustment commit

# Check web server is running
curl http://localhost
# Should return HTML with 📈 Actualización salarial section
```

### Rollback if Issues Found

```bash
# Quick rollback to main/v1.0.0
git checkout main
git pull origin main
# Reload web server
sudo systemctl restart nginx
```

## Testing Report Template

Use this after testing on server:

```markdown
# Testing Results: Salary Adjustment Feature

## Environment
- Server: server.mario.gal
- Date: [YYYY-MM-DD]
- Tester: [name]

## UI Tests
- [ ] Section appears: PASS / FAIL
- [ ] Add button works: PASS / FAIL
- [ ] Delete works: PASS / FAIL
- [ ] Month selector: PASS / FAIL

## Functionality Tests

### Test 1: Single Adjustment July
- Input: Base €30k, adjust to €36k from July
- Expected: Annual gross €33,500
- Result: PASS / FAIL ___________
- Notes: ___________

### Test 2: Multiple Adjustments
- Input: €24k (Jan-Apr), €30k (May-Aug), €36k (Sep-Dec)
- Expected: Annual gross €31,500
- Result: PASS / FAIL ___________

### Test 3: Non-retroactive
- Input: Adjust June salary
- Expected: Jan-May unchanged
- Result: PASS / FAIL ___________

## Integration Tests
- Works with bonuses: PASS / FAIL
- Works with especie: PASS / FAIL
- SS correct: PASS / FAIL
- IRPF correct: PASS / FAIL

## Overall Result
[ ] PASSED - Ready to merge to main
[ ] FAILED - Issues found (details below)

## Issues Found (if any)
1. ___________
2. ___________

## Recommendation
[ ] Merge PR #1 to main
[ ] Fix issues before merging
```

## Next Steps

### To Deploy for Testing:

1. **Stage 1 - Deploy to Server**
   ```bash
   # Tell me when you're ready and I'll provide exact commands
   # for your server setup
   ```

2. **Stage 2 - Test Using Checklist**
   ```bash
   # Use the testing checklist above
   # Test real scenarios with your data
   ```

3. **Stage 3 - Report & Approve PR**
   - If tests PASS → Approve PR #1 and merge to main
   - If tests FAIL → Report issues, I'll fix them on the feature branch

4. **Stage 4 - Deploy to Main in Production**
   ```bash
   git checkout main
   git pull origin main
   # Reload server
   ```

## Risk Assessment

### Risk Level: **LOW** ✅

Why?
- Purely additive feature (no changes to existing functionality)
- No changes to core IRPF/SS calculations
- Existing features (bonuses, especie) remain unchanged
- Automatic fallback: if issues found, simple `git checkout main`
- All 17 unit tests pass locally

### Rollback Time: **< 2 minutes**
```bash
git checkout main && git pull && sudo systemctl restart nginx
```

## Timeline

| Phase | Time | Status |
|-------|------|--------|
| Code implementation | ✅ Done | Complete |
| Testing on feature branch | ✅ Done | 17/17 tests pass |
| **Server deployment** | ⏳ TODO | Ready when you are |
| **Server testing** | ⏳ TODO | Use checklist |
| **Approval & merge** | ⏳ TODO | After tests pass |
| Live in production | ⏳ TODO | After merge |

---

## Questions?

- Where should I deploy? (staging server, prod, or local test?)
- What's the exact path on your server? (/var/www/html, /home/user/app, etc.)
- Who should I coordinate with for server access?
- Are there any specific test scenarios you want me to validate?

**Status: READY FOR SERVER TESTING** ✅

Feature branch: `feature/actualizacion-salarial`  
PR: #1 (awaiting your approval after testing)
