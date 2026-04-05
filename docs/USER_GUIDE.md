# User Guide — Calculadora IRPF + Seguridad Social

## 📋 Tabla de Contenidos

1. [Inicio rápido](#inicio-rápido)
2. [Secciones principales](#secciones-principales)
3. [Ejemplos prácticos](#ejemplos-prácticos)
4. [Interpretar resultados](#interpretar-resultados)
5. [Casos especiales](#casos-especiales)
6. [FAQ](#faq)

---

## Inicio Rápido

### Paso 1: Acceder a la calculadora

👉 **Online:** [irpf.mario.gal](https://irpf.mario.gal)  
👉 **Local:** `npm start` → http://localhost:3000

### Paso 2: Introducir salario bruto

En la sección **"Datos del trabajador"**, introduce tu **salario bruto anual**:

```
Ej: 30.000  (sin decimales o con comas)
Ej: 30,000  (formato español)
Ej: 30000.50
```

✅ La calculadora **valida automáticamente** el formato.

### Paso 3: Seleccionar opciones

| Campo | Opciones | Por defecto |
|-------|----------|-----------|
| **Año fiscal** | 2023–2045 | 2026 |
| **Número de pagas** | 12 o 14 | 12 |
| **Tipo de contrato** | Indefinido / Temporal | Indefinido |
| **Edad** | <65 / 65–74 / 75+ | Menor de 65 |
| **Discapacidad** | No / 33% / 65% | No |

### Paso 4: Revisar resultados

La calculadora muestra **4 secciones:**

1. **Flujo IRPF** — Desglose paso a paso
2. **Cotizaciones SS** — Por tipo y mes
3. **Resumen final** — Neto, impuestos, coste empresa

---

## Secciones Principales

### 📋 1. Datos del Trabajador

#### Salario Bruto Anual
Tu **ingresos antes de impuestos**.

```
Ejemplo: 30.000 € ÷ 12 = 2.500 € mes
```

#### Año Fiscal
Para años futuros (2025–2045) se aplican automáticamente:
- ✓ **MEI actualizado** (cuota módulo autónomo)
- ✓ **Bases de cotización** nuevas
- ✓ **Escala IRPF** del año
- ✓ **Cuota de solidaridad** (desde 2025)

#### Pagas
- **12 pagas:** la mayoría de empleados
- **14 pagas:** incluye 2 pagas extra (junio + diciembre)

⚠️ **Efecto en neto:** Mismo neto anual; diferente importe mensual.

```
Ejemplo 30.000 € / 12 = 2.500 € / mes
        30.000 € / 14 = 2.142,86 € / mes
```

#### Contrato
El tipo afecta a la **cuota de desempleo:**
- **Indefinido:** 1,55% trabajador + 5,50% empresa
- **Temporal:** 1,60% trabajador + 6,70% empresa

#### Datos Personales
Para **calcular el mínimo personal** (reduce IRPF):

| Dato | Impacto |
|------|--------|
| **Edad 65+** | +1.150 € mínimo (Est.) / +1.200 € (Aut.) |
| **Edad 75+** | +1.400 € mínimo adicional |
| **Discapacidad 33–65%** | +3.000 € mínimo (Est.) / +0 (Aut.) |
| **Discapacidad >65%** | +9.000 € mínimo (Est.) |
| **Primo hijo** | +2.400 € mínimo |
| **Segundo hijo** | +2.700 € (acumulado: +5.100 €) |
| **Tercer hijo** | +4.000 € (acumulado: +9.100 €) |
| **4+ hijos** | +4.500 € cada uno (acumulado: +13.600 €) |
| **Ascendiente 65+** | +1.150 € / ascendiente |

**Reducción total = suma de todos los aplicables**

---

### 💰 2. Conceptos en Especie

Añade **beneficios no monetarios** que reducen la base imponible del IRPF:

| Concepto | Límite exento | Cómo funciona |
|----------|---------------|--------------|
| **Seguro médico** | €500/año (€1.500 si discapacidad) | Empresa paga póliza, tú no pagas IRPF |
| **Transporte** | €1.500/año | Combined con tickets = proporcional |
| **Tickets comida** | Sin límite | Control del empleado; totalmente exento |
| **Dietas** | €0/ control | Flexible; no reduce IRPF |

#### Añadir conceptos en especie

Es posible agregar valores en los campos de **Seguro médico, Transporte, Tickets** y **Dietas**.

**Estructura personalizada:**

Usa la sección **"Conceptos en especie personalizado"** para crear nuevos items:

1. **Nombre:** Ej: "Fondo de pensiones"
2. **Cantidad:** €200 / mes
3. **Toggle "Din." (Dinerario):**
   - ✅ SI: Se suma al **bruto** (afecta SS + IRPF)
   - ❌ NO: Permanece como especie (exento)

**Ejemplos:**

```
Fondo pensiones: €200/mes → 200 × 12 = €2.400 especie (exento)
Bonus vivienda: €500/mes → 500 × 12 = €6.000 DINERARIO (suma a bruto)
```

---

### 📊 3. Bonificaciones y Pagas Extras

Calcula el impacto de **bonifiaciones por mes**:

Usa la sección **"Bonificaciones anuales"** para especificar:
- **Mes:** Enero–Diciembre
- **Importe:** €3.000 (bonus en ese mes específico)

**Múltiples bonificaciones:**

```
Enero   → €2.000 (bonus navidad adelantada)
Junio   → €3.000 (paga extra)
Diciembre → €5.000 (paga extra + bonus performance)
```

Se calcula correctamente el SS **por mes** (cada mes puede estar al máximo de base).

---

### 🔍 Resultado: Flujo IRPF

**Paso a paso:**

```
ENTRADA
├─ Bruto: €30.000
├─ - Aportaciones SS: €1.962 (6,54%)
├─ - Otros gastos deducibles: €2.000
├─ = Rendimiento neto: €26.038
├─ - Reducción rendimientos: €7.302
├─ = Base liquidable: €18.736
├─ - Mínimo personal: €5.550
├─ = Base sujeta a escala: €13.186
├─ ESCALA ESTATAL: €1.222,05
├─ ESCALA AUTONÓMICA (Andalucía): €876,25
├─ = Cuota IRPF: €2.098,30
└─ → NETO: €26.039,70
```

---

### 📋 Tabla: Cotizaciones SS por mes

Muestra **mes a mes:**
- **Base de cotización** (salario, capped)
- **CC (Contingencias Comunes):** 4,70%
- **Desempleo:** 1,55% (indefinido) o 1,60% (temporal)
- **FP (Formación):** 0,10%
- **MEI (Módulo):** 0,13% (2025)
- **CUOTA TOTAL:** Suma de arriba

Si hay **bonifikaciones**, la base del mes correspondiente sube (dentro del máximo).

---

### 📊 Tabla: Resumen Final

**3 zonas (Iceberg):**

#### ZONA 1: Salario Neto (Trabajador)
```
Bruto: €30.000
- SS trabajador: €1.962
- IRPF: €2.098
- Flexible: €0
= NETO: €25.940
```

#### ZONA 2: Impuestos + Aportes (Trabajador)
```
SS: €1.962
IRPF: €2.098
Flexible: €0
TOTAL: €4.060
```

#### ZONA 3: Coste Empresa
```
Bruto: €30.000
+ SS empresa: €9.876
+ Especie adicional: €0
= COSTE TOTAL: €39.876
```

---

## Ejemplos Prácticos

### Ejemplo 1: Empleado simple, 30€k indefinido

**Inputs:**
```
Bruto: 30.000 €
Año: 2026
Pagas: 12
Contrato: Indefinido
Edad: Menor de 65
```

**Resultado esperado:**
```
Neto anual: ~€25.940
SS anual: €1.962 (6,54%)
IRPF anual: €2.098 (7%)
Coste empresa: €39.876
SM mensual: ~€2.160 neto
```

---

### Ejemplo 2: Padres con 2 hijos, seguro médico, 40€k

**Inputs:**
```
Bruto: 40.000 €
Año: 2026
Contrato: Indefinido
Edad: Menor de 65
Hijos: 2
Discapacidad: No
Seguro médico (adicional): 600 €/año
Transporte: 1.500 €/año (máximo)
```

**Cambios (vs. sin hijos):**
```
Mínimo personal: +€5.100 (2 hijos)
→ Base imponible se reduce €5.100
→ IRPF disminuye ~€1.209 (24.5% estatal)
→ NETO aumenta ~€1.209
```

---

### Ejemplo 3: Autónomo con bonus, solidaridad, 80€k (2026)

**Inputs:**
```
Bruto: 80.000 €
Año: 2026
Contrato: Indefinido
Bonificaciones:
  - Junio: €4.000
  - Diciembre: €6.000
```

**Cambios:**
```
Base media mensual: 80.000 / 12 = €6.667
Base máxima (2026): €5.101,20
→ Base SS capeada a máximo todo el año

Junio (bonus +€4.000):
  - Bruto mes: €6.667 + €4.000 = €10.667
  - Base SS (capeada): €5.101,20
  - SS mes: €5.101,20 × 6,54% = €333,62

Solidaridad (desde 2025):
  - Exceso sobre máximo anual: €80.000 - €61.214 = €18.786
  - Tramo 1 (0–10% máximo): €6.121 × 0,92% = €56,31
  - Tramo 2 (10–50%): €24.486 × 1,00% = €244,86
  - Cuota solidaridad trabajador total: ~€301 × 4.70/28.30 = ~€50
```

---

### Ejemplo 4: Mayor de 65 con discapacidad, 50€k

**Inputs:**
```
Bruto: 50.000 €
Año: 2026
Edad: Mayor de 65
Discapacidad: 65%
Hijos: 1
```

**Mínimo personal:**
```
Base: 5.790 € (Andalucía)
Mayor65: +1.200 €
Disc65: +9.390 €
Hijo1: +2.510 €
TOTAL: €19.890
```

**Impacto:**
```
Rendimiento neto: ~€45.000 (después de SS)
Base liq: €45.000 - €19.890 = €25.110
IRPF: €2.831 (vs. ~€5.000 sin combo)
Ahorro IRPF: ~€2.169
```

---

## Interpretar Resultados

### ¿Qué es "Reducción rendimientos"?

Resto de gastos deducibles aplicable a **trabajadores por cuenta ajena** (Art. 19.2 LIRPF):

```
Rendimiento neto = Bruto - SS - 2.000 €
```

Es **fijo** de €2.000 (no depende del salario).

Si trabajas como **autónomo**, otros cálculos aplican (no incluidos aquí).

---

### ¿Qué es "Base liquidable"?

La **base sujeta a escala IRPF:**

```
Base liquidable = (Bruto - SS - 2.000) - Reducción rendimientos - Mínimo personal
```

El IRPF se calcula aplicando esta **escala progresiva** de 6 tramos.

---

### ¿Cuál es mi neto mensual?

Divide el **neto anual** entre el número de **pagas**:

```
12 pagas: Neto mensual = Neto anual / 12
14 pagas: Neto mensual = Neto anual / 14
```

⚠️ **No es lineal:** con 14 pagas, algunos meses tienen importe diferente (pagas extras).

---

### ¿A cuánto llega la solidaridad?

✅ Desde 2025 para salarios > máximo base anual.

```
Tramo 1: 0–10% del máximo     → 0,92% (2025)
Tramo 2: 10–50% del máximo    → 1,00% (2025)
Tramo 3: >50% del máximo      → 1,17% (2025)
```

Ejemplo 80€k (2026, máx €61.214):
```
Exceso: €18.786
T1: €6.121 × 0,92% = €56
T2: €24.486 × 1,00% = €245
Solidaridad: ~€301 total
→ Trabajador paga: ~€50 (4,70/28,30 share)
```

---

## Casos Especiales

### Salarios ≤ SMI (€16.576)

**IRPF = €0** (exención legal).

SS sigue siendo exigible (obligatoria).

```
Ejemplo: €15.000 bruto
- SS: €981
- IRPF: €0 (SMI exemption)
- Neto: €14.019
```

---

### Bonificaciones en meses con base ya al máximo

Si tu **salario base es alto** y ya estás al máximo, la bonificación:
- ✅ Aumenta tu neto (más ingresos)
- ❌ No aumenta SS (ya al máximo)

```
Ej: 70€k bruto (60k base + 10k bonus variable)
Base media: €5.833 > máximo €5.101
→ SS capeado ya, bonus no suma más SS
```

---

### Especie flexible vs. bruto dinerario

**Flexible (no "Din." checked):**
```
€200/mes especie flexible
→ NO suma al bruto
→ Exento de IRPF
→ No afecta SS
```

**Dinerario (Din." checked):**
```
€200/mes dinerario
→ SÍ suma al bruto (€2.400 anual)
→ Sujeto a IRPF
→ Aumenta SS (si por debajo máximo)
```

---

### Cambio de edad durante el año

La calculadora **asume la edad a 1 de enero**.

Si cumplas 65 durante el año, recalcula introduciendo tu edad final.

---

### Trabajador con discapacidad transitoria

Selecciona **"Discapacidad 33%"** o **"65%"** según certificación.

Aumenta el mínimo personal (ahorro IRPF):
- **33–65%:** +€3.000 (est.) / +€3.130 (aut.)
- **>65%:** +€9.000 (est.) / +€9.390 (aut.)

---

### Múltiples empleadores (pluriempleo)

⚠️ Esta calculadora es para **un único empleador**.

Si tienes varios empleos:
1. Calcula cada uno por separado
2. Suma brutos para IRPF global
3. Cada empleador manda su cotización SS
4. Descuenta el máximo de SS en la declaración

---

## FAQ

### ❓ ¿Incluye IRPF autonómico?

✅ Sí, escala **Andalucía** (Art. 27 Ley PF Andalucía).

Escala más favorable que estatal (tipo máximo 22,5% vs. 24,5%).

---

### ❓ ¿Qué año es "2026"?

**Por defecto, la calculadora usa 2026** (año actual al escribir la documentación).

Para otros años:
- **2023–2024:** Datos históricos (cambio MEI)
- **2025–2029:** MEI en fase-in (0,13% → 0,20%)
- **2030–2045:** Cuota solidaridad en aumento

---

### ❓ ¿Puedo exportar resultados?

Actualmente **no hay botón de exportación**.

**Workaround:**
- Captura pantalla (Print Screen)
- Abre DevTools (F12) → Elements → copia tabla HTML
- Copia manualmente los números

---

### ❓ ¿Es exact este cálculo?

✅ **100% verified** — 1.344 tests automáticos comprueban:
- Todas las escalas
- Todos los años
- Todas las combinaciones de mínimos
- Identidades contables (neto + impuestos + aportes = bruto)

Ver [TESTING.md](../docs/TESTING.md) para detalles.

---

### ❓ ¿Qué pasa si hay cambios legales?

La calculadora es actualizable:
1. Cambios en tablas: modifica constantes en `js/app.js`
2. Cambios en lógica: modifica funciones
3. Ejecuta tests: `python3 tests/test_irpf.py`
4. Despliega: `git push && npm start`

---

### ❓ ¿Por qué hay tanta "Reducción rendimientos"?

Art. 19.2 LIRPF da un **descuento fijo de €2.000** a trabajadores:
- Cubre gastos de "deducción derecha" (teléfono, coche, etc.)
- No se requiere factura
- Se aplicó desde 2015; es "descuento automático"

---

### ❓ ¿Puede cambiar mi situación personal afectar el resultado?

✅ Mucho:

| Dato | Impacto |
|------|--------|
| Mayor edad | +€1.150 a €2.000 mínimo |
| Discapacidad | +€3.000 a €9.000 mínimo |
| Hijos | +€2.400 a €4.500 por hijo (hasta 4+) |

Prueba la calculadora con tus datos reales para ver el efecto.

---

### ❓ ¿Y si sospecho error?

1. **Revisa:** ¿Todos los datos introducidos son correctos?
2. **Compara:** Con [gestoría online](https://www.agencia-tributaria.es) o [Renta Web](https://www.aeat.es)
3. **Reporta:** Abre [issue](https://github.com/MarioContrerasLara/Calculadora-IRPF/issues)

---

### ❓ ¿Soporta autónomos?

Parcialmente. El cálculo de SS asume **régimen general**.

Los autónomos tienen:
- ✓ Base mínima + máxima diferente
- ✓ Reducción de base (€3.000 anual)
- ✗ No incluido aquí (versión futura)

---

### ❓ ¿Puedo usar esto para solicitar un préstamo?

✅ Sí, pero **verifica con tu asesor fiscal**:
- Calculadora es orientativa
- Cada situación es única
- Declaración oficial (Renta) es la referencia

---

## 📞 Más Ayuda

- **Preguntas generales IRPF?** → [AEAT.es](https://www.aeat.es)
- **Bug o feature request?** → [GitHub Issues](https://github.com/MarioContrerasLara/Calculadora-IRPF/issues)
- **Detalles técnicos?** → [ARCHITECTURE.md](../docs/ARCHITECTURE.md)
