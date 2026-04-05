# Documentation Guide

Welcome to the Calculadora IRPF documentation. Find what you need quickly:

## Quick Start

**New to the calculator?**  
→ Read [USER_GUIDE.md](USER_GUIDE.md)

**Setting up locally?**  
→ Read [INSTALLATION.md](INSTALLATION.md)

**Testing a feature?**  
→ Read [guides/TESTING_CHECKLIST.md](guides/TESTING_CHECKLIST.md)

## Feature Documentation

### 📈 Salary Adjustment (Actualización Salarial)
Change salary from any month during the year.

- **[Feature Overview](guides/FEATURE_ACTUALIZACION_SALARIAL.md)** — What's new, examples, how it works
- **[User Guide](ACTUALIZACION_SALARIAL.md)** — Complete guide for users
- **[Testing Checklist](guides/TESTING_CHECKLIST.md)** — Test before deployment

## Developer Documentation

**Understanding the codebase?**
- [ARCHITECTURE.md](ARCHITECTURE.md) — System design and data flow
- [API_REFERENCE.md](API_REFERENCE.md) — All functions and their parameters

**Contributing or extending?**
- [TESTING.md](TESTING.md) — How to run and add tests
- [guides/CI_CD_WORKFLOW.md](guides/CI_CD_WORKFLOW.md) — Deployment and CI/CD

## Operations Documentation

**Running the app?**
- [DEPLOYMENT.md](DEPLOYMENT.md) — Production setup and best practices

**Monitoring and troubleshooting?**
- [DEPLOYMENT.md](DEPLOYMENT.md) — Includes troubleshooting section

**Release process?**
- [CHANGELOG.md](CHANGELOG.md) — See what changed in each version

## Directory Structure

```
docs/
├─ README.md (this file)
├─ USER_GUIDE.md              ← Start here if new
├─ INSTALLATION.md            ← Setup instructions
├─ ARCHITECTURE.md            ← System design
├─ API_REFERENCE.md           ← Function reference
├─ TESTING.md                 ← Testing guide
├─ DEPLOYMENT.md              ← Production guide
├─ CHANGELOG.md               ← Version history
├─ ACTUALIZACION_SALARIAL.md  ← Salary feature guide
└─ guides/                     ← Operational guides
   ├─ README.md (you are here)
   ├─ CI_CD_WORKFLOW.md       ← Deployment workflow
   ├─ TESTING_CHECKLIST.md    ← Testing procedures
   └─ FEATURE_ACTUALIZACION_SALARIAL.md ← Feature summary
```

## By Role

### 👤 End Users
1. [USER_GUIDE.md](USER_GUIDE.md) — How to use features
2. [ACTUALIZACION_SALARIAL.md](ACTUALIZACION_SALARIAL.md) — New salary feature

### 👨‍💻 Developers
1. [INSTALLATION.md](INSTALLATION.md) — Local setup
2. [ARCHITECTURE.md](ARCHITECTURE.md) — System overview
3. [API_REFERENCE.md](API_REFERENCE.md) — Code reference
4. [TESTING.md](TESTING.md) — Running tests

### 🚀 DevOps / Deployment
1. [DEPLOYMENT.md](DEPLOYMENT.md) — Production setup
2. [guides/CI_CD_WORKFLOW.md](guides/CI_CD_WORKFLOW.md) — GitHub Actions workflow
3. [CHANGELOG.md](CHANGELOG.md) — Version information

### 🧪 QA / Testing
1. [guides/TESTING_CHECKLIST.md](guides/TESTING_CHECKLIST.md) — What to test
2. [TESTING.md](TESTING.md) — How tests work
3. [guides/FEATURE_ACTUALIZACION_SALARIAL.md](guides/FEATURE_ACTUALIZACION_SALARIAL.md) — Feature details

## Quick Links

| What | Where |
|------|-------|
| How do I use the app? | [USER_GUIDE.md](USER_GUIDE.md) |
| How do I set it up? | [INSTALLATION.md](INSTALLATION.md) |
| How is it built? | [ARCHITECTURE.md](ARCHITECTURE.md) |
| What functions exist? | [API_REFERENCE.md](API_REFERENCE.md) |
| How do I test? | [TESTING.md](TESTING.md) |
| How do I deploy? | [DEPLOYMENT.md](DEPLOYMENT.md) |
| What's the salary feature? | [guides/FEATURE_ACTUALIZACION_SALARIAL.md](guides/FEATURE_ACTUALIZACION_SALARIAL.md) |
| How do I test a feature? | [guides/TESTING_CHECKLIST.md](guides/TESTING_CHECKLIST.md) |
| How does CI/CD work? | [guides/CI_CD_WORKFLOW.md](guides/CI_CD_WORKFLOW.md) |
| What changed in v1.0.1? | [CHANGELOG.md](CHANGELOG.md) |

## Search Tips

Looking for something specific?
- Press **Cmd+F** (Mac) or **Ctrl+F** (Windows/Linux) on any page
- Type your search term
- Documentation is keyword-rich

## Found an Issue?

If documentation is unclear or outdated:
1. Open an issue on GitHub
2. Include which document and section
3. Describe what was confusing

---

**Last Updated:** April 5, 2026  
**Documentation Status:** Complete ✅
