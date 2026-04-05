# Actualización Salarial (Salary Adjustment Feature)

## Overview

The **Actualización Salarial** (Salary Adjustment) feature allows users to change their salary at any point during the year. This is useful for employees who receive mid-year raises, bonuses, or salary changes due to promotions or contract modifications.

## Feature Goals

- ✅ Support multiple salary levels within a single year
- ✅ Automatically recalculate SS contributions with adjusted salaries
- ✅ Properly calculate IRPF based on total annual income
- ✅ Account for salary changes in monthly breakdown views
- ✅ Work seamlessly with bonuses and benefits in especie

## User Interface

### Location

The salary adjustment section is located in the main form, immediately after the "Bonus puntuales" section and before "Retribución en especie".

### Components

```
📈 Actualización salarial (opcional)
├─ Instructions: "Añade cambios salariales durante el año. Cada ajuste reemplaza 
│  el salario base desde el mes indicado en adelante."
├─ Empty list container (populated as adjustments are added)
├─ "+ Añadir cambio salarial" button
```

### Adding a Salary Adjustment

1. Click **"＋ Añadir cambio salarial"**
2. A new row appears with:
   - **Nuevo salario anual (€)** — Input field for new annual salary
   - **Month selector** — Dropdown with months (Enero through Diciembre)
   - **Delete button (✕)** — Remove this adjustment
3. Enter the new salary amount and select the starting month
4. The calculator automatically recalculates when you change values
5. Repeat to add multiple adjustments

### Example Usage

**Scenario:** Employee has a base salary of €30,000 but gets a raise to €36,000 from June

1. Enter base salary: **€30,000**
2. Click "+ Añadir cambio salarial"
3. Enter: Nuevo salario anual: **€36,000**
4. Select month: **Junio**
5. See results update automatically

## Calculation Logic

### Per-Month Salary Determination

The feature maintains a map of salaries for each month (1-12):

```javascript
salarioPorMes {
  1: 30000,  // Jan: base salary
  2: 30000,  // Feb: base salary
  3: 30000,  // Mar: base salary
  4: 30000,  // Apr: base salary
  5: 30000,  // May: base salary
  6: 36000,  // Jun: adjusted salary (from adjustment)
  7: 36000,  // Jul: adjusted salary continues
  8: 36000,  // Aug: adjusted salary continues
  9: 36000,  // Sep: adjusted salary continues
  10: 36000, // Oct: adjusted salary continues
  11: 36000, // Nov: adjusted salary continues
  12: 36000  // Dec: adjusted salary continues
}
```

### Annual Gross Income Calculation

The total annual gross income is calculated by summing monthly salaries plus any bonuses:

```
Annual Gross = Σ(Monthly Salary + Monthly Bonus) for months 1-12

Example:
= (30000/12 × 5) + (36000/12 × 7) + Bonuses
= (2500 × 5) + (3000 × 7) + 0
= 12,500 + 21,000
= €33,500
```

### Social Security (SS) Base Calculation

The SS baseline for each month is calculated as:

```
MonthlySSBase = MIN(MAX(Monthly Gross, SS_MIN), SS_MAX)

Where (2025):
- SS_MIN = €1,381.20 (Group 4)
- SS_MAX = €4,909.50

Then: Annual SS Base = Σ(Monthly SS Base) for months 1-12
```

Example with salary adjustment to €5,000/month (exceeds cap):
```
Monthly SS Base = MIN(MAX(5000, 1381.20), 4909.50) = 4909.50 (capped)
```

### IRPF (Income Tax) Calculation

IRPF is calculated based on total annual income:

```
Rendimiento Íntegro (Gross Income for Tax)
= Annual Gross Income + Additional Benefits - Flexible/Exemption Amounts

This adjusted figure is used as input to the IRPF tax bracketlette.
```

### Interaction with Bonuses

Bonuses and salary adjustments are independent:

- **Salary Adjustments** — Change the base monthly salary from a specific month forward
- **Bonuses** — One-time additional payments that also occur in specific months

Example:
```
Base: €30,000 (€2,500/month)
Jun adjustment to: €36,000 (€3,000/month)
June bonus: €2,000

June gross income = €3,000 (adjusted salary) + €2,000 (bonus) = €5,000
```

## Important Behavior Notes

### Non-Retroactive Adjustments

Salary adjustments **only apply from the selected month forward**. They do not retroactively affect earlier months.

**Example:**
- If you set adjustment for June, salaries in January-May are NOT changed
- Only June through December use the new salary

### Latest Adjustment Wins

If you somehow create multiple adjustments for the same month (though the UI typically prevents this), the latest one in processing order applies.

### Interaction with Número de Pagas

The number of payments (12 or 14) affects monthly salary calculations:

```
Monthly Salary = Annual Salary ÷ 12  (regardless of pagas setting)
SS Base = Capped Monthly Salary      (uses the same monthly figure)
```

The "número de pagas" affects how the annual SS and IRPF are **distributed** in the monthly view, not how they're **calculated**.

