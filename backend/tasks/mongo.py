import os
import json
import uuid
from datetime import datetime, timezone
from bson import ObjectId
from pymongo import MongoClient, ASCENDING
from pymongo.errors import ConnectionFailure, ServerSelectionTimeoutError
from django.conf import settings

# Data directory for fallback storage if MongoDB is not currently running
DATA_DIR = os.path.join(settings.BASE_DIR, 'data')
FALLBACK_FILE = os.path.join(DATA_DIR, 'db_store.json')

_mongo_client = None

def get_mongo_client():
    global _mongo_client
    if _mongo_client is None:
        try:
            client = MongoClient(
                settings.MONGODB_URI,
                serverSelectionTimeoutMS=1500,
                connectTimeoutMS=1500
            )
            # Test connection
            client.admin.command('ping')
            _mongo_client = client
        except Exception:
            _mongo_client = None
    else:
        try:
            _mongo_client.admin.command('ping')
        except Exception:
            _mongo_client = None
    return _mongo_client

def is_mongo_alive():
    client = get_mongo_client()
    return client is not None

def get_mongo_status():
    alive = is_mongo_alive()
    return {
        "connected": alive,
        "mode": "mongodb" if alive else "local_fallback",
        "uri": settings.MONGODB_URI,
        "database": settings.MONGODB_DB_NAME,
        "message": "Connected to live MongoDB server" if alive else "MongoDB offline at localhost:27017. Operating in automatic fallback storage mode. Start mongod to switch to live MongoDB!"
    }

def get_db():
    client = get_mongo_client()
    if client is not None:
        return client[settings.MONGODB_DB_NAME]
    return None

# ----------------- Fallback JSON Store -----------------

