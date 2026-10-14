import os
import sys
import django

# Setup Django environment
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'taskflow_backend.settings')
django.setup()

from tasks import mongo

EXPECTED_COLLECTIONS = {
    "users": ["_id", "first_name", "last_name", "email", "password_hash", "role", "created_at"],
    "projects": ["_id", "name", "description", "owner_id", "status", "start_date", "due_date", "created_at"],
    "tasks": ["_id", "project_id", "title", "description", "assigned_to", "created_by", "status", "priority", "due_date"],
    "project_members": ["_id", "project_id", "user_id", "role", "joined_at"],
    "comments": ["_id", "task_id", "user_id", "text", "created_at"],
    "activities": ["_id", "user_id", "project_id", "task_id", "action", "created_at"],
    "notifications": ["_id", "recipient_id", "message", "is_read", "created_at"]
}

def verify_mongo_schema():
    print("Checking MongoDB status...")
    status = mongo.get_mongo_status()
    print("Status:", status)

    if not status["connected"]:
        print("\n❌ Could not connect to MongoDB at", status["uri"])
        print("Please start MongoDB Server service or check your connection string in backend/.env.")
        return False

    db = mongo.get_db()
    existing_colls = db.list_collection_names()
    print(f"\nConnected to database '{db.name}'. Existing collections: {existing_colls}\n")

    all_valid = True
    for coll_name, expected_fields in EXPECTED_COLLECTIONS.items():
        if coll_name not in existing_colls:
            print(f"❌ Collection '{coll_name}' is missing!")
            all_valid = False
            continue

        count = db[coll_name].count_documents({})
        doc = db[coll_name].find_one()
        fields_present = list(doc.keys()) if doc else []
        missing_fields = [f for f in expected_fields if f not in fields_present] if doc else []

        if missing_fields:
            print(f"[WARN] Collection '{coll_name}': {count} documents (Missing expected fields: {missing_fields})")
            all_valid = False
        else:
            print(f"[OK] Collection '{coll_name}': {count} documents. Schema matches: {expected_fields}")

    if all_valid:
        print("\n[SUCCESS] All 7 collections in 'taskflow_db' match the exact requested MongoDB schema!")
    else:
        print("\nSome collections or fields differ. Run migrate_to_schema.py to rectify.")
    return all_valid

if __name__ == "__main__":
    verify_mongo_schema()
