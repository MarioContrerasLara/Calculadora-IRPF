# Changelog

All notable changes to this project are documented here.

---

## [1.0.2] — 2 July 2026

### 🔧 Bug Fixes

- **SS base minimum removed** — SS contributions now follow actual salary (no longer clamped to SMI minimum base)
- **SMI exemption year-dependent** — 16,576€ (2025) / 17,094€ (2026) per Art. 81 bis RIRPF
- **Floating-point tolerance** — SMI comparison uses `+ 0.01` to handle IEEE 754 rounding (`(16576/12)*12 = 16576.000000000004`)
- **foreignObject negative width** — Prevents SVG errors when mensual chart bars are very small (`Math.max(totalBarW - textPad*2, 0)`)
- **Quick-pick buttons** — No longer open keyboard on click (removed `brutoInput.focus()`)

### ✨ UI Improvements

- **Mobile responsiveness** — All 3 tabs (SS, IRPF, Mensual) now work on small screens
  - SS table split into 3 mobile-friendly tables (Trabajador, Empleador, Combinado)
  - IRPF Mínimo personal table fits on mobile (3-column, `table-layout: auto`)
  - Mensual view-toggle all 5 buttons fit in one row (`calc(20% - 6px)`)
  - Mensual chart responsive viewBox (same pixel bar height on all screens)
- **Tab icons replaced** — Descriptive SVGs (shield, document, bar-chart, pie-chart)
- **Build tag removed** — Removed footer build tag
- **Dynamic SS legend** — Legend items show/hide based on row types present
- **Mínimo personal table** — € removed from headers, footer alignment fixed
- **Distribución text** — Explanation text fills full width (removed 60ch max-width)
- **foreignObject bar numbers** — Numbers display inside bars with overflow handling

### 🧪 Testing

- All 1,344 tests passing
- 22 salary update tests passing
- Verified with 30 salary values (10 to 500,000)

### 📦 Changes

- Cache versions: `styles.css?v=214`, `app.js?v=246`, `ui.js?v=178`
- Removed duplicate monthly chart views (Trabajador, Ambos)
- Removed `.ice-connector` CSS elements (replaced with SVG overlay)

---

## [1.0.1] — 5 April 2026

### ✨ New Features

#### Salary Adjustment (Actualización Salarial)
- ✅ Support multiple salary levels within a single year
- ✅ Automatically recalculate SS contributions with adjusted salaries
- ✅ Properly calculate IRPF based on total annual income
- ✅ Account for salary changes in monthly breakdown views
- ✅ Work seamlessly with bonuses and benefits in especie

### 🔧 Improvements

- ✅ Date-based salary adjustments (day/month precision)
- ✅ Monthly/annual mode toggle for transport & restaurant tickets
- ✅ Server configuration for HTTPS
- ✅ Systemd service file

### 🧪 Testing

- ✅ 22 salary update tests added (`test_actualizacion_salarial.py`)
- ✅ Comprehensive coverage of salary adjustment scenarios

### 📚 Documentation

- ✅ `docs/ACTUALIZACION_SALARIAL.md` — Feature overview
- ✅ `docs/guides/FEATURE_ACTUALIZACION_SALARIAL.md` — Implementation details
- ✅ `docs/guides/TESTING_CHECKLIST.md` — Test checklist
- ✅ `docs/guides/CI_CD_WORKFLOW.md` — CI/CD documentation
- ✅ `docs/guides/DEPLOYMENT_GUIDE.md` — Deployment guide

---

## [1.0.0] — 5 April 2026

### 🎉 First Release

**Status:** Production Ready

Complete IRPF + Seguridad Social calculator with comprehensive test coverage.

### ✨ Major Features

#### Social Security Calculation
- ✅ Per-month SS base calculation with respect to grupo (1–4)
- ✅ Support for 12 and 14 pay periods
- ✅ Month-by-month bonus handling (capped at base maximum)
- ✅ Dynamic MEI rates by year (2023–2029 phase-in)
- ✅ Solidarity contributions (2025–2045 progressive 3-tramo system)
- ✅ Worker and employer contribution rates
- ✅ Support for indefinido and temporal contract types

#### IRPF Calculation
- ✅ Estatal scale (6 brackets, 0–24.5%)
- ✅ Andalucía autonomous scale (6 brackets, 0–22.5%)
- ✅ Personal income exemptions (Art. 19.2 LIRPF: €2.000)
- ✅ Minimum personal deductions by age/disability/dependents
- ✅ SMI exemption (16.576€ threshold)
- ✅ Proportional tax calculations

#### Especie & Flexible Benefits
- ✅ Medical insurance (€500 normal / €1.500 discapacidad)
- ✅ Transport benefit (€1.500 annual, proportional capping)
- ✅ Meal tickets (unlimited, employee control)
- ✅ Dietas (fully flexible, tax-free)
- ✅ Custom especie items with dinerario toggle
- ✅ Split allocation (exempt vs. taxable)
- ✅ Flexible tax savings calculation

