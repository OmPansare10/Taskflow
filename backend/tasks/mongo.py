import os
import uuid
import threading
from datetime import datetime, timezone
from bson import ObjectId
from pymongo import MongoClient, ASCENDING, DESCENDING
from pymongo.errors import ConnectionFailure, ServerSelectionTimeoutError
from django.conf import settings
from django.contrib.auth.hashers import make_password, check_password

_assignment_lock = threading.Lock()
_client_lock = threading.Lock()
_mongo_client = None

def _sanitize_mongo_uri(uri):
    if not uri:
        return "Not configured"
    import re
    if "mongodb+srv" in uri:
        masked = re.sub(r'://([^:]+):([^@]+)@', r'://\1:****@', uri)
        return masked
    elif "@" in uri:
        return re.sub(r'://([^:]+):([^@]+)@', r'://\1:****@', uri)
    return uri

def _normalize_mongo_uri(uri):
    if not uri or not isinstance(uri, str):
        return uri
    import urllib.parse
    cleaned = uri.strip()
    for prefix in ["mongodb+srv://", "mongodb://"]:
        if cleaned.startswith(prefix):
            rest = cleaned[len(prefix):]
            if "@" in rest:
                last_at = rest.rfind("@")
                userinfo = rest[:last_at]
                hosts_query = rest[last_at + 1:]
                if ":" in userinfo:
                    user, pwd = userinfo.split(":", 1)
                    pwd_decoded = urllib.parse.unquote(pwd)
                    pwd_encoded = urllib.parse.quote_plus(pwd_decoded)
                    return f"{prefix}{user}:{pwd_encoded}@{hosts_query}"
    return cleaned

def get_mongo_client():
    global _mongo_client
    if _mongo_client is None:
        with _client_lock:
            if _mongo_client is None:
                raw_uri = getattr(settings, 'MONGODB_URI', None) or getattr(settings, 'MONGO_URI', 'mongodb://localhost:27017')
                uri = _normalize_mongo_uri(raw_uri)
                try:
                    # Allow 5000ms for cloud DNS SRV resolution and TLS handshake on Atlas
                    timeout_ms = 5000 if 'mongodb+srv' in uri else 2000
                    client = MongoClient(
                        uri,
                        serverSelectionTimeoutMS=timeout_ms,
                        connectTimeoutMS=timeout_ms
                    )
                    client.admin.command('ping')
                    _mongo_client = client
                except Exception as e:
                    _mongo_client = None
    return _mongo_client

def is_mongo_alive():
    try:
        client = get_mongo_client()
        if client is not None:
            client.admin.command('ping')
            return True
        return False
    except Exception:
        return False

def get_mongo_status():
    alive = is_mongo_alive()
    raw_uri = getattr(settings, 'MONGODB_URI', '') or getattr(settings, 'MONGO_URI', '')
    is_atlas = "mongodb+srv" in raw_uri
    db_name = getattr(settings, 'MONGODB_DB_NAME', 'taskflow')
    
    if alive:
        msg = f"Connected to MongoDB Atlas cluster ({db_name})" if is_atlas else f"Connected to local MongoDB server ({db_name})"
    else:
        if is_atlas:
            msg = "MongoDB Atlas is unreachable. Verify MONGO_URI in Render environment variables and ensure Atlas Network Access allows 0.0.0.0/0."
        else:
            msg = "MongoDB is offline at localhost:27017. Please ensure MongoDB service is running."

    return {
        "connected": alive,
        "mode": "mongodb_atlas" if is_atlas else "mongodb_local",
        "uri": _sanitize_mongo_uri(raw_uri),
        "database": db_name,
        "message": msg
    }

def get_db():
    client = get_mongo_client()
    if client is not None:
        db_name = getattr(settings, 'MONGODB_DB_NAME', 'taskflow')
        return client[db_name]
    return None

# ----------------- Helpers -----------------

def to_object_id(val):
    if not val:
        return None
    if isinstance(val, ObjectId):
        return val
    s = str(val).strip()
    if ObjectId.is_valid(s):
        return ObjectId(s)
    return s

def _build_id_query(doc_id):
    if not doc_id:
        return {"_id": None}
    doc_id_str = str(doc_id).strip()
    if ObjectId.is_valid(doc_id_str):
        return {"$or": [{"_id": ObjectId(doc_id_str)}, {"_id": doc_id_str}]}
    return {"_id": doc_id_str}

def normalize_email_str(email):
    if not email or not isinstance(email, str):
        return ""
    e = email.strip().lower()
    if "@" not in e and "." in e:
        parts = e.split(".")
        if len(parts) >= 2:
            e = parts[0] + "@" + ".".join(parts[1:])
    if e == "om@gmail.com":
        return "om.pansare10@gmail.com"
    return e

def serialize_doc(doc):
    if not doc:
        return None
    res = dict(doc)
    if '_id' in res:
        res['id'] = str(res['_id'])
        res['_id'] = str(res['_id'])
    for k, v in list(res.items()):
        if isinstance(v, ObjectId):
            res[k] = str(v)
        elif isinstance(v, datetime):
            res[k] = v.isoformat()
    return res

def _user_summary(u_doc):
    if not u_doc:
        return {
            "id": "",
            "_id": "",
            "name": "Team Member",
            "firstName": "Team",
            "lastName": "Member",
            "email": "",
            "role": "Team Member",
            "avatar": "TM",
            "color": "#6366f1"
        }
    fn = u_doc.get("first_name") or u_doc.get("firstName") or ""
    ln = u_doc.get("last_name") or u_doc.get("lastName") or ""
    name = f"{fn} {ln}".strip() or u_doc.get("email") or "User"
    initials = f"{(fn or 'U')[0]}{(ln or '')[:1]}".upper() or "U"
    role = u_doc.get("role") or "Team Member"
    color = "#6366f1" if "Manager" in role else "#06b6d4"
    u_id = str(u_doc.get("_id") or "")
    return {
        "id": u_id,
        "_id": u_id,
        "name": name,
        "firstName": fn,
        "lastName": ln,
        "email": u_doc.get("email") or "",
        "role": role,
        "avatar": initials,
        "color": color
    }

def _resolve_user_id(db, identifier=None, email=None, name=None):
    if db is None:
        return None
    if email:
        norm_email = normalize_email_str(email)
        u = db.users.find_one({"email": norm_email})
        if u:
            return u["_id"]
    if identifier:
        id_str = str(identifier).strip()
        if "@" in id_str:
            u = db.users.find_one({"email": normalize_email_str(id_str)})
            if u:
                return u["_id"]
        u = db.users.find_one(_build_id_query(id_str))
        if u:
            return u["_id"]
        # Try matching name by identifier if not ObjectId
        u = db.users.find_one({
            "$or": [
                {"email": normalize_email_str(id_str)},
                {"first_name": {"$regex": f"^{id_str}$", "$options": "i"}},
                {"last_name": {"$regex": f"^{id_str}$", "$options": "i"}}
            ]
        })
        if u:
            return u["_id"]
    if name:
        parts = name.strip().split()
        if len(parts) >= 2:
            u = db.users.find_one({
                "first_name": {"$regex": f"^{parts[0]}$", "$options": "i"},
                "last_name": {"$regex": f"^{parts[1]}$", "$options": "i"}
            })
            if u:
                return u["_id"]
        u = db.users.find_one({"first_name": {"$regex": f"^{name.strip()}$", "$options": "i"}})
        if u:
            return u["_id"]
    return None

# ----------------- Project Operations -----------------

