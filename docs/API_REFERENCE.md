# API Reference

Complete reference of all JavaScript functions and Python helpers.

---

## JavaScript Functions (`js/app.js`)

### Input Parsing

#### `parseRawEuro(raw: string): number`

Parse user input to numeric value.

**Behavior:**
- Removes non-numeric characters except comma and decimal point
- Handles Spanish (1.000,50) and US (1,000.50) formats
- Returns 0 for empty, negative, or invalid input

**Examples:**
```javascript
parseRawEuro("30.000")      // 30.0 (decimal point)
parseRawEuro("30.000,50")   // 30000.50 (Spanish format)
parseRawEuro("30,000")      // 30.0 (removes comma, treats . as decimal)
parseRawEuro("1e5")         // 100000 (scientific notation)
parseRawEuro("-500")        // 0 (negative rejected)
parseRawEuro("abc")         // 0 (non-numeric)
parseRawEuro("")            // 0 (empty)
```

---

### Core Calculations

#### `calcular(): void`

**Main calculator function.** Runs all calculations and updates DOM with results.

**Inputs:** Reads from form fields:
- `#bruto` — Gross salary (€)
- `#anio` — Tax year (2023–2045)
- `#pagas` — Pay periods (12 or 14)
- `#contrato` — Contract type (indefinido/temporal)
- `#grupo` — SS group (1–4)
- `#edad` — Age bracket (menor65/mayor65/mayor75)
- `#discapacidad` — Disability (no/33/65)
- `#numHijos` — Number of children
- `#numAsc` — Number of dependents

**Process:**
1. Parse and validate bruto
2. Calculate SS by month (12-month loop)
3. Calculate solidaridad (if year ≥ 2025)
4. Calculate IRPF scales
5. Calculate neto = bruto - SS - IRPF
6. Update all output tables

**Side Effects:** Updates DOM with results

**Example:**
```javascript
// User changes input
document.getElementById('bruto').value = '30000';
calcular();  // Instantly recalculates and displays
```

---

### Deduction Functions

#### `reduccion_rendimientos(rendNeto: number): number`

Calculate Art. 19.2 LIRPF deduction (non-business income).

**Formula:**
```
IF   rendNeto ≤ 14,852  → 7,302
IF   14,852 < rendNeto ≤ 17,673.52  → 7,302 - (rendNeto - 14,852) × 2.59
IF   rendNeto > 17,673.52  → 0

(Clamped to ≥ 0)
```

**Examples:**
```javascript
reduccion_rendimientos(0)         // 7302
reduccion_rendimientos(14852)     // 7302
reduccion_rendimientos(15000)     // 7302 - (15000-14852) × 2.59 = 7302 - 383.22 = 6918.78
reduccion_rendimientos(17673.52)  // ≈ 0
reduccion_rendimientos(50000)     // 0
```

---

#### `aplicar_escala(base: number, escala: Array<[number, number]>): number`

Apply progressive tax scale.

**Params:**
- `base`: Taxable base (€)
- `escala`: Array of [bracket_limit, cumulative_tax]

**Returns:** Total tax for base

**Estatal Scale (6 brackets):**
```
[0, 0]
[12450, 1182.75]
[20200, 2112.75]
[35200, 4362.75]
[60000, 8950.75]
[300000, 62950.75]
[∞, ∞]  (max rate 24.5%)
```

**Andalucía Scale (6 brackets):**
```
[0, 0]
[13000, 1235]
[21100, 2829]
[35200, 5069]
[60000, 9527]
[300000, 69800]
[∞, ∞]  (max rate 22.5%)
```

**Examples:**
```javascript
aplicar_escala(0, ESCALA_ESTATAL)        // 0
aplicar_escala(12450, ESCALA_ESTATAL)    // 1182.75 (bracket 1 limit)
aplicar_escala(20200, ESCALA_ESTATAL)    // 2112.75 (bracket 2 limit)
aplicar_escala(30000, ESCALA_ESTATAL)    // 1182.75 + (9800) × 0.19 = 3042.75
aplicar_escala(500000, ESCALA_ESTATAL)   // ~122451 (nearly 24.5% marginal)
```

---

