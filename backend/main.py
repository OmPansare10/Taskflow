from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware

from routes.comments import router as comments_router
from routes.team import router as team_router
from database import client
from dependencies import get_current_user
from routes.dashboard import router as dashboard_router
from routes.auth import router as auth_router
from routes.projects import router as projects_router
from routes.tasks import router as tasks_router
from routes.notifications import router as notifications_router


app = FastAPI(
    title="TaskFlow API",
    description="Backend API for TaskFlow Project Management System",
    version="1.0.0"
)


# =========================================================
# CORS
# =========================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        # Local development
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",

        # Production
        "https://taskflow-bwxq.onrender.com",
        "https://frontend-om-pansare.vercel.app",
    ],
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =========================================================
# REGISTER API ROUTERS
# =========================================================

app.include_router(auth_router)
app.include_router(projects_router)
app.include_router(tasks_router)
app.include_router(notifications_router)
app.include_router(comments_router)
app.include_router(dashboard_router)
app.include_router(team_router)


# =========================================================
# ROOT
# =========================================================

@app.get("/")
def root():
    return {
        "message": "TaskFlow Backend is running"
    }


# =========================================================
# HEALTH CHECK
# =========================================================

@app.get("/health")
def health_check():

    try:
        client.admin.command("ping")

        return {
            "status": "healthy",
            "database": "connected"
        }

    except Exception as e:

        return {
            "status": "unhealthy",
            "database": "disconnected",
            "error": str(e)
        }


# =========================================================
# CURRENT USER
# =========================================================

@app.get("/auth/me")
def get_me(
    current_user=Depends(get_current_user)
):

    return {
        "id": str(current_user["_id"]),
        "name": current_user["name"],
        "email": current_user["email"],
        "avatar": current_user["avatar"],
        "role": current_user.get("role", "Developer"),
        "custom_role": current_user.get("custom_role", "")
    }