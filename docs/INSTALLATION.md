# Installation & Setup Guide

## System Requirements

| Requirement | Version | Purpose |
|------------|---------|---------|
| Node.js | 14+ | Servidor backend (desarrollo/producción) |
| Python | 3.8+ | Ejecutar suite de tests |
| Git | 2.x | Clonar repositorio y versionamiento |
| Navegadores soportados | Modern (2020+) | FireFox, Chrome, Safari, Edge |

## 🏠 Instalación Local (Desarrollo)

### 1. Clonar repositorio

```bash
git clone https://github.com/MarioContrerasLara/Calculadora-IRPF.git
cd Calculadora-IRPF
```

### 2. Opción A: Node.js Server (Recomendado)

```bash
# Instalar dependencias
npm install

# Iniciar servidor en puerto 3000
npm start

# O ejecutar manualmente
node server.js
```

Abre **http://localhost:3000** en tu navegador.

**Archivos servidos:**
- `index.html` — Página principal
- `css/styles.css` — Estilos diseño Apple
- `js/app.js` — Lógica cálculos IRPF + SS
- `js/tarifa-at.js` — Tarifa accidente de trabajo (referencia)

### 3. Opción B: Python HTTP Server (Ligero)

```bash
python3 -m http.server 8000
```

Abre **http://localhost:8000** en tu navegador.

### 4. Opción C: Servir con Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY . .
RUN npm install
CMD ["node", "server.js"]
EXPOSE 3000
```

```bash
docker build -t irpf-calc .
docker run -p 3000:3000 irpf-calc
```

---

## 🧪 Instalación de Tests

### Requisitos

- Python 3.8+
- Módulos: `math`, `re` (built-in)

### Ejecutar tests

```bash
cd Calculadora-IRPF
python3 tests/test_irpf.py
```

**Salida esperada:**
```
============================================================
 IRPF 2025 Calculator — Python Verification Tests
============================================================

reduccionRendimientos
  ✓ rendNeto=0 → 7302
  ...
============================================================
  ALL 1344 TESTS PASSED ✓
============================================================
```

### Ejecutar tests específicos

```bash
# Filtrar por nombre de grupo
python3 tests/test_irpf.py 2>&1 | grep -A 5 "MEI_BY_YEAR"

# Contar total de tests
python3 tests/test_irpf.py 2>&1 | grep "TESTS PASSED"
```

---

## 🚀 Instalación Producción

### en AWS EC2

```bash
# SSH a instancia
ssh -i mykey.pem ubuntu@your-ec2-instance

# Clonar repo
git clone https://github.com/MarioContrerasLara/Calculadora-IRPF.git
cd Calculadora-IRPF

# Instalar dependencias
npm install

# Usar PM2 para mantener servidor vivo
npm install -g pm2
pm2 start server.js --name "irpf"
pm2 startup
pm2 save
```

### en Heroku

```bash
# Crear app
heroku create irpf-calc

# Deploy
git push heroku main

# Ver logs
heroku logs --tail
```

Requiere Procfile:
```
web: node server.js
```

### en tu servidor (SSH)

```bash
# En servidor remoto
ssh user@server.mario.gal

# Clonar/actualizar
cd ~/IRPF/Calculadora-IRPF
git pull

# Reiniciar servicio
sudo systemctl restart irpf.service

# Ver estado
sudo systemctl status irpf.service
```

**Systemd service file** (`/etc/systemd/system/irpf.service`):
```ini
[Unit]
Description=IRPF Calculator
After=network.target

[Service]
Type=simple
User=mario
WorkingDirectory=/home/mario/IRPF/Calculadora-IRPF
ExecStart=/usr/bin/node server.js
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
```

---

## 🔐 Variables de Entorno

Crear `.env` en raíz:

```env
PORT=3000
NODE_ENV=production
IRPF_YEAR=2026
DEBUG=false
```

Leer en `server.js`:
```javascript
require('dotenv').config();
const port = process.env.PORT || 3000;
```

---

## 🐛 Troubleshooting

### Puerto 3000 ocupado

```bash
# Encontrar proceso
lsof -i :3000

# Matar proceso
kill -9 <PID>

# O usar puerto diferente
PORT=8080 npm start
```

### Tests fallan

```bash
# Verificar Python
python3 --version

# Verificar módulos
python3 -c "import math, re; print('OK')"

# Ejecutar con debug
python3 -u tests/test_irpf.py 2>&1 | head -100
```

### CORS en navegador

Si accedes desde otro dominio, añade headers en `server.js`:

```javascript
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST');
    next();
});
```

### CSS/JS no cargan

Limpia caché del navegador:
- **Chrome:** Ctrl+Shift+Delete
- **Firefox:** Ctrl+Shift+Delete  
- **Safari:** Cmd+Shift+Delete

O accede con caché desactivada:
- Chrome DevTools → Network → Disable cache (checkbox)

---

## 📦 Estructura de carpetas

```
Calculadora-IRPF/
├── index.html              # Página principal
├── server.js               # Servidor Node.js
├── package.json            # Dependencias npm
├── README.md               # Este archivo
├── css/
│   └── styles.css         # Estilos (Apple design, responsive)
├── js/
│   ├── app.js             # Lógica IRPF + SS (1240 líneas)
│   └── tarifa-at.js       # Datos AT (referencia)
├── tests/
│   ├── test_irpf.py       # Suite 1344 tests
│   └── test.html          # Tests HTML (navegador)
└── docs/
    ├── INSTALLATION.md    # Este archivo
    ├── USER_GUIDE.md
    ├── ARCHITECTURE.md
    ├── API_REFERENCE.md
    ├── TESTING.md
    ├── DEPLOYMENT.md
    └── CHANGELOG.md
```

---

## ✅ Verificación de instalación

```bash
# 1. Node.js
node --version        # v14.0.0+

# 2. npm
npm --version         # 6.0.0+

# 3. Python
python3 --version     # Python 3.8+

# 4. Git
git --version         # git version 2.x

# 5. Tests
python3 tests/test_irpf.py 2>&1 | tail -3
# ALL 1344 TESTS PASSED ✓

# 6. Servidor
npm start
# Abre http://localhost:3000
```

---

## 🔄 Actualizar instalación existente

```bash
git pull                 # Descargar cambios
npm install             # Instalar nuevas dependencias
npm start               # Reiniciar servidor

# Verificar es OK
python3 tests/test_irpf.py
```

---

## 📞 Soporte

- **Problemas con instalación?** Abre un [issue](https://github.com/MarioContrerasLara/Calculadora-IRPF/issues)
- **Preguntas de uso?** Ver [USER_GUIDE.md](USER_GUIDE.md)
- **Detalles técnicos?** Ver [ARCHITECTURE.md](ARCHITECTURE.md)
