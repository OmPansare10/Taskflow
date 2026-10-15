# TaskFlow - MongoDB Atlas Migration & Production Deployment Guide

This guide explains how to migrate all existing data from your local MongoDB instance to MongoDB Atlas, and connect your Render backend and Vercel frontend for production.

---

## 1. Verified Local Database State

Your local database (`taskflow_db` on `mongodb://localhost:27017`) contains **136 total documents** across 8 collections:

| Collection | Document Count | Contents |
| :--- | :--- | :--- |
| **`activities`** | 76 | Project and task activity logs, timeline history |
| **`comments`** | 5 | Task discussions and comment threads |
| **`notifications`** | 12 | Member invitations, assignments, team notifications |
| **`project_members`** | 13 | Project memberships, roles, and join timestamps |
| **`projects`** | 6 | Projects, metadata, keys, descriptions |
| **`tasks`** | 15 | Tasks, subtasks, priorities, statuses, tags, dates |
| **`users`** | 9 | User profiles, emails, PBKDF2 password hashes |
| **`team`** | 0 | Team container |

---

## 2. Pre-Migration Step: Automated Backup

Before migration, the migration script automatically creates an offline BSON-compatible backup in `backend/data/backups/`.

You can also run the backup independently at any time:
```powershell
# From the backend directory:
.\venv\Scripts\python.exe scripts\backup_local_mongodb.py
```

---

## 3. How to Run the Migration Script to MongoDB Atlas

Run the migration script from your local development machine (which has direct access to your local MongoDB):

### Option A: Using PowerShell Environment Variable
```powershell
# In PowerShell (from project root):
$env:TARGET_MONGO_URI = "mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority"
$env:TARGET_DB_NAME = "taskflow"

backend\venv\Scripts\python.exe scripts\migrate_local_mongodb_to_atlas.py
```

### Option B: Using Command-Line Arguments
```powershell
backend\venv\Scripts\python.exe scripts\migrate_local_mongodb_to_atlas.py --target-uri "mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority" --target-db "taskflow"
```

### What the Migration Script Does:
1. **Automated Pre-Backup:** Takes a snapshot of all local collections.
2. **Preserves Identity:** Retains exact `_id` values (BSON ObjectIds), ISO timestamps, nested arrays, and foreign references.
3. **Preserves Passwords:** Password hashes (`password_hash`) are copied verbatim — no passwords are reset or double-hashed.
4. **Idempotent (Safe to Rerun):** Uses `ReplaceOne(..., upsert=True)` to prevent duplicate records if re-run.
5. **Re-creates Indexes:** Copies collection indexes to Atlas.
6. **Integrity Report:** Verifies source vs. destination counts and outputs an audit table.
7. **Leaves Local DB Untouched:** Your local database remains 100% intact for local development.

---

## 4. Render Production Configuration

In your **Render Dashboard** (`https://dashboard.render.com`):
1. Select your Web Service: **`taskflow-2-bzh0`**.
2. Go to the **Environment** tab on the left menu.
3. Add / update the following environment variables:

| Variable Name | Recommended Value | Notes |
| :--- | :--- | :--- |
| **`MONGO_URI`** | `mongodb+srv://<user>:<password>@cluster.mongodb.net/?retryWrites=true&w=majority` | Atlas connection string (or set `MONGODB_URI`) |
| **`DATABASE_NAME`** | `taskflow` | Production MongoDB database name |
| **`DEBUG`** | `False` | Disables debug mode in production |
| **`SECRET_KEY`** | *(generate a random 64-char string)* | Keep this secure |
| **`ALLOWED_HOSTS`** | `taskflow-2-bzh0.onrender.com,localhost,127.0.0.1` | Allowed backend hosts |
| **`CORS_ALLOWED_ORIGINS`** | `https://taskflow-six-phi-99.vercel.app` | Vercel production frontend origin |

*Important:* In MongoDB Atlas, verify under **Network Access** that `0.0.0.0/0` is active so Render can connect.

---

## 5. Vercel Production Configuration

In your **Vercel Dashboard** (`https://vercel.com`):
1. Select your project: **`taskflow-six-phi-99`**.
2. Go to **Settings → Environment Variables**.
3. Add / update:

| Variable Name | Value | Environment |
| :--- | :--- | :--- |
| **`VITE_API_URL`** | `https://taskflow-2-bzh0.onrender.com` | Production, Preview, Development |

4. Trigger a Redeploy (or push changes to GitHub) to build with the new backend target.

---

## 6. Verification Checklist

- [x] Run local backend tests (`manage.py test`): **Passed (9/9 tests)**.
- [x] Build frontend bundle (`npm run build`): **Built cleanly with 0 errors**.
- [x] Local MongoDB backup executed and verified (136 docs saved).
- [x] Root and frontend `vercel.json` rewrites updated to `https://taskflow-2-bzh0.onrender.com/api/:path*`.
- [x] `frontend/src/api.js` updated to support `VITE_API_URL` and `taskflow-2-bzh0.onrender.com`.
- [x] Backend `settings.py` updated to support `MONGO_URI`, `DATABASE_NAME`, CORS, CSRF, and host restrictions.
- [x] Backend `mongo.py` updated to sanitize credentials from status endpoints and support cloud connection timeouts.
- [x] Run `python scripts/migrate_local_mongodb_to_atlas.py`: **Completed! (All 136 docs migrated to Atlas & verified)**.
- [ ] Add `MONGO_URI` to Render Environment Variables and test login on Vercel.