def _format_project(db, p_doc):
    if not p_doc:
        return None
    p_id = p_doc["_id"]
    p_id_str = str(p_id)

    # 1. Fetch project members from project_members collection
    members_docs = list(db.project_members.find({"$or": [{"project_id": p_id}, {"project_id": p_id_str}]}))
    team_members = []
    seen_user_ids = set()

    for m in members_docs:
        uid = m.get("user_id")
        u_doc = db.users.find_one(_build_id_query(uid))
        if u_doc:
            s = _user_summary(u_doc)
            s["role"] = m.get("role") or s["role"]
            if s["id"] not in seen_user_ids:
                team_members.append(s)
                seen_user_ids.add(s["id"])

    # 2. Owner summary
    owner_id = p_doc.get("owner_id")
    owner_doc = db.users.find_one(_build_id_query(owner_id)) if owner_id else None
    owner_summary = _user_summary(owner_doc) if owner_doc else None

    # If owner wasn't in members, prepend owner
    if owner_summary and owner_summary["id"] and owner_summary["id"] not in seen_user_ids:
        team_members.insert(0, owner_summary)
        seen_user_ids.add(owner_summary["id"])

    name = p_doc.get("name") or "Untitled Project"
    created_at = p_doc.get("created_at")
    created_at_str = created_at.isoformat() if isinstance(created_at, datetime) else str(created_at or "")

    key = "".join([w[0] for w in name.split() if w]).upper()[:4] or "PRJ"

    return {
        "id": p_id_str,
        "_id": p_id_str,
        "name": name,
        "title": name,  # Frontend alias
        "key": key,
        "description": p_doc.get("description") or "",
        "owner_id": str(owner_id) if owner_id else "",
        "createdBy": str(owner_id) if owner_id else "",
        "manager": owner_summary["name"] if owner_summary else "Project Manager",
        "managerEmail": owner_summary["email"] if owner_summary else "",
        "status": p_doc.get("status") or "active",
        "start_date": str(p_doc.get("start_date") or "")[:10],
        "startDate": str(p_doc.get("start_date") or "")[:10],
        "due_date": str(p_doc.get("due_date") or "")[:10],
        "dueDate": str(p_doc.get("due_date") or "")[:10],
        "created_at": created_at_str,
        "createdAt": created_at_str,
        "teamMembers": team_members
    }

def list_projects(user_email=None, user_id=None, username=None):
    db = get_db()
    if db is None:
        return []

    u_id = None
    if user_email:
        u_id = _resolve_user_id(db, email=user_email)
    if not u_id and user_id:
        u_id = _resolve_user_id(db, identifier=user_id)
    if not u_id and username:
        u_id = _resolve_user_id(db, name=username)

    if u_id:
        member_entries = list(db.project_members.find({"$or": [{"user_id": u_id}, {"user_id": str(u_id)}]}))
        member_pids = [m["project_id"] for m in member_entries]
        query = {
            "$or": [
                {"owner_id": u_id},
                {"owner_id": str(u_id)},
                {"_id": {"$in": member_pids}},
                {"_id": {"$in": [str(pid) for pid in member_pids]}}
            ]
        }
        projects_cur = list(db.projects.find(query).sort("created_at", DESCENDING))
    else:
        projects_cur = list(db.projects.find().sort("created_at", DESCENDING))

    if not projects_cur:
        return []

    # Batch pre-fetch all members for these projects
    p_ids = [p["_id"] for p in projects_cur]
    all_members = list(db.project_members.find({"$or": [{"project_id": {"$in": p_ids}}, {"project_id": {"$in": [str(pid) for pid in p_ids]}}]}))

    # Batch pre-fetch all users needed
    user_ids = {m["user_id"] for m in all_members if m.get("user_id")}
    for p in projects_cur:
        if p.get("owner_id"):
            user_ids.add(p["owner_id"])

    user_query = {"$or": [{"_id": {"$in": list(user_ids)}}, {"_id": {"$in": [str(uid) for uid in user_ids]}}]}
    users_dict = {}
    for u in db.users.find(user_query):
        s = _user_summary(u)
        users_dict[str(u["_id"])] = s
        users_dict[u["_id"]] = s

    # Map members by project_id
    members_by_pid = {}
    for m in all_members:
        pid_key = str(m.get("project_id"))
        members_by_pid.setdefault(pid_key, []).append(m)

    results = []
    for p_doc in projects_cur:
        p_id = p_doc["_id"]
        p_id_str = str(p_id)
        proj_members = members_by_pid.get(p_id_str, [])

        team_members = []
        seen_user_ids = set()

        for m in proj_members:
            uid = m.get("user_id")
            s = users_dict.get(str(uid)) or users_dict.get(uid)
            if s and s["id"] not in seen_user_ids:
                m_copy = dict(s)
                m_copy["role"] = m.get("role") or s["role"]
                team_members.append(m_copy)
                seen_user_ids.add(s["id"])

        owner_id = p_doc.get("owner_id")
        owner_summary = users_dict.get(str(owner_id)) or users_dict.get(owner_id)
        if owner_summary and owner_summary["id"] and owner_summary["id"] not in seen_user_ids:
            team_members.insert(0, owner_summary)
            seen_user_ids.add(owner_summary["id"])

        name = p_doc.get("name") or "Untitled Project"
        created_at = p_doc.get("created_at")
        created_at_str = created_at.isoformat() if isinstance(created_at, datetime) else str(created_at or "")
        key = "".join([w[0] for w in name.split() if w]).upper()[:4] or "PRJ"

        results.append({
            "id": p_id_str,
            "_id": p_id_str,
            "name": name,
            "title": name,
            "key": key,
            "description": p_doc.get("description") or "",
            "owner_id": str(owner_id) if owner_id else "",
            "createdBy": str(owner_id) if owner_id else "",
            "manager": owner_summary["name"] if owner_summary else "Project Manager",
            "managerEmail": owner_summary["email"] if owner_summary else "",
            "status": p_doc.get("status") or "active",
            "start_date": str(p_doc.get("start_date") or "")[:10],
            "startDate": str(p_doc.get("start_date") or "")[:10],
            "due_date": str(p_doc.get("due_date") or "")[:10],
            "dueDate": str(p_doc.get("due_date") or "")[:10],
            "created_at": created_at_str,
            "createdAt": created_at_str,
            "teamMembers": team_members
        })

    return results

def get_project_by_id(project_id):
    db = get_db()
    if db is None or not project_id:
        return None
    p = db.projects.find_one(_build_id_query(project_id))
    return _format_project(db, p) if p else None

def create_project(data):
    db = get_db()
    if db is None:
        raise ConnectionFailure("MongoDB is offline")

    name = str(data.get("title") or data.get("name") or "").strip()
    if not name:
        raise ValueError("Project title/name is required")

    description = str(data.get("description") or "").strip()
    status_str = str(data.get("status") or "active").strip()
    start_date = str(data.get("startDate") or data.get("start_date") or datetime.now(timezone.utc).strftime("%Y-%m-%d"))[:10]
    due_date = str(data.get("dueDate") or data.get("due_date") or datetime.now(timezone.utc).strftime("%Y-%m-%d"))[:10]
    now = datetime.now(timezone.utc)

    # Resolve owner_id
    owner_id = _resolve_user_id(
        db,
        identifier=data.get("createdBy") or data.get("owner_id"),
        email=data.get("managerEmail"),
        name=data.get("manager")
    )
    if not owner_id:
        first_user = db.users.find_one()
        owner_id = first_user["_id"] if first_user else ObjectId()

    new_id = ObjectId()
    # MongoDB collection: projects (Fields: _id, name, description, owner_id, status, start_date, due_date, created_at)
    proj_doc = {
        "_id": new_id,
        "name": name,
        "description": description,
        "owner_id": owner_id,
        "status": status_str,
        "start_date": start_date,
        "due_date": due_date,
        "created_at": now
    }
    db.projects.insert_one(proj_doc)

    # MongoDB collection: project_members (Fields: _id, project_id, user_id, role, joined_at)
    db.project_members.insert_one({
        "_id": ObjectId(),
        "project_id": new_id,
        "user_id": owner_id,
        "role": "Project Manager",
        "joined_at": now
    })

    # Add other team members if provided
    members_input = data.get("teamMembers") or []
    for m in members_input:
        if isinstance(m, dict):
            mid = _resolve_user_id(db, identifier=m.get("id") or m.get("_id"), email=m.get("email"), name=m.get("name"))
            if mid and mid != owner_id:
                if not db.project_members.find_one({"project_id": new_id, "user_id": mid}):
                    db.project_members.insert_one({
                        "_id": ObjectId(),
                        "project_id": new_id,
                        "user_id": mid,
                        "role": m.get("role") or "Team Member",
                        "joined_at": now
                    })

    # MongoDB collection: activities (Fields: _id, user_id, project_id, task_id, action, created_at)
    db.activities.insert_one({
        "_id": ObjectId(),
        "user_id": owner_id,
        "project_id": new_id,
        "task_id": None,
        "action": f"Project '{name}' created",
        "created_at": now
    })

    return get_project_by_id(new_id)