#### `calcular_minimo(edad: string, discapacidad: string, num_hijos: number, num_asc: number, minimos_table: Object): number`

Calculate personal income exemption amount.

**Params:**
- `edad`: "menor65", "mayor65", or "mayor75"
- `discapacidad`: "no", "33", or "65"
- `num_hijos`: 0–4+
- `num_asc`: 0–2+
- `minimos_table`: MIN_EST or MIN_AUT

**Formula (additive):**
```
Base (contribuyente) +
Age bonus +
Disability bonus +
Sum of children brackets +
Sum of ascendant amounts
```

**Examples:**
```javascript
// Base value
calcular_minimo('menor65', 'no', 0, 0, MIN_EST)  // 5550

// With age
calcular_minimo('mayor65', 'no', 0, 0, MIN_EST)  // 5550 + 1150 = 6700
calcular_minimo('mayor75', 'no', 0, 0, MIN_EST)  // 5550 + 1150 + 1400 = 8100

// With kids
calcular_minimo('menor65', 'no', 1, 0, MIN_EST)  // 5550 + 2400 = 7950
calcular_minimo('menor65', 'no', 2, 0, MIN_EST)  // 5550 + 2400 + 2700 = 10650
calcular_minimo('menor65', 'no', 3, 0, MIN_EST)  // 5550 + 2400 + 2700 + 4000 = 14650

// Complex
calcular_minimo('mayor65', '65', 2, 1, MIN_EST)
// 5550 (base) + 1150 (65+) + 9000 (disc65) + 2400 + 2700 (kids) + 1150 (asc) = 21950
```

---

#### `split_exempt(ad: number, fl: number, limit: number): Array<[number, number, number, number]>`

Split especie amount into exempt and taxable portions.

**Params:**
- `ad`: Additional (adicional) amount
- `fl`: Flexible (flexible) amount
- `limit`: Total exemption limit

**Returns:** `[exAd, exFl, grAd, grFl]` (exempt adicional, exempt flexible, taxable ad, taxable fl)

**Logic:**
```
1. Total = ad + fl
2. If total ≤ limit:
   - All exempt: [ad, fl, 0, 0]
3. If total > limit:
   - Proportional split: ratio = limit / total
   - Exempt: [ad×ratio, fl×ratio, ?, ?]
   - Taxable: [ad×(1-ratio), fl×(1-ratio), ?, ?]
```

**Examples:**
```javascript
split_exempt(500, 0, 500)        // [500, 0, 0, 0] (all within limit)
split_exempt(600, 0, 500)        // [500, 0, 100, 0] (ad exceeds, fl fully exempt)
split_exempt(300, 200, 500)      // [300, 200, 0, 0] (both within)
split_exempt(600, 400, 500)      // [300, 200, 300, 200] (proportional split)
split_exempt(1000, 1000, 1500)   // [750, 750, 250, 250] (at limit)
```

---

### Social Security

#### `calcSolidaridad(bruto: number, maxBaseAnual: number, anio: number): Object`

Calculate solidarity contribution (3-tramo system, 2025+).

**Params:**
- `bruto`: Annual gross salary
- `maxBaseAnual`: Max SS base annual (baseMax × 12)
- `anio`: Tax year (2025–2045)

**Returns:**
```javascript
{
    worker: 123.45,      // Worker contribution (€)
    employer: 789.01,    // Employer contribution (€)
    tramos: [
        { base: 6121.4, tipoTotal: 0.92, tipoW: 0.43, tipoE: 0.49, cuotaW: 26.2, cuotaE: 30.0 },
        ...
    ]
}
```

**Tramo Structure:**
- **Tramo 1:** 0–10% of max base → lowest rate
- **Tramo 2:** 10–50% of max base → medium rate
- **Tramo 3:** >50% of max base → highest rate

**Example:**
```javascript
calcSolidaridad(80000, 61214.40, 2026)
// exceso = 80000 - 61214.40 = 18785.60
// T1 (0–10%): 6121.4 × 1.15% = 70.40
// T2 (10–50%): 24486.2 × 1.25% = 306.08
// T3 (>50%): 0 (all exceso used in T1+T2)
// → {worker: ~43.50, employer: ~333.98, tramos: [...]}
```

---