## Display in Results

### Monthly View

When salary adjustments are present, the monthly breakdown shows:

```
Bruto / paga: €2,500 €            (ordinary month)
SS / mes ordinario: €158.75 €      
IRPF / mes (×12): €145 €           

[Special Months - if adjustments exist]
Junio (bruto) *actualizado*: €3,000 €
SS Junio: €190.50 €
Neto Junio: €2,000 €
```

Months with salary adjustments have an **asterisk (*actualizado*)** label.

### Annual Totals

All totals (SS, IRPF, Neto, Coste Total) automatically include the effects of salary adjustments.

## API Reference

### Functions

#### `addActualizacionSalarial()`
Creates a new salary adjustment row in the UI.

```javascript
addActualizacionSalarial()
```

#### `removeActualizacionSalarial(btn)`
Removes a salary adjustment row.

```javascript
removeActualizacionSalarial(btn)  // btn = the delete button element
```

#### `getActualizacionSalarialItems()`
Retrieves all configured salary adjustments from the UI.

Returns: Array of objects
```javascript
[
  { nuevoSalario: 36000, mes: 6 },
  { nuevoSalario: 42000, mes: 9 }
]
```

### Data Structure

Each adjustment is represented as:

```javascript
{
  nuevoSalario: Number,  // New annual salary in euros (> 0)
  mes: Number            // Month number (1-12)
}
```

### UI Element IDs

- Container: `#actualizacionList`
- Row class: `.especie-custom-row`
- Input class: `.actualizacion-nuevoSalario`
- Month selector class: `.actualizacion-mes`

## Testing

Comprehensive test suite included: `tests/test_actualizacion_salarial.py`

### Test Coverage

- **17 automated tests** covering:
  - Single salary adjustments
  - Multiple adjustments throughout the year
  - Interaction with bonuses
  - SS base calculations with caps
  - IRPF calculations with adjusted income
  - Edge cases (zero adjustment, very high salaries, January start)
  - Integration scenarios

Run tests:
```bash
python3 tests/test_actualizacion_salarial.py
```

All tests pass ✅

## Common Use Cases

### Case 1: Mid-Year Raise

**Scenario:** Promoted in June with salary increase

1. Base salary: €30,000
2. Add adjustment: €36,000 from June
3. Result: Higher SS and IRPF reflected in June-December

### Case 2: Progressive Annual Increases

**Scenario:** Multiple raises throughout the year

1. Base: €24,000
2. Adjustment 1: €30,000 from April
3. Adjustment 2: €36,000 from September
4. Result: Reflects 3 different salary levels

### Case 3: Raise + Bonus in Same Month

**Scenario:** Promotion with one-time bonus

1. Base: €30,000
2. Adjustment: €36,000 from July
3. Bonus: €2,000 in July (configured separately)
4. Result: July shows both effects combined

### Case 4: Contract Type Change

**Scenario:** Changed from permanent to temporary or vice versa

1. Would require changing the contract type separately (different feature)
2. But salary adjustment can model the effect on gross income

## Limitations & Notes

### Current Limitations

1. **Order of Adjustments** — If multiple adjustments are added for different months, they are processed in chronological order. The latest adjustment in time applies from its month onward.

2. **No Deletion History** — Deleted adjustments aren't tracked. Once removed, the configuration is lost.

3. **No "Decrease" Special Handling** — Salary reductions are handled the same as increases.

4. **All Benefits Scale with Salary** — If you use especie **flexible**, it still treats the adjusted salary as the base (no special logic).

### Design Decisions

1. **Adjustments Override, Not Add** — Each adjustment replaces the salary, not adds to it. Use this for "new salary from this month" scenarios.

2. **Non-Retroactive** — Adjustments never affect past months, ensuring accurate monthly tax withholding in retrospect.

3. **Annual Salary Input** — User inputs annual salary (not monthly) to maintain UI consistency with the base salary field.

## Future Enhancements

Potential future improvements:

1. **Salary Reduction Factors** — Support increase/decrease by percentage (€+2,000 or +10%)
2. **Seasonal Salaries** — Template for common patterns (e.g., tourism industry)
3. **Historical Comparison** — Compare scenarios with different adjustment timings
4. **CSV Import** — Bulk import salary adjustments from file
5. **Alerts** — Warning if multiple adjustments in same month or invalid dates

## Related Features

This feature works in conjunction with:

- **Bonus Puntuales** — One-time payments in specific months
- **Retribución en Especie** — Benefits in kind (medical, meals, transport)
- **Número de Pagas** — 12 or 14 payments per year
- **Grupo de Cotización** — Affects SS base minimums

## Support & Questions

For issues or questions about the salary adjustment feature:

1. Check this documentation
2. Review test cases in `tests/test_actualizacion_salarial.py`
3. Check monthly view results for correctness
4. Compare with manual calculations to verify

---

**Version:** 1.0.0  
**Feature Added:** April 2026  
**Status:** Stable ✅