def update_project(project_id, data):
    db = get_db()
    if db is None or not project_id:
        return None

    query = _build_id_query(project_id)
    proj = db.projects.find_one(query)
    if not proj:
        return None

    p_id = proj["_id"]
    update_fields = {}

    if "name" in data or "title" in data:
        update_fields["name"] = str(data.get("name") or data.get("title")).strip()
    if "description" in data:
        update_fields["description"] = str(data.get("description") or "").strip()
    if "status" in data:
        update_fields["status"] = str(data.get("status") or "active").strip()
    if "startDate" in data or "start_date" in data:
        update_fields["start_date"] = str(data.get("startDate") or data.get("start_date"))[:10]
    if "dueDate" in data or "due_date" in data:
        update_fields["due_date"] = str(data.get("dueDate") or data.get("due_date"))[:10]

    if update_fields:
        db.projects.update_one({"_id": p_id}, {"$set": update_fields})

    # Sync project_members if teamMembers is given
    if "teamMembers" in data and isinstance(data["teamMembers"], list):
        now = datetime.now(timezone.utc)
        desired_uids = set()
        for tm in data["teamMembers"]:
            if isinstance(tm, dict):
                uid = _resolve_user_id(db, identifier=tm.get("id") or tm.get("_id"), email=tm.get("email"), name=tm.get("name"))
                if uid:
                    desired_uids.add(uid)
                    db.project_members.update_one(
                        {"$or": [{"project_id": p_id}, {"project_id": str(p_id)}], "user_id": uid},
                        {"$set": {"role": tm.get("role") or "Team Member"}, "$setOnInsert": {"_id": ObjectId(), "project_id": p_id, "user_id": uid, "joined_at": now}},
                        upsert=True
                    )
        # Always retain owner
        owner_id = proj.get("owner_id")
        if owner_id:
            desired_uids.add(owner_id)

        # Remove members not in desired_uids
        db.project_members.delete_many({
            "$or": [{"project_id": p_id}, {"project_id": str(p_id)}],
            "user_id": {"$nin": list(desired_uids)}
        })

    return get_project_by_id(p_id)

def delete_project(project_id):
    db = get_db()
    if db is None or not project_id:
        return False
    query = _build_id_query(project_id)
    proj = db.projects.find_one(query)
    if not proj:
        return False

    p_id = proj["_id"]
    p_id_str = str(p_id)

    # Delete tasks and associated comments
    tasks = list(db.tasks.find({"$or": [{"project_id": p_id}, {"project_id": p_id_str}]}))
    task_ids = [t["_id"] for t in tasks]
    if task_ids:
        db.comments.delete_many({"$or": [{"task_id": {"$in": task_ids}}, {"task_id": {"$in": [str(tid) for tid in task_ids]}}]})
        db.tasks.delete_many({"_id": {"$in": task_ids}})

    db.project_members.delete_many({"$or": [{"project_id": p_id}, {"project_id": p_id_str}]})
    db.activities.delete_many({"$or": [{"project_id": p_id}, {"project_id": p_id_str}]})
    db.projects.delete_one({"_id": p_id})
    return True

def leave_project(project_id, user_data):
    db = get_db()
    if db is None or not project_id:
        return None
    proj = db.projects.find_one(_build_id_query(project_id))
    if not proj:
        return None

    p_id = proj["_id"]
    u_id = _resolve_user_id(db, identifier=user_data.get("userId"), email=user_data.get("userEmail"))
    if u_id:
        db.project_members.delete_many({"$or": [{"project_id": p_id}, {"project_id": str(p_id)}], "$or": [{"user_id": u_id}, {"user_id": str(u_id)}]})
        db.activities.insert_one({
            "_id": ObjectId(),
            "user_id": u_id,
            "project_id": p_id,
            "task_id": None,
            "action": "Left project",
            "created_at": datetime.now(timezone.utc)
        })
    return get_project_by_id(p_id)

# ----------------- Task Operations -----------------

def _format_task(db, t_doc):
    if not t_doc:
        return None
    t_id = t_doc["_id"]
    t_id_str = str(t_id)

    # Fetch comments from comments collection (Fields: _id, task_id, user_id, text, created_at)
    comments_cur = db.comments.find({"$or": [{"task_id": t_id}, {"task_id": t_id_str}]}).sort("created_at", ASCENDING)
    comments_list = []
    for c in comments_cur:
        author_u = db.users.find_one(_build_id_query(c.get("user_id")))
        author_summary = _user_summary(author_u)
        ts = c.get("created_at")
        ts_str = ts.isoformat() if isinstance(ts, datetime) else str(ts or "")
        comments_list.append({
            "id": str(c["_id"]),
            "_id": str(c["_id"]),
            "author": author_summary["name"],
            "user": author_summary["name"],
            "userId": author_summary["id"],
            "avatar": author_summary["avatar"],
            "text": c.get("text") or "",
            "timestamp": ts_str,
            "createdAt": ts_str
        })

    # Fetch assignee
    assigned_to = t_doc.get("assigned_to")
    assignee_u = db.users.find_one(_build_id_query(assigned_to)) if assigned_to else None
    assignee_summary = _user_summary(assignee_u) if assignee_u else None

    # Fetch reporter / creator
    created_by = t_doc.get("created_by")
    creator_u = db.users.find_one(_build_id_query(created_by)) if created_by else None
    reporter_name = _user_summary(creator_u)["name"] if creator_u else "Project Manager"

    # Activity log for this task
    acts_cur = db.activities.find({"$or": [{"task_id": t_id}, {"task_id": t_id_str}]}).sort("created_at", DESCENDING)
    activity_log = []
    for a in acts_cur:
        act_user = db.users.find_one(_build_id_query(a.get("user_id")))
        u_name = _user_summary(act_user)["name"] if act_user else "Team Member"
        ts = a.get("created_at")
        ts_str = ts.isoformat() if isinstance(ts, datetime) else str(ts or "")
        activity_log.append({
            "id": str(a["_id"]),
            "action": a.get("action") or "activity",
            "details": a.get("action") or "activity",
            "user": u_name,
            "timestamp": ts_str
        })

    p_id_str = str(t_doc.get("project_id") or "")
    proj = db.projects.find_one(_build_id_query(t_doc.get("project_id")))
    proj_name = proj.get("name") if proj else "Project"
    key_prefix = "".join([w[0] for w in proj_name.split() if w]).upper()[:3] or "TSK"

    return {
        "id": t_id_str,
        "_id": t_id_str,
        "projectId": p_id_str,
        "project_id": p_id_str,
        "taskKey": f"{key_prefix}-{t_id_str[-4:]}",
        "title": t_doc.get("title") or "Untitled Task",
        "description": t_doc.get("description") or "",
        "assigned_to": str(assigned_to) if assigned_to else "",
        "assignee": assignee_summary,
        "assigneeName": assignee_summary["name"] if assignee_summary else "Unassigned",
        "created_by": str(created_by) if created_by else "",
        "reporter": reporter_name,
        "status": t_doc.get("status") or "todo",
        "priority": t_doc.get("priority") or "medium",
        "dueDate": str(t_doc.get("due_date") or "")[:10],
        "due_date": str(t_doc.get("due_date") or "")[:10],
        "comments": comments_list,
        "activityLog": activity_log
    }

