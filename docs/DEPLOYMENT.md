# Deployment Guide

Complete guide to deploying the calculator to production.

---

## Table of Contents

1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Server Setup](#server-setup)
3. [Application Deployment](#application-deployment)
4. [Monitoring & Maintenance](#monitoring--maintenance)
5. [Troubleshooting](#troubleshooting)
6. [Rollback Procedure](#rollback-procedure)

---

## Pre-Deployment Checklist

Before deploying:

- [ ] All tests pass: `python3 tests/test_irpf.py`
- [ ] No uncommitted changes: `git status`
- [ ] Latest code on main branch: `git log --oneline | head -5`
- [ ] CHANGELOG.md updated with version
- [ ] README.md reflects current version
- [ ] README.md links work: Links to docs files valid
- [ ] No console errors in browser (F12 → Console)
- [ ] Responsive design tested on mobile
- [ ] All input validation working
- [ ] Performance acceptable (~100ms calc time)

---

## Server Setup

### System Requirements

**Server specs:** Single-core, 512 MB RAM minimum

- **OS:** Ubuntu 20.04 LTS+ or CentOS 8+
- **Node.js:** 14.0.0+
- **PM2:** For process management (optional but recommended)
- **Git:** For pulling code
- **SSL certificate:** For HTTPS (included with Let's Encrypt)

### Initial Server Configuration

#### 1. SSH into Server

```bash
ssh user@server.example.com
```

#### 2. Install Dependencies

```bash
# Update package manager
sudo apt update && sudo apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install Git
sudo apt install -y git

# Install PM2 (process manager)
sudo npm install -g pm2

# Verify installations
node --version
npm --version
git --version
pm2 --version
```

#### 3. Create App User

```bash
# Create non-root user
sudo useradd -m -s /bin/bash irpf

# Give sudo to app user (optional)
sudo usermod -aG sudo irpf

# Switch to app user
sudo su - irpf
```

#### 4. Clone Repository

```bash
# As app user (irpf)
cd ~
git clone https://github.com/MarioContrerasLara/Calculadora-IRPF.git ~/IRPF/Calculadora-IRPF
cd ~/IRPF/Calculadora-IRPF

# Install dependencies
npm install
```

#### 5. Setup Systemd Service (Recommended)

Create `/etc/systemd/system/irpf.service`:

```ini
[Unit]
Description=IRPF Calculator
After=network.target
Wants=irpf.service

[Service]
Type=simple
User=irpf
WorkingDirectory=/home/irpf/IRPF/Calculadora-IRPF
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=10
Environment="NODE_ENV=production"
Environment="PORT=3000"

# Security
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/home/irpf/IRPF

[Install]
WantedBy=multi-user.target
```

**Enable service:**

```bash
sudo systemctl daemon-reload
sudo systemctl enable irpf.service
sudo systemctl start irpf.service
sudo systemctl status irpf.service
```

**View logs:**

```bash
sudo journalctl -u irpf.service -f
```

#### 6. Setup Nginx Reverse Proxy

Install Nginx:

```bash
sudo apt install -y nginx
```

Configure `/etc/nginx/sites-available/irpf`:

```nginx
upstream irpf_backend {
    server 127.0.0.1:3000;
}

server {
    listen 80;
    server_name irpf.example.com;

    location / {
        proxy_pass http://irpf_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable site:

```bash
sudo ln -s /etc/nginx/sites-available/irpf /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

#### 7. Setup SSL with Let's Encrypt

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d irpf.example.com
```

Nginx config auto-updated to use HTTPS.

### Environment Variables

Create `.env` file:

```bash
cd ~/IRPF/Calculadora-IRPF
cat > .env << EOF
NODE_ENV=production
PORT=3000
DEBUG=false
IRPF_YEAR=2026
EOF
```

---

## Application Deployment

### Fresh Deployment

```bash
# SSH to server
ssh user@server.example.com

# Switch to app user
sudo su - irpf

# Navigate to app directory
cd ~/IRPF/Calculadora-IRPF

# Install dependencies
npm install

# Run tests (optional but recommended)
python3 tests/test_irpf.py

# Start the service
sudo systemctl start irpf.service

# Verify it's running
sudo systemctl status irpf.service

# Check logs
sudo journalctl -u irpf.service -f
```

### Updating Existing Deployment

```bash
# SSH to server
ssh user@server.example.com
sudo su - irpf
cd ~/IRPF/Calculadora-IRPF

# Stop service (optional for zero-downtime)
sudo systemctl stop irpf.service

# Pull latest code
git pull origin main

# Install new dependencies (if any)
npm install

# Run tests
python3 tests/test_irpf.py

# Start service
sudo systemctl start irpf.service

# Verify
curl http://localhost:3000
```

### Zero-Downtime Deployment

Using PM2:

```bash
# Install PM2 (if not already)
sudo npm install -g pm2

# Start app with PM2
pm2 start server.js --name "irpf"

# Setup PM2 startup on reboot
pm2 startup
pm2 save

# For updates
pm2 reload irpf  # Zero-downtime reload

# Monitor
pm2 status
pm2 logs irpf
```

---

## Monitoring & Maintenance

### Health Check

```bash
# HTTP request
curl -I http://localhost:3000

# Should return 200 OK
```

### Logs

**Systemd:**

```bash
# Last 50 lines
sudo journalctl -u irpf.service -n 50

# Follow in real-time
sudo journalctl -u irpf.service -f

# Last hour
sudo journalctl -u irpf.service --since "1 hour ago"
```

**PM2:**

```bash
pm2 logs irpf
pm2 monit
```

### Performance Monitoring

```bash
# CPU/Memory usage
ps aux | grep node

# Detailed process info
top -p $(pgrep -f "node server.js")

# Port listening
sudo lsof -i :3000
```

### Certificate renewal (Let's Encrypt)

Auto-renews before expiration. Manual renewal:

```bash
sudo certbot renew --dry-run  # Test
sudo certbot renew             # Actual
```

### Backups

Data is **client-side only** — no database backups needed.

Backup code repository:

```bash
cd ~/IRPF/Calculadora-IRPF
git clone --mirror . ~/IRPF-backup.git
```

---

## Troubleshooting

### Port 3000 already in use

```bash
# Find what's using port
sudo lsof -i :3000

# Kill process (if needed)
sudo kill -9 <PID>

# Or use different port
PORT=8080 node server.js
```

### Service won't start

```bash
# Check logs
sudo journalctl -u irpf.service -n 50

# Verify Node.js installation
node --version

# Verify working directory exists
ls -la /home/irpf/IRPF/Calculadora-IRPF

# Verify dependencies installed
npm list --depth=0
```

### Out of memory

```bash
# Increase Node.js heap
NODE_OPTIONS="--max-old-space-size=512" node server.js

# Or update systemd service
# Environment="NODE_OPTIONS=--max-old-space-size=512"
```

### High CPU usage

Run profiling:

```bash
node --prof server.js
node --prof-process isolate-*.log > profile.txt
cat profile.txt
```

### SSL certificate issues

```bash
# Check certificate expiration
sudo certbot certificates

# Renew manually
sudo certbot renew

# Force renewal
sudo certbot renew --force-renewal
```

---

## Rollback Procedure

### If Deployment Breaks

```bash
# Identify last working commit
git log --oneline | head -10

# Rollback to previous version
git revert <latest-commit-hash>
# Or for faster rollback:
git reset --hard <previous-working-hash>

# Reinstall dependencies (if changed)
npm install

# Restart service
sudo systemctl restart irpf.service

# Verify
curl http://localhost:3000
```

### Rollback Using Git Tags

Tag releases for easy rollback:

```bash
# Create tag
git tag -a v1.0.0 -m "Release v1.0.0"
git push origin v1.0.0

# Rollback to tag
git checkout v1.0.0
npm install
sudo systemctl restart irpf.service
```

---

## Multiple Environment Setup

### Staging Environment (Testing)

```bash
# Same setup, different domain
server_name irpf-staging.example.com
PORT=3001
Environment="NODE_ENV=staging"
```

### Production Environment (Live)

```bash
server_name irpf.example.com
PORT=3000
Environment="NODE_ENV=production"
```

Keep both running; test in staging before promoting to production.

---

## Cloud Deployments

### AWS (Elastic Beanstalk)

Create `.ebextensions/nodecommand.config`:

```yaml
option_settings:
  aws:elasticbeanstalk:container:nodejs:
    NodeCommand: "node server.js"
```

Deploy:

```bash
aws elasticbeanstalk create-application --application-name irpf
eb init -p "Node.js 18 running on 64bit Amazon Linux 2" --region us-east-1
eb create irpf-app
eb deploy
```

### Heroku

Create `Procfile`:

```
web: node server.js
```

Deploy:

```bash
heroku create irpf-calc
git push heroku main
heroku logs --tail
```

### Docker

Create `Dockerfile`:

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
EXPOSE 3000
CMD ["node", "server.js"]
```

Build & run:

```bash
docker build -t irpf-calc .
docker run -p 3000:3000 irpf-calc
```

---

## Database Considerations

**None needed** — Application is fully client-side.

No user accounts, no data persistence, no sessions.

All calculations happen in the browser; nothing stored on server.

---

## Security Hardening

### Disable unnecessary services

```bash
sudo systemctl disable debug-shell.service
sudo systemctl disable systemd-debug-generator.service
```

### Firewall rules

```bash
sudo ufw allow 22/tcp     # SSH
sudo ufw allow 80/tcp     # HTTP
sudo ufw allow 443/tcp    # HTTPS
sudo ufw enable
```

### Remove git history from production

```bash
rm -rf .git
```

### Set restrictive permissions

```bash
chmod 755 ~/IRPF/Calculadora-IRPF
chmod 644 ~/IRPF/Calculadora-IRPF/*.js
chmod 644 ~/IRPF/Calculadora-IRPF/js/*
chmod 644 ~/IRPF/Calculadora-IRPF/css/*
```

---

## Performance Optimization

### Static file caching

In Nginx:

```nginx
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

### Compression

In Nginx:

```nginx
gzip on;
gzip_types text/plain text/css text/javascript application/json;
gzip_min_length 1000;
```

### CDN (Optional)

Use CloudFlare for global distribution:
1. Register domain with CloudFlare
2. Set nameservers
3. Enable caching rules
4. Enable minification

---

## Scheduled Maintenance

### Daily

- Monitor logs for errors
- Verify service is running

### Weekly

- Check disk space: `df -h`
- Update server packages: `sudo apt update && sudo apt upgrade`
- Review test results

### Monthly

- Update Node.js (if new patch available)
- Audit dependencies: `npm audit`
- Backup code

### Annually

- Rotate SSL certificate (or auto-renew)
- Review security settings
- Capacity planning

---

## Disaster Recovery

### Backup procedure

```bash
# Backup code
cp -r ~/IRPF/Calculadora-IRPF ~/backups/IRPF-$(date +%Y%m%d).tar.gz

# Backup job (crontab)
0 2 * * 0 cp -r ~/IRPF/Calculadora-IRPF ~/backups/IRPF-$(date +\%Y\%m\%d).tar.gz
```

### Restore procedure

```bash
# Stop service
sudo systemctl stop irpf.service

# Restore from backup
tar -xzf ~/backups/IRPF-20260101.tar.gz -C ~/IRPF

# Restart service
sudo systemctl start irpf.service
```

---

## Quick Reference

| Task | Command |
|------|---------|
| Start service | `sudo systemctl start irpf.service` |
| Stop service | `sudo systemctl stop irpf.service` |
| Restart service | `sudo systemctl restart irpf.service` |
| View logs | `sudo journalctl -u irpf.service -f` |
| Check status | `sudo systemctl status irpf.service` |
| Update code | `git pull && npm install && sudo systemctl restart irpf` |
| Run tests | `python3 tests/test_irpf.py` |
| Check port | `sudo lsof -i :3000` |
| Health check | `curl http://localhost:3000` |

---

## Support

**Deployment issues?**

1. Check logs: `sudo journalctl -u irpf.service -f`
2. Verify Node.js: `node --version`
3. Verify dependencies: `npm list`
4. Check port: `sudo lsof -i :3000`
5. Restart service: `sudo systemctl restart irpf.service`

**Still stuck?** Open an [issue](https://github.com/MarioContrerasLara/Calculadora-IRPF/issues)

---

*Last updated: 5 April 2026*
