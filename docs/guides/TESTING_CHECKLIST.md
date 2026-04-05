# Testing Checklist: Salary Adjustment Feature

Use this checklist when testing the salary adjustment feature on your server.

## Pre-Testing

- [ ] Deployed feature branch to server
- [ ] Server is running latest code
- [ ] No errors in server logs
- [ ] Can load calculator in browser

## UI Tests

### Section Appearance
- [ ] New "📈 Actualización salarial" section appears
- [ ] Section appears below "Bonus puntuales"
- [ ] Section appears above "Retribución en especie"
- [ ] Section is collapsible (can expand/collapse)
- [ ] Hint text visible: "Añade cambios salariales durante el año..."

### Adding Adjustments
- [ ] Click "+ Añadir cambio salarial" button works
- [ ] New row appears with input fields
- [ ] "Nuevo salario anual" input field present
- [ ] Month dropdown shows all 12 months
- [ ] Delete button (✕) present
- [ ] Can type in salary field
- [ ] Can select different months
- [ ] Can add multiple adjustments
- [ ] Each has delete button

### Removing Adjustments
- [ ] Click ✕ button removes row
- [ ] After removal, row is gone
- [ ] Can add new one after removing

## Functionality Tests

### Test 1: Single Mid-Year Raise (July)
```
Input:
  Base salary: 30,000
  Add adjustment: 36,000 from July
  No bonuses
  
Expected:
  Annual gross: 33,500
  (€2,500/mo × 6) + (€3,000/mo × 6)
  
Verification:
  - [ ] Annual gross shows 33,500
  - [ ] Monthly breakdown shows adjustment
  - [ ] SS increased
  - [ ] IRPF increased appropriately
```

### Test 2: Non-Retroactive (Jan-May Unchanged)
```
Input:
  Same as Test 1 (July adjustment)
  
Expected:
  - [ ] Jan-May months show €2,500/mo salary
  - [ ] Jun-Dec months show €3,000/mo salary
  - [ ] Only affects months >= July
```

### Test 3: Multiple Adjustments
```
Input:
  Jan-Apr: 24,000
  Add adjustment: 30,000 from May
  Add adjustment: 36,000 from September
  
Expected:
  Annual: 31,500
  (€2,000×4) + (€2,500×4) + (€3,000×4)
  
Verification:
  - [ ] Annual gross 31,500
  - [ ] Each adjustment applies at correct month
  - [ ] Totals correct
```

### Test 4: Adjustment + Bonus Same Month
```
Input:
  Base: 30,000
  Adjustment: 36,000 from June
  Bonus: 2,000 in June
  
Expected:
  June shows both combined
  
Verification:
  - [ ] June monthly view shows: 3,000 + 2,000 = 5,000
  - [ ] Annual includes both
```

## Integration Tests

### Works with Bonuses
- [ ] Add bonus in one month
- [ ] Add adjustment in different month
- [ ] Both appear in calculations
- [ ] No conflicts or errors

### Works with Especie
- [ ] Add flexible especie items
- [ ] Add adjustments
- [ ] SS and IRPF both correct
- [ ] No calculation errors

### Different Groups (Cotización)
- [ ] Test with Grupo 1
- [ ] Test with Grupo 2
- [ ] Test with Grupo 3
- [ ] Test with Grupo 4 (default)
- [ ] Verify min/max SS bases applied correctly

### 12 vs 14 Pagas
- [ ] Test with 12 pagas
- [ ] Test with 14 pagas
- [ ] Monthly breakdown correct for each
- [ ] Adjustments still work

### Different Ages
- [ ] Test age "Menor de 65"
- [ ] Test age "Entre 65-74"
- [ ] Test age "75 o más"
- [ ] IRPF minimum amounts applied correctly

## Edge Cases

### Very High Salary
```
Input: 150,000 base salary
- [ ] No calculation errors
- [ ] SS base capped correctly (4,909.50)
- [ ] IRPF calculated
- [ ] No display overflows
```

### Very Low Salary
```
Input: 12,000 base salary
- [ ] Calculation works
- [ ] Minimum SS base applied (1,381.20)
- [ ] No errors
```

### High Adjustment
```
Input: 
  Base: 30,000
  Adjust to: 100,000 from June
- [ ] SS base capped at 4,909.50
- [ ] IRPF reflects high income
- [ ] No errors
```

### January Adjustment
```
Input: Adjust salary starting January
- [ ] Entire year uses adjusted salary
- [ ] No month unaffected
```

### Decimal Values
```
Input: 30,000.50
- [ ] Accepts decimal input
- [ ] Calculates correctly
- [ ] Displays properly
```

### Comma vs Period Decimals
```
Input: 30.000,50 (European format)
- [ ] Accepts and converts correctly
- [ ] Calculates as 30000.50
```

## Calculation Verification

### SS Calculation
- [ ] Base grows with salary adjustments
- [ ] Minimum base applied (1,381.20 for group 4)
- [ ] Maximum base capped (4,909.50)
- [ ] Monthly SS changed for adjusted months

### IRPF Calculation
- [ ] Uses total annual gross (includes adjustments)
- [ ] Minimum personal amount applied correctly
- [ ] Tax brackets calculated correctly
- [ ] Effective rate reflects higher income

### Montly View
- [ ] Shows regular months (ordinary case)
- [ ] Shows adjusted months (marked clearly)
- [ ] Shows months with bonus
- [ ] All totals correct

## Data Persistence

- [ ] After adding adjustments, refresh page
- [ ] Values still show (saved in form)
- [ ] Calculations still correct
- [ ] Can modify adjustment and values update

## No Regressions

### Existing Features Still Work
- [ ] Bonus puntuales still works
- [ ] Especie still works
- [ ] Different contract types work
- [ ] All existing calculations unchanged
- [ ] All existing tests still pass

### Browser Compatibility
- [ ] Firefox: works ✅
- [ ] Chrome: works ✅
- [ ] Safari: works ✅
- [ ] Mobile browser: works ✅

## Performance

- [ ] Calculations fast (< 100ms)
- [ ] No lag when typing salary
- [ ] No lag when selecting month
- [ ] Page responsive
- [ ] No memory leaks on repeated calculations

## Error Handling

### Invalid Inputs
- [ ] Empty salary field: ignored on calc
- [ ] Negative salary: filtered out
- [ ] Invalid month: can't happen (dropdown)
- [ ] Non-numeric input: cleaned/ignored

### Multiple Adjustments for Same Month
- [ ] Can add multiple for one month
- [ ] Last one applies (or combines?)
- [ ] No errors or crashes

## Final Sign-Off

- [ ] All tests above PASSED
- [ ] No regressions found
- [ ] Ready for production
- [ ] Ready to merge PR

---

## Summary

After completing all tests:

**If ALL PASS ✅**
→ Feature is ready
→ Approve and merge PR #1
→ GitHub Actions creates tag
→ Deploy to production

**If ANY FAIL ❌**
→ Note which tests failed
→ Report issues
→ Fix in code
→ Re-test

---

**Date Tested:** _______________  
**Tester:** _______________  
**All Tests Passed:** [ ] YES [ ] NO  
**Issues Found:** _______________
