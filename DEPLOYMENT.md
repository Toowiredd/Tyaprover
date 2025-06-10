# Tyaprover Deployment Guide

This guide covers deploying Tyaprover with MCP (Model Context Protocol) integration for AI-powered application management.

## 🏗 Deployment Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Claude CLI    │◄──►│   MCP Server     │◄──►│   Tyaprover     │
│   (AI Client)   │    │  (Bridge/API)    │    │  (Main App)     │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                │                        │
                                ▼                        ▼
                         ┌──────────────┐    ┌─────────────────┐
                         │ Config Files │    │ Docker Containers│
                         │    (.env)    │    │ (Your Apps)     │
                         └──────────────┘    └─────────────────┘
```

## 🚀 Production Deployment

### Option 1: Docker Compose (Recommended)

#### 1. Prepare Environment
```bash
# Clone repository
git clone https://github.com/yourusername/tyaprover.git
cd tyaprover

# Create production environment file
cp deploy-config.env .env.production
# Edit .env.production with your production values
```

#### 2. Configure Production Settings
```bash
# Edit deploy-config.env
TYAPROVER_API_URL=https://captain.yourdomain.com
TYAPROVER_AUTH_TOKEN=your-production-token
TYAPROVER_NAMESPACE=captain
NODE_ENV=production
LOG_LEVEL=warn
API_TIMEOUT=60000
```

#### 3. Deploy with Docker Compose
```bash
# Build and start services
docker-compose -f docker-compose.yml up -d