### Especie Management

#### `getEspecieCustomItems(): Array<Object>`

Get list of custom especie items from form rows.

**Returns:**
```javascript
[
    { nombre: "Fondo pensiones", dinerario: 2400, adicional: 0, flexible: 0 },
    { nombre: "Vivienda", adicional: 1200, flexible: 0, dinerario: 0 },
    ...
]
```

Each item has either:
- `dinerario` (if "Din." checkbox checked → adds to bruto)
- `adicional` + `flexible` (if unchecked → stays as especie)

---

#### `addEspecieCustom(): void`

Add new blank custom especie row to form.

**Side Effects:** Appends HTML row to `#espCustomList`

```javascript
document.getElementById('btnAddEspecie').onclick = addEspecieCustom;
```

---

#### `toggleEspecieDin(checkbox: HTMLElement): void`

Toggle between dinerario (money) and (especie) modes in custom especie row.

**Params:** Checkbox element (from `.especie-din-chk`)

**Behavior:**
- If ✓ checked: Show "€/mes" input for dinerario
- If ☐ unchecked: Show "Ad./Fl." inputs for especie split

---

### Bonus Management

#### `getBonusItems(): Object<number, number>`

Parse bonus month → amount mappings from form.

**Returns:**
```javascript
{
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 0,
    6: 3000,   // Bonus €3000 in June
    7: 0,
    8: 0,
    9: 0,
    10: 0,
    11: 0,
    12: 2000,  // Bonus €2000 in December
}
```

---

#### `addBonus(): void`

Add new blank month/amount bonus row.

**Side Effects:** Appends HTML row to `#bonusList`

---

### Output Rendering

#### `renderResultados(calc: Object): void`

Populate all output tables with calculation results.

**Params:** calc dictionary from `calcular()`

**Updates:**
- Table `#tbFlow` — IRPF step-by-step flow
- Table `#tbMes` — Monthly SS breakdown (12 rows)
- Table `#tbResumen` — Summary results
- Iceberg chart with 3 zones

---

## Data Structures

### Constants

#### SS Worker Rates (2025)

```javascript
SS_WORKER = {
    cc: 4.70,        // Contingencies (invalidez, vejez, muerte)
    fp: 0.10,        // Professional training
    mei: 0.13,       // (Replaced by year-specific rate)
}
```

#### SS Desemp (Unemployment) Rates

```javascript
SS_DESEMP_W = {
    indefinido: 1.55,
    temporal: 1.60,
}

SS_DESEMP_E = {
    indefinido: 5.50,
    temporal: 6.70,
}
```

#### SS Employer Rates (2025)

```javascript
SS_EMPLOYER = {
    cc: 23.60,
    desempleo: 5.50,  // (replaced by SS_DESEMP_E)
    fogasa: 0.20,
    fp: 0.60,
    at: 2.00,         // Workplace accidents (default)
    mei: 0.67,        // (Replaced by year-specific rate)
}
```

#### MEI by Year

```javascript
MEI_BY_YEAR = {
    2023: { worker: 0.10, employer: 0.50 },
    2024: { worker: 0.12, employer: 0.58 },
    2025: { worker: 0.13, employer: 0.67 },
    2026: { worker: 0.15, employer: 0.75 },
    2027: { worker: 0.17, employer: 0.83 },
    2028: { worker: 0.18, employer: 0.92 },
    2029: { worker: 0.20, employer: 1.00 },
}
```

#### Social Security Bases

```javascript
BASES_BY_YEAR = {
    2025: {
        max: 4909.50,
        min: { 1: 1929.00, 2: 1599.60, 3: 1391.70, 4: 1381.20 },
    },
    2026: {
        max: 5101.20,
        min: { 1: 1929.00, 2: 1599.60, 3: 1391.70, 4: 1381.20 },
    },
    // ... more years ...
}
```

#### Solidarity Rates by Year

```javascript
SOLIDARIDAD_BY_YEAR = {
    2025: [0.92, 1.00, 1.17],    // [T1, T2, T3]
    2026: [1.15, 1.25, 1.46],
    // ...
    2045: [5.50, 6.00, 7.00],
}
```

#### Minimum Personal Deductions

