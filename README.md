<img width="1437" height="702" alt="image" src="https://github.com/user-attachments/assets/1b0e6250-4de0-41a7-81f4-a2e3fba757c5" />





# CricAnalytics

A comprehensive full-stack cricket analytics web application for exploring player statistics, building teams, comparing players, and viewing rankings across different cricket formats (ODI, Test, T20).

![Status](https://img.shields.io/badge/status-active-brightgreen)
![License](https://img.shields.io/badge/license-MIT-blue)
![Version](https://img.shields.io/badge/version-1.0.0-blue)

## 🎯 Features

- **Player Profiles** - Detailed statistics and performance metrics for cricketers
- **Team Builder** - Dynamically build teams with balance analysis (batting, bowling, all-round)
- **Player Comparison** - Side-by-side comparison of multiple players across different metrics
- **Rankings** - Comprehensive leaderboards for batting, bowling, and all-round categories
- **Multi-format Support** - Statistics across ODI, Test, and T20 formats
- **Responsive Design** - Mobile-friendly interface built with modern React
- **REST API** - Complete REST API for accessing cricket statistics
- **Real-time Data** - Up-to-date player statistics and rankings

## 🛠️ Tech Stack

### Frontend
- **React 19** - UI library
- **Vite** - Build tool and dev server
- **React Router v7** - Client-side routing
- **Axios** - HTTP client
- **CSS3** - Styling

### Backend
- **Django 4.2** - Web framework
- **Django REST Framework** - REST API
- **PostgreSQL** - Database
- **Gunicorn** - Production WSGI server
- **CORS** - Cross-origin resource sharing

### Data Processing
- **Pandas** - Data manipulation and analysis
- **NumPy** - Numerical computing
- **Beautiful Soup** - Web scraping

## 📋 Prerequisites

- **Node.js** (v16+)
- **Python** (3.9+)
- **PostgreSQL** (12+)
- **npm** or **yarn**

## 🚀 Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/CricAnalytics.git
cd CricAnalytics
```

### 2. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv .venv

# Activate virtual environment
# On Windows:
.venv\Scripts\activate
# On macOS/Linux:
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create .env file
cp .env.example .env  # Edit with your database credentials

# Run migrations
python manage.py migrate

# Create superuser (optional)
python manage.py createsuperuser

# Start development server
python manage.py runserver
```

Backend will be available at `http://localhost:8000`

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

Frontend will be available at `http://localhost:5173`

## 🔧 Configuration

### Backend Configuration (.env file)

Create a `.env` file in the `backend` directory:

```
DEBUG=True
SECRET_KEY=your-secret-key-here
DATABASE_URL=postgresql://user:password@localhost:5432/cricanalytics
ALLOWED_HOSTS=localhost,127.0.0.1

# For production
# DEBUG=False
# ALLOWED_HOSTS=yourdomain.com,www.yourdomain.com
```

### Database Setup

```bash
# Create PostgreSQL database
createdb cricanalytics

# Run migrations
cd backend
python manage.py migrate
```

## 📁 Project Structure

```
CricAnalytics/
├── backend/                    # Django REST API
│   ├── CricAnalytics/         # Main project settings
│   ├── players/               # Players app (models, serializers, views)
│   ├── stats/                 # Statistics app (ODI, Test, T20 data)
│   ├── manage.py
│   ├── requirements.txt
│   └── Procfile               # Production deployment
│
├── frontend/                   # React Vite application
│   ├── src/
│   │   ├── components/        # Reusable components
│   │   ├── pages/             # Page components
│   │   ├── services/          # API services
│   │   ├── styles/            # CSS styles
│   │   └── main.jsx
│   ├── package.json
│   └── vite.config.js
│
├── build.sh                    # Production build script (Linux/Mac)
├── build.bat                   # Production build script (Windows)
├── DEPLOYMENT.md              # Deployment instructions
└── README.md                  # This file
```

## 🎮 Development

### Running Both Frontend and Backend

**Terminal 1 - Backend:**
```bash
cd backend
source .venv/bin/activate  # or .venv\Scripts\activate on Windows
python manage.py runserver
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

### API Documentation

The REST API endpoints include:

- `GET /api/players/` - List all players
- `GET /api/players/{id}/` - Get player details
- `GET /api/stats/` - Get statistics
- `GET /api/rankings/` - Get rankings

For detailed API documentation, check the backend views and serializers.

## 🏗️ Building for Production

### Using Build Scripts

**On Linux/macOS:**
```bash
chmod +x build.sh
./build.sh
```

**On Windows:**
```bash
build.bat
```

### Manual Build

```bash
# Build frontend
cd frontend
npm install
npm run build

# Move built files to backend static directory
cp -r dist backend/static/

# Backend is ready for deployment
cd ..
```

## 📦 Deployment

### Render Deployment

See [RENDER_DEPLOYMENT.md](RENDER_DEPLOYMENT.md) for detailed Render deployment instructions.

### Traditional Server Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for comprehensive deployment guide.

### Key Deployment Steps

1. Build the frontend: `npm run build`
2. Collect static files: `python manage.py collectstatic`
3. Run migrations: `python manage.py migrate`
4. Start with Gunicorn: `gunicorn CricAnalytics.wsgi:application`

## 🐛 Troubleshooting

### Database Connection Issues

```bash
# Verify PostgreSQL is running
# Check DATABASE_URL in .env
# Run migrations again
python manage.py migrate
```

### CORS Errors

- Check `CORS_ALLOWED_ORIGINS` in `backend/CricAnalytics/settings.py`
- Ensure frontend URL is whitelisted

### Frontend Build Issues

```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Port Already in Use

- Django: Change to `python manage.py runserver 8001`
- Vite: Change to `npm run dev -- --port 5174`

## 🔗 API Routes

### Players
- `GET /api/players/` - Get all players
- `GET /api/players/{id}/` - Get player by ID
- `POST /api/players/` - Create player (admin)
- `PUT /api/players/{id}/` - Update player (admin)
- `DELETE /api/players/{id}/` - Delete player (admin)

### Statistics
- `GET /api/stats/` - Get statistics
- `GET /api/rankings/` - Get rankings for format

### Admin Panel
- Django admin at `/admin/`

## 📝 Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `DEBUG` | Debug mode | `True` / `False` |
| `SECRET_KEY` | Django secret key | Generate with: `python -c 'from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())'` |
| `DATABASE_URL` | PostgreSQL connection | `postgresql://user:pass@localhost/db` |
| `ALLOWED_HOSTS` | Allowed hostnames | `localhost,127.0.0.1` |

## 📚 Additional Resources

- [Django Documentation](https://docs.djangoproject.com/)
- [React Documentation](https://react.dev/)
- [Vite Documentation](https://vitejs.dev/)
- [Django REST Framework](https://www.django-rest-framework.org/)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 👨‍💻 Author

Created by [Your Name]

## 🙏 Acknowledgments

- Django and React communities
- Cricket data providers
- All contributors and supporters

---

**Questions or Issues?** Open an issue on GitHub or check the documentation files in this repository.
