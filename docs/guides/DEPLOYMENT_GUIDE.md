# Deploy to Server for Testing

## Overview

You're about to test the salary adjustment feature on your server before merging to production. This guide walks you through the process.

## Prerequisites

Before you start, make sure you have:
- ✅ SSH access to server.mario.gal
- ✅ Git installed on server
- ✅ Python 3.8+ installed
- ✅ Web server running (Nginx/Apache/Node.js)
- ✅ Feature branch pushed to GitHub ✅ (already done)

## Quick Deploy (5 minutes)

### Option 1: Using Deployment Script (Easiest)

```bash
# On your server
cd /path/to/calculadora-irpf

# Copy this script first, or:
wget https://raw.githubusercontent.com/MarioContrerasLara/Calculadora-IRPF/feature/actualizacion-salarial/scripts/deploy-feature.sh

# Make it executable
chmod +x scripts/deploy-feature.sh

# Run it
bash scripts/deploy-feature.sh
```

### Option 2: Manual Deployment (Step by Step)

If you prefer to do it step-by-step:

```bash
# 1. SSH to your server
ssh mario@server.mario.gal

# 2. Go to your repo directory
cd /path/to/calculadora-irpf

# 3. Fetch the feature branch
git fetch origin feature/actualizacion-salarial

# 4. Checkout the feature branch
git checkout feature/actualizacion-salarial

# 5. Verify you're on the right branch
git branch -v
# Should show: * feature/actualizacion-salarial

# 6. Run automated tests (1,361 tests)
cd tests
python3 test_irpf.py
python3 test_actualizacion_salarial.py

# 7. Go back to root
cd ..

# 8. Restart your web server
sudo systemctl restart nginx
# Or if using Node.js:
# pm2 restart calculadora-irpf
# Or Apache:
# sudo systemctl restart apache2
```

## Verification

After deployment, verify everything is working:

### ✅ Check Branch
```bash
git branch -v
# Should show feature/actualizacion-salarial with ✓
```

### ✅ Check Tests
```bash
python3 tests/test_actualizacion_salarial.py
# Should show: ✅ ALL 17 TESTS PASSED
```

### ✅ Check Website
Open your browser:
```
http://server.mario.gal
```

Look for:
- ✅ New "📈 Actualización salarial" section appears
- ✅ Section is between "Bonus puntuales" and "Retribución en especie"
- ✅ "+ Añadir cambio salarial" button visible
- ✅ Can expand/collapse section

## Manual Testing

Now test the feature manually using the [TESTING_CHECKLIST.md](../../docs/guides/TESTING_CHECKLIST.md)

Quick tests:

### Test 1: Single Adjustment
1. Enter base salary: **30,000**
2. Click "+ Añadir cambio salarial"
3. Enter new salary: **36,000**
4. Select month: **Junio**
5. Click "Calcular nómina"
6. **Expected:** Annual gross = €33,500 (not €36,000)

### Test 2: Works with Bonus
1. Enter base salary: **30,000**
2. Add bonus: **2,000** in June
3. Add adjustment: **36,000** from June
4. **Expected:** June shows €5,000 (€3,000 salary + €2,000 bonus)

### Test 3: Non-Retroactive
1. Add adjustment for July
2. **Expected:** January-June unaffected, only July-December changed

(See [TESTING_CHECKLIST.md](../../docs/guides/TESTING_CHECKLIST.md) for comprehensive testing)

## Monitoring

### Check Logs
```bash
# If using Nginx
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log

# If using Node.js
pm2 logs calculadora-irpf

# If using Apache
sudo tail -f /var/log/apache2/error.log
```

### Check Server Health
```bash
# Verify service is running
sudo systemctl status nginx

# Test connectivity
curl http://localhost

# Check disk space
df -h

# Check memory
free -h
```

## If Tests Fail

### Tests Fail on Server