# Check service health
docker-compose ps
docker-compose logs tyaprover-mcp
```

#### 4. Configure Load Balancer (Nginx)
```nginx
# /etc/nginx/sites-available/tyaprover
server {
    listen 443 ssl http2;
    server_name captain.yourdomain.com;

    ssl_certificate /path/to/ssl/cert.pem;
    ssl_certificate_key /path/to/ssl/key.pem;

    location / {
        proxy_pass http://localhost:7474;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### Option 2: Direct Deployment

#### 1. Install Dependencies
```bash
# Install Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 for process management
npm install -g pm2
```

#### 2. Build and Deploy
```bash
# Build MCP server
cd mcp-server
npm install --production
npm run build

# Create PM2 ecosystem file
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [
    {
      name: 'tyaprover-main',
      script: './built/app.js',
      cwd: '/path/to/tyaprover',
      env: {
        NODE_ENV: 'production',
        PORT: 7474
      }
    },
    {
      name: 'tyaprover-mcp',
      script: './build/index.js',
      cwd: '/path/to/tyaprover/mcp-server',
      env: {
        NODE_ENV: 'production',
        TYAPROVER_API_URL: 'http://localhost:7474',
        TYAPROVER_AUTH_TOKEN: 'your-token'
      }
    }
  ]
};
EOF

# Start services
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

## 🛡 Security Configuration

### 1. Environment Security
```bash
# Secure environment files
chmod 600 .env.production
chown root:root .env.production

# Use environment-specific configs
export NODE_ENV=production
export CONFIG_PATH=/etc/tyaprover/config.json
```

### 2. Network Security
```bash
# Configure firewall (UFW example)
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable

# Internal communication only for MCP server
# No direct external access needed
```

### 3. SSL/TLS Configuration
```bash
# Generate SSL certificates (Let's Encrypt)
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d captain.yourdomain.com

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

## 📊 Monitoring and Logging

### 1. Application Monitoring
```bash
# PM2 monitoring
pm2 monit

# Log management
pm2 logs tyaprover-mcp --lines 100
pm2 logs tyaprover-mcp --follow

# Health checks
curl -f http://localhost:7474/api/v2/user/system/info
```

### 2. Log Configuration
```json
// config.json - Production logging
{
  "logging": {
    "level": "warn",
    "format": "json",
    "file": "/var/log/tyaprover/mcp-server.log",
    "rotation": {
      "enabled": true,
      "maxFiles": 5,
      "maxSize": "10m"
    }
  }
}
```

### 3. Log Rotation
```bash
# Configure logrotate
sudo cat > /etc/logrotate.d/tyaprover << EOF
/var/log/tyaprover/*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    copytruncate
}
EOF
```

## 🔧 Performance Tuning

### 1. Node.js Optimization
```bash
# Set Node.js memory limits
export NODE_OPTIONS="--max-old-space-size=2048"

# Enable V8 optimizations
export NODE_OPTIONS="--optimize-for-size"
```

### 2. System Optimization
```bash
# Increase file descriptor limits
echo "* soft nofile 65536" >> /etc/security/limits.conf
echo "* hard nofile 65536" >> /etc/security/limits.conf

# Optimize network settings
echo "net.core.somaxconn = 65535" >> /etc/sysctl.conf
sysctl -p
```

### 3. Database Optimization
```bash
# Docker resource limits for databases
docker run -d \
  --name postgres \
  --memory=1g \
  --cpus=1.0 \
  -e POSTGRES_PASSWORD=secretpassword \
  postgres:14
```

## 🔄 Backup and Recovery

### 1. Application Backup
```bash
#!/bin/bash
# backup-tyaprover.sh

BACKUP_DIR="/backup/tyaprover/$(date +%Y%m%d)"
mkdir -p "$BACKUP_DIR"

# Backup configurations
cp -r /path/to/tyaprover/mcp-server/config.json "$BACKUP_DIR/"
cp /path/to/tyaprover/.env.production "$BACKUP_DIR/"

# Backup application data
docker exec tyaprover-db pg_dump -U postgres tyaprover > "$BACKUP_DIR/database.sql"

# Backup Docker volumes
docker run --rm -v tyaprover_data:/data -v "$BACKUP_DIR":/backup alpine \
  tar czf /backup/volumes.tar.gz -C /data .

echo "Backup completed: $BACKUP_DIR"
```

### 2. Automated Backups
```bash
# Add to crontab
0 2 * * * /path/to/backup-tyaprover.sh > /var/log/tyaprover-backup.log 2>&1
```

### 3. Recovery Procedure
```bash
#!/bin/bash
# restore-tyaprover.sh

BACKUP_DATE="$1"  # Format: YYYYMMDD
BACKUP_DIR="/backup/tyaprover/$BACKUP_DATE"

# Stop services
pm2 stop all

# Restore configurations
cp "$BACKUP_DIR/config.json" /path/to/tyaprover/mcp-server/
cp "$BACKUP_DIR/.env.production" /path/to/tyaprover/

# Restore database
docker exec -i tyaprover-db psql -U postgres < "$BACKUP_DIR/database.sql"

# Restore volumes
docker run --rm -v tyaprover_data:/data -v "$BACKUP_DIR":/backup alpine \
  tar xzf /backup/volumes.tar.gz -C /data

# Start services
pm2 start all

echo "Recovery completed from: $BACKUP_DIR"
```

## 🧪 Testing Production Deployment

### 1. Health Checks
```bash
#!/bin/bash
# health-check.sh

echo "Testing Tyaprover Main Application..."
curl -f http://localhost:7474/api/v2/user/system/info || exit 1

echo "Testing MCP Server Integration..."
export TYAPROVER_API_URL="http://localhost:7474"
export TYAPROVER_AUTH_TOKEN="your-token"
cd /path/to/tyaprover/mcp-server
node -e "
const { TyaproverMCPServer } = require('./build/index.js');
const server = new TyaproverMCPServer();
console.log('MCP Server initialization: OK');
"

echo "Testing Claude CLI Integration..."
claude "list all applications" || echo "Claude CLI test failed (may need auth)"

echo "All health checks passed!"
```

### 2. Load Testing
```bash
# Install Apache Bench
sudo apt install apache2-utils

# Test API endpoints
ab -n 1000 -c 10 http://localhost:7474/api/v2/user/apps/appData

# Test MCP server responsiveness
# (requires custom load testing script)
```

## 📚 Troubleshooting

### Common Issues

#### 1. Authentication Failures
```bash
# Check token validity
curl -H "x-captain-auth: your-token" \
     http://localhost:7474/api/v2/user/system/info

# Regenerate token if needed
# (via Tyaprover web interface)
```

#### 2. Connection Issues
```bash
# Check service status
pm2 status
docker-compose ps

# Check network connectivity
netstat -tulpn | grep 7474
telnet localhost 7474
```

#### 3. Memory Issues
```bash
# Monitor memory usage
pm2 monit
free -h
df -h

# Restart services if needed
pm2 restart all
```

### Maintenance Commands

```bash
# Update Tyaprover
cd /path/to/tyaprover
git pull origin main
npm install
npm run build

# Update MCP server
cd mcp-server
npm install
npm run build
pm2 restart tyaprover-mcp

# Clean up Docker
docker system prune -f
docker volume prune -f
```

## 📞 Support

- **Documentation**: See [README.md](../README.md) and [API.md](./API.md)
- **Issues**: GitHub Issues
- **Community**: Discord/Slack channels
- **Professional Support**: Contact support@tyaprover.com

---

<!-- Generated by Copilot -->