def list_tasks(project_id=None, status=None, priority=None, search=None):
    db = get_db()
    if db is None:
        return []

    q = {}
    if project_id:
        p_obj = to_object_id(project_id)
        q["$or"] = [{"project_id": p_obj}, {"project_id": str(project_id)}]
    if status:
        q["status"] = status
    if priority:
        q["priority"] = priority
    if search:
        q["$or"] = [
            {"title": {"$regex": search, "$options": "i"}},
            {"description": {"$regex": search, "$options": "i"}}
        ]

    tasks_cur = list(db.tasks.find(q))
    if not tasks_cur:
        return []

    t_ids = [t["_id"] for t in tasks_cur]
    t_id_strings = [str(tid) for tid in t_ids]

    # Batch comments
    comments_cur = list(db.comments.find({"$or": [{"task_id": {"$in": t_ids}}, {"task_id": {"$in": t_id_strings}}]}).sort("created_at", ASCENDING))
    # Batch activities
    acts_cur = list(db.activities.find({"$or": [{"task_id": {"$in": t_ids}}, {"task_id": {"$in": t_id_strings}}]}).sort("created_at", DESCENDING))

    # Collect all user IDs and project IDs
    user_ids = set()
    proj_ids = set()
    for t in tasks_cur:
        if t.get("assigned_to"): user_ids.add(t["assigned_to"])
        if t.get("created_by"): user_ids.add(t["created_by"])
        if t.get("project_id"): proj_ids.add(t["project_id"])

    for c in comments_cur:
        if c.get("user_id"): user_ids.add(c["user_id"])

    for a in acts_cur:
        if a.get("user_id"): user_ids.add(a["user_id"])

    # Batch fetch users
    users_dict = {}
    if user_ids:
        u_list = list(user_ids)
        for u in db.users.find({"$or": [{"_id": {"$in": u_list}}, {"_id": {"$in": [str(uid) for uid in u_list]}}]}):
            s = _user_summary(u)
            users_dict[str(u["_id"])] = s
            users_dict[u["_id"]] = s

    # Batch fetch projects
    projs_dict = {}
    if proj_ids:
        p_list = list(proj_ids)
        for p in db.projects.find({"$or": [{"_id": {"$in": p_list}}, {"_id": {"$in": [str(pid) for pid in p_list]}}]}):
            projs_dict[str(p["_id"])] = p.get("name") or "Project"
            projs_dict[p["_id"]] = p.get("name") or "Project"

    # Group comments by task_id
    comments_by_tid = {}
    for c in comments_cur:
        tid_str = str(c.get("task_id"))
        author_summary = users_dict.get(str(c.get("user_id"))) or users_dict.get(c.get("user_id")) or _user_summary(None)
        ts = c.get("created_at")
        ts_str = ts.isoformat() if isinstance(ts, datetime) else str(ts or "")
        comments_by_tid.setdefault(tid_str, []).append({
            "id": str(c["_id"]),
            "_id": str(c["_id"]),
            "author": author_summary["name"],
            "user": author_summary["name"],
            "userId": author_summary["id"],
            "avatar": author_summary["avatar"],
            "text": c.get("text") or "",
            "timestamp": ts_str,
            "createdAt": ts_str
        })

    # Group activities by task_id
    acts_by_tid = {}
    for a in acts_cur:
        tid_str = str(a.get("task_id"))
        act_user = users_dict.get(str(a.get("user_id"))) or users_dict.get(a.get("user_id"))
        u_name = act_user["name"] if act_user else "Team Member"
        ts = a.get("created_at")
        ts_str = ts.isoformat() if isinstance(ts, datetime) else str(ts or "")
        acts_by_tid.setdefault(tid_str, []).append({
            "id": str(a["_id"]),
            "action": a.get("action") or "activity",
            "details": a.get("action") or "activity",
            "user": u_name,
            "timestamp": ts_str
        })

    results = []
    for t_doc in tasks_cur:
        t_id = t_doc["_id"]
        t_id_str = str(t_id)

        comments_list = comments_by_tid.get(t_id_str, [])
        activity_log = acts_by_tid.get(t_id_str, [])

        assigned_to = t_doc.get("assigned_to")
        assignee_summary = users_dict.get(str(assigned_to)) or users_dict.get(assigned_to)

        created_by = t_doc.get("created_by")
        creator_summary = users_dict.get(str(created_by)) or users_dict.get(created_by)
        reporter_name = creator_summary["name"] if creator_summary else "Project Manager"

        p_id_str = str(t_doc.get("project_id") or "")
        proj_name = projs_dict.get(p_id_str) or projs_dict.get(t_doc.get("project_id")) or "Project"
        key_prefix = "".join([w[0] for w in proj_name.split() if w]).upper()[:3] or "TSK"

        results.append({
            "id": t_id_str,
            "_id": t_id_str,
            "projectId": p_id_str,
            "project_id": p_id_str,
            "taskKey": f"{key_prefix}-{t_id_str[-4:]}",
            "title": t_doc.get("title") or "Untitled Task",
            "description": t_doc.get("description") or "",
            "assigned_to": str(assigned_to) if assigned_to else "",
            "assignee": assignee_summary,
            "assigneeName": assignee_summary["name"] if assignee_summary else "",
            "created_by": str(created_by) if created_by else "",
            "reporter": reporter_name,
            "status": t_doc.get("status") or "todo",
            "priority": t_doc.get("priority") or "medium",
            "dueDate": str(t_doc.get("due_date") or "")[:10],
            "due_date": str(t_doc.get("due_date") or "")[:10],
            "comments": comments_list,
            "activityLog": activity_log
        })

    return results

def get_task_by_id(task_id):
    db = get_db()
    if db is None or not task_id:
        return None
    t = db.tasks.find_one(_build_id_query(task_id))
    return _format_task(db, t) if t else None

# ----------------- Assignment Strategies & Configuration -----------------

class AssignmentStrategy:
    FEWEST_ACTIVE_TASKS = "fewest_active_tasks"
    ROUND_ROBIN = "round_robin"
    RANDOM = "random"

DEFAULT_ASSIGNMENT_STRATEGY = AssignmentStrategy.FEWEST_ACTIVE_TASKS

def get_assignment_strategy():
    try:
        from django.conf import settings
        return getattr(settings, "TASKFLOW_ASSIGNMENT_STRATEGY", DEFAULT_ASSIGNMENT_STRATEGY)
    except Exception:
        return DEFAULT_ASSIGNMENT_STRATEGY

def is_user_active(u_doc):
    if not u_doc or not isinstance(u_doc, dict):
        return False
    if u_doc.get("is_active") is False or u_doc.get("is_active") == 0:
        return False
    if str(u_doc.get("status") or "").lower() in ["inactive", "disabled", "deactivated"]:
        return False
    return True

def select_assignee_by_strategy(candidates, candidate_metrics, strategy=None):
    if not candidates:
        return None
    strat = strategy or get_assignment_strategy()

    if strat == AssignmentStrategy.ROUND_ROBIN:
        # Sort by least recently assigned task (oldest last_id or empty last_id)
        sorted_candidates = sorted(
            candidates,
            key=lambda c: (candidate_metrics[str(c["_id"])][1], str(c["_id"]))
        )
        return sorted_candidates[0]

    elif strat == AssignmentStrategy.RANDOM:
        import random
        return random.choice(candidates)

    else:
        # Default: FEWEST_ACTIVE_TASKS with Round-Robin tie-breaker
        min_active = min(candidate_metrics[str(c["_id"])][0] for c in candidates)
        tied = [c for c in candidates if candidate_metrics[str(c["_id"])][0] == min_active]
        # Tie-breaker: round-robin (oldest last_id or empty string first)
        tied.sort(key=lambda c: (candidate_metrics[str(c["_id"])][1], str(c["_id"])))
        return tied[0]

def get_eligible_assignees_for_project(project_id, user_email=None, user_id=None, strategy=None):
    db = get_db()
    if db is None:
        return {
            "source": "none",
            "projectMemberCount": 0,
            "eligibleAssignees": [],
            "recommendedAssignee": None,
            "message": "Database is unavailable."
        }

    proj = db.projects.find_one(_build_id_query(project_id))
    if not proj:
        return {
            "source": "none",
            "projectMemberCount": 0,
            "eligibleAssignees": [],
            "recommendedAssignee": None,
            "message": "Project not found."
        }

    p_id = proj["_id"]
    p_id_str = str(p_id)
    owner_id = proj.get("owner_id")
    owner_id_str = str(owner_id) if owner_id else ""
    manager_email = normalize_email_str(proj.get("managerEmail") or "")

    # 1. Fetch project members
    pm_records = list(db.project_members.find({
        "project_id": {"$in": [p_id, p_id_str]}
    }))
    pm_uids = [pm.get("user_id") for pm in pm_records if pm.get("user_id")]

    # Fetch user docs for project members
    pm_users = []
    if pm_uids:
        pm_users = list(db.users.find({
            "$or": [{"_id": {"$in": pm_uids}}, {"_id": {"$in": [str(uid) for uid in pm_uids]}}]
        }))

    # Filter out inactive users (Scenario E)
    active_pm_users = [
        u for u in pm_users
        if is_user_active(u)
    ]

    # Non-manager members of the project
    non_manager_pm_users = [
        u for u in active_pm_users
        if str(u.get("_id")) != owner_id_str and normalize_email_str(u.get("email")) != manager_email
    ]

    # Map roles from project_members
    pm_role_map = {}
    for pm in pm_records:
        uid_key = str(pm.get("user_id"))
        if pm.get("role"):
            pm_role_map[uid_key] = pm.get("role")

    project_member_count = len(non_manager_pm_users)

    if not non_manager_pm_users:
        return {
            "source": "project",
            "projectMemberCount": 0,
            "eligibleAssignees": [],
            "recommendedAssignee": None,
            "message": "No members added to this project yet."
        }

    candidates = non_manager_pm_users
    source = "project"

    # Helper to calculate active tasks and last task timestamp
    def get_candidate_metrics(candidate_uid):
        c_obj = to_object_id(candidate_uid)
        c_str = str(candidate_uid)
        active_cnt = db.tasks.count_documents({
            "assigned_to": {"$in": [c_obj, c_str]},
            "status": {"$nin": ["done", "completed"]}
        })
        last_t = db.tasks.find_one(
            {"assigned_to": {"$in": [c_obj, c_str]}},
            sort=[("_id", DESCENDING)]
        )
        last_id = str(last_t["_id"]) if last_t else ""
        return active_cnt, last_id

    assignee_details = []
    candidate_metrics = {}

    for c in candidates:
        c_id = c["_id"]
        c_id_str = str(c_id)
        active_cnt, last_id = get_candidate_metrics(c_id)
        candidate_metrics[c_id_str] = (active_cnt, last_id)

        summary = _user_summary(c)
        if c_id_str in pm_role_map:
            summary["role"] = pm_role_map[c_id_str]
        summary["activeTaskCount"] = active_cnt
        assignee_details.append(summary)

    # Use configured assignment strategy among project members
    recommended_user = select_assignee_by_strategy(candidates, candidate_metrics, strategy=strategy)
    rec_summary = _user_summary(recommended_user)
    rec_uid_str = str(recommended_user["_id"])
    if rec_uid_str in pm_role_map:
        rec_summary["role"] = pm_role_map[rec_uid_str]
    rec_summary["activeTaskCount"] = candidate_metrics[rec_uid_str][0]

    for a in assignee_details:
        a["isRecommended"] = (a["id"] == rec_summary["id"])

    return {
        "source": source,
        "projectMemberCount": project_member_count,
        "eligibleAssignees": assignee_details,
        "recommendedAssignee": rec_summary,
        "message": ""
    }

