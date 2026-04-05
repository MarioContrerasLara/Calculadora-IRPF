# Calculadora IRPF + Seguridad Social 2026

[![Tests Passing](https://img.shields.io/badge/tests%20passing-1344%2F1344-brightgreen.svg)](./docs/TESTING.md)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Version: 1.0.0](https://img.shields.io/badge/version-1.0.0-green.svg)](CHANGELOG.md)

Una **calculadora integral del IRPF + Seguridad Social** para trabajadores del régimen general en **Andalucía (2025–2026)**, con soporte para años futuros hasta 2045.

## 🎯 Características Principales

✅ **Cálculo preciso IRPF + SS** — Aplica todas las escalas impositivas actuales y contribuciones del régimen general  
✅ **Seguridad Social completa** — Cotizaciones de desempleo, CC, FP, MEI y cuota de solidaridad (desde 2025)  
✅ **Especie y flexibilidad laboral** — Seguro médico, transporte, descuentos tickets, dietas y fondos de pensiones (_tax-free_)  
✅ **Dinerario personalizable** — Añade conceptos en especie monetarios con un solo clic  
✅ **Diseño responsivo** — Interfaz inspirada en Apple; se adapta perfectamente a móvil, tablet y desktop  
✅ **Análisis visual iceberg** — Desglosa el coste total en tres zonas: neto, impuestos trabajador, contribuciones empresa  
✅ **Bonus y pagas variables** — Soporta bonificaciones por mes y pagas de 12 o 14  
✅ **Suite de tests completa** — **1.344 pruebas autom** que garantizan precisión en todos los escenarios  

## 🚀 Inicio Rápido

### Requisitos  
- Node.js 14+ (para el servidor)  
- Navegador moderno (Chrome, Firefox, Safari, Edge)  
- Python 3.8+ (solo para ejecutar tests)  

### Instalación local

```bash
git clone https://github.com/MarioContrerasLara/Calculadora-IRPF.git
cd Calculadora-IRPF

# Opción 1: Servidor Node.js (desarrollo)
npm install
npm start
# Abre http://localhost:3000

# Opción 2: Servir estático (python)
python3 -m http.server 8000
# Abre http://localhost:8000
```

### Usar online

👉 Disponible en **[irpf.mario.gal](https://irpf.mario.gal)** — sin instalación necesaria.

## 📚 Documentación

| Documento | Contenido |
|-----------|----------|
| [INSTALLATION.md](docs/INSTALLATION.md) | Configuración detallada (desarrollo, producción, Docker) |
| [USER_GUIDE.md](docs/USER_GUIDE.md) | Tutorial completo de uso de la calculadora |
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | Diseño del sistema, estructura de código, flujo de datos |
| [API_REFERENCE.md](docs/API_REFERENCE.md) | Referencia de todas las funciones JavaScript y Python |
| [TESTING.md](docs/TESTING.md) | Suite de tests, estrategia de verificación, cómo añadir tests |
| [DEPLOYMENT.md](docs/DEPLOYMENT.md) | Desplegar en producción, AWS, CI/CD |
| [CHANGELOG.md](docs/CHANGELOG.md) | Historial de cambios v1.0.0 |

## 🔧 Stack Técnico

| Capa | Tecnología |
|-----|-----------|
| **Frontend** | HTML5, CSS3 (Diseño Apple), JavaScript vanilla (`'use strict'`) |
| **Backend** | Node.js + Express (producción) o Python http.server (desarrollo) |
| **Testing** | Python custom test runner (227 tests de lógica, 1117 tests integración) |
| **Font** | SF Pro Text (Apple system stack) |
| **Deploy** | GitHub + SSH (server.mario.gal) |

## 📊 Características Técnicas Avanzadas

### Cálculo de Seguridad Social por mes
El cálculo respeta las bases reguladas **por mes**, considerando:
- Base mínima grupo 4: €1.381,20 (2025)
- Base máxima: €4.909,50 (2025) → €5.101,20 (2026)
- Bonificaciones que elevan la base en meses específicos (capped a máximo)

### Solidaridad (desde 2025)
Cuota de solidaridad obligatoria en 3 tramos:
- **Tramo 1** (0–10% del máximo): 0,92% (2025) → 5,50% (2045)
- **Tramo 2** (10–50% del máximo): 1,00% (2025) → 6,00% (2045)
- **Tramo 3** (>50% del máximo): 1,17% (2025) → 7,00% (2045)

Ratio trabajador/empresa: **4,70/28,30**

### MEI (Módulo Trabajador Autónomo) 2023–2029
Cuotas anuales crecientes para trabajadores con doble status:
- 2025: 0,13% trabajador + 0,67% empresa
- 2029: 0,20% trabajador + 1,00% empresa

### Especie fiscal (Art. 42.3 LIRPF)
- Seguro médico personal: €500/año (€1.500 con discapacidad)
- Transporte: €1.500/año (proporcional si excede)
- Tickets comida: sin límite (control empleado)
- Dietas: flexible

## ✅ Garantía de Precisión

Todos los cálculos han pasado **1.344 tests** que cubren:
- ✓ Todos los años 2023–2045
- ✓ Todos los grupos de cotización (1–4)
- ✓ Todas las escalas IRPF (Estatal + Andalucía)
- ✓ Combinaciones de especie (médico + transporte + tickets + dietas)
- ✓ Todas las opciones de edad/discapacidad/hijos/ascendientes
- ✓ MEI, solidaridad, bonificaciones variables
- ✓ Identidades contables (neto + impuestos + aportes = bruto)

Ver [TESTING.md](docs/TESTING.md) para detalles.

## 🤝 Contribuir

Las contribuciones son bienvenidas. Para reportar bugs o solicitar características:

1. Abre un [issue](https://github.com/MarioContrerasLara/Calculadora-IRPF/issues)
2. Fork el repositorio
3. Crea una rama (`git checkout -b feature/MiCaracteristica`)
4. Haz commit de tus cambios (`git commit -m "Añade..."`)
5. Push a la rama (`git push origin feature/MiCaracteristica`)
6. Abre un Pull Request

**Pautas:** Todo código nuevo debe incluir tests. Ejecuta `python3 tests/test_irpf.py` antes de push.

## 📄 Licencia

MIT License — Libre para uso privado, comercial, educativo.

## 👤 Autor

**Mario Contreras Lara**  
[GitHub](https://github.com/MarioContrerasLara) · [mario.gal](https://mario.gal)

---

**¿Preguntas?** Consulta la [USER_GUIDE.md](docs/USER_GUIDE.md) o abre un issue.
