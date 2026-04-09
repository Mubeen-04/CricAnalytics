# CricAnalytics - Monolithic Deployment Guide

This guide explains how to build and deploy CricAnalytics as a single monolithic application (frontend + backend integrated).

## Overview

The architecture consists of:
- **Frontend**: React + Vite (built into `backend/static/dist`)
- **Backend**: Django REST API + Static File Server
- **Database**: PostgreSQL

---

## Development Setup

### Prerequisites
- Node.js (v16+)
- Python 3.9+
- PostgreSQL

### 1. Backend Setup

```bash
cd backend

# Create and activate virtual environment
python -m venv .venv

# Windows
.venv\Scripts\activate

# macOS/Linux
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run migrations
python manage.py migrate

# Create superuser (optional)
python manage.py createsuperuser

# Start dev server
python manage.py runserver
```

### 2. Frontend Development (with hot reload)

```bash
cd frontend

# Install dependencies
npm install

# Start dev server (port 5173)
npm run dev

# The dev server proxies /api requests to http://localhost:8000
```

Visit: `http://localhost:5173`

---

## Building for Production

### Step 1: Build Frontend

```bash
cd frontend

# Install dependencies (if not already done)
npm install

# Build the frontend
npm run build

# Output: ../backend/static/dist/
```

The built files include:
- `index.html` - Main entry point
- `assets/` - JS, CSS bundles (with hashes)

### Step 2: Update Backend Configuration

Edit `backend/CricAnalytics/settings.py`:

```python
# Production settings
DEBUG = False
ALLOWED_HOSTS = ['yourdomain.com', 'www.yourdomain.com']
```

Or use environment variables:
```bash
DEBUG=False
ALLOWED_HOSTS=yourdomain.com,www.yourdomain.com
```

### Step 3: Collect Static Files (Optional)

If using a separate static file server:

```bash
cd backend
python manage.py collectstatic --noinput
# Copies to backend/staticfiles/
```

---

## Deployment

### Option A: Linux Server (Recommended)

#### Prerequisites
- Ubuntu 20.04+ or similar
- PostgreSQL
- Python 3.9+
- Nginx (optional, but recommended for production)

#### Steps

1. **Clone/Upload Project**
   ```bash
   git clone <your-repo> cricanalytics
   cd cricanalytics/backend
   ```

2. **Setup Database**
   ```bash
   # Ensure PostgreSQL is running
   sudo systemctl start postgresql

   # Create database and user
   createdb cricket_db
   createuser postgres_user
   ```

3. **Install Dependencies**
   ```bash
   python -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   pip install gunicorn
   ```

4. **Run Migrations**
   ```bash
   source venv/bin/activate
   python manage.py migrate
   ```

5. **Test with Gunicorn**
   ```bash
   gunicorn --workers 4 --bind 0.0.0.0:8000 CricAnalytics.wsgi:application
   ```

6. **Setup Nginx (Optional but Recommended)**

   Create `/etc/nginx/sites-available/cricanalytics`:

   ```nginx
   server {
       listen 80;
       server_name yourdomain.com www.yourdomain.com;

       location / {
           proxy_pass http://127.0.0.1:8000;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
       }

       location /static/ {
           alias /home/user/cricanalytics/backend/staticfiles/;
       }
   }
   ```

   Enable the site:
   ```bash
   sudo ln -s /etc/nginx/sites-available/cricanalytics /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl restart nginx
   ```

7. **Setup SSL with Certbot**
   ```bash
   sudo apt install certbot python3-certbot-nginx
   sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
   ```