def determine_automatic_assignee(db, project_id, owner_identifier=None, strategy=None):
    res = get_eligible_assignees_for_project(project_id, user_id=owner_identifier, user_email=owner_identifier, strategy=strategy)
    rec = res.get("recommendedAssignee")
    if rec and rec.get("id"):
        target_uid = to_object_id(rec["id"])
        target_u = db.users.find_one(_build_id_query(target_uid))
        if target_u and is_user_active(target_u):
            return target_uid

    eligible = res.get("eligibleAssignees") or []
    if not eligible:
        return None

    candidate_docs = []
    candidate_metrics = {}
    for c in eligible:
        u_id = to_object_id(c.get("id"))
        u_doc = db.users.find_one(_build_id_query(u_id))
        if u_doc and is_user_active(u_doc):
            c_str = str(u_doc["_id"])
            c_obj = u_doc["_id"]
            active_cnt = db.tasks.count_documents({
                "assigned_to": {"$in": [c_obj, c_str]},
                "status": {"$nin": ["done", "completed"]}
            })
            last_t = db.tasks.find_one(
                {"assigned_to": {"$in": [c_obj, c_str]}},
                sort=[("_id", DESCENDING)]
            )
            last_id = str(last_t["_id"]) if last_t else ""
            candidate_metrics[c_str] = (active_cnt, last_id)
            candidate_docs.append(u_doc)

    if not candidate_docs:
        return None

    sel = select_assignee_by_strategy(candidate_docs, candidate_metrics, strategy=strategy)
    return sel["_id"]

def create_task(data):
    db = get_db()
    if db is None:
        raise ConnectionFailure("MongoDB is offline")

    title = str(data.get("title") or "").strip()
    if not title:
        raise ValueError("Task title is required")

    p_id = to_object_id(data.get("projectId") or data.get("project_id"))
    if not p_id:
        raise ValueError("Project ID is required")

    proj = db.projects.find_one(_build_id_query(p_id))
    if not proj:
        raise ValueError("Project not found")

    with _assignment_lock:
        # Resolve assigned_to
        assignee_input = data.get("assignee")
        assigned_to = None

        is_explicit_unassigned = False
        if isinstance(assignee_input, dict):
            raw_id = str(assignee_input.get("id") or assignee_input.get("_id") or "").strip().lower()
            raw_name = str(assignee_input.get("name") or "").strip().lower()
            if raw_id in ["unassigned", "none", ""] or raw_name in ["unassigned", "none", ""]:
                is_explicit_unassigned = True
            elif raw_id not in ["auto"]:
                assigned_to = _resolve_user_id(db, identifier=raw_id, email=assignee_input.get("email"), name=raw_name)
            elif raw_name not in ["auto"]:
                assigned_to = _resolve_user_id(db, name=raw_name, email=assignee_input.get("email"))
        elif data.get("assigned_to") and str(data.get("assigned_to")).strip().lower() in ["unassigned", "none", ""]:
            is_explicit_unassigned = True
        elif data.get("assigned_to") and str(data.get("assigned_to")).strip().lower() not in ["auto", "unassigned", ""]:
            assigned_to = _resolve_user_id(db, identifier=data.get("assigned_to"))
        elif "assigneeName" in data and str(data.get("assigneeName") or "").strip().lower() in ["unassigned", "none", ""]:
            is_explicit_unassigned = True
        elif data.get("assigneeName") and str(data.get("assigneeName")).strip().lower() not in ["auto", "unassigned", ""]:
            assigned_to = _resolve_user_id(db, name=data.get("assigneeName"))
        elif not data.get("assignee") and "assigned_to" in data and not data.get("assigned_to"):
            is_explicit_unassigned = True

        # If an explicit assignee was given but could not be resolved in the database:
        explicit_given = False
        if isinstance(assignee_input, dict):
            raw_id = str(assignee_input.get("id") or assignee_input.get("_id") or "").lower()
            if raw_id and raw_id not in ["auto", "unassigned", "none", ""]:
                explicit_given = True
        elif data.get("assigned_to") and str(data.get("assigned_to")).lower() not in ["auto", "unassigned", "none", ""]:
            explicit_given = True

        if explicit_given and not assigned_to:
            raise ValueError("Cannot assign task to an inactive or nonexistent user.")

        # If assigned_to is still None (or was explicitly auto-assign), determine automatic fair assignee
        # ONLY IF it was NOT explicitly marked as Unassigned
        if not assigned_to and not is_explicit_unassigned:
            created_by_identifier = data.get("created_by") or data.get("createdBy") or data.get("userEmail")
            assigned_to = determine_automatic_assignee(db, p_id, owner_identifier=created_by_identifier)

        # Validate assignee is active, exists, and is a project member if assigned
        if assigned_to:
            target_u = db.users.find_one(_build_id_query(assigned_to))
            if not target_u or not is_user_active(target_u):
                raise ValueError("Cannot assign task to an inactive or nonexistent user.")
            p_id_str = str(p_id)
            existing_pm = db.project_members.find_one({
                "project_id": {"$in": [p_id, p_id_str]},
                "user_id": {"$in": [assigned_to, str(assigned_to)]}
            })
            if not existing_pm:
                raise ValueError("Cannot assign task to a user who is not a member of this project.")

        # Resolve created_by
        created_by = _resolve_user_id(db, identifier=data.get("created_by") or data.get("createdBy"), name=data.get("reporter"))
        if not created_by:
            created_by = proj.get("owner_id")

        due_date = str(data.get("dueDate") or data.get("due_date") or datetime.now(timezone.utc).strftime("%Y-%m-%d"))[:10]
        task_status = str(data.get("status") or "todo").strip()
        priority = str(data.get("priority") or "medium").strip()

        new_id = ObjectId()
        # MongoDB collection: tasks (Fields: _id, project_id, title, description, assigned_to, created_by, status, priority, due_date)
        task_doc = {
            "_id": new_id,
            "project_id": p_id,
            "title": title,
            "description": str(data.get("description") or "").strip(),
            "assigned_to": assigned_to,
            "created_by": created_by,
            "status": task_status,
            "priority": priority,
            "due_date": due_date
        }
        db.tasks.insert_one(task_doc)

        # Log to activities collection (Fields: _id, user_id, project_id, task_id, action, created_at)
        db.activities.insert_one({
            "_id": ObjectId(),
            "user_id": created_by,
            "project_id": p_id,
            "task_id": new_id,
            "action": f"Task '{title}' created",
            "created_at": datetime.now(timezone.utc)
        })

        return get_task_by_id(new_id)