```javascript
MIN_EST = {
    contribuyente: 5550,
    mayor65: 1150,
    mayor75: 1400,
    disc33: 3000,
    disc65: 9000,
    hijos: [2400, 2700, 4000, 4500],  // Per child (1st through 4th+)
    asc65: 1150,
    asc75: 1400,
}

MIN_AUT = {  // Andalucía (more generous)
    contribuyente: 5790,
    mayor65: 1200,
    mayor75: 1460,
    disc33: 3130,
    disc65: 9390,
    hijos: [2510, 2820, 4170, 4700],
    asc65: 1200,
    asc75: 1460,
}
```

#### Especie Exemption Limits

```javascript
ESPECIE = {
    seguro_medico_persona: 500,
    seguro_medico_discapacidad: 1500,
    ticket_rest_max_dia: 11,    // Daily meal ticket limit
    transporte_exento: 1500,
}
```

#### Constants

```javascript
SMI_ANUAL = 16576              // Annual minimum interprofessional wage
OTROS_GASTOS = 2000            // Fixed deduction (Art. 19.2)
SOLIDARIDAD_WORKER_RATIO = 4.70 / 28.30  // Worker share of CC rate
```

---

## Python Test Helpers (`tests/test_irpf.py`)

### Test Framework

#### `assert_close(desc: str, actual: float, expected: float, tol: float = 0.01) -> None`

Assert actual ≈ expected within tolerance.

```python
assert_close('SS at 30k', ss_calc, 1962, 0.01)  # Pass if within ±0.01€
```

---

#### `assert_eq(desc: str, actual, expected) -> None`

Assert exact equality (for counts, booleans).

```python
assert_eq('Count of years', len(MEI_BY_YEAR), 7)
```

---

#### `assert_true(desc: str, condition: bool) -> None`

Assert condition is True.

```python
assert_true('MEI increases yearly', mei_2025 < mei_2026)
```

---

### Test Helpers

#### `group(name: str) -> None`

Print test group header.

```python
group('MEI_BY_YEAR validation')
# ... tests follow ...
```

---

#### `full_calc(bruto: float, ...) -> dict`

Python mirror of JS `calcular()`.

**Returns:**
```python
{
    'bruto': 30000,
    'neto': 25940,
    'base_ss': 2500,
    'total_ss': 1962,
    'cuota_irpf': 2098,
    'total_emp': 9876,
    'coste_total': 39876,
    'exenta_ad': 0,
    'gravada_ad': 0,
    'exenta_fl': 0,
    'gravada_fl': 0,
    'total_ad': 0,
    'total_fl': 0,
    'ahorro_flex': 0,
}
```

---

## DOM Element IDs

Key form and output elements:

| ID | Type | Purpose |
|----|------|---------|
| `#bruto` | input | Gross salary (€) |
| `#anio` | input[number] | Tax year |
| `#pagas` | select | Pay periods (12/14) |
| `#contrato` | select | Contract type |
| `#grupo` | select | SS group |
| `#edad` | select | Age bracket |
| `#discapacidad` | select | Disability status |
| `#numHijos` | input | Children count |
| `#numAsc` | input | Dependents count |
| `#espCustomList` | div | Container for custom especie rows |
| `#bonusList` | div | Container for bonus rows |
| `#tbFlow` | table | IRPF flow output |
| `#tbMes` | table | Monthly SS breakdown |
| `#tbResumen` | table | Summary results |
| `#headerAnio` | span | Year display in header |

---

## Error Handling

No external error library. Functions gracefully handle:

- **Invalid input:** Return 0 or falsy value
- **Out-of-range year:** Use nearest available data
- **NaN in calculations:** Clamped to 0
- **Negative values:** Clamped to 0
- **No data:** Fallback to default/previous year

---

## Performance Notes

- **`calcular()`:** 5–10ms
- **DOM updates:** 50–100ms
- **Total user perception:** <200ms (feels instant)

No debouncing needed; safe to call on every form change.

---

## Version Info

- **Current version:** 1.0.0
- **Released:** 5 April 2026
- **JavaScript:** ES6+ (no transpilation)
- **Python:** 3.8+ (no external deps)
- **Browser support:** All modern browsers (2020+)