8. **Create Systemd Service**

   Create `/etc/systemd/system/cricanalytics.service`:

   ```ini
   [Unit]
   Description=CricAnalytics Django Application
   After=network.target

   [Service]
   Type=notify
   User=www-data
   WorkingDirectory=/home/user/cricanalytics/backend
   Environment="PATH=/home/user/cricanalytics/backend/venv/bin"
   ExecStart=/home/user/cricanalytics/backend/venv/bin/gunicorn \
       --workers 4 \
       --bind unix:/run/gunicorn.sock \
       --timeout 120 \
       CricAnalytics.wsgi:application

   [Install]
   WantedBy=multi-user.target
   ```

   Enable and start:
   ```bash
   sudo systemctl daemon-reload
   sudo systemctl enable cricanalytics
   sudo systemctl start cricanalytics
   ```

---

### Option B: Docker (Recommended for Easy Deployment)

Create `Dockerfile` in project root:

```dockerfile
FROM python:3.10-slim

WORKDIR /app

# Backend dependencies
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt gunicorn

# Frontend build
COPY frontend /tmp/frontend
WORKDIR /tmp/frontend
RUN apt-get update && apt-get install -y nodejs npm && \
    npm install && \
    npm run build && \
    cp -r dist /app/backend/static/dist && \
    cd /app && \
    rm -rf /tmp/frontend

# Copy backend
COPY backend /app

# Collect static files
RUN python manage.py collectstatic --noinput

EXPOSE 8000

CMD ["gunicorn", "--workers", "4", "--bind", "0.0.0.0:8000", "CricAnalytics.wsgi:application"]
```

Build and run:
```bash
docker build -t cricanalytics:latest .
docker run -p 8000:8000 \
  -e DEBUG=False \
  -e ALLOWED_HOSTS=yourdomain.com \
  -e DATABASE_URL=postgresql://user:password@db:5432/cricket_db \
  cricanalytics:latest
```

---

### Option C: Heroku

1. **Create Procfile**
   ```
   web: gunicorn CricAnalytics.wsgi --log-file -
   ```

2. **Create runtime.txt**
   ```
   python-3.10.0
   ```

3. **Deploy**
   ```bash
   heroku login
   heroku create cricanalytics
   git push heroku main
   heroku run python manage.py migrate
   ```

---

## Environment Variables

Set these for production:

```bash
DEBUG=False
SECRET_KEY=your-secret-key-here
ALLOWED_HOSTS=yourdomain.com,www.yourdomain.com
DATABASE_URL=postgresql://user:password@host:5432/cricket_db
CORS_ALLOW_ALL_ORIGINS=False
CORS_ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

---

## Performance Optimization

### 1. Database
- Index frequently queried fields
- Use connection pooling (pgBouncer)
- Regular backups

### 2. Frontend
- Assets are already minified by Vite
- Enable gzip in Nginx

### 3. Backend
- Use production-grade WSGI server (Gunicorn)
- Set appropriate worker count: `workers = (2 * CPU_cores) + 1`
- Enable caching headers

---

## Troubleshooting

### Frontend Not Loading
- Ensure `npm run build` was executed
- Check `STATIC_URL` and `STATIC_ROOT` in settings.py
- Verify static files directory exists: `backend/static/dist/`

### API Requests Failing
- Check CORS settings in `settings.py`
- Ensure backend is running
- Verify `ALLOWED_HOSTS` includes your domain

### Database Connection Issues
- Verify PostgreSQL is running
- Check `DATABASES` configuration
- Ensure database credentials are correct

---

## Quick Deployment Checklist

- [ ] Build frontend: `cd frontend && npm run build`
- [ ] Update `DEBUG = False` in settings.py
- [ ] Update `ALLOWED_HOSTS` with your domain
- [ ] Run migrations: `python manage.py migrate`
- [ ] Set `SECRET_KEY` to a secure random value
- [ ] Configure `CORS_ALLOWED_ORIGINS` (if not using `Allow All`)
- [ ] Collect static files: `python manage.py collectstatic`
- [ ] Test with Gunicorn locally
- [ ] Deploy to your server
- [ ] Setup SSL certificate
- [ ] Configure monitoring/logging

---

## Support

For issues or questions:
1. Check server logs: `journalctl -u cricanalytics -f`
2. Django logs location depends on your setup
3. Check Nginx/Gunicorn error logs

