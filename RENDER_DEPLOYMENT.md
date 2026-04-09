# Deploy to Render with Supabase (PostgreSQL)

## Step 1: Create Supabase PostgreSQL Database

1. Go to [supabase.com](https://supabase.com)
2. Sign up / Login
3. Create a new project:
   - Project name: `cricanalytics`
   - Database password: Create secure password
   - Region: Choose closest to you
4. Wait for setup (2-3 minutes)

### Get Your Database URL

1. Go to **Project Settings** > **Database**
2. Find **Connection string** section
3. Copy the PostgreSQL URL (URI format)
   - It looks like: `postgresql://postgres:[PASSWORD]@[HOST]:[PORT]/[DATABASE]?sslmode=require`

**⚠️ Important:** Replace `[PASSWORD]` with the actual database password you set during setup

---

## Step 2: Prepare GitHub Repository

1. Push your code to GitHub:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/cricanalytics.git
   git push -u origin main
   ```

2. Ensure these files exist in project root:
   - ✅ `Procfile` (created)
   - ✅ `backend/requirements.txt` (updated)
   - ✅ `backend/CricAnalytics/settings.py` (configured for env vars)

---

## Step 3: Deploy on Render

### Method A: Using render.yaml (Recommended)

1. Go to [render.com](https://render.com)
2. Click **New +** > **Web Service**
3. Select **Deploy from Git Repository**
4. Connect GitHub and select your `cricanalytics` repository
5. Select Branch: `main`
6. Render should auto-detect `render.yaml`
7. Set Environment Variables (see below)
8. Click **Create Web Service**

### Method B: Manual Setup

1. Go to [render.com](https://render.com)
2. Click **New +** > **Web Service**
3. Fill in the form:
   - **Name:** `cricanalytics`
   - **Environment:** `Python 3`
   - **Build Command:**
     ```bash
     pip install -r requirements.txt && cd frontend && npm install && npm run build
     ```
   - **Start Command:**
     ```bash
     gunicorn CricAnalytics.wsgi:application --log-file -
     ```
   - **Plan:** Free (or upgrade as needed)

4. Click **Create Web Service**

---

## Step 4: Configure Environment Variables in Render

After creating the service, go to **Environment** tab and add these variables:

| Key | Value |
|-----|-------|
| `DEBUG` | `False` |
| `SECRET_KEY` | Generate: [django-insecure secret key generator](https://www.miniwebtool.com/django-secret-key-generator/) |
| `ALLOWED_HOSTS` | `yoursite.onrender.com,www.yoursite.onrender.com` |
| `DATABASE_URL` | Paste your Supabase PostgreSQL URL from Step 1 |
| `CORS_ALLOWED_ORIGINS` | `https://yoursite.onrender.com,https://www.yoursite.onrender.com` |

**Example DATABASE_URL:**
```
postgresql://postgres:YOUR_PASSWORD@db.supabaselocalhost.com:5432/postgres?sslmode=require
```

---

## Step 5: Run Migrations

After deployment, you need to run database migrations:

### Option A: Using Render Shell

1. In Render dashboard, go to your service
2. Click **Shell** tab
3. Run:
   ```bash
   python manage.py migrate
   python manage.py createsuperuser  # (optional)
   ```

### Option B: Using release command in Procfile

The `release` command in `Procfile` should run migrations automatically on each deploy.

---

## Step 6: Test Your Deployment

1. Wait for deployment to complete (shows as "Live")
2. Visit: `https://your-app.onrender.com`
3. Check API: `https://your-app.onrender.com/api`
4. Admin panel: `https://your-app.onrender.com/admin`

---

## Troubleshooting

### Database Connection Failed

**Error:** `could not connect to server`

1. Verify `DATABASE_URL` is correct in Render environment
2. Check Supabase database is not suspended
3. Ensure Supabase password is correct in URL
4. Check connection string includes `?sslmode=require`

### Frontend Not Loading

**Error:** Blank page or 404

1. Build was successful? Check build logs
2. Verify `frontend/package.json` has build script
3. Check `backend/static/dist/index.html` exists

### 502 Bad Gateway

**Error:** Application error

1. Check application logs in Render
2. Run `python manage.py migrate` in shell
3. Check `SECRET_KEY` is set
4. Ensure `DEBUG = False`

---

## Database Management

### Backup Your Data

From Supabase dashboard:
1. Go to **Backups** tab
2. Choose **On Demand** backup
3. Download when ready

### Access Database Directly

Using psql or DBeaver:
```bash
psql "postgresql://postgres:[PASSWORD]@[HOST]:[PORT]/postgres?sslmode=require"
```

---

## Scaling (When Ready)

- **Render Plans:** Upgrade from Free to Pro for better performance
- **Supabase Plans:** Upgrade for more storage and performance

---

## Custom Domain

1. In Render, go to **Settings** > **Custom Domains**
2. Add your domain (e.g., `cricanalytics.com`)
3. Update DNS records as shown
4. Update `ALLOWED_HOSTS` in environment variables

---

## Monitoring & Logs

- **Render Logs:** Dashboard > Logs tab
- **Performance:** Monitor memory/CPU usage
- **Errors:** Check error logs for issues

---

## Quick Reference: Environment Variables Needed

```
DEBUG=False
SECRET_KEY=your-secret-key-here
ALLOWED_HOSTS=yoursite.onrender.com
DATABASE_URL=postgresql://postgres:password@host:5432/postgres?sslmode=require
CORS_ALLOW_ALL_ORIGINS=False
CORS_ALLOWED_ORIGINS=https://yoursite.onrender.com
```

---

## Support

- **Render Docs:** https://render.com/docs
- **Supabase Docs:** https://supabase.com/docs
- **Django Docs:** https://docs.djangoproject.com/