def update_task(task_id, data):
    db = get_db()
    if db is None or not task_id:
        return None

    query = _build_id_query(task_id)
    task = db.tasks.find_one(query)
    if not task:
        return None

    t_id = task["_id"]
    p_id = task.get("project_id")
    update_fields = {}

    if "title" in data:
        update_fields["title"] = str(data["title"]).strip()
    if "description" in data:
        update_fields["description"] = str(data["description"]).strip()
    if "priority" in data:
        update_fields["priority"] = str(data["priority"]).strip()
    if "dueDate" in data or "due_date" in data:
        update_fields["due_date"] = str(data.get("dueDate") or data.get("due_date"))[:10]

    # Assignee
    if "assignee" in data:
        assignee_input = data["assignee"]
        if isinstance(assignee_input, dict):
            raw_id = str(assignee_input.get("id") or assignee_input.get("_id") or "").strip().lower()
            raw_name = str(assignee_input.get("name") or "").strip().lower()
            if raw_id in ["unassigned", "none", ""] or raw_name in ["unassigned", "none", ""]:
                update_fields["assigned_to"] = None
            else:
                update_fields["assigned_to"] = _resolve_user_id(db, identifier=assignee_input.get("id") or assignee_input.get("_id"), email=assignee_input.get("email"), name=assignee_input.get("name"))
        elif assignee_input and str(assignee_input).strip().lower() not in ["unassigned", "none", ""]:
            update_fields["assigned_to"] = _resolve_user_id(db, identifier=assignee_input)
        else:
            update_fields["assigned_to"] = None
    elif "assigned_to" in data:
        if not data["assigned_to"] or str(data["assigned_to"]).strip().lower() in ["unassigned", "none", ""]:
            update_fields["assigned_to"] = None
        else:
            update_fields["assigned_to"] = _resolve_user_id(db, identifier=data["assigned_to"])
    elif "assigneeName" in data:
        if not data["assigneeName"] or str(data["assigneeName"]).strip().lower() in ["unassigned", "none", ""]:
            update_fields["assigned_to"] = None
        else:
            update_fields["assigned_to"] = _resolve_user_id(db, name=data["assigneeName"])

    if "assigned_to" in update_fields and update_fields["assigned_to"]:
        target_u = db.users.find_one(_build_id_query(update_fields["assigned_to"]))
        if not target_u or target_u.get("is_active") is False or target_u.get("status") == "inactive":
            raise ValueError("Cannot assign task to an inactive or nonexistent user.")

        existing_pm = db.project_members.find_one({
            "project_id": {"$in": [p_id, str(p_id)]},
            "user_id": {"$in": [update_fields["assigned_to"], str(update_fields["assigned_to"])]}
        })
        if not existing_pm:
            raise ValueError("Cannot assign task to a user who is not a member of this project.")

    # Status change detection
    if "status" in data and data["status"] != task.get("status"):
        old_status = task.get("status", "todo")
        new_status = data["status"]
        update_fields["status"] = new_status

        user_name = data.get("updatedBy") or "Team Member"
        user_id = _resolve_user_id(db, name=user_name)
        db.activities.insert_one({
            "_id": ObjectId(),
            "user_id": user_id,
            "project_id": p_id,
            "task_id": t_id,
            "action": f"Status changed from {old_status} to {new_status}",
            "created_at": datetime.now(timezone.utc)
        })

    if update_fields:
        db.tasks.update_one({"_id": t_id}, {"$set": update_fields})

    return get_task_by_id(t_id)

def delete_task(task_id, user_name="Project Manager"):
    db = get_db()
    if db is None or not task_id:
        return False

    task = db.tasks.find_one(_build_id_query(task_id))
    if not task:
        return False

    t_id = task["_id"]
    p_id = task.get("project_id")
    user_id = _resolve_user_id(db, name=user_name)

    db.activities.insert_one({
        "_id": ObjectId(),
        "user_id": user_id,
        "project_id": p_id,
        "task_id": None,
        "action": f"Task '{task.get('title')}' deleted by {user_name}",
        "created_at": datetime.now(timezone.utc)
    })

    db.comments.delete_many({"$or": [{"task_id": t_id}, {"task_id": str(t_id)}]})
    db.tasks.delete_one({"_id": t_id})
    return True

def add_task_comment(task_id, comment_data):
    db = get_db()
    if db is None or not task_id:
        return None

    task = db.tasks.find_one(_build_id_query(task_id))
    if not task:
        return None

    t_id = task["_id"]
    p_id = task.get("project_id")
    text = str(comment_data.get("text") or "").strip()
    if not text:
        return None

    author_name = comment_data.get("author") or comment_data.get("user") or "Team Member"
    u_id = _resolve_user_id(db, identifier=comment_data.get("userId"), email=comment_data.get("email"), name=author_name)
    now = datetime.now(timezone.utc)

    # MongoDB collection: comments (Fields: _id, task_id, user_id, text, created_at)
    db.comments.insert_one({
        "_id": ObjectId(),
        "task_id": t_id,
        "user_id": u_id,
        "text": text,
        "created_at": now
    })

    # MongoDB collection: activities
    snippet = text if len(text) <= 35 else f"{text[:32]}..."
    db.activities.insert_one({
        "_id": ObjectId(),
        "user_id": u_id,
        "project_id": p_id,
        "task_id": t_id,
        "action": f"Added comment: \"{snippet}\"",
        "created_at": now
    })

    return get_task_by_id(t_id)

def batch_update_tasks_order(items, updated_by="Team Member"):
    db = get_db()
    if db is None or not items:
        return False

    now = datetime.now(timezone.utc)
    user_id = _resolve_user_id(db, name=updated_by)

    for it in items:
        tid = it.get("id") or it.get("_id")
        new_status = it.get("status")
        if tid and new_status:
            t = db.tasks.find_one(_build_id_query(tid))
            if t and t.get("status") != new_status:
                db.tasks.update_one({"_id": t["_id"]}, {"$set": {"status": new_status}})
                db.activities.insert_one({
                    "_id": ObjectId(),
                    "user_id": user_id,
                    "project_id": t.get("project_id"),
                    "task_id": t["_id"],
                    "action": f"Status changed from {t.get('status')} to {new_status}",
                    "created_at": now
                })
    return True

# ----------------- Activities & Audit -----------------

def record_activity(project_id, user, action, details=None, task_id=None, **kwargs):
    db = get_db()
    if db is None:
        return None

    p_id = to_object_id(project_id)
    t_id = to_object_id(task_id) if task_id else None
    u_id = _resolve_user_id(db, name=user, email=kwargs.get("user_email"))
    act_text = details or action or "Activity recorded"

    doc = {
        "_id": ObjectId(),
        "user_id": u_id,
        "project_id": p_id,
        "task_id": t_id,
        "action": act_text,
        "created_at": datetime.now(timezone.utc)
    }
    db.activities.insert_one(doc)
    return serialize_doc(doc)

def get_project_daily_activities(project_id, date_str=None, start_date=None, end_date=None, user_filter=None):
    db = get_db()
    if db is None or not project_id:
        return {"date": date_str or "", "startDate": start_date or "", "endDate": end_date or "", "activities": []}

    proj = db.projects.find_one(_build_id_query(project_id))
    p_id = proj["_id"] if proj else to_object_id(project_id)

    acts_cur = db.activities.find({"$or": [{"project_id": p_id}, {"project_id": str(p_id)}]}).sort("created_at", DESCENDING)

    res_acts = []
    for a in acts_cur:
        u_doc = db.users.find_one(_build_id_query(a.get("user_id"))) if a.get("user_id") else None
        u_summary = _user_summary(u_doc)

        if user_filter and user_filter.lower() not in u_summary["name"].lower() and user_filter.lower() not in u_summary["email"].lower():
            continue

        t_doc = db.tasks.find_one(_build_id_query(a.get("task_id"))) if a.get("task_id") else None
        ts = a.get("created_at")
        ts_str = ts.isoformat() if isinstance(ts, datetime) else str(ts or "")
        day_str = ts_str[:10]

        if start_date and day_str < start_date[:10]:
            continue
        if end_date and day_str > end_date[:10]:
            continue
        if date_str and day_str != date_str[:10]:
            continue

        res_acts.append({
            "id": str(a["_id"]),
            "user": u_summary["name"],
            "userEmail": u_summary["email"],
            "avatar": u_summary["avatar"],
            "color": u_summary["color"],
            "taskTitle": t_doc.get("title") if t_doc else "",
            "taskId": str(t_doc["_id"]) if t_doc else "",
            "action": a.get("action") or "",
            "details": a.get("action") or "",
            "timestamp": ts_str,
            "created_at": ts_str
        })

    eff_start = start_date or date_str or (res_acts[0]["timestamp"][:10] if res_acts else "")
    eff_end = end_date or date_str or (res_acts[0]["timestamp"][:10] if res_acts else "")

    return {
        "date": date_str or eff_start,
        "startDate": eff_start,
        "endDate": eff_end,
        "activities": res_acts
    }