```bash
# 1. Check what's wrong
python3 tests/test_actualizacion_salarial.py

# 2. See detailed error
python3 tests/test_actualizacion_salarial.py -v

# 3. Check Python version
python3 --version
# Should be 3.8+

# 4. Look at logs
less tests/test_reports.txt
```

### Website Doesn't Load

```bash
# 1. Verify server is running
sudo systemctl status nginx

# 2. Check if process is listening
sudo netstat -tlnp | grep nginx

# 3. Check for configuration errors
sudo nginx -t

# 4. Restart
sudo systemctl restart nginx

# 5. Check error logs
sudo tail -50 /var/log/nginx/error.log
```

### Payment Issues in Calculator

- Check browser console: Press F12 → Console tab
- See if there are JavaScript errors
- Verify `js/app.js` was updated correctly

## Rollback (If Needed)

Quick rollback to main branch:

```bash
# 1. Go back to main
git checkout main

# 2. Pull latest
git pull origin main

# 3. Restart server
sudo systemctl restart nginx

# Done! Back to stable version
```

## When Testing is Complete

Once you've tested everything and confirmed it works:

### ✅ All Tests Pass

1. **Approve PR #1** on GitHub
   - Go to: https://github.com/MarioContrerasLara/Calculadora-IRPF/pull/1
   - Click [Approve] button
   - Click [Merge pull request] button

2. **Watch auto-tag happen**
   - Go to: GitHub → Actions tab
   - See "Auto Tag on Merge" workflow running
   - New tag v1.0.1 created automatically

3. **Deploy to Production**
   ```bash
   # On your server
   cd /path/to/calculadora-irpf
   git checkout main
   git pull origin main
   git describe --tags  # Verify new tag (v1.0.1)
   sudo systemctl restart nginx
   ```

### ❌ Issues Found

1. **Note what failed** in the testing
2. **Report the issue** (what test, what was wrong)
3. **Fix on feature branch** (I'll help)
4. **Tests run again automatically** on GitHub
5. **Re-test on server** after fix

## Helpful Commands

```bash
# See what branch you're on
git branch

# See commits on feature branch
git log --oneline -5

# See differences from main
git diff main..feature/actualizacion-salarial --stat

# See what files changed
git diff main..feature/actualizacion-salarial --name-only

# Show current line count
wc -l js/app.js

# Check file sizes
du -h *

# Compare with main branch
git diff main index.html | head -50
```

## Documentation While Testing

While testing, refer to these guides:

- **[TESTING_CHECKLIST.md](../../docs/guides/TESTING_CHECKLIST.md)** — Complete testing guide
- **[FEATURE_ACTUALIZACION_SALARIAL.md](../../docs/guides/FEATURE_ACTUALIZACION_SALARIAL.md)** — Feature details
- **[CI_CD_WORKFLOW.md](../../docs/guides/CI_CD_WORKFLOW.md)** — How the workflow works

## Support During Testing

If something goes wrong:

1. **Check logs** — `sudo tail -f /var/log/nginx/error.log`
2. **Check JavaScript console** — Browser F12 → Console
3. **Review test output** — Run tests again with details
4. **Compare with main** — `git diff main js/app.js`

## Timeline

```
NOW ⏱️
├─ Deploy feature branch (5 min)
├─ Run automated tests (2 min)
├─ Manual testing (15 min) ← You are here
├─ Review results
└─ Ready to approve & merge
   ├─ Approve PR (1 min)
   ├─ Auto-tag happens (1 min)
   └─ Deploy main to production (5 min)
```

---

## Status Checklist

- [ ] SSH'd to server
- [ ] Feature branch checked out
- [ ] Tests pass (1,361/1,361)
- [ ] Website loads
- [ ] New section appears
- [ ] Salary adjustment works
- [ ] No regressions
- [ ] Ready to approve PR

---

**Ready?** Start with Option 1 above, or let me know if you need help! 🚀
