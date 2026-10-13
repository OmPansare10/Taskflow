# TaskFlow &mdash; Enterprise Project & Task Management

A full-stack, enterprise-grade Task and Project Management platform built for companies, engineering teams, and project managers.

---

## 🛠️ Technology Stack

- **Frontend**: **React** (Vite), Vanilla CSS design system with custom CSS variables, dark slate aesthetics, **Lucide Icons**
- **Backend**: **Django** & **Django REST Framework**
- **Database**: **MongoDB** (connected via `pymongo` with automatic development fallback and dynamic database seeding)

---

## 🚀 Key Features

1. **Company Project Management**:
   - Create and manage projects with custom keys (e.g., `ECM`, `CPR`), descriptions, target delivery dates, budgets, and priority levels.
   - Edit project details and delete projects along with their associated tasks.

2. **Interactive Kanban Board**:
   - 4-stage workflow: **To Do**, **In Progress**, **Under Review**, **Done**.
   - HTML5 Drag-and-drop card movements between columns.
   - Quick one-click stage shift buttons (`<` and `>`) for rapid status updates.

3. **Multi-View System**:
   - **Kanban Board**: Visual drag-and-drop columns with task counters and priority tags.
   - **List View**: Data table with sorting, status pills, overdue alerts, and assignee avatars.
   - **Project Metrics / Analytics**: Real-time completion percentage, task distribution by status and priority, and team member workload charts.

4. **Task Lifecycle & Collaboration**:
   - Add technical tasks with auto-generated project keys (e.g., `ECM-1`, `ECM-2`).
   - Assign to team members with color-coded avatar pills.
   - Track **Estimated Hours vs Logged Hours**.
   - **Comments thread**: Team members and project managers can post updates and blockers.
   - **Activity Log**: Audit trail tracking status updates, task creation, and comments.

5. **Role-Based Access Control**:
   - Toggle between **Project Manager** (can create projects, add/delete tasks, adjust budgets) and **Team Member** (updates task progress, adds comments).

6. **Live MongoDB Integration & Health Badge**:
   - Real-time indicator badge in the top navigation bar showing connection status to MongoDB (`mongodb://localhost:27017`).
   - Click the badge to inspect URI, database name (`taskflow_db`), and connection mode.
   - Seamless fallback: If MongoDB is offline, it safely saves to local dev store without crashing, and automatically transitions when MongoDB is running.

---

## ⚙️ Running Locally

### 1. Backend (Django + MongoDB)
```powershell
cd backend
# Activate virtual environment
.\venv\Scripts\Activate.ps1
# Run migrations (standard Django auth/sessions)
python manage.py migrate
# Start Django API server on port 8000
python manage.py runserver 127.0.0.1:8000
```

### 2. Frontend (React + Vite)
```powershell
cd frontend
# Install dependencies
npm install
# Start Vite development server (proxies /api to 127.0.0.1:8000)
npm run dev
```

Open **`http://localhost:5173`** in your browser.

---

## 🍃 MongoDB Configuration

In `backend/.env`:
```env
MONGODB_URI=mongodb://localhost:27017
MONGODB_DB_NAME=taskflow_db
PORT=8000
DEBUG=True
```

To run a local MongoDB instance with Docker:
```powershell
docker run -d -p 27017:27017 --name taskflow-mongo mongo:latest
```
Or use a **MongoDB Atlas** connection string by updating `MONGODB_URI` in `backend/.env`.