# ----------------- Team Members -----------------

def list_team_members(owner=None):
    db = get_db()
    if db is None:
        return []

    owner_uid = _resolve_user_id(db, identifier=owner, email=owner) if owner else None
    owner_uid_str = str(owner_uid) if owner_uid else ""

    # 1. If owner is given, find project members across projects owned or managed by this user
    member_uids = []
    member_roles = {}
    if owner_uid:
        owner_u = db.users.find_one(_build_id_query(owner_uid))
        owner_email = normalize_email_str(owner_u.get("email") if owner_u else owner)

        owner_queries = [
            {"owner_id": owner_uid},
            {"owner_id": owner_uid_str}
        ]
        if owner_email:
            owner_queries.append({"managerEmail": owner_email})
            owner_queries.append({"createdBy": owner_uid_str})
            owner_queries.append({"createdBy": owner_uid})

        owned_projects = list(db.projects.find({"$or": owner_queries}))
        proj_ids = []
        for p in owned_projects:
            pid = p.get("_id")
            if pid:
                proj_ids.append(pid)
                proj_ids.append(str(pid))

        if proj_ids:
            pm_records = list(db.project_members.find({"project_id": {"$in": proj_ids}}))
            for pm in pm_records:
                uid = pm.get("user_id")
                if not uid:
                    continue
                uid_str = str(uid)
                if uid_str == owner_uid_str:
                    continue
                u_obj = to_object_id(uid)
                if u_obj:
                    member_uids.append(u_obj)
                member_uids.append(uid_str)
                if pm.get("role"):
                    member_roles[uid_str] = pm.get("role")

    if member_uids:
        users = list(db.users.find({"_id": {"$in": member_uids}}).sort("first_name", ASCENDING))
        res = []
        seen = set()
        for u in users:
            uid_str = str(u["_id"])
            if uid_str in seen or uid_str == owner_uid_str:
                continue
            if not is_user_active(u):
                continue
            seen.add(uid_str)
            summary = _user_summary(u)
            if uid_str in member_roles and member_roles[uid_str]:
                summary["role"] = member_roles[uid_str]
            res.append(summary)
        if res:
            return res

    # 2. Fallback: Return global registered active users (excluding the owner/manager)
    query = {
        "is_active": {"$ne": False},
        "status": {"$nin": ["inactive", "disabled", "deactivated"]}
    }
    if owner_uid:
        query["_id"] = {"$nin": [owner_uid, owner_uid_str]}

    users = list(db.users.find(query).sort("first_name", ASCENDING))
    res = []
    seen = set()
    for u in users:
        uid_str = str(u["_id"])
        if uid_str in seen or uid_str == owner_uid_str:
            continue
        if not is_user_active(u):
            continue
        seen.add(uid_str)
        res.append(_user_summary(u))

    return res

def add_team_member_by_query(query_str, owner=None, owner_email=None, owner_id=None):
    db = get_db()
    if db is None:
        raise ConnectionFailure("MongoDB is offline")

    q = str(query_str).strip()
    target_uid = _resolve_user_id(db, identifier=q, email=q, name=q)
    if not target_uid:
        raise ValueError(f"No user found matching '{query_str}'. They must register first.")

    target_u = db.users.find_one(_build_id_query(target_uid))
    if not target_u:
        raise ValueError(f"No user found matching '{query_str}'.")

    target_summary = _user_summary(target_u)
    owner_key = owner_id or owner_email or owner
    owner_uid = _resolve_user_id(db, identifier=owner_key, email=owner_key) if owner_key else None

    if owner_uid and str(owner_uid) == str(target_uid):
        raise ValueError("You cannot add yourself to your own team.")

    if owner_uid:
        now = datetime.now(timezone.utc)
        proj = db.projects.find_one({
            "$or": [
                {"owner_id": owner_uid},
                {"owner_id": str(owner_uid)}
            ]
        })
        if not proj:
            owner_u = db.users.find_one(_build_id_query(owner_uid))
            s_name = f"{owner_u.get('first_name', '')} {owner_u.get('last_name', '')}".strip() if owner_u else "Workspace"
            new_pid = ObjectId()
            proj = {
                "_id": new_pid,
                "name": f"{s_name}'s Workspace",
                "description": "Default workspace project",
                "owner_id": owner_uid,
                "status": "In Progress",
                "start_date": now.strftime("%Y-%m-%d"),
                "due_date": now.strftime("%Y-%m-%d"),
                "created_at": now
            }
            db.projects.insert_one(proj)
            db.project_members.insert_one({
                "_id": ObjectId(),
                "project_id": new_pid,
                "user_id": owner_uid,
                "role": "Project Manager",
                "joined_at": now
            })

        p_ids = [proj["_id"], str(proj["_id"])]
        u_ids = [target_uid, str(target_uid)]
        existing_pm = db.project_members.find_one({
            "project_id": {"$in": p_ids},
            "user_id": {"$in": u_ids}
        })
        if not existing_pm:
            db.project_members.insert_one({
                "_id": ObjectId(),
                "project_id": proj["_id"],
                "user_id": target_uid,
                "role": target_u.get("role") or "Team Member",
                "joined_at": now
            })

        # Activity log
        db.activities.insert_one({
            "_id": ObjectId(),
            "user_id": owner_uid,
            "project_id": proj["_id"],
            "task_id": None,
            "action": f"Added {target_summary['name']} to team",
            "created_at": now
        })

    return target_summary

def delete_team_member(member_id, owner=None):
    db = get_db()
    if db is None:
        return False

    target_uid = _resolve_user_id(db, identifier=member_id, email=member_id)
    if not target_uid:
        target_uid = to_object_id(member_id)
    if not target_uid:
        return False

    owner_uid = _resolve_user_id(db, identifier=owner, email=owner) if owner else None

    if owner_uid:
        owned_projects = list(db.projects.find({
            "$or": [
                {"owner_id": owner_uid},
                {"owner_id": str(owner_uid)}
            ]
        }, {"_id": 1}))
        proj_ids = [p["_id"] for p in owned_projects] + [str(p["_id"]) for p in owned_projects]

        db.project_members.delete_many({
            "project_id": {"$in": proj_ids},
            "$or": [
                {"user_id": target_uid},
                {"user_id": str(target_uid)}
            ]
        })
    else:
        db.project_members.delete_many({
            "$or": [
                {"user_id": target_uid},
                {"user_id": str(target_uid)}
            ]
        })

    return True

# ----------------- Analytics -----------------

def get_project_analytics(project_id=None):
    db = get_db()
    if db is None:
        return {}

    q = {}
    if project_id:
        p_obj = to_object_id(project_id)
        q = {"$or": [{"project_id": p_obj}, {"project_id": str(project_id)}]}

    tasks = list(db.tasks.find(q))
    total = len(tasks)
    by_status = {"todo": 0, "in_progress": 0, "review": 0, "done": 0}
    by_priority = {"low": 0, "medium": 0, "high": 0, "urgent": 0}

    for t in tasks:
        s = t.get("status", "todo")
        by_status[s] = by_status.get(s, 0) + 1
        p = t.get("priority", "medium")
        by_priority[p] = by_priority.get(p, 0) + 1

    done_count = by_status.get("done", 0)
    completion_rate = round((done_count / total * 100), 1) if total > 0 else 0

    return {
        "totalTasks": total,
        "completedTasks": done_count,
        "completionRate": completion_rate,
        "byStatus": by_status,
        "byPriority": by_priority
    }

# ----------------- Users & Authentication -----------------

def register_user(data):
    db = get_db()
    if db is None:
        raise ConnectionFailure("MongoDB is offline")

    first_name = str(data.get("firstName") or data.get("first_name") or "").strip()
    last_name = str(data.get("lastName") or data.get("last_name") or "").strip()
    email = normalize_email_str(data.get("email"))
    password = str(data.get("password") or "").strip()
    role = str(data.get("role") or "Project Manager").strip()

    if not first_name or not last_name or not email or not password:
        raise ValueError("First name, last name, email, and password are all required")

    existing = db.users.find_one({"email": email})
    if existing:
        raise ValueError("User with this email already exists. Please login.")

    now = datetime.now(timezone.utc)
    hashed_pwd = make_password(password)

    # MongoDB collection: users (Fields: _id, first_name, last_name, email, password_hash, role, created_at)
    user_doc = {
        "_id": ObjectId(),
        "first_name": first_name,
        "last_name": last_name,
        "email": email,
        "password_hash": hashed_pwd,
        "role": role,
        "created_at": now
    }
    db.users.insert_one(user_doc)
    return _user_summary(user_doc)