def _load_fallback():
    os.makedirs(DATA_DIR, exist_ok=True)
    if not os.path.exists(FALLBACK_FILE):
        initial = get_initial_seed_data()
        with open(FALLBACK_FILE, 'w', encoding='utf-8') as f:
            json.dump(initial, f, indent=2)
        return initial
    try:
        with open(FALLBACK_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception:
        initial = get_initial_seed_data()
        with open(FALLBACK_FILE, 'w', encoding='utf-8') as f:
            json.dump(initial, f, indent=2)
        return initial

def _save_fallback(data):
    os.makedirs(DATA_DIR, exist_ok=True)
    with open(FALLBACK_FILE, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2)

def serialize_doc(doc):
    if not doc:
        return None
    res = dict(doc)
    if '_id' in res:
        res['id'] = str(res['_id'])
        del res['_id']
    elif 'id' not in res:
        res['id'] = str(uuid.uuid4())
    return res

def _build_id_query(doc_id):
    if not doc_id:
        return {"_id": None}
    doc_id_str = str(doc_id).strip()
    conditions = [{"_id": doc_id_str}, {"id": doc_id_str}]
    if ObjectId.is_valid(doc_id_str):
        try:
            conditions.insert(0, {"_id": ObjectId(doc_id_str)})
        except Exception:
            pass
    return {"$or": conditions}

# ----------------- Seed Data -----------------

def get_initial_seed_data():
    now = datetime.now(timezone.utc).isoformat()
    p1_id = "65f00100a0b1c2d3e4f50001"
    p2_id = "65f00100a0b1c2d3e4f50002"

    projects = [
        {
            "_id": p1_id,
            "id": p1_id,
            "title": "Enterprise Cloud Migration",
            "key": "ECM",
            "description": "Migrate core company workloads and services to AWS with high availability and SOC2 compliance.",
            "status": "active",
            "priority": "high",
            "manager": "Alex Mercer",
            "managerEmail": "alex.mercer@company.com",
            "createdBy": "65f00990a0b1c2d3e4f50001",
            "budget": 85000,
            "startDate": "2026-09-01",
            "dueDate": "2026-12-15",
            "tags": ["DevOps", "Cloud", "Security"],
            "teamMembers": [
                {"id": "u1", "name": "Alex Mercer", "role": "Project Manager", "email": "alex.mercer@company.com", "avatar": "AM", "color": "#6366f1"},
                {"id": "u2", "name": "Sarah Connor", "role": "DevOps Lead", "email": "sarah.connor@company.com", "avatar": "SC", "color": "#06b6d4"},
                {"id": "u3", "name": "David Kim", "role": "Backend Engineer", "email": "david.kim@company.com", "avatar": "DK", "color": "#10b981"},
                {"id": "u4", "name": "Elena Rostova", "role": "QA Architect", "email": "elena.rostova@company.com", "avatar": "ER", "color": "#f59e0b"}
            ],
            "createdAt": now,
            "updatedAt": now
        },
        {
            "_id": p2_id,
            "id": p2_id,
            "title": "Customer Portal Redesign",
            "key": "CPR",
            "description": "Modernize user experience, implement self-service billing, and optimize mobile responsive flow.",
            "status": "active",
            "priority": "medium",
            "manager": "Alex Mercer",
            "managerEmail": "alex.mercer@company.com",
            "createdBy": "65f00990a0b1c2d3e4f50001",
            "budget": 42000,
            "startDate": "2026-09-15",
            "dueDate": "2026-11-30",
            "tags": ["Frontend", "UX", "Billing"],
            "teamMembers": [
                {"id": "u1", "name": "Alex Mercer", "role": "Project Manager", "email": "alex.mercer@company.com", "avatar": "AM", "color": "#6366f1"},
                {"id": "u5", "name": "Maya Patel", "role": "Senior UI/UX", "email": "maya.patel@company.com", "avatar": "MP", "color": "#ec4899"},
                {"id": "u3", "name": "David Kim", "role": "Backend Engineer", "email": "david.kim@company.com", "avatar": "DK", "color": "#10b981"}
            ],
            "createdAt": now,
            "updatedAt": now
        }
    ]

    tasks = [
        {
            "_id": "65f00200a0b1c2d3e4f50011",
            "id": "65f00200a0b1c2d3e4f50011",
            "projectId": p1_id,
            "taskKey": "ECM-1",
            "title": "Setup Terraform IaC for VPC and Subnets",
            "description": "Define multi-region infrastructure using modular Terraform with state locking in S3/DynamoDB.",
            "status": "done",
            "priority": "high",
            "assignee": {"id": "u2", "name": "Sarah Connor", "role": "DevOps Lead", "avatar": "SC", "color": "#06b6d4"},
            "reporter": "Alex Mercer",
            "dueDate": "2026-09-20",
            "estimatedHours": 16,
            "spentHours": 14,
            "labels": ["Terraform", "AWS"],
            "order": 0,
            "comments": [
                {"id": "c1", "author": "Sarah Connor", "text": "VPC modules tested and merged to main branch.", "timestamp": now}
            ],
            "activityLog": [
                {"id": "a1", "action": "created", "details": "Task created by Alex Mercer", "timestamp": now, "user": "Alex Mercer"},
                {"id": "a2", "action": "status_change", "details": "Moved to Done", "timestamp": now, "user": "Sarah Connor"}
            ],
            "createdAt": now,
            "updatedAt": now
        },
        {
            "_id": "65f00200a0b1c2d3e4f50012",
            "id": "65f00200a0b1c2d3e4f50012",
            "projectId": p1_id,
            "taskKey": "ECM-2",
            "title": "Migrate PostgreSQL to Amazon Aurora",
            "description": "Establish continuous replication with AWS DMS, verify schema indexes, and prepare cutover plan.",
            "status": "in_progress",
            "priority": "urgent",
            "assignee": {"id": "u3", "name": "David Kim", "role": "Backend Engineer", "avatar": "DK", "color": "#10b981"},
            "reporter": "Alex Mercer",
            "dueDate": "2026-10-12",
            "estimatedHours": 24,
            "spentHours": 18,
            "labels": ["Database", "Migration"],
            "order": 0,
            "comments": [
                {"id": "c2", "author": "David Kim", "text": "DMS task is currently replicating with 0 latency lag.", "timestamp": now}
            ],
            "activityLog": [
                {"id": "a3", "action": "created", "details": "Task created by Alex Mercer", "timestamp": now, "user": "Alex Mercer"}
            ],
            "createdAt": now,
            "updatedAt": now
        },
        {
            "_id": "65f00200a0b1c2d3e4f50013",
            "id": "65f00200a0b1c2d3e4f50013",
            "projectId": p1_id,
            "taskKey": "ECM-3",
            "title": "Configure EKS Cluster & Ingress Controller",
            "description": "Deploy Kubernetes 1.30 with ALB Ingress Controller, ExternalDNS, and Cert-Manager for SSL.",
            "status": "review",
            "priority": "medium",
            "assignee": {"id": "u2", "name": "Sarah Connor", "role": "DevOps Lead", "avatar": "SC", "color": "#06b6d4"},
            "reporter": "Alex Mercer",
            "dueDate": "2026-10-18",
            "estimatedHours": 20,
            "spentHours": 19,
            "labels": ["Kubernetes", "DevOps"],
            "order": 0,
            "comments": [],
            "activityLog": [],
            "createdAt": now,
            "updatedAt": now
        },
        {
            "_id": "65f00200a0b1c2d3e4f50014",
            "id": "65f00200a0b1c2d3e4f50014",
            "projectId": p1_id,
            "taskKey": "ECM-4",
            "title": "Perform SOC2 Penetration & Security Audit",
            "description": "Coordinate with third-party auditor, generate compliance artifacts and address vulnerability scans.",
            "status": "todo",
            "priority": "high",
            "assignee": {"id": "u4", "name": "Elena Rostova", "role": "QA Architect", "avatar": "ER", "color": "#f59e0b"},
            "reporter": "Alex Mercer",
            "dueDate": "2026-11-05",
            "estimatedHours": 32,
            "spentHours": 0,
            "labels": ["Security", "Compliance"],
            "order": 0,
            "comments": [],
            "activityLog": [],
            "createdAt": now,
            "updatedAt": now
        },
        {
            "_id": "65f00200a0b1c2d3e4f50021",
            "id": "65f00200a0b1c2d3e4f50021",
            "projectId": p2_id,
            "taskKey": "CPR-1",
            "title": "Design Figma Design Tokens & Component Library",
            "description": "Establish cohesive color system, dark mode variants, and responsive layout grids.",
            "status": "done",
            "priority": "medium",
            "assignee": {"id": "u5", "name": "Maya Patel", "role": "Senior UI/UX", "avatar": "MP", "color": "#ec4899"},
            "reporter": "Alex Mercer",
            "dueDate": "2026-09-30",
            "estimatedHours": 25,
            "spentHours": 24,
            "labels": ["UI", "Design"],
            "order": 0,
            "comments": [],
            "activityLog": [],
            "createdAt": now,
            "updatedAt": now
        },
        {
            "_id": "65f00200a0b1c2d3e4f50022",
            "id": "65f00200a0b1c2d3e4f50022",
            "projectId": p2_id,
            "taskKey": "CPR-2",
            "title": "Integrate Stripe Invoice Download & Webhooks",
            "description": "Allow enterprise clients to download PDF invoices and receive webhook alerts on payment failure.",
            "status": "in_progress",
            "priority": "high",
            "assignee": {"id": "u3", "name": "David Kim", "role": "Backend Engineer", "avatar": "DK", "color": "#10b981"},
            "reporter": "Alex Mercer",
            "dueDate": "2026-10-25",
            "estimatedHours": 18,
            "spentHours": 10,
            "labels": ["Stripe", "Billing"],
            "order": 0,
            "comments": [],
            "activityLog": [],
            "createdAt": now,
            "updatedAt": now
        }
    ]

    team_members = [
        {"id": "u1", "name": "Alex Mercer", "role": "Project Manager", "email": "alex.mercer@company.com", "avatar": "AM", "color": "#6366f1"},
        {"id": "u2", "name": "Sarah Connor", "role": "DevOps Lead", "email": "sarah.connor@company.com", "avatar": "SC", "color": "#06b6d4"},
        {"id": "u3", "name": "David Kim", "role": "Backend Engineer", "email": "david.kim@company.com", "avatar": "DK", "color": "#10b981"},
        {"id": "u4", "name": "Elena Rostova", "role": "QA Architect", "email": "elena.rostova@company.com", "avatar": "ER", "color": "#f59e0b"},
        {"id": "u5", "name": "Maya Patel", "role": "Senior UI/UX", "email": "maya.patel@company.com", "avatar": "MP", "color": "#ec4899"}
    ]

    return {
        "projects": projects,
        "tasks": tasks,
        "team_members": team_members
    }

def seed_mongo_if_empty(db):
    try:
        if db.projects.count_documents({}) == 0:
            seed = get_initial_seed_data()
            # Clean docs for mongo (keep _id as ObjectId where valid, or string)
            for p in seed["projects"]:
                p_copy = dict(p)
                p_id = p_copy.pop("id", None)
                if p_id and ObjectId.is_valid(p_id):
                    p_copy["_id"] = ObjectId(p_id)
                db.projects.insert_one(p_copy)

            for t in seed["tasks"]:
                t_copy = dict(t)
                t_id = t_copy.pop("id", None)
                if t_id and ObjectId.is_valid(t_id):
                    t_copy["_id"] = ObjectId(t_id)
                db.tasks.insert_one(t_copy)

            for m in seed["team_members"]:
                db.team_members.insert_one(dict(m))

            # Create indices
            db.projects.create_index([("key", ASCENDING)], unique=True)
            db.tasks.create_index([("projectId", ASCENDING)])
            db.tasks.create_index([("status", ASCENDING)])
    except Exception as e:
        print(f"Error seeding MongoDB: {e}")

# ----------------- Projects Data Access -----------------

def normalize_email_str(email):
    if not email or not isinstance(email, str):
        return ""
    e = email.strip().lower()
    if "@" not in e and "." in e:
        parts = e.split(".")
        if len(parts) >= 2:
            e = parts[0] + "@" + ".".join(parts[1:])
    return e

def list_projects(user_email=None, user_id=None, username=None):
    db = get_db()
    if db is not None:
        seed_mongo_if_empty(db)
        docs = list(db.projects.find().sort("createdAt", -1))
        all_projs = [serialize_doc(d) for d in docs]
    else:
        fallback = _load_fallback()
        all_projs = fallback.get("projects", [])

    if user_email or user_id:
        ue = normalize_email_str(user_email)
        uid = str(user_id or "").strip()

        filtered = []
        for p in all_projs:
            p_mgr_email = normalize_email_str(p.get("managerEmail") or "")
            p_creator = str(p.get("createdBy") or "").strip()

            # Manager or Creator match strictly by ID or Email
            if uid and p_creator and p_creator == uid:
                filtered.append(p)
                continue
            if ue and p_mgr_email and p_mgr_email == ue:
                filtered.append(p)
                continue
            if ue == "alex.mercer@company.com" and (not p_mgr_email or p_mgr_email == "alex.mercer@company.com"):
                if "alex" in (p.get("manager") or "").lower() or not p_creator or p_creator in ["None", "", "u1", "65f00990a0b1c2d3e4f50001"]:
                    filtered.append(p)
                    continue

            # Team member match strictly by Email or ID
            members = p.get("teamMembers") or []
            if any(
                (ue and normalize_email_str(m.get("email") or "") == ue) or
                (uid and str(m.get("id") or m.get("userId") or "").strip() == uid)
                for m in members if isinstance(m, dict)
            ):
                filtered.append(p)
                continue

        return filtered

    return all_projs

def get_project_by_id(project_id):
    if not project_id:
        return None
    db = get_db()
    if db is not None:
        doc = db.projects.find_one(_build_id_query(project_id))
        return serialize_doc(doc)
    fallback = _load_fallback()
    pid = str(project_id)
    for p in fallback.get("projects", []):
        if str(p.get("id")) == pid or str(p.get("_id")) == pid:
            return p
    return None

def create_project(data):
    now = datetime.now(timezone.utc).isoformat()
    project_doc = {
        "title": data.get("title", "Untitled Project").strip(),
        "key": data.get("key", "PRJ").strip().upper(),
        "description": data.get("description", "").strip(),
        "status": data.get("status", "active"),
        "priority": data.get("priority", "medium"),
        "manager": data.get("manager", "Project Manager"),
        "managerEmail": data.get("managerEmail", ""),
        "createdBy": data.get("createdBy", ""),
        "budget": float(data.get("budget", 0)) if data.get("budget") is not None else 0,
        "startDate": data.get("startDate", now[:10]),
        "dueDate": data.get("dueDate", ""),
        "tags": data.get("tags", []),
        "teamMembers": data.get("teamMembers", []),
        "createdAt": now,
        "updatedAt": now
    }

    db = get_db()
    if db is not None:
        result = db.projects.insert_one(project_doc)
        project_doc["_id"] = result.inserted_id
        ser_proj = serialize_doc(project_doc)
        
        # Trigger notification for added project members
        mgr_email = str(project_doc.get("managerEmail") or "").strip().lower()
        mgr_name = project_doc.get("manager") or "Project Manager"
        for m in project_doc.get("teamMembers", []):
            m_email = str(m.get("email") or "").strip().lower()
            if m_email and m_email != mgr_email:
                create_notification({
                    "recipientEmail": m_email,
                    "senderName": mgr_name,
                    "senderAvatar": mgr_name[:2].upper(),
                    "senderColor": "#6366f1",
                    "type": "project_added",
                    "title": f"Added to Project: {project_doc.get('title')}",
                    "message": f"{mgr_name} added you to project \"{project_doc.get('title')}\" ({project_doc.get('key')}).",
                    "data": {
                        "projectId": ser_proj["id"],
                        "projectTitle": project_doc.get("title"),
                        "projectKey": project_doc.get("key")
                    }
                })
        return ser_proj
    
    # Fallback
    fallback = _load_fallback()
    new_id = str(uuid.uuid4())
    project_doc["id"] = new_id
    project_doc["_id"] = new_id
    fallback.setdefault("projects", []).insert(0, project_doc)
    _save_fallback(fallback)

    # Trigger notification for added project members
    mgr_email = str(project_doc.get("managerEmail") or "").strip().lower()
    mgr_name = project_doc.get("manager") or "Project Manager"
    for m in project_doc.get("teamMembers", []):
        m_email = str(m.get("email") or "").strip().lower()
        if m_email and m_email != mgr_email:
            create_notification({
                "recipientEmail": m_email,
                "senderName": mgr_name,
                "senderAvatar": mgr_name[:2].upper(),
                "senderColor": "#6366f1",
                "type": "project_added",
                "title": f"Added to Project: {project_doc.get('title')}",
                "message": f"{mgr_name} added you to project \"{project_doc.get('title')}\" ({project_doc.get('key')}).",
                "data": {
                    "projectId": new_id,
                    "projectTitle": project_doc.get("title"),
                    "projectKey": project_doc.get("key")
                }
            })

    return project_doc

def update_project(project_id, data):
    if not project_id:
        return None
    now = datetime.now(timezone.utc).isoformat()
    update_fields = {}
    allowed = ["title", "key", "description", "status", "priority", "manager", "managerEmail", "createdBy", "budget", "startDate", "dueDate", "tags", "teamMembers"]
    for field in allowed:
        if field in data:
            if field == "budget" and data[field] is not None:
                update_fields[field] = float(data[field])
            elif field == "key":
                update_fields[field] = str(data[field]).strip().upper()
            else:
                update_fields[field] = data[field]
    update_fields["updatedAt"] = now

    db = get_db()
    if db is not None:
        db.projects.update_one(_build_id_query(project_id), {"$set": update_fields})
        return get_project_by_id(project_id)
    
    fallback = _load_fallback()
    pid = str(project_id)
    for p in fallback.get("projects", []):
        if str(p.get("id")) == pid or str(p.get("_id")) == pid:
            p.update(update_fields)
            _save_fallback(fallback)
            return p
    return None

def delete_project(project_id):
    if not project_id:
        return False
    db = get_db()
    if db is not None:
        db.projects.delete_one(_build_id_query(project_id))
        # Also remove associated tasks
        pid_str = str(project_id)
        pid_targets = [pid_str]
        if ObjectId.is_valid(pid_str):
            pid_targets.append(ObjectId(pid_str))
        db.tasks.delete_many({"projectId": {"$in": pid_targets}})
        return True
    
    fallback = _load_fallback()
    pid = str(project_id)
    projects = [p for p in fallback.get("projects", []) if str(p.get("id")) != pid and str(p.get("_id")) != pid]
    tasks = [t for t in fallback.get("tasks", []) if str(t.get("projectId")) != pid]
    fallback["projects"] = projects
    fallback["tasks"] = tasks
    _save_fallback(fallback)
    return True

def leave_project(project_id, user_data):
    """
    Remove a user from a project's team members list.
    user_data can be a dict (userEmail, email, userId, id, username, name) or a string.
    """
    proj = get_project_by_id(project_id)
    if not proj:
        return None

    user_email = ""
    user_id = ""
    username = ""
    if isinstance(user_data, dict):
        user_email = (user_data.get("email") or user_data.get("userEmail") or "").strip().lower()
        user_id = str(user_data.get("id") or user_data.get("userId") or "").strip()
        username = (user_data.get("username") or user_data.get("name") or "").strip().lower()
    elif isinstance(user_data, str):
        val = user_data.strip().lower()
        user_email = val
        user_id = user_data.strip()
        username = val

    members = proj.get("teamMembers") or []
    updated_members = []
    for m in members:
        m_email = (m.get("email") or "").strip().lower()
        m_id = str(m.get("id") or m.get("userId") or m.get("_id") or "").strip()
        m_name = (m.get("name") or "").strip().lower()

        if user_id and m_id == user_id:
            continue
        if user_email and m_email == user_email:
            continue
        if username and (m_name == username or username in m_name):
            continue
        updated_members.append(m)

    return update_project(project_id, {"teamMembers": updated_members})

# ----------------- Tasks Data Access -----------------

def list_tasks(project_id=None, status=None, priority=None, search=None):
    db = get_db()
    if db is not None:
        seed_mongo_if_empty(db)
        query = {}
        if project_id:
            pid_str = str(project_id)
            pid_targets = [pid_str]
            if ObjectId.is_valid(pid_str):
                pid_targets.append(ObjectId(pid_str))
            query["projectId"] = {"$in": pid_targets}
        if status:
            query["status"] = status
        if priority:
            query["priority"] = priority
        if search:
            query["$or"] = [
                {"title": {"$regex": search, "$options": "i"}},
                {"taskKey": {"$regex": search, "$options": "i"}},
                {"description": {"$regex": search, "$options": "i"}}
            ]
        docs = list(db.tasks.find(query).sort([("order", ASCENDING), ("createdAt", -1)]))
        return [serialize_doc(d) for d in docs]

    fallback = _load_fallback()
    tasks = fallback.get("tasks", [])
    if project_id:
        tasks = [t for t in tasks if str(t.get("projectId")) == str(project_id)]
    if status:
        tasks = [t for t in tasks if t.get("status") == status]
    if priority:
        tasks = [t for t in tasks if t.get("priority") == priority]
    if search:
        s = search.lower()
        tasks = [t for t in tasks if s in t.get("title", "").lower() or s in t.get("taskKey", "").lower() or s in t.get("description", "").lower()]
    return tasks

def get_task_by_id(task_id):
    if not task_id:
        return None
    db = get_db()
    if db is not None:
        doc = db.tasks.find_one(_build_id_query(task_id))
        return serialize_doc(doc)
    fallback = _load_fallback()
    tid = str(task_id)
    for t in fallback.get("tasks", []):
        if str(t.get("id")) == tid or str(t.get("_id")) == tid:
            return t
    return None

def record_activity(project_id, user, action, details, task_id=None, task_key=None, task_title=None, from_status=None, to_status=None, timestamp=None, user_email=None):
    now = timestamp or datetime.now(timezone.utc).isoformat()
    project_id_str = str(project_id) if project_id else ""

    if task_id and (not task_key or not task_title or not project_id_str):
        t = get_task_by_id(task_id)
        if t:
            task_key = task_key or t.get("taskKey")
            task_title = task_title or t.get("title")
            project_id_str = project_id_str or str(t.get("projectId"))

    proj = get_project_by_id(project_id_str) if project_id_str else None
    proj_title = proj.get("title", "") if proj else ""

    act_entry = {
        "id": str(uuid.uuid4())[:10],
        "projectId": project_id_str,
        "projectTitle": proj_title,
        "taskId": str(task_id) if task_id else None,
        "taskKey": task_key or "-",
        "taskTitle": task_title or "-",
        "user": user or "Team Member",
        "userEmail": user_email or "",
        "action": action,
        "details": details,
        "fromStatus": from_status,
        "toStatus": to_status,
        "timestamp": now
    }

    db = get_db()
    if db is not None:
        try:
            db.activities.insert_one(dict(act_entry))
        except Exception as e:
            print("Failed to insert into activities collection:", e)
        if task_id:
            try:
                db.tasks.update_one(_build_id_query(task_id), {
                    "$push": {"activityLog": act_entry},
                    "$set": {"updatedAt": now}
                })
            except Exception as e:
                print("Failed to append activity to task:", e)
        return act_entry

    fallback = _load_fallback()
    fallback.setdefault("activities", []).append(dict(act_entry))
    if task_id:
        tid = str(task_id)
        for t in fallback.get("tasks", []):
            if str(t.get("id")) == tid or str(t.get("_id")) == tid:
                t.setdefault("activityLog", []).append(act_entry)
                t["updatedAt"] = now
                break
    _save_fallback(fallback)
    return act_entry

def create_task(data):
    now = datetime.now(timezone.utc).isoformat()
    project_id = str(data.get("projectId", ""))
    
    # Calculate task Key
    existing_tasks = list_tasks(project_id=project_id)
    project = get_project_by_id(project_id)
    proj_key = project.get("key", "TSK") if project else "TSK"
    next_num = len(existing_tasks) + 1
    task_key = f"{proj_key}-{next_num}"
    creator_name = data.get("reporter") or data.get("createdBy") or "Project Manager"

    initial_activity = {
        "id": str(uuid.uuid4())[:8],
        "action": "task_created",
        "details": f"{creator_name} created task {task_key}: \"{data.get('title', 'Untitled Task').strip()}\"",
        "timestamp": now,
        "user": creator_name,
        "taskKey": task_key,
        "taskTitle": data.get("title", "Untitled Task").strip(),
        "toStatus": data.get("status", "todo")
    }

    task_doc = {
        "projectId": project_id,
        "taskKey": task_key,
        "title": data.get("title", "Untitled Task").strip(),
        "description": data.get("description", "").strip(),
        "status": data.get("status", "todo"),
        "priority": data.get("priority", "medium"),
        "assignee": data.get("assignee") or {"name": "Unassigned", "role": "Team Member", "avatar": "UN", "color": "#94a3b8"},
        "reporter": creator_name,
        "dueDate": data.get("dueDate", ""),
        "estimatedHours": float(data.get("estimatedHours", 0)) if data.get("estimatedHours") else 0,
        "spentHours": float(data.get("spentHours", 0)) if data.get("spentHours") else 0,
        "labels": data.get("labels", []),
        "order": int(data.get("order", len(existing_tasks))),
        "comments": [],
        "activityLog": [initial_activity],
        "createdAt": now,
        "updatedAt": now
    }

    db = get_db()
    if db is not None:
        result = db.tasks.insert_one(task_doc)
        task_doc["_id"] = result.inserted_id
        new_task = serialize_doc(task_doc)
        record_activity(
            project_id=project_id,
            user=creator_name,
            action="task_created",
            details=initial_activity["details"],
            task_id=new_task["id"],
            task_key=task_key,
            task_title=task_doc["title"],
            to_status=task_doc["status"],
            timestamp=now
        )
        # Trigger task_assigned notification
        assignee_data = task_doc.get("assignee")
        if assignee_data and isinstance(assignee_data, dict):
            assignee_email = str(assignee_data.get("email") or "").strip().lower()
            if not assignee_email and assignee_data.get("name"):
                u = find_user_doc(assignee_data.get("name"))
                if u:
                    assignee_email = str(u.get("email") or "").strip().lower()
            
            sender_display = creator_name
            if sender_display == "Project Manager" and project and project.get("manager"):
                sender_display = project.get("manager")

            if assignee_email:
                create_notification({
                    "recipientEmail": assignee_email,
                    "senderName": sender_display,
                    "senderAvatar": sender_display[:2].upper(),
                    "senderColor": "#6366f1",
                    "type": "task_assigned",
                    "title": f"New Task Assigned: {task_key}",
                    "message": f"{sender_display} assigned you to task \"{task_doc['title']}\" ({task_key}).",
                    "data": {
                        "taskId": new_task["id"],
                        "projectId": project_id,
                        "taskKey": task_key,
                        "taskTitle": task_doc["title"]
                    }
                })

        return new_task

    fallback = _load_fallback()
    new_id = str(uuid.uuid4())
    task_doc["id"] = new_id
    task_doc["_id"] = new_id
    fallback.setdefault("tasks", []).append(task_doc)
    _save_fallback(fallback)
    record_activity(
        project_id=project_id,
        user=creator_name,
        action="task_created",
        details=initial_activity["details"],
        task_id=new_id,
        task_key=task_key,
        task_title=task_doc["title"],
        to_status=task_doc["status"],
        timestamp=now
    )

    # Trigger task_assigned notification in fallback
    assignee_data = task_doc.get("assignee")
    if assignee_data and isinstance(assignee_data, dict):
        assignee_email = str(assignee_data.get("email") or "").strip().lower()
        if not assignee_email and assignee_data.get("name"):
            u = find_user_doc(assignee_data.get("name"))
            if u:
                assignee_email = str(u.get("email") or "").strip().lower()
        
        sender_display = creator_name
        if sender_display == "Project Manager" and project and project.get("manager"):
            sender_display = project.get("manager")

        if assignee_email:
            create_notification({
                "recipientEmail": assignee_email,
                "senderName": sender_display,
                "senderAvatar": sender_display[:2].upper(),
                "senderColor": "#6366f1",
                "type": "task_assigned",
                "title": f"New Task Assigned: {task_key}",
                "message": f"{sender_display} assigned you to task \"{task_doc['title']}\" ({task_key}).",
                "data": {
                    "taskId": new_id,
                    "projectId": project_id,
                    "taskKey": task_key,
                    "taskTitle": task_doc["title"]
                }
            })

    return task_doc

def update_task(task_id, data):
    if not task_id:
        return None
    now = datetime.now(timezone.utc).isoformat()
    old_task = get_task_by_id(task_id)
    if not old_task:
        return None

    project_id = str(old_task.get("projectId", ""))
    project = get_project_by_id(project_id)
    task_key = old_task.get("taskKey", "")
    task_title = old_task.get("title", "")
    user_name = data.get("updatedBy") or "Team Member"

    update_fields = {}
    allowed = ["title", "description", "status", "priority", "assignee", "reporter", "dueDate", "estimatedHours", "spentHours", "labels", "order"]
    
    activity_entry = None
    if "status" in data and data["status"] != old_task.get("status"):
        old_st = old_task.get("status", "")
        new_st = data["status"]
        old_st_title = old_st.replace('_', ' ').title()
        new_st_title = new_st.replace('_', ' ').title()
        act_details = f"{user_name} moved task {task_key} from {old_st_title} to {new_st_title}"
        activity_entry = {
            "id": str(uuid.uuid4())[:8],
            "action": "status_changed",
            "details": act_details,
            "timestamp": now,
            "user": user_name,
            "fromStatus": old_st,
            "toStatus": new_st,
            "taskKey": task_key,
            "taskTitle": task_title
        }
        record_activity(
            project_id=project_id,
            user=user_name,
            action="status_changed",
            details=act_details,
            task_id=task_id,
            task_key=task_key,
            task_title=task_title,
            from_status=old_st,
            to_status=new_st,
            timestamp=now
        )
    elif "priority" in data and data["priority"] != old_task.get("priority"):
        old_p = old_task.get("priority", "").title()
        new_p = str(data["priority"]).title()
        act_details = f"{user_name} changed priority of {task_key} from {old_p} to {new_p}"
        activity_entry = {
            "id": str(uuid.uuid4())[:8],
            "action": "priority_changed",
            "details": act_details,
            "timestamp": now,
            "user": user_name,
            "taskKey": task_key,
            "taskTitle": task_title
        }
        record_activity(
            project_id=project_id,
            user=user_name,
            action="priority_changed",
            details=act_details,
            task_id=task_id,
            task_key=task_key,
            task_title=task_title,
            timestamp=now
        )
    elif "assignee" in data and str(data["assignee"]) != str(old_task.get("assignee")):
        new_assignee_name = data["assignee"].get("name") if isinstance(data["assignee"], dict) else str(data["assignee"])
        act_details = f"{user_name} assigned {task_key} to {new_assignee_name}"
        activity_entry = {
            "id": str(uuid.uuid4())[:8],
            "action": "assignee_changed",
            "details": act_details,
            "timestamp": now,
            "user": user_name,
            "taskKey": task_key,
            "taskTitle": task_title
        }
        record_activity(
            project_id=project_id,
            user=user_name,
            action="assignee_changed",
            details=act_details,
            task_id=task_id,
            task_key=task_key,
            task_title=task_title,
            timestamp=now
        )

    # Check and trigger task_assigned notification if assignee changed or assigned
    if "assignee" in data and data["assignee"]:
        new_assignee = data["assignee"]
        if isinstance(new_assignee, dict):
            new_assignee_email = str(new_assignee.get("email") or "").strip().lower()
            if not new_assignee_email and new_assignee.get("name"):
                u = find_user_doc(new_assignee.get("name"))
                if u:
                    new_assignee_email = str(u.get("email") or "").strip().lower()

            old_assignee = old_task.get("assignee") or {}
            old_assignee_email = str(old_assignee.get("email") or "").strip().lower() if isinstance(old_assignee, dict) else ""

            if new_assignee_email and new_assignee_email != old_assignee_email:
                sender_display = user_name
                if sender_display == "Project Manager" and project and project.get("manager"):
                    sender_display = project.get("manager")

                create_notification({
                    "recipientEmail": new_assignee_email,
                    "senderName": sender_display,
                    "senderAvatar": sender_display[:2].upper(),
                    "senderColor": "#6366f1",
                    "type": "task_assigned",
                    "title": f"Task Assigned: {task_key}",
                    "message": f"{sender_display} assigned you to task \"{task_title}\" ({task_key}).",
                    "data": {
                        "taskId": str(task_id),
                        "projectId": project_id,
                        "taskKey": task_key,
                        "taskTitle": task_title
                    }
                })

    for field in allowed:
        if field in data:
            if field in ["estimatedHours", "spentHours"]:
                update_fields[field] = float(data[field]) if data[field] is not None else 0
            elif field == "order":
                update_fields[field] = int(data[field])
            else:
                update_fields[field] = data[field]
    
    update_fields["updatedAt"] = now

    db = get_db()
    if db is not None:
        update_op = {"$set": update_fields}
        if activity_entry:
            update_op["$push"] = {"activityLog": activity_entry}
        db.tasks.update_one(_build_id_query(task_id), update_op)
        return get_task_by_id(task_id)

    fallback = _load_fallback()
    tid = str(task_id)
    for t in fallback.get("tasks", []):
        if str(t.get("id")) == tid or str(t.get("_id")) == tid:
            t.update(update_fields)
            if activity_entry:
                t.setdefault("activityLog", []).append(activity_entry)
            _save_fallback(fallback)
            return t
    return None

def delete_task(task_id, user_name="Project Manager"):
    if not task_id:
        return False
    old_task = get_task_by_id(task_id)
    if old_task:
        record_activity(
            project_id=old_task.get("projectId"),
            user=user_name,
            action="task_deleted",
            details=f"{user_name} deleted task {old_task.get('taskKey')} ({old_task.get('title')})",
            task_id=task_id,
            task_key=old_task.get("taskKey"),
            task_title=old_task.get("title")
        )
    db = get_db()
    if db is not None:
        db.tasks.delete_one(_build_id_query(task_id))
        return True
    fallback = _load_fallback()
    tid = str(task_id)
    tasks = [t for t in fallback.get("tasks", []) if str(t.get("id")) != tid and str(t.get("_id")) != tid]
    fallback["tasks"] = tasks
    _save_fallback(fallback)
    return True

def add_task_comment(task_id, comment_data):
    if not task_id:
        return None
    now = datetime.now(timezone.utc).isoformat()
    author = comment_data.get("author", "Team Member")
    text_val = comment_data.get("text", "").strip()
    comment = {
        "id": str(uuid.uuid4())[:8],
        "author": author,
        "text": text_val,
        "timestamp": now
    }
    
    task = get_task_by_id(task_id)
    t_key = task.get("taskKey", "") if task else ""
    t_title = task.get("title", "") if task else ""
    p_id = task.get("projectId", "") if task else ""

    preview = f"{text_val[:40]}..." if len(text_val) > 40 else text_val
    act_details = f"{author} commented on {t_key}: \"{preview}\""

    activity = {
        "id": str(uuid.uuid4())[:8],
        "action": "comment_added",
        "details": act_details,
        "timestamp": now,
        "user": author,
        "taskKey": t_key,
        "taskTitle": t_title
    }

    record_activity(
        project_id=p_id,
        user=author,
        action="comment_added",
        details=act_details,
        task_id=task_id,
        task_key=t_key,
        task_title=t_title,
        timestamp=now
    )

    db = get_db()
    if db is not None:
        db.tasks.update_one(
            _build_id_query(task_id),
            {
                "$push": {"comments": comment, "activityLog": activity},
                "$set": {"updatedAt": now}
            }
        )
        return get_task_by_id(task_id)

    fallback = _load_fallback()
    tid = str(task_id)
    for t in fallback.get("tasks", []):
        if str(t.get("id")) == tid or str(t.get("_id")) == tid:
            t.setdefault("comments", []).append(comment)
            t.setdefault("activityLog", []).append(activity)
            t["updatedAt"] = now
            _save_fallback(fallback)
            return t
    return None

def batch_update_tasks_order(items, updated_by="Team Member"):
    """
    items: list of { id, status, order }
    """
    now = datetime.now(timezone.utc).isoformat()
    db = get_db()
    if db is not None:
        for item in items:
            t_id = item.get("id")
            if not t_id:
                continue
            old_task = get_task_by_id(t_id)
            if old_task and item.get("status") and item.get("status") != old_task.get("status"):
                old_st = old_task.get("status", "")
                new_st = item.get("status")
                old_st_title = old_st.replace('_', ' ').title()
                new_st_title = new_st.replace('_', ' ').title()
                user_name = updated_by or "Team Member"
                act_details = f"{user_name} moved task {old_task.get('taskKey')} from {old_st_title} to {new_st_title}"
                record_activity(
                    project_id=old_task.get("projectId"),
                    user=user_name,
                    action="status_changed",
                    details=act_details,
                    task_id=t_id,
                    task_key=old_task.get("taskKey"),
                    task_title=old_task.get("title"),
                    from_status=old_st,
                    to_status=new_st,
                    timestamp=now
                )
            db.tasks.update_one(_build_id_query(t_id), {
                "$set": {
                    "status": item.get("status"),
                    "order": item.get("order", 0),
                    "updatedAt": now
                }
            })
        return True

    fallback = _load_fallback()
    item_map = {item["id"]: item for item in items if "id" in item}
    for t in fallback.get("tasks", []):
        tid = t.get("id") or str(t.get("_id"))
        if tid in item_map:
            new_st = item_map[tid].get("status")
            if new_st and new_st != t.get("status"):
                old_st = t.get("status", "")
                old_st_title = old_st.replace('_', ' ').title()
                new_st_title = new_st.replace('_', ' ').title()
                user_name = updated_by or "Team Member"
                act_details = f"{user_name} moved task {t.get('taskKey')} from {old_st_title} to {new_st_title}"
                record_activity(
                    project_id=t.get("projectId"),
                    user=user_name,
                    action="status_changed",
                    details=act_details,
                    task_id=tid,
                    task_key=t.get("taskKey"),
                    task_title=t.get("title"),
                    from_status=old_st,
                    to_status=new_st,
                    timestamp=now
                )
            t["status"] = item_map[tid].get("status", t.get("status"))
            t["order"] = item_map[tid].get("order", t.get("order"))
            t["updatedAt"] = now
    _save_fallback(fallback)
    return True

def get_project_daily_activities(project_id, date_str=None, start_date=None, end_date=None, user_filter=None):
    import re
    if not start_date and not end_date:
        if date_str:
            start_date = date_str.strip()[:10]
            end_date = start_date
        else:
            today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
            start_date = today
            end_date = today
    else:
        if not start_date:
            start_date = end_date.strip()[:10] if end_date else datetime.now(timezone.utc).strftime("%Y-%m-%d")
        else:
            start_date = start_date.strip()[:10]
        if not end_date:
            end_date = start_date
        else:
            end_date = end_date.strip()[:10]

    # Ensure start_date <= end_date
    if start_date > end_date:
        start_date, end_date = end_date, start_date

    def is_in_range(ts):
        if not ts:
            return False
        d = ts[:10]
        return start_date <= d <= end_date

    project_id_str = str(project_id)
    project = get_project_by_id(project_id_str)
    proj_title = project.get("title", "") if project else ""
    proj_key = project.get("key", "") if project else ""

    matched_activities = []
    seen_ids = set()

    # 1. Fetch from dedicated activities collection
    db = get_db()
    if db is not None:
        try:
            cursor = db.activities.find({"projectId": project_id_str})
            for doc in cursor:
                a = serialize_doc(doc)
                ts = a.get("timestamp", "")
                if is_in_range(ts):
                    a_id = str(a.get("id") or a.get("_id"))
                    if a_id not in seen_ids:
                        seen_ids.add(a_id)
                        matched_activities.append(a)
        except Exception as e:
            print("Error querying activities collection:", e)
    else:
        fallback = _load_fallback()
        for a in fallback.get("activities", []):
            if str(a.get("projectId")) == project_id_str:
                ts = a.get("timestamp", "")
                if is_in_range(ts):
                    a_id = str(a.get("id") or a.get("_id"))
                    if a_id not in seen_ids:
                        seen_ids.add(a_id)
                        matched_activities.append(a)

    # 2. Also check task.activityLog for tasks in this project to include pre-existing activities
    tasks = list_tasks(project_id=project_id_str)
    for task in tasks:
        t_id = task.get("id") or str(task.get("_id"))
        t_key = task.get("taskKey") or "-"
        t_title = task.get("title") or "-"
        for log in task.get("activityLog", []):
            log_id = str(log.get("id") or "")
            log_ts = log.get("timestamp", "")
            if not is_in_range(log_ts):
                continue

            unique_fingerprint = f"{log_id}_{t_id}_{log_ts}"
            if log_id in seen_ids or unique_fingerprint in seen_ids:
                continue
            seen_ids.add(log_id or unique_fingerprint)

            raw_details = log.get("details", "")
            from_st = log.get("fromStatus")
            to_st = log.get("toStatus")
            raw_act = log.get("action", "")
            
            if not from_st or not to_st:
                match = re.search(r'from\s+([A-Za-z0-9_\s]+)\s+to\s+([A-Za-z0-9_\s]+)', raw_details, re.IGNORECASE)
                if match:
                    from_st = match.group(1).strip()
                    to_st = match.group(2).strip()
                    if not raw_act:
                        raw_act = "status_changed"

            log_user = log.get("user") or "Team Member"
            display_details = raw_details
            if "Changed status from" in raw_details:
                display_details = f"{log_user} moved task {t_key} ({t_title}) from {from_st or 'Previous'} to {to_st or 'Next'}"
            elif "Created by" in raw_details or raw_act in ["created", "task_created"]:
                display_details = f"{log_user} created task {t_key}: \"{t_title}\""
            elif "Added comment:" in raw_details or raw_act == "comment_added":
                comment_clean = raw_details.replace('Added comment:', '').strip()
                display_details = f"{log_user} commented on {t_key}: {comment_clean}"

            entry = {
                "id": log_id or str(uuid.uuid4())[:8],
                "projectId": project_id_str,
                "projectTitle": proj_title,
                "taskId": t_id,
                "taskKey": log.get("taskKey") or t_key,
                "taskTitle": log.get("taskTitle") or t_title,
                "user": log_user,
                "userEmail": log.get("userEmail", ""),
                "action": raw_act or "status_changed",
                "details": display_details,
                "fromStatus": from_st,
                "toStatus": to_st,
                "timestamp": log_ts
            }
            matched_activities.append(entry)

    # 3. Filter by user if requested
    if user_filter and user_filter.strip():
        uf = user_filter.strip().lower()
        matched_activities = [a for a in matched_activities if uf in (a.get("user") or "").lower()]

    # 4. Sort chronologically (newest first for UI preview)
    matched_activities.sort(key=lambda x: x.get("timestamp", ""), reverse=True)

    # 5. Add formatted presentation fields
    for a in matched_activities:
        ts = a.get("timestamp", "")
        formatted_time = ""
        formatted_date = ""
        if ts:
            a["date"] = ts[:10]
            try:
                dt_clean = ts.replace("Z", "+00:00")
                dt = datetime.fromisoformat(dt_clean)
                formatted_time = dt.strftime("%I:%M %p")
                formatted_date = dt.strftime("%b %d, %Y")
            except Exception:
                formatted_time = ts[11:16] if len(ts) >= 16 else ts
                formatted_date = ts[:10]
        a["formattedTime"] = formatted_time
        a["formattedDate"] = formatted_date

        act = (a.get("action") or "").lower()
        if "status" in act:
            a["actionLabel"] = "Moved Stage"
        elif "create" in act:
            a["actionLabel"] = "Task Created"
        elif "comment" in act:
            a["actionLabel"] = "Comment Added"
        elif "priority" in act:
            a["actionLabel"] = "Priority Changed"
        elif "assign" in act:
            a["actionLabel"] = "Assignee Changed"
        elif "delete" in act:
            a["actionLabel"] = "Task Deleted"
        else:
            a["actionLabel"] = act.replace("_", " ").title()

    stage_moves = sum(1 for a in matched_activities if "status" in (a.get("action") or "").lower())
    tasks_created = sum(1 for a in matched_activities if "create" in (a.get("action") or "").lower())
    comments_added = sum(1 for a in matched_activities if "comment" in (a.get("action") or "").lower())
    unique_users = len(set(a.get("user") for a in matched_activities if a.get("user")))

    date_display = start_date if start_date == end_date else f"{start_date} to {end_date}"

    return {
        "projectId": project_id_str,
        "projectTitle": proj_title,
        "projectKey": proj_key,
        "startDate": start_date,
        "endDate": end_date,
        "date": date_display,
        "totalCount": len(matched_activities),
        "stats": {
            "totalActions": len(matched_activities),
            "stageMoves": stage_moves,
            "tasksCreated": tasks_created,
            "commentsAdded": comments_added,
            "uniqueUsers": unique_users
        },
        "activities": matched_activities
    }

# ----------------- Team Data Access -----------------

def list_team_members(owner=None):
    db = get_db()
    if db is not None:
        seed_mongo_if_empty(db)
        if not owner:
            return []

        owner_clean = str(owner).strip().lower()
        cur_user = find_user_doc(owner)
        cur_email = str(cur_user.get("email") if cur_user else owner_clean).lower().strip()
        cur_id = str(cur_user.get("_id") or cur_user.get("id") or (owner if ObjectId.is_valid(owner) else "")).strip()

        # Email aliases (e.g., if saved with or without @)
        cur_emails = [cur_email]
        if "@" in cur_email:
            cur_emails.append(cur_email.replace("@", "."))
        elif "." in cur_email:
            parts = cur_email.split(".")
            if len(parts) >= 2:
                cur_emails.append(parts[0] + "@" + ".".join(parts[1:]))

        # 1. Direct members added by current user
        owner_filter = []
        for em in cur_emails:
            owner_filter.extend([{"owner": em}, {"ownerEmail": em}])
        if cur_id:
            owner_filter.append({"ownerId": cur_id})

        if cur_email in ["alex", "alex.mercer@company.com"]:
            owner_filter.extend([
                {"owner": "alex"},
                {"owner": "alex.mercer@company.com"},
                {"ownerEmail": "alex.mercer@company.com"},
                {"owner": None},
                {"owner": {"$exists": False}}
            ])

        direct_members = list(db.team_members.find({"$or": owner_filter}))

        # 2. Reverse members (owners who added this user to their team)
        member_filter = []
        for em in cur_emails:
            member_filter.append({"email": em})
        if cur_id:
            member_filter.append({"userId": cur_id})

        added_to_teams = list(db.team_members.find({"$or": member_filter}))
        reverse_members = []
        for doc in added_to_teams:
            o_email = str(doc.get("ownerEmail") or doc.get("owner") or "").strip().lower()
            o_id = str(doc.get("ownerId") or "").strip()
            if o_email and o_email not in cur_emails and o_email not in ["alex.mercer@company.com"]:
                o_user = find_user_doc(o_email) or (find_user_doc(o_id) if o_id else None)
                if o_user:
                    o_clean_id = str(o_user.get("_id") or o_user.get("id"))
                    o_clean_email = str(o_user.get("email") or o_email)
                    o_name = o_user.get("name") or f"{o_user.get('firstName', '')} {o_user.get('lastName', '')}".strip() or o_clean_email
                    reverse_members.append({
                        "id": o_clean_id,
                        "_id": o_clean_id,
                        "userId": o_clean_id,
                        "name": o_name,
                        "email": o_clean_email,
                        "role": o_user.get("role") or "Project Manager",
                        "avatar": o_user.get("avatar") or o_name[:2].upper(),
                        "color": o_user.get("color", "#6366f1"),
                        "owner": cur_email,
                        "ownerEmail": cur_email,
                        "ownerId": cur_id
                    })

        all_docs = direct_members + reverse_members
        result = []
        seen = set()

        for d in all_docs:
            ser = serialize_doc(d)
            m_email = str(ser.get("email") or "").strip().lower()
            m_uid = str(ser.get("userId") or ser.get("id") or "").strip()

            # Do not display the user themselves in their team list
            if m_email in cur_emails:
                continue
            if cur_id and m_uid == cur_id:
                continue

            dedup_key = m_email if m_email else m_uid
            if dedup_key and dedup_key not in seen:
                seen.add(dedup_key)
                result.append(ser)

        return result

    # Fallback JSON store mode
    fallback = _load_fallback()
    all_team = fallback.get("team_members", [])
    if not owner:
        return []

    owner_clean = str(owner).strip().lower()
    cur_user = find_user_doc(owner)
    cur_email = str(cur_user.get("email") if cur_user else owner_clean).lower().strip()
    cur_id = str(cur_user.get("_id") or cur_user.get("id") or "").strip()

    cur_emails = [cur_email]
    if "@" in cur_email:
        cur_emails.append(cur_email.replace("@", "."))
    elif "." in cur_email:
        parts = cur_email.split(".")
        if len(parts) >= 2:
            cur_emails.append(parts[0] + "@" + ".".join(parts[1:]))

    result = []
    seen = set()

    for m in all_team:
        m_owner = str(m.get("ownerEmail") or m.get("owner") or "").strip().lower()
        m_owner_id = str(m.get("ownerId") or "").strip()
        m_email = str(m.get("email") or "").strip().lower()
        m_id = str(m.get("userId") or m.get("id") or "").strip()

        # Direct match (added by current user)
        if m_owner in cur_emails or (cur_id and m_owner_id == cur_id) or (cur_email in ["alex", "alex.mercer@company.com"] and not m_owner):
            if m_email not in cur_emails and (not cur_id or m_id != cur_id):
                dedup_key = m_email if m_email else m_id
                if dedup_key not in seen:
                    seen.add(dedup_key)
                    result.append(dict(m))

        # Reverse match (owner who added current user)
        elif m_email in cur_emails or (cur_id and m_id == cur_id):
            if m_owner and m_owner not in cur_emails and m_owner != "alex.mercer@company.com":
                o_user = find_user_doc(m_owner)
                if o_user:
                    o_clean_id = str(o_user.get("_id") or o_user.get("id"))
                    o_clean_email = str(o_user.get("email") or m_owner)
                    o_name = o_user.get("name") or f"{o_user.get('firstName', '')} {o_user.get('lastName', '')}".strip() or o_clean_email
                    if o_clean_email not in seen:
                        seen.add(o_clean_email)
                        result.append({
                            "id": o_clean_id,
                            "userId": o_clean_id,
                            "name": o_name,
                            "email": o_clean_email,
                            "role": o_user.get("role") or "Project Manager",
                            "avatar": o_user.get("avatar") or o_name[:2].upper(),
                            "color": o_user.get("color", "#6366f1"),
                            "owner": cur_email,
                            "ownerEmail": cur_email,
                            "ownerId": cur_id
                        })

    return result

def add_team_member_by_query(query_str, owner=None, owner_email=None, owner_id=None):
    q = (query_str or "").strip().lower()
    if not q:
        raise ValueError("Please provide an email or member ID to search.")

    owner_key = (owner_email or owner or "").strip().lower()
    cur_user = find_user_doc(owner_key or owner_id)

    db = get_db()
    if db is not None:
        user_queries = [{"email": q}]
        if "@" in q:
            user_queries.append({"email": q.replace("@", ".")})
        elif "." in q:
            parts = q.split(".")
            if len(parts) >= 2:
                user_queries.append({"email": parts[0] + "@" + ".".join(parts[1:])})

        if ObjectId.is_valid(query_str):
            user_queries.append({"_id": ObjectId(query_str)})
        else:
            user_queries.append({"_id": query_str})
        
        user = db.users.find_one({"$or": user_queries})
        if not user:
            raise ValueError(f"No registered user found with '{query_str}'. The member must register/sign up first.")

        user_email = user.get("email", "").lower()
        user_id_str = str(user.get("_id"))

        if cur_user:
            cur_user_email = str(cur_user.get("email", "")).lower()
            cur_user_id = str(cur_user.get("_id") or cur_user.get("id"))
            if user_email == cur_user_email or user_id_str == cur_user_id:
                raise ValueError("You cannot add yourself to your own team.")
        
        # Check if already a team member for this owner
        existing = db.team_members.find_one({
            "$and": [
                {"$or": [{"email": user_email}, {"userId": user_id_str}]},
                {"$or": [{"owner": owner_key}, {"ownerEmail": owner_key}, {"ownerId": str(owner_id or '')}]}
            ]
        })

        if existing:
            raise ValueError(f"'{user.get('name') or user.get('email')}' is already in your team.")

        full_name = user.get("name")
        if not full_name:
            fn = user.get("firstName", "").strip()
            ln = user.get("lastName", "").strip()
            full_name = f"{fn} {ln}".strip() or user.get("email")

        member_doc = {
            "name": full_name,
            "email": user.get("email", ""),
            "role": user.get("role") or "Developer",
            "avatar": user.get("avatar") or full_name[:2].upper(),
            "color": user.get("color", "#6366f1"),
            "userId": user_id_str,
            "owner": owner_key,
            "ownerEmail": owner_key,
            "ownerId": str(owner_id or '')
        }
        res = db.team_members.insert_one(member_doc)
        member_doc["_id"] = res.inserted_id

        # Also create reciprocal link for the added user if cur_user exists
        if cur_user and owner_key != "alex.mercer@company.com":
            cur_user_email = str(cur_user.get("email", "")).lower()
            cur_user_id = str(cur_user.get("_id") or cur_user.get("id"))
            cur_name = cur_user.get("name") or f"{cur_user.get('firstName', '')} {cur_user.get('lastName', '')}".strip() or cur_user_email

            reciprocal_existing = db.team_members.find_one({
                "$and": [
                    {"$or": [{"email": cur_user_email}, {"userId": cur_user_id}]},
                    {"$or": [{"owner": user_email}, {"ownerEmail": user_email}, {"ownerId": user_id_str}]}
                ]
            })
            if not reciprocal_existing:
                db.team_members.insert_one({
                    "name": cur_name,
                    "email": cur_user_email,
                    "role": cur_user.get("role") or "Project Manager",
                    "avatar": cur_user.get("avatar") or cur_name[:2].upper(),
                    "color": cur_user.get("color", "#6366f1"),
                    "userId": cur_user_id,
                    "owner": user_email,
                    "ownerEmail": user_email,
                    "ownerId": user_id_str
                })

        return serialize_doc(member_doc)

    # Fallback store
    fallback = _load_fallback()
    users = fallback.get("users", [])
    user = None
    for u in users:
        if (u.get("email") or "").lower() == q or str(u.get("id")) == query_str:
            user = u
            break

    if not user:
        raise ValueError(f"No registered user found with '{query_str}'. The member must register/sign up first.")

    team = fallback.setdefault("team_members", [])
    user_email = (user.get("email") or "").lower()
    user_id_str = str(user.get("id") or user.get("_id"))

    if cur_user:
        cur_user_email = str(cur_user.get("email", "")).lower()
        cur_user_id = str(cur_user.get("id") or cur_user.get("_id"))
        if user_email == cur_user_email or user_id_str == cur_user_id:
            raise ValueError("You cannot add yourself to your own team.")

    if any((m.get("email") or "").lower() == user_email and m.get("owner") == owner_key for m in team):
        raise ValueError(f"'{user.get('name') or user.get('email')}' is already in your team.")

    full_name = user.get("name") or f"{user.get('firstName', '')} {user.get('lastName', '')}".strip() or user.get("email")
    new_member = {
        "id": str(uuid.uuid4())[:8],
        "name": full_name,
        "email": user.get("email", ""),
        "role": user.get("role") or "Developer",
        "avatar": user.get("avatar") or full_name[:2].upper(),
        "color": user.get("color", "#6366f1"),
        "userId": str(user.get("id")),
        "owner": owner_key,
        "ownerEmail": owner_key,
        "ownerId": str(owner_id or '')
    }
    team.append(new_member)

    # Reciprocal in fallback
    if cur_user and owner_key != "alex.mercer@company.com":
        cur_user_email = str(cur_user.get("email", "")).lower()
        cur_user_id = str(cur_user.get("id") or cur_user.get("_id"))
        cur_name = cur_user.get("name") or f"{cur_user.get('firstName', '')} {cur_user.get('lastName', '')}".strip() or cur_user_email

        if not any((m.get("email") or "").lower() == cur_user_email and m.get("owner") == user_email for m in team):
            team.append({
                "id": str(uuid.uuid4())[:8],
                "name": cur_name,
                "email": cur_user_email,
                "role": cur_user.get("role") or "Project Manager",
                "avatar": cur_user.get("avatar") or cur_name[:2].upper(),
                "color": cur_user.get("color", "#6366f1"),
                "userId": cur_user_id,
                "owner": user_email,
                "ownerEmail": user_email,
                "ownerId": user_id_str
            })

    _save_fallback(fallback)
    return new_member

def delete_team_member(member_id, owner=None):
    db = get_db()
    if db is not None:
        cur_user = find_user_doc(owner) if owner else None
        target_user = find_user_doc(member_id)

        queries = [{"email": member_id}, {"id": member_id}, {"userId": member_id}]
        if ObjectId.is_valid(member_id):
            queries.append({"_id": ObjectId(member_id)})
        else:
            queries.append({"_id": member_id})

        # Also find target member doc in team_members to get their email/id
        tm_doc = db.team_members.find_one({"$or": queries})
        target_email = str(target_user.get("email") if target_user else (tm_doc.get("email") if tm_doc else member_id)).lower().strip()
        cur_email = str(cur_user.get("email") if cur_user else owner).lower().strip() if owner else ""

        del_filters = [{"$or": queries}]

        if cur_email and target_email:
            # Delete connection in both directions
            del_filters.append({
                "$and": [
                    {"$or": [{"email": target_email}, {"userId": str(target_user.get("_id") if target_user else "")}]},
                    {"$or": [{"owner": cur_email}, {"ownerEmail": cur_email}]}
                ]
            })
            del_filters.append({
                "$and": [
                    {"$or": [{"email": cur_email}, {"userId": str(cur_user.get("_id") if cur_user else "")}]},
                    {"$or": [{"owner": target_email}, {"ownerEmail": target_email}]}
                ]
            })

        for f in del_filters:
            db.team_members.delete_many(f)
        return True

    fallback = _load_fallback()
    team = fallback.get("team_members", [])
    cur_user = find_user_doc(owner) if owner else None
    cur_email = str(cur_user.get("email") if cur_user else owner).lower().strip() if owner else ""
    target_id_str = str(member_id).strip().lower()

    fallback["team_members"] = [
        m for m in team 
        if str(m.get("_id")) != target_id_str 
        and str(m.get("id")) != target_id_str 
        and str(m.get("userId")) != target_id_str
        and (m.get("email") or "").lower() != target_id_str
        and not (cur_email and ((m.get("ownerEmail") or m.get("owner") or "").lower() == cur_email and (m.get("email") or "").lower() == target_id_str))
        and not (cur_email and ((m.get("ownerEmail") or m.get("owner") or "").lower() == target_id_str and (m.get("email") or "").lower() == cur_email))
    ]
    _save_fallback(fallback)
    return True

# ----------------- Project Analytics -----------------

def get_project_analytics(project_id=None):
    tasks = list_tasks(project_id=project_id)
    projects = list_projects()
    
    total_tasks = len(tasks)
    status_counts = {"todo": 0, "in_progress": 0, "review": 0, "done": 0}
    priority_counts = {"low": 0, "medium": 0, "high": 0, "urgent": 0}
    member_workload = {}
    total_estimated = 0
    total_spent = 0

    now_date = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    overdue_count = 0

    for t in tasks:
        st = t.get("status", "todo")
        status_counts[st] = status_counts.get(st, 0) + 1

        pr = t.get("priority", "medium")
        priority_counts[pr] = priority_counts.get(pr, 0) + 1

        est = float(t.get("estimatedHours", 0) or 0)
        sp = float(t.get("spentHours", 0) or 0)
        total_estimated += est
        total_spent += sp

        due = t.get("dueDate")
        if due and due < now_date and st != "done":
            overdue_count += 1

        assignee = t.get("assignee")
        if assignee and isinstance(assignee, dict):
            name = assignee.get("name", "Unassigned")
            if name not in member_workload:
                member_workload[name] = {
                    "name": name,
                    "avatar": assignee.get("avatar", name[:2].upper()),
                    "color": assignee.get("color", "#6366f1"),
                    "taskCount": 0,
                    "completedCount": 0
                }
            member_workload[name]["taskCount"] += 1
            if st == "done":
                member_workload[name]["completedCount"] += 1

    completion_rate = round((status_counts["done"] / total_tasks * 100), 1) if total_tasks > 0 else 0

    return {
        "totalProjects": len(projects),
        "totalTasks": total_tasks,
        "completionRate": completion_rate,
        "overdueTasks": overdue_count,
        "statusCounts": status_counts,
        "priorityCounts": priority_counts,
        "totalEstimatedHours": total_estimated,
        "totalSpentHours": total_spent,
        "memberWorkload": list(member_workload.values())
    }

# ----------------- User Authentication Data Access -----------------
from django.contrib.auth.hashers import make_password, check_password

def get_initial_users():
    now = datetime.now(timezone.utc).isoformat()
    return [
        {
            "_id": "65f00990a0b1c2d3e4f50001",
            "id": "65f00990a0b1c2d3e4f50001",
            "firstName": "Alex",
            "lastName": "Mercer",
            "email": "alex.mercer@company.com",
            "password": make_password("password123"),
            "role": "Project Manager",
            "avatar": "AM",
            "color": "#6366f1",
            "createdAt": now
        },
        {
            "_id": "65f00990a0b1c2d3e4f50002",
            "id": "65f00990a0b1c2d3e4f50002",
            "firstName": "Sarah",
            "lastName": "Connor",
            "email": "sarah.connor@company.com",
            "password": make_password("password123"),
            "role": "DevOps Lead",
            "avatar": "SC",
            "color": "#06b6d4",
            "createdAt": now
        }
    ]

def register_user(data):
    first_name = str(data.get("firstName") or "").strip()
    last_name = str(data.get("lastName") or "").strip()
    email = str(data.get("email") or "").strip().lower()
    password = str(data.get("password") or "").strip()
    role = str(data.get("role") or "Project Manager").strip()

    if not first_name or not last_name or not email or not password:
        raise ValueError("First name, last name, email, and password are all required")

    if "@" not in email or "." not in email:
        raise ValueError("Please provide a valid email address.")

    now = datetime.now(timezone.utc).isoformat()
    hashed_pwd = make_password(password)
    initials = f"{first_name[0]}{last_name[0]}".upper()

    user_doc = {
        "firstName": first_name,
        "lastName": last_name,
        "name": f"{first_name} {last_name}".strip(),
        "email": email,
        "password": hashed_pwd,
        "role": role,
        "avatar": initials,
        "color": "#6366f1" if "Manager" in role else "#06b6d4",
        "createdAt": now,
        "updatedAt": now
    }

    db = get_db()
    if db is not None:
        # Check duplicate email
        existing = db.users.find_one({"email": email})
        if existing:
            raise ValueError("User with this email already exists. Please login.")
        res = db.users.insert_one(user_doc)
        user_doc["_id"] = res.inserted_id

        user_clean = serialize_doc(user_doc)
        user_clean.pop("password", None)
        return user_clean

    fallback = _load_fallback()
    users = fallback.setdefault("users", get_initial_users())
    for u in users:
        if str(u.get("email") or "").strip().lower() == email:
            raise ValueError("User with this email already exists. Please login.")

    new_id = str(uuid.uuid4())
    user_doc["id"] = new_id
    user_doc["_id"] = new_id
    users.append(user_doc)

    _save_fallback(fallback)
    user_clean = dict(user_doc)
    user_clean.pop("password", None)
    return user_clean

def authenticate_user(email_or_identifier, password):
    query_str = str(email_or_identifier or "").strip().lower()
    if not query_str or not password:
        return None

    db = get_db()
    if db is not None:
        user = db.users.find_one({"email": query_str})
        if not user:
            # check by ID if provided
            user = db.users.find_one(_build_id_query(query_str))

        if not user and query_str in ["alex.mercer@company.com"]:
            # Seed default users
            for u in get_initial_users():
                db.users.insert_one(dict(u))
            user = db.users.find_one({"email": query_str})

        if user and check_password(password, user.get("password", "")):
            user_clean = serialize_doc(user)
            user_clean.pop("password", None)
            return user_clean
        return None

    fallback = _load_fallback()
    users = fallback.setdefault("users", get_initial_users())
    for u in users:
        if (
            str(u.get("email") or "").strip().lower() == query_str
            or str(u.get("id") or "").strip() == query_str
            or str(u.get("_id") or "").strip() == query_str
        ):
            if check_password(password, u.get("password", "")):
                user_clean = dict(u)
                user_clean.pop("password", None)
                return user_clean
    return None

def find_user_doc(identifier):
    """Helper to find user document with password hash included."""
    if not identifier:
        return None
    query_str = str(identifier).strip()
    db = get_db()
    if db is not None:
        filter_or = [{"email": query_str.lower()}, {"id": query_str}]
        if ObjectId.is_valid(query_str):
            filter_or.append({"_id": ObjectId(query_str)})
        user = db.users.find_one({"$or": filter_or})
        if not user and query_str.lower() in ["alex.mercer@company.com"]:
            for u in get_initial_users():
                db.users.insert_one(dict(u))
            user = db.users.find_one({"$or": filter_or})
        return user

    fallback = _load_fallback()
    users = fallback.setdefault("users", get_initial_users())
    for u in users:
        if (
            str(u.get("id") or "") == query_str
            or str(u.get("_id") or "") == query_str
            or str(u.get("email") or "").lower().strip() == query_str.lower()
        ):
            return u
    return None

def get_user_profile(identifier):
    """Returns complete user profile details without password, including stats."""
    user = find_user_doc(identifier)
    if not user:
        return None

    user_clean = serialize_doc(user)
    user_clean.pop("password", None)

    # Compute project and task statistics for this user
    u_id = str(user_clean.get("id") or user_clean.get("_id") or "").strip()
    u_name = str(user_clean.get("name") or "").lower().strip()
    u_email = str(user_clean.get("email") or "").lower().strip()

    all_projs = list_projects()
    user_projs = []
    for p in all_projs:
        p_mgr = str(p.get("manager", "")).lower().strip()
        p_mgr_email = str(p.get("managerEmail", "")).lower().strip()
        p_creator = str(p.get("createdBy", "")).strip()
        is_mine = False
        if u_id and p_creator == u_id:
            is_mine = True
        elif u_email and p_mgr_email == u_email:
            is_mine = True
        elif u_name and (p_mgr == u_name or p_mgr.startswith(u_name)):
            is_mine = True
        else:
            team_m = p.get("teamMembers") or []
            if any(str(m.get("email", "")).lower().strip() == u_email or str(m.get("id", "")).strip() == u_id for m in team_m):
                is_mine = True
        if is_mine:
            user_projs.append({
                "id": p.get("id"),
                "title": p.get("title"),
                "key": p.get("key"),
                "role": "Project Manager" if (p_creator == u_id or (u_email and p_mgr_email == u_email) or (u_name and p_mgr == u_name)) else "Team Member"
            })

    all_tasks = list_tasks()
    assigned_count = 0
    completed_count = 0
    for t in all_tasks:
        assignee_obj = t.get("assignee")
        assignee_str = ""
        assignee_email = ""
        if isinstance(assignee_obj, dict):
            assignee_str = str(assignee_obj.get("name") or "").lower().strip()
            assignee_email = str(assignee_obj.get("email") or "").lower().strip()
        else:
            assignee_str = str(assignee_obj or "").lower().strip()

        if (u_email and assignee_email == u_email) or (u_name and u_name in assignee_str) or (u_email and u_email in assignee_str):
            assigned_count += 1
            if str(t.get("status", "")).lower() in ["done", "completed"]:
                completed_count += 1

    user_clean["stats"] = {
        "projectsCount": len(user_projs),
        "projects": user_projs[:6],
        "assignedTasksCount": assigned_count,
        "completedTasksCount": completed_count
    }
    return user_clean

def update_user_profile(identifier, data):
    """Updates user information (first name, last name, role)."""
    user = find_user_doc(identifier)
    if not user:
        raise ValueError("User not found")

    first_name = data.get("firstName", user.get("firstName", "")).strip()
    last_name = data.get("lastName", user.get("lastName", "")).strip()
    role = data.get("role", user.get("role", "Project Manager")).strip()

    full_name = f"{first_name} {last_name}".strip() if (first_name or last_name) else user.get("name", "")
    avatar = (f"{first_name[:1]}{last_name[:1]}".upper()) if (first_name and last_name) else (user.get("avatar") or full_name[:2].upper())

    now = datetime.now(timezone.utc).isoformat()
    updates = {
        "firstName": first_name,
        "lastName": last_name,
        "name": full_name,
        "role": role,
        "avatar": avatar,
        "updatedAt": now
    }

    db = get_db()
    if db is not None:
        db.users.update_one({"_id": user["_id"]}, {"$set": updates})
        updated = db.users.find_one({"_id": user["_id"]})
        clean = serialize_doc(updated)
        clean.pop("password", None)
        return clean
    else:
        fallback = _load_fallback()
        users = fallback.setdefault("users", get_initial_users())
        for idx, u in enumerate(users):
            if str(u.get("id")) == str(user.get("id")) or str(u.get("_id")) == str(user.get("_id")):
                users[idx].update(updates)
                _save_fallback(fallback)
                clean = dict(users[idx])
                clean.pop("password", None)
                return clean
        raise ValueError("User not found in local store")

def change_user_password(identifier, current_password, new_password):
    """Validates current password and updates with securely hashed new password."""
    user = find_user_doc(identifier)
    if not user:
        raise ValueError("User not found")

    if not current_password:
        raise ValueError("Current password is required")
    if not new_password:
        raise ValueError("New password is required")
    if len(new_password) < 6:
        raise ValueError("New password must be at least 6 characters long")

    stored_pwd = user.get("password", "")
    if not check_password(current_password, stored_pwd):
        raise ValueError("Current password is incorrect. Please verify and try again.")

    new_hash = make_password(new_password)
    now = datetime.now(timezone.utc).isoformat()

    db = get_db()
    if db is not None:
        db.users.update_one({"_id": user["_id"]}, {"$set": {"password": new_hash, "updatedAt": now}})
        return {"success": True, "message": "Password changed successfully"}
    else:
        fallback = _load_fallback()
        users = fallback.setdefault("users", get_initial_users())
        for idx, u in enumerate(users):
            if str(u.get("id")) == str(user.get("id")) or str(u.get("_id")) == str(user.get("_id")):
                users[idx]["password"] = new_hash
                users[idx]["updatedAt"] = now
                _save_fallback(fallback)
                return {"success": True, "message": "Password changed successfully"}
        raise ValueError("User not found in local store")


# ----------------- Notifications Data Access -----------------

def create_notification(data):
    now = datetime.now(timezone.utc).isoformat()
    recipient_email = str(data.get("recipientEmail") or data.get("userEmail") or "").strip().lower()
    if not recipient_email:
        return None

    notif_doc = {
        "id": str(uuid.uuid4())[:12],
        "recipientEmail": recipient_email,
        "recipientId": str(data.get("recipientId") or "").strip(),
        "senderName": data.get("senderName") or "TaskFlow",
        "senderEmail": str(data.get("senderEmail") or "").strip().lower(),
        "senderAvatar": data.get("senderAvatar") or "TF",
        "senderColor": data.get("senderColor") or "#6366f1",
        "type": data.get("type", "generic"), # 'team_request' | 'team_accepted' | 'task_assigned' | 'project_added' | 'task_due'
        "title": data.get("title", "New Notification"),
        "message": data.get("message", ""),
        "status": data.get("status", "pending" if data.get("type") == "team_request" else None),
        "isRead": bool(data.get("isRead", False)),
        "data": data.get("data", {}),
        "createdAt": now,
        "updatedAt": now
    }

    db = get_db()
    if db is not None:
        # Check duplicate pending team_request to avoid duplicate records
        if notif_doc["type"] == "team_request":
            dup = db.notifications.find_one({
                "recipientEmail": recipient_email,
                "senderEmail": notif_doc["senderEmail"],
                "type": "team_request",
                "status": "pending"
            })
            if dup:
                return serialize_doc(dup)

        res = db.notifications.insert_one(notif_doc)
        notif_doc["_id"] = res.inserted_id
        return serialize_doc(notif_doc)

    fallback = _load_fallback()
    notifs = fallback.setdefault("notifications", [])
    if notif_doc["type"] == "team_request":
        for n in notifs:
            if n.get("recipientEmail") == recipient_email and n.get("senderEmail") == notif_doc["senderEmail"] and n.get("type") == "team_request" and n.get("status") == "pending":
                return n

    notif_doc["_id"] = notif_doc["id"]
    notifs.append(notif_doc)
    _save_fallback(fallback)
    return notif_doc

def list_notifications(user_email):
    if not user_email:
        return []
    u_email = str(user_email).strip().lower()
    u_doc = find_user_doc(user_email)
    u_id = str(u_doc.get("_id") or u_doc.get("id") or "").strip() if u_doc else ""

    email_variants = [u_email]
    if "@" in u_email:
        email_variants.append(u_email.replace("@", "."))
    elif "." in u_email:
        parts = u_email.split(".")
        if len(parts) >= 2:
            email_variants.append(parts[0] + "@" + ".".join(parts[1:]))

    # Check for due tasks & projects to dynamically add daily countdown notifications (<= 3 days)
    today_dt = datetime.now(timezone.utc).date()
    today_str = today_dt.strftime("%Y-%m-%d")

    # 1. Tasks Due Countdown (<= 3 days) for Assignee
    all_tasks = list_tasks()
    for t in all_tasks:
        assignee = t.get("assignee") or {}
        a_email = ""
        a_id = ""
        if isinstance(assignee, dict):
            a_email = str(assignee.get("email") or "").lower().strip()
            a_id = str(assignee.get("id") or assignee.get("_id") or "").strip()
        
        is_my_task = (a_email in email_variants) or (u_id and a_id == u_id)
        due = t.get("dueDate")
        st = str(t.get("status") or "todo").lower()
        if is_my_task and due and st != "done":
            try:
                due_dt = datetime.strptime(str(due).strip()[:10], "%Y-%m-%d").date()
                diff_days = (due_dt - today_dt).days
            except Exception:
                diff_days = None

            if diff_days is not None and diff_days <= 3:
                is_overdue = diff_days < 0
                t_id = str(t.get("id") or t.get("_id"))
                t_key = t.get("taskKey") or "Task"
                t_title = t.get("title") or "Task"
                p_id = str(t.get("projectId") or "")

                if diff_days == 3:
                    title = f"🚨 Task Due in 3 Days: {t_key}"
                    msg = f"Task \"{t_title}\" is due in 3 days ({due}). You have 3 days remaining to complete this."
                    tag_text = "3 Days Left"
                elif diff_days == 2:
                    title = f"🚨 Task Due in 2 Days: {t_key}"
                    msg = f"Task \"{t_title}\" is due in 2 days ({due}). You have 2 days remaining to complete this."
                    tag_text = "2 Days Left"
                elif diff_days == 1:
                    title = f"🔥 Task Due Tomorrow (1 Day Left): {t_key}"
                    msg = f"Task \"{t_title}\" is due tomorrow ({due})! Please complete this task today."
                    tag_text = "Due Tomorrow"
                elif diff_days == 0:
                    title = f"⏰ Task Due Today: {t_key}"
                    msg = f"Task \"{t_title}\" is due today ({due})! Final day to complete and submit."
                    tag_text = "Due Today"
                else:
                    days_over = abs(diff_days)
                    title = f"⚠️ Task Overdue: {t_key}"
                    msg = f"Task \"{t_title}\" was due on {due} ({days_over} day{'s' if days_over > 1 else ''} overdue)! Please resolve immediately."
                    tag_text = f"{days_over}d Overdue"

                notif_payload = {
                    "recipientEmail": u_email,
                    "recipientId": u_id,
                    "senderName": "TaskFlow Deadline Alert",
                    "senderAvatar": "🚨" if is_overdue or diff_days <= 1 else "⏰",
                    "senderColor": "#dc2626" if is_overdue or diff_days <= 1 else "#ea580c",
                    "type": "task_due",
                    "title": title,
                    "message": msg,
                    "data": {
                        "taskId": t_id,
                        "projectId": p_id,
                        "taskKey": t_key,
                        "taskTitle": t_title,
                        "dueDate": due,
                        "diffDays": diff_days,
                        "daysRemaining": diff_days,
                        "isDueUrgent": True,
                        "isOverdue": is_overdue,
                        "tagText": tag_text,
                        "checkDate": today_str
                    }
                }

                db = get_db()
                if db is not None:
                    existing = db.notifications.find_one({
                        "recipientEmail": {"$in": email_variants},
                        "type": "task_due",
                        "data.taskId": t_id,
                        "data.checkDate": today_str
                    })
                    if not existing:
                        create_notification(notif_payload)
                else:
                    fallback = _load_fallback()
                    existing = any(
                        n.get("recipientEmail") in email_variants 
                        and n.get("type") == "task_due" 
                        and (n.get("data") or {}).get("taskId") == t_id 
                        and (n.get("data") or {}).get("checkDate") == today_str
                        for n in fallback.get("notifications", [])
                    )
                    if not existing:
                        create_notification(notif_payload)

    # 2. Projects Due Countdown (<= 3 days) for Manager & Team Members
    all_projects = list_projects()
    for p in all_projects:
        p_mgr_email = str(p.get("managerEmail") or "").lower().strip()
        p_creator = str(p.get("createdBy") or "").strip()
        p_team = p.get("teamMembers") or []

        is_my_project = (p_mgr_email in email_variants) or (u_id and p_creator == u_id)
        if not is_my_project and isinstance(p_team, list):
            is_my_project = any(
                str(m.get("email") or "").lower().strip() in email_variants 
                or (u_id and str(m.get("id") or m.get("userId") or "").strip() == u_id)
                for m in p_team if isinstance(m, dict)
            )

        p_due = p.get("dueDate")
        p_st = str(p.get("status") or "").lower()
        if is_my_project and p_due and p_st not in ["completed", "done"]:
            try:
                p_due_dt = datetime.strptime(str(p_due).strip()[:10], "%Y-%m-%d").date()
                p_diff_days = (p_due_dt - today_dt).days
            except Exception:
                p_diff_days = None

            if p_diff_days is not None and p_diff_days <= 3:
                p_is_overdue = p_diff_days < 0
                p_id = str(p.get("id") or p.get("_id"))
                p_title = p.get("title") or "Project"
                p_key = p.get("key") or "PRJ"

                if p_diff_days == 3:
                    p_title_text = f"🚨 Project Deadline in 3 Days: {p_title}"
                    p_msg = f"Project \"{p_title}\" is due in 3 days ({p_due}). You have 3 days remaining for this project."
                    p_tag = "3 Days Left"
                elif p_diff_days == 2:
                    p_title_text = f"🚨 Project Deadline in 2 Days: {p_title}"
                    p_msg = f"Project \"{p_title}\" is due in 2 days ({p_due}). 2 days remaining!"
                    p_tag = "2 Days Left"
                elif p_diff_days == 1:
                    p_title_text = f"🔥 Project Deadline Tomorrow: {p_title}"
                    p_msg = f"Project \"{p_title}\" deadline is tomorrow ({p_due})! Final day to finalize deliverables."
                    p_tag = "Due Tomorrow"
                elif p_diff_days == 0:
                    p_title_text = f"⏰ Project Due Today: {p_title}"
                    p_msg = f"Project \"{p_title}\" is due today ({p_due})! All deliverables should be wrapped up today."
                    p_tag = "Due Today"
                else:
                    p_days_over = abs(p_diff_days)
                    p_title_text = f"⚠️ Project Overdue: {p_title}"
                    p_msg = f"Project \"{p_title}\" deadline was on {p_due} ({p_days_over} day{'s' if p_days_over > 1 else ''} overdue)!"
                    p_tag = f"{p_days_over}d Overdue"

                p_notif_payload = {
                    "recipientEmail": u_email,
                    "recipientId": u_id,
                    "senderName": "TaskFlow Deadline Alert",
                    "senderAvatar": "🚨" if p_is_overdue or p_diff_days <= 1 else "⏰",
                    "senderColor": "#dc2626" if p_is_overdue or p_diff_days <= 1 else "#ea580c",
                    "type": "project_due",
                    "title": p_title_text,
                    "message": p_msg,
                    "data": {
                        "projectId": p_id,
                        "projectKey": p_key,
                        "projectTitle": p_title,
                        "dueDate": p_due,
                        "diffDays": p_diff_days,
                        "daysRemaining": p_diff_days,
                        "isDueUrgent": True,
                        "isOverdue": p_is_overdue,
                        "tagText": p_tag,
                        "checkDate": today_str
                    }
                }

                db = get_db()
                if db is not None:
                    existing_p = db.notifications.find_one({
                        "recipientEmail": {"$in": email_variants},
                        "type": "project_due",
                        "data.projectId": p_id,
                        "data.checkDate": today_str
                    })
                    if not existing_p:
                        create_notification(p_notif_payload)
                else:
                    fallback = _load_fallback()
                    existing_p = any(
                        n.get("recipientEmail") in email_variants 
                        and n.get("type") == "project_due" 
                        and (n.get("data") or {}).get("projectId") == p_id 
                        and (n.get("data") or {}).get("checkDate") == today_str
                        for n in fallback.get("notifications", [])
                    )
                    if not existing_p:
                        create_notification(p_notif_payload)

    db = get_db()
    if db is not None:
        query_conditions = [{"recipientEmail": {"$in": email_variants}}]
        if u_id:
            query_conditions.append({"recipientId": u_id})
        
        docs = list(db.notifications.find({"$or": query_conditions}).sort([("createdAt", -1)]).limit(50))
        return [serialize_doc(d) for d in docs]

    fallback = _load_fallback()
    notifs = fallback.get("notifications", [])
    user_notifs = [
        n for n in notifs 
        if (n.get("recipientEmail") in email_variants or (u_id and n.get("recipientId") == u_id))
    ]
    user_notifs.sort(key=lambda x: x.get("createdAt", ""), reverse=True)
    return user_notifs[:50]

def mark_notification_read(notification_id=None, user_email=None, mark_all=False):
    now = datetime.now(timezone.utc).isoformat()
    db = get_db()
    if db is not None:
        if mark_all and user_email:
            u_email = str(user_email).strip().lower()
            email_variants = [u_email]
            if "@" in u_email:
                email_variants.append(u_email.replace("@", "."))
            elif "." in u_email:
                parts = u_email.split(".")
                if len(parts) >= 2:
                    email_variants.append(parts[0] + "@" + ".".join(parts[1:]))
            db.notifications.update_many({"recipientEmail": {"$in": email_variants}}, {"$set": {"isRead": True, "updatedAt": now}})
            return {"success": True}
        elif notification_id:
            db.notifications.update_one(_build_id_query(notification_id), {"$set": {"isRead": True, "updatedAt": now}})
            return {"success": True}

    fallback = _load_fallback()
    notifs = fallback.get("notifications", [])
    if mark_all and user_email:
        u_email = str(user_email).strip().lower()
        for n in notifs:
            if n.get("recipientEmail") == u_email:
                n["isRead"] = True
                n["updatedAt"] = now
    elif notification_id:
        nid = str(notification_id)
        for n in notifs:
            if str(n.get("id")) == nid or str(n.get("_id")) == nid:
                n["isRead"] = True
                n["updatedAt"] = now
                break
    _save_fallback(fallback)
    return {"success": True}

def send_team_request(sender_email, query_str, sender_id=None, sender_name=None):
    q = (query_str or "").strip().lower()
    if not q:
        raise ValueError("Please provide an email or member ID to search.")

    sender_email_clean = str(sender_email or "").strip().lower()
    sender_user = find_user_doc(sender_email_clean or sender_id)
    if not sender_user:
        raise ValueError("Sender user not found.")

    s_name = sender_name or sender_user.get("name") or f"{sender_user.get('firstName', '')} {sender_user.get('lastName', '')}".strip() or sender_email_clean
    s_email = str(sender_user.get("email") or sender_email_clean).lower()
    s_id = str(sender_user.get("_id") or sender_user.get("id") or "")
    s_avatar = sender_user.get("avatar") or s_name[:2].upper()
    s_color = sender_user.get("color") or "#6366f1"
    s_role = sender_user.get("role") or "Project Manager"

    recipient_user = find_user_doc(q)
    if not recipient_user:
        raise ValueError(f"No registered user found with '{query_str}'. The member must register/sign up first.")

    r_email = str(recipient_user.get("email") or "").strip().lower()
    r_id = str(recipient_user.get("_id") or recipient_user.get("id") or "")
    r_name = recipient_user.get("name") or f"{recipient_user.get('firstName', '')} {recipient_user.get('lastName', '')}".strip() or r_email

    if r_email == s_email or (r_id and r_id == s_id):
        raise ValueError("You cannot send a team request to yourself.")

    # Check if already teammates
    cur_team = list_team_members(s_email)
    if any((m.get("email") or "").lower() == r_email or str(m.get("userId") or m.get("id")) == r_id for m in cur_team):
        raise ValueError(f"'{r_name}' ({r_email}) is already in your team.")

    # Check if pending request exists
    db = get_db()
    if db is not None:
        pending = db.notifications.find_one({
            "recipientEmail": r_email,
            "senderEmail": s_email,
            "type": "team_request",
            "status": "pending"
        })
        if pending:
            raise ValueError(f"A team invitation has already been sent to {r_name} and is waiting for their response.")
    else:
        fallback = _load_fallback()
        for n in fallback.get("notifications", []):
            if n.get("recipientEmail") == r_email and n.get("senderEmail") == s_email and n.get("type") == "team_request" and n.get("status") == "pending":
                raise ValueError(f"A team invitation has already been sent to {r_name} and is waiting for their response.")

    notif = create_notification({
        "recipientEmail": r_email,
        "recipientId": r_id,
        "senderName": s_name,
        "senderEmail": s_email,
        "senderAvatar": s_avatar,
        "senderColor": s_color,
        "type": "team_request",
        "title": f"Team Request from {s_name}",
        "message": f"{s_name} ({s_email}) sent you a request to join their team.",
        "status": "pending",
        "data": {
            "senderEmail": s_email,
            "senderId": s_id,
            "senderName": s_name,
            "senderAvatar": s_avatar,
            "senderColor": s_color,
            "senderRole": s_role,
            "recipientEmail": r_email,
            "recipientId": r_id,
            "recipientName": r_name
        }
    })

    return {
        "success": True,
        "message": f"Team invitation sent to {r_name}! They will receive a notification in their bell to accept.",
        "recipient": {
            "name": r_name,
            "email": r_email,
            "avatar": recipient_user.get("avatar") or r_name[:2].upper(),
            "role": recipient_user.get("role") or "Member"
        },
        "notification": notif
    }

def respond_team_request(notification_id, action, user_email, user_id=None):
    if not notification_id:
        raise ValueError("Notification ID is required.")
    if action not in ["accept", "decline"]:
        raise ValueError("Action must be 'accept' or 'decline'.")

    u_email = str(user_email or "").strip().lower()
    u_user = find_user_doc(u_email or user_id)
    if not u_user:
        raise ValueError("User not found.")

    u_name = u_user.get("name") or f"{u_user.get('firstName', '')} {u_user.get('lastName', '')}".strip() or u_email
    u_id_str = str(u_user.get("_id") or u_user.get("id"))
    now = datetime.now(timezone.utc).isoformat()

    db = get_db()
    if db is not None:
        notif = db.notifications.find_one(_build_id_query(notification_id))
        if not notif:
            raise ValueError("Notification not found.")
        
        sender_email = str(notif.get("senderEmail") or "").strip().lower()
        sender_user = find_user_doc(sender_email)
        s_name = notif.get("senderName") or (sender_user.get("name") if sender_user else sender_email)
        s_id = str(sender_user.get("_id") or sender_user.get("id") or "") if sender_user else ""

        if action == "accept":
            # Update notification status
            db.notifications.update_one(_build_id_query(notification_id), {
                "$set": {"status": "accepted", "isRead": True, "updatedAt": now}
            })

            # Add User B to User A's team
            if sender_email:
                ex1 = db.team_members.find_one({
                    "$and": [
                        {"$or": [{"email": u_email}, {"userId": u_id_str}]},
                        {"$or": [{"owner": sender_email}, {"ownerEmail": sender_email}, {"ownerId": s_id}]}
                    ]
                })
                if not ex1:
                    db.team_members.insert_one({
                        "name": u_name,
                        "email": u_email,
                        "role": u_user.get("role") or "Developer",
                        "avatar": u_user.get("avatar") or u_name[:2].upper(),
                        "color": u_user.get("color", "#6366f1"),
                        "userId": u_id_str,
                        "owner": sender_email,
                        "ownerEmail": sender_email,
                        "ownerId": s_id
                    })

            # Add User A to User B's team
            if sender_user:
                ex2 = db.team_members.find_one({
                    "$and": [
                        {"$or": [{"email": sender_email}, {"userId": s_id}]},
                        {"$or": [{"owner": u_email}, {"ownerEmail": u_email}, {"ownerId": u_id_str}]}
                    ]
                })
                if not ex2:
                    db.team_members.insert_one({
                        "name": s_name,
                        "email": sender_email,
                        "role": sender_user.get("role") or "Project Manager",
                        "avatar": sender_user.get("avatar") or s_name[:2].upper(),
                        "color": sender_user.get("color", "#6366f1"),
                        "userId": s_id,
                        "owner": u_email,
                        "ownerEmail": u_email,
                        "ownerId": u_id_str
                    })

            # Send team_accepted notification to original sender
            create_notification({
                "recipientEmail": sender_email,
                "recipientId": s_id,
                "senderName": u_name,
                "senderAvatar": u_user.get("avatar") or u_name[:2].upper(),
                "senderColor": u_user.get("color") or "#10b981",
                "type": "team_accepted",
                "title": "Team Request Accepted! 🎉",
                "message": f"{u_name} ({u_email}) accepted your team request! You are now teammates.",
                "data": {
                    "memberEmail": u_email,
                    "memberName": u_name,
                    "role": u_user.get("role") or "Developer"
                }
            })

            return {
                "success": True,
                "message": f"You accepted {s_name}'s team request! You are now teammates.",
                "status": "accepted"
            }

        else: # decline
            db.notifications.update_one(_build_id_query(notification_id), {
                "$set": {"status": "declined", "isRead": True, "updatedAt": now}
            })
            return {
                "success": True,
                "message": f"You declined the team request from {s_name}.",
                "status": "declined"
            }

    # Fallback JSON store mode
    fallback = _load_fallback()
    notifs = fallback.setdefault("notifications", [])
    target_notif = None
    nid_str = str(notification_id)
    for n in notifs:
        if str(n.get("id")) == nid_str or str(n.get("_id")) == nid_str:
            target_notif = n
            break

    if not target_notif:
        raise ValueError("Notification not found.")

    sender_email = str(target_notif.get("senderEmail") or "").strip().lower()
    sender_user = find_user_doc(sender_email)
    s_name = target_notif.get("senderName") or (sender_user.get("name") if sender_user else sender_email)
    s_id = str(sender_user.get("_id") or sender_user.get("id") or "") if sender_user else ""

    if action == "accept":
        target_notif["status"] = "accepted"
        target_notif["isRead"] = True
        target_notif["updatedAt"] = now

        team = fallback.setdefault("team_members", [])
        if not any((m.get("email") or "").lower() == u_email and m.get("ownerEmail") == sender_email for m in team):
            team.append({
                "id": str(uuid.uuid4())[:8],
                "name": u_name,
                "email": u_email,
                "role": u_user.get("role") or "Developer",
                "avatar": u_user.get("avatar") or u_name[:2].upper(),
                "color": u_user.get("color", "#6366f1"),
                "userId": u_id_str,
                "owner": sender_email,
                "ownerEmail": sender_email,
                "ownerId": s_id
            })

        if sender_user and not any((m.get("email") or "").lower() == sender_email and m.get("ownerEmail") == u_email for m in team):
            team.append({
                "id": str(uuid.uuid4())[:8],
                "name": s_name,
                "email": sender_email,
                "role": sender_user.get("role") or "Project Manager",
                "avatar": sender_user.get("avatar") or s_name[:2].upper(),
                "color": sender_user.get("color", "#6366f1"),
                "userId": s_id,
                "owner": u_email,
                "ownerEmail": u_email,
                "ownerId": u_id_str
            })

        _save_fallback(fallback)
        create_notification({
            "recipientEmail": sender_email,
            "recipientId": s_id,
            "senderName": u_name,
            "senderAvatar": u_user.get("avatar") or u_name[:2].upper(),
            "senderColor": u_user.get("color") or "#10b981",
            "type": "team_accepted",
            "title": "Team Request Accepted! 🎉",
            "message": f"{u_name} ({u_email}) accepted your team request! You are now teammates.",
            "data": {
                "memberEmail": u_email,
                "memberName": u_name,
                "role": u_user.get("role") or "Developer"
            }
        })

        return {
            "success": True,
            "message": f"You accepted {s_name}'s team request! You are now teammates.",
            "status": "accepted"
        }
    else:
        target_notif["status"] = "declined"
        target_notif["isRead"] = True
        target_notif["updatedAt"] = now
        _save_fallback(fallback)
        return {
            "success": True,
            "message": f"You declined the team request from {s_name}.",
            "status": "declined"
        }


