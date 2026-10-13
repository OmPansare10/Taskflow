import os
import sys
import django

# Setup Django environment
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'taskflow_backend.settings')
django.setup()

from tasks import mongo

def sync_data():
    print("Checking MongoDB status...")
    status = mongo.get_mongo_status()
    print("Status:", status)

    if not status["connected"]:
        print("\n❌ Could not connect to MongoDB at", status["uri"])
        print("Please start MongoDB Server or check your connection string in backend/.env.")
        return False

    db = mongo.get_db()
    fallback = mongo._load_fallback()

    print("\nConnected to live MongoDB! Syncing fallback data to MongoDB collections...")

    # 1. Sync Users
    users = fallback.get("users", [])
    synced_users = 0
    for u in users:
        u_copy = dict(u)
        uid = u_copy.pop("id", None)
        query = {"username": u_copy.get("username")}
        if not db.users.find_one(query):
            db.users.insert_one(u_copy)
            synced_users += 1
    print(f"[OK] Synced {synced_users} new users into MongoDB collection 'users'")

    # 2. Sync Team Members
    team = fallback.get("team_members", [])
    synced_team = 0
    for m in team:
        m_copy = dict(m)
        m_copy.pop("id", None)
        query = {"name": m_copy.get("name")}
        if not db.team_members.find_one(query):
            db.team_members.insert_one(m_copy)
            synced_team += 1
    print(f"[OK] Synced {synced_team} team members into MongoDB collection 'team_members'")

    # 3. Sync Projects
    projects = fallback.get("projects", [])
    synced_projects = 0
    for p in projects:
        p_copy = dict(p)
        pid = p_copy.pop("id", None)
        query = {"key": p_copy.get("key")}
        if not db.projects.find_one(query):
            db.projects.insert_one(p_copy)
            synced_projects += 1
    print(f"[OK] Synced {synced_projects} projects into MongoDB collection 'projects'")

    # 4. Sync Tasks
    tasks = fallback.get("tasks", [])
    synced_tasks = 0
    for t in tasks:
        t_copy = dict(t)
        tid = t_copy.pop("id", None)
        query = {"taskKey": t_copy.get("taskKey")}
        if not db.tasks.find_one(query):
            db.tasks.insert_one(t_copy)
            synced_tasks += 1
    print(f"[OK] Synced {synced_tasks} tasks into MongoDB collection 'tasks'")

    print("\nAll data is now live in MongoDB! You can refresh MongoDB Compass to see 'taskflow_db'!")
    return True

if __name__ == "__main__":
    sync_data()