def authenticate_user(email_or_identifier, password):
    db = get_db()
    if db is None or not email_or_identifier or not password:
        return None

    query_str = normalize_email_str(email_or_identifier)
    u = db.users.find_one({"email": query_str})
    if not u:
        u = db.users.find_one(_build_id_query(email_or_identifier))
    if not u:
        return None

    pwd_hash = u.get("password_hash") or u.get("password")
    if pwd_hash and check_password(password, pwd_hash):
        return _user_summary(u)
    return None

def find_user_doc(identifier):
    db = get_db()
    if db is None or not identifier:
        return None
    norm = normalize_email_str(identifier)
    u = db.users.find_one({"email": norm})
    if not u:
        u = db.users.find_one(_build_id_query(identifier))
    return u

def get_user_profile(identifier):
    db = get_db()
    if db is None or not identifier:
        return None
    u = find_user_doc(identifier)
    if not u:
        return None

    res = _user_summary(u)
    res["createdAt"] = u.get("created_at").isoformat() if isinstance(u.get("created_at"), datetime) else str(u.get("created_at") or "")
    return res

def update_user_profile(identifier, data):
    db = get_db()
    if db is None or not identifier:
        return None
    u = find_user_doc(identifier)
    if not u:
        return None

    updates = {}
    if "firstName" in data or "first_name" in data:
        updates["first_name"] = str(data.get("firstName") or data.get("first_name")).strip()
    if "lastName" in data or "last_name" in data:
        updates["last_name"] = str(data.get("lastName") or data.get("last_name")).strip()
    if "role" in data:
        updates["role"] = str(data.get("role")).strip()
    if "email" in data:
        updates["email"] = normalize_email_str(data.get("email"))

    if updates:
        db.users.update_one({"_id": u["_id"]}, {"$set": updates})
        u = db.users.find_one({"_id": u["_id"]})

    return _user_summary(u)

def change_user_password(identifier, current_password, new_password):
    db = get_db()
    if db is None or not identifier:
        raise ValueError("User not found")
    u = find_user_doc(identifier)
    if not u:
        raise ValueError("User not found")

    pwd_hash = u.get("password_hash") or u.get("password")
    if not pwd_hash or not check_password(current_password, pwd_hash):
        raise ValueError("Current password is incorrect")

    db.users.update_one(
        {"_id": u["_id"]},
        {"$set": {"password_hash": make_password(new_password)}}
    )
    return {"success": True, "message": "Password changed successfully"}

# ----------------- Notifications -----------------

def create_notification(data_or_recipient_id, message=None):
    db = get_db()
    if db is None:
        return None

    if isinstance(data_or_recipient_id, dict):
        recip_id = _resolve_user_id(db, identifier=data_or_recipient_id.get("recipient_id") or data_or_recipient_id.get("recipientId"), email=data_or_recipient_id.get("recipientEmail"))
        msg = data_or_recipient_id.get("message") or "Notification"
    else:
        recip_id = to_object_id(data_or_recipient_id)
        msg = message or "Notification"

    now = datetime.now(timezone.utc)
    # MongoDB collection: notifications (Fields: _id, recipient_id, message, is_read, created_at)
    doc = {
        "_id": ObjectId(),
        "recipient_id": recip_id,
        "message": msg,
        "is_read": False,
        "created_at": now
    }
    db.notifications.insert_one(doc)
    return serialize_doc(doc)

def list_notifications(user_email):
    db = get_db()
    if db is None or not user_email:
        return []

    u_id = _resolve_user_id(db, email=user_email)
    if not u_id:
        return []

    cur = db.notifications.find({"$or": [{"recipient_id": u_id}, {"recipient_id": str(u_id)}]}).sort("created_at", DESCENDING)
    results = []
    for n in cur:
        ts = n.get("created_at")
        ts_str = ts.isoformat() if isinstance(ts, datetime) else str(ts or "")
        results.append({
            "id": str(n["_id"]),
            "_id": str(n["_id"]),
            "recipient_id": str(n.get("recipient_id")),
            "recipientId": str(n.get("recipient_id")),
            "title": "Notification",
            "message": n.get("message") or "",
            "is_read": bool(n.get("is_read")),
            "isRead": bool(n.get("is_read")),
            "created_at": ts_str,
            "createdAt": ts_str
        })
    return results

def mark_notification_read(notification_id=None, user_email=None, mark_all=False):
    db = get_db()
    if db is None:
        return {"success": False}

    if mark_all and user_email:
        u_id = _resolve_user_id(db, email=user_email)
        if u_id:
            db.notifications.update_many(
                {"$or": [{"recipient_id": u_id}, {"recipient_id": str(u_id)}]},
                {"$set": {"is_read": True}}
            )
            return {"success": True, "markedAll": True}

    if notification_id:
        db.notifications.update_one(_build_id_query(notification_id), {"$set": {"is_read": True}})
        return {"success": True, "id": str(notification_id)}

    return {"success": True}

def send_team_request(sender_email, query_str, sender_id=None, sender_name=None):
    db = get_db()
    if db is None:
        raise ConnectionFailure("MongoDB is offline")

    recipient_uid = _resolve_user_id(db, email=query_str, identifier=query_str, name=query_str)
    if not recipient_uid:
        raise ValueError(f"No user found matching '{query_str}'. They must register first.")

    target_u = db.users.find_one(_build_id_query(recipient_uid))
    if not target_u:
        raise ValueError(f"No user found matching '{query_str}'.")

    target_summary = _user_summary(target_u)
    sender_uid = _resolve_user_id(db, email=sender_email, identifier=sender_id)
    sender_u = db.users.find_one(_build_id_query(sender_uid)) if sender_uid else None
    s_name = sender_name or (_user_summary(sender_u)["name"] if sender_u else sender_email or "Team Manager")

    if sender_uid and str(sender_uid) == str(recipient_uid):
        raise ValueError("You cannot add yourself to your own team.")

    now = datetime.now(timezone.utc)
    proj = None
    if sender_uid:
        proj = db.projects.find_one({
            "$or": [
                {"owner_id": sender_uid},
                {"owner_id": str(sender_uid)}
            ]
        })
        if not proj:
            new_pid = ObjectId()
            proj = {
                "_id": new_pid,
                "name": f"{s_name}'s Workspace",
                "description": "Default workspace project",
                "owner_id": sender_uid,
                "status": "In Progress",
                "start_date": now.strftime("%Y-%m-%d"),
                "due_date": now.strftime("%Y-%m-%d"),
                "created_at": now
            }
            db.projects.insert_one(proj)
            db.project_members.insert_one({
                "_id": ObjectId(),
                "project_id": new_pid,
                "user_id": sender_uid,
                "role": "Project Manager",
                "joined_at": now
            })

    if proj:
        p_ids = [proj["_id"], str(proj["_id"])]
        u_ids = [recipient_uid, str(recipient_uid)]
        existing_pm = db.project_members.find_one({
            "project_id": {"$in": p_ids},
            "user_id": {"$in": u_ids}
        })
        if not existing_pm:
            db.project_members.insert_one({
                "_id": ObjectId(),
                "project_id": proj["_id"],
                "user_id": recipient_uid,
                "role": target_u.get("role") or "Team Member",
                "joined_at": now
            })

    proj_name = proj.get("name") if proj else "the team"
    msg = f"{s_name} ({sender_email}) added you to their team ({proj_name})."
    notif_doc = {
        "_id": ObjectId(),
        "recipient_id": recipient_uid,
        "message": msg,
        "is_read": False,
        "created_at": now
    }
    db.notifications.insert_one(notif_doc)

    if sender_uid and proj:
        db.activities.insert_one({
            "_id": ObjectId(),
            "user_id": sender_uid,
            "project_id": proj["_id"],
            "task_id": None,
            "action": f"Invited and added {target_summary['name']} to the team",
            "created_at": now
        })

    return {
        **serialize_doc(notif_doc),
        "targetUser": target_summary,
        "message": f"Successfully added {target_summary['name']} to your team."
    }

def respond_team_request(notification_id, action, user_email=None, user_id=None):
    db = get_db()
    if db is None or not notification_id:
        return {"success": False}

    db.notifications.update_one(
        _build_id_query(notification_id),
        {"$set": {"is_read": True}}
    )
    return {"success": True, "action": action}