#### User Interface
- ✅ Apple-inspired design system (SF Pro typography, -apple-system stack)
- ✅ Pill-shaped buttons and smooth animations
- ✅ Responsive grid (desktop, tablet, mobile)
- ✅ 2 media query breakpoints (900px tablet, 640px mobile)
- ✅ Focus glow rings and accessible interaction states
- ✅ Iceberg 3-zone visualization (neto + worker taxes + employer costs)
- ✅ Color-coded components (brand green #0a7d4b)

#### Calculation Output
- ✅ IRPF flow table (step-by-step tax calculation)
- ✅ Monthly SS forecast (all 12 months)
- ✅ Comprehensive summary (neto, SS, IRPF, coste empresa)
- ✅ Real-time recalculation on input change

#### Data & Constants
- ✅ MEI_BY_YEAR (2023–2029)
- ✅ BASES_BY_YEAR (2021–2026)
- ✅ SOLIDARIDAD_BY_YEAR (2025–2045)
- ✅ ESCALA_ESTATAL (6 brackets)
- ✅ ESCALA_ANDALUCIA (6 brackets)
- ✅ MIN_EST and MIN_AUT (personal exemptions)

### 🧪 Testing

- ✅ **1,344 automated tests** (Python custom framework)
- ✅ All 61 test groups passing
- ✅ 100% coverage of calculation logic
- ✅ Coverage: 2021–2045 (25 years)
- ✅ Coverage: All 4 SS groups
- ✅ Coverage: 432 combinations of personal exemptions
- ✅ Accounting identity tests (neto + taxes = bruto)
- ✅ Boundary and edge case tests

### 📚 Documentation

- ✅ README.md (project overview)
- ✅ INSTALLATION.md (setup instructions)
- ✅ USER_GUIDE.md (complete usage tutorial)
- ✅ ARCHITECTURE.md (system design)
- ✅ API_REFERENCE.md (all functions documented)
- ✅ TESTING.md (test strategy and guidelines)
- ✅ DEPLOYMENT.md (production deployment)
- ✅ CHANGELOG.md (this file)

### 🚀 Deployment

- ✅ Server setup (Node.js + Express)
- ✅ GitHub repository with git workflow
- ✅ SSH deployment to server.mario.gal
- ✅ Static file serving (HTML/CSS/JS)
- ✅ Production-ready systemd service

### 🔧 Technical Stack

- **Frontend:** HTML5, CSS3 (Apple design), JavaScript ES6+
- **Backend:** Node.js 14+
- **Testing:** Python 3.8+ (custom framework)
- **Deployment:** GitHub, SSH, systemd
- **Design:** Apple Human Interface Guidelines inspiration

---

## Version Numbering

This project uses **Semantic Versioning** (MAJOR.MINOR.PATCH):

- **MAJOR (1.x.x):** Breaking changes (e.g., new IRPF scale calculation logic)
- **MINOR (x.1.x):** New features, additions (e.g., new year support, new calculations)
- **PATCH (x.x.1):** Bug fixes, minor improvements, documentation

---


## Known Limitations (v1.0.0)

- ⚠️ Single-employer only (pluriempleo not supported)
- ⚠️ General regime only (no autónomos support)
- ⚠️ Andalucía region only (other communities not supported)
- ⚠️ No export/PDF generation
- ⚠️ Client-side calculation only (no backend persistence)
- ⚠️ No multi-language support (Spanish only)

---

## Breaking Changes

None yet — v1.0.0 is the first release.

---

## Deprecations

None yet.

---

## Security Updates

### v1.0.0

- No known vulnerabilities
- All user data remains client-side (no transmission)
- No external API calls (fully offline-capable)
- No authentication required

---

## Credits & Acknowledgments

### Data Sources

- **AEAT (Agencia Tributaria Española)** — IRPF scales, SMS limits
- **Seguridad Social** — SS bases, contribution rates
- **BOE (Boletín Oficial del Estado)** — Legal references, rate changes
- **Junta de Andalucía** — Andalucía-specific tax scales

### Inspiration

- Apple Human Interface Guidelines (design)
- Clean Code principles (architecture)
- Test-Driven Development (quality)

---

## Migration Guide

N/A for first release.

---

## Support & Reporting

### Reporting Bugs

Found a bug? Open an [issue](https://github.com/MarioContrerasLara/Calculadora-IRPF/issues):

```
Title: [BUG] Calculation incorrect for X
Description:
- Input: 30.000€ salary, 2 children
- Expected: €X neto
- Actual: €Y neto
- Browser: Chrome 120, macOS 14
```

### Feature Requests

Have an idea? Open an [issue](https://github.com/MarioContrerasLara/Calculadora-IRPF/issues):

```
Title: [FEATURE] Add autónomos mode
Description:
- Use case: Calculate self-employed taxes
- Benefit: Covers larger user base
- Priority: Nice-to-have
```

### Questions & Discussions

General questions → [GitHub Discussions](https://github.com/MarioContrerasLara/Calculadora-IRPF/discussions)

---

## License

MIT License — See [LICENSE](../LICENSE)

Free for personal, commercial, and educational use.

---

## Version History at a Glance

```
2026-04-05 v1.0.0   🎉 First release (1344 tests, full documentation)
```

---

## How to update

```bash
# Check for updates
git pull origin main

# Run tests to verify
python3 tests/test_irpf.py

# Deploy
git push && ssh server.mario.gal "cd ~/IRPF/Calculadora-IRPF && git pull"
```

---

## Contact

**Mario Contreras Lara**

- 🌐 [mario.gal](https://mario.gal)
- 🐙 [GitHub](https://github.com/MarioContrerasLara)
- 📧 [Email](mailto:hello@mario.gal)

---

*Last updated: 4 July 2026*