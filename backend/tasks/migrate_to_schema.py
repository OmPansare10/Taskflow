import os
import sys
import django
from datetime import datetime, timezone
from bson import ObjectId
from pymongo import MongoClient

# Setup Django environment for hashers
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'taskflow_backend.settings')
django.setup()

from django.contrib.auth.hashers import make_password

def to_object_id(val):
    if not val:
        return ObjectId()
    if isinstance(val, ObjectId):
        return val
    s = str(val).strip()
    if ObjectId.is_valid(s):
        return ObjectId(s)
    # If not 24-char hex, generate deterministic or new ObjectId
    return ObjectId()

def parse_iso(dt):
    if isinstance(dt, datetime):
        return dt
    if isinstance(dt, str):
        try:
            return datetime.fromisoformat(dt.replace('Z', '+00:00'))
        except Exception:
            pass
    return datetime.now(timezone.utc)

def run_migration():
    client = MongoClient('mongodb://localhost:27017')
    db = client['taskflow_db']
    print("Connected to MongoDB taskflow_db")

    # 1. Fetch existing users
    old_users = list(db.users.find())
    print(f"Found {len(old_users)} existing users in Mongo.")

    users_by_email = {}
    users_by_id_str = {}
    users_by_name = {}

    migrated_users = []
    for u in old_users:
        u_id = to_object_id(u.get('_id'))
        first_name = u.get('first_name') or u.get('firstName') or ''
        last_name = u.get('last_name') or u.get('lastName') or ''
        name = u.get('name') or ''
        if not first_name and name:
            parts = name.split()
            first_name = parts[0]
            last_name = " ".join(parts[1:]) if len(parts) > 1 else ''
        if not first_name:
            first_name = 'User'

        email = (u.get('email') or '').strip().lower()
        pwd_hash = u.get('password_hash') or u.get('password') or make_password('Password123!')
        role = u.get('role') or 'Project Manager'
        created_at = parse_iso(u.get('created_at') or u.get('createdAt'))

        user_doc = {
            '_id': u_id,
            'first_name': first_name,
            'last_name': last_name,
            'email': email,
            'password_hash': pwd_hash,
            'role': role,
            'created_at': created_at
        }
        migrated_users.append(user_doc)
        if email:
            users_by_email[email] = user_doc
        users_by_id_str[str(u.get('_id'))] = user_doc
        users_by_id_str[str(u_id)] = user_doc
        if name:
            users_by_name[name.lower()] = user_doc
        if first_name and last_name:
            users_by_name[f"{first_name} {last_name}".lower()] = user_doc

    def resolve_user_id(candidate_id=None, candidate_email=None, candidate_name=None):
        if candidate_email and candidate_email.lower() in users_by_email:
            return users_by_email[candidate_email.lower()]['_id']
        if candidate_id and str(candidate_id) in users_by_id_str:
            return users_by_id_str[str(candidate_id)]['_id']
        if candidate_name and candidate_name.lower() in users_by_name:
            return users_by_name[candidate_name.lower()]['_id']
        # Default fallback to first user if available
        if migrated_users:
            return migrated_users[0]['_id']
        return ObjectId()

    # 2. Fetch existing projects & team members
    old_projects = list(db.projects.find())
    print(f"Found {len(old_projects)} existing projects in Mongo.")

    migrated_projects = []
    migrated_members = []
    projects_by_id_str = {}

    for p in old_projects:
        p_id = to_object_id(p.get('_id'))
        name = p.get('name') or p.get('title') or 'Untitled Project'
        description = p.get('description') or ''
        owner_id = resolve_user_id(
            candidate_id=p.get('createdBy') or p.get('owner_id'),
            candidate_email=p.get('managerEmail'),
            candidate_name=p.get('manager')
        )
        status = p.get('status') or 'active'
        start_date = p.get('start_date') or p.get('startDate') or '2026-10-01'
        due_date = p.get('due_date') or p.get('dueDate') or '2026-12-31'
        created_at = parse_iso(p.get('created_at') or p.get('createdAt'))

        proj_doc = {
            '_id': p_id,
            'name': name,
            'description': description,
            'owner_id': owner_id,
            'status': status,
            'start_date': str(start_date)[:10],
            'due_date': str(due_date)[:10],
            'created_at': created_at
        }
        migrated_projects.append(proj_doc)
        projects_by_id_str[str(p.get('_id'))] = proj_doc
        projects_by_id_str[str(p_id)] = proj_doc

        # Extract project members
        existing_uids = set()
        # Owner is a member
        migrated_members.append({
            '_id': ObjectId(),
            'project_id': p_id,
            'user_id': owner_id,
            'role': 'Project Manager',
            'joined_at': created_at
        })
        existing_uids.add(str(owner_id))

        team_members_list = p.get('teamMembers', [])
        for tm in team_members_list:
            if isinstance(tm, dict):
                m_uid = resolve_user_id(
                    candidate_id=tm.get('id') or tm.get('_id'),
                    candidate_email=tm.get('email'),
                    candidate_name=tm.get('name')
                )
                if str(m_uid) not in existing_uids:
                    migrated_members.append({
                        '_id': ObjectId(),
                        'project_id': p_id,
                        'user_id': m_uid,
                        'role': tm.get('role') or 'Team Member',
                        'joined_at': created_at
                    })
                    existing_uids.add(str(m_uid))

    # 3. Fetch existing tasks, comments, and activities
    old_tasks = list(db.tasks.find())
    print(f"Found {len(old_tasks)} existing tasks in Mongo.")

    migrated_tasks = []
    migrated_comments = []
    migrated_activities = []
    tasks_by_id_str = {}

    for t in old_tasks:
        t_id = to_object_id(t.get('_id'))
        old_pid = str(t.get('projectId') or t.get('project_id') or '')
        proj_doc = projects_by_id_str.get(old_pid)
        p_id = proj_doc['_id'] if proj_doc else to_object_id(old_pid)

        title = t.get('title') or 'Untitled Task'
        description = t.get('description') or ''

        assignee = t.get('assignee') or {}
        if isinstance(assignee, dict):
            assigned_to = resolve_user_id(
                candidate_id=assignee.get('id') or assignee.get('_id'),
                candidate_email=assignee.get('email'),
                candidate_name=assignee.get('name')
            )
        else:
            assigned_to = resolve_user_id(candidate_id=t.get('assigned_to'))

        created_by = resolve_user_id(
            candidate_id=t.get('created_by'),
            candidate_name=t.get('reporter')
        )
        task_status = t.get('status') or 'todo'
        priority = t.get('priority') or 'medium'
        due_date = str(t.get('due_date') or t.get('dueDate') or '2026-10-31')[:10]

        task_doc = {
            '_id': t_id,
            'project_id': p_id,
            'title': title,
            'description': description,
            'assigned_to': assigned_to,
            'created_by': created_by,
            'status': task_status,
            'priority': priority,
            'due_date': due_date
        }
        migrated_tasks.append(task_doc)
        tasks_by_id_str[str(t.get('_id'))] = task_doc
        tasks_by_id_str[str(t_id)] = task_doc

        # Extract embedded comments
        for c in t.get('comments', []):
            if isinstance(c, dict):
                c_uid = resolve_user_id(candidate_name=c.get('author'), candidate_id=c.get('userId') or c.get('user_id'))
                c_time = parse_iso(c.get('timestamp') or c.get('created_at'))
                migrated_comments.append({
                    '_id': ObjectId(),
                    'task_id': t_id,
                    'user_id': c_uid,
                    'text': c.get('text') or '',
                    'created_at': c_time
                })

        # Extract embedded activityLog
        for a in t.get('activityLog', []):
            if isinstance(a, dict):
                a_uid = resolve_user_id(candidate_name=a.get('user'), candidate_id=a.get('userId') or a.get('user_id'))
                a_time = parse_iso(a.get('timestamp') or a.get('created_at'))
                action_text = a.get('details') or a.get('action') or 'Task activity'
                migrated_activities.append({
                    '_id': ObjectId(),
                    'user_id': a_uid,
                    'project_id': p_id,
                    'task_id': t_id,
                    'action': action_text,
                    'created_at': a_time
                })

    # 4. Fetch existing activities collection
    old_activities = list(db.activities.find())
    for a in old_activities:
        a_uid = resolve_user_id(candidate_id=a.get('user_id') or a.get('userId'), candidate_email=a.get('userEmail'), candidate_name=a.get('user'))
        old_pid = str(a.get('projectId') or a.get('project_id') or '')
        proj = projects_by_id_str.get(old_pid)
        p_id = proj['_id'] if proj else to_object_id(old_pid)

        old_tid = str(a.get('taskId') or a.get('task_id') or '')
        task = tasks_by_id_str.get(old_tid)
        t_id = task['_id'] if task else (to_object_id(old_tid) if old_tid else None)

        action_text = a.get('details') or a.get('action') or 'Activity'
        a_time = parse_iso(a.get('timestamp') or a.get('created_at'))

        migrated_activities.append({
            '_id': ObjectId(),
            'user_id': a_uid,
            'project_id': p_id,
            'task_id': t_id,
            'action': action_text,
            'created_at': a_time
        })

    # 5. Fetch existing notifications
    old_notifications = list(db.notifications.find())
    migrated_notifications = []
    for n in old_notifications:
        r_uid = resolve_user_id(
            candidate_id=n.get('recipient_id') or n.get('recipientId'),
            candidate_email=n.get('recipientEmail')
        )
        msg = n.get('message') or n.get('title') or 'New Notification'
        is_read = bool(n.get('is_read') if 'is_read' in n else n.get('isRead', False))
        n_time = parse_iso(n.get('created_at') or n.get('createdAt'))
        migrated_notifications.append({
            '_id': ObjectId(),
            'recipient_id': r_uid,
            'message': msg,
            'is_read': is_read,
            'created_at': n_time
        })

    print("\n--- Summary of Migrated Data ---")
    print(f"Users: {len(migrated_users)}")
    print(f"Projects: {len(migrated_projects)}")
    print(f"Tasks: {len(migrated_tasks)}")
    print(f"Project Members: {len(migrated_members)}")
    print(f"Comments: {len(migrated_comments)}")
    print(f"Activities: {len(migrated_activities)}")
    print(f"Notifications: {len(migrated_notifications)}")

    # 6. Apply migration to taskflow_db
    # Clear collections and insert new formatted schema
    for coll_name in ['users', 'projects', 'tasks', 'project_members', 'comments', 'activities', 'notifications']:
        db[coll_name].drop()

    if 'team_members' in db.list_collection_names():
        db.team_members.drop()
        print("Dropped legacy collection 'team_members'")

    if migrated_users:
        db.users.insert_many(migrated_users)
    if migrated_projects:
        db.projects.insert_many(migrated_projects)
    if migrated_tasks:
        db.tasks.insert_many(migrated_tasks)
    if migrated_members:
        db.project_members.insert_many(migrated_members)
    if migrated_comments:
        db.comments.insert_many(migrated_comments)
    if migrated_activities:
        db.activities.insert_many(migrated_activities)
    if migrated_notifications:
        db.notifications.insert_many(migrated_notifications)

    # Indexes
    db.users.create_index('email', unique=True)
    db.projects.create_index('owner_id')
    db.tasks.create_index('project_id')
    db.project_members.create_index([('project_id', 1), ('user_id', 1)], unique=True)
    db.comments.create_index('task_id')
    db.activities.create_index('project_id')
    db.notifications.create_index('recipient_id')

    print("\nAll 7 collections successfully populated with exact schema!")
    print("Collections in taskflow_db now:", db.list_collection_names())

if __name__ == '__main__':
    run_migration()
