import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'taskflow_backend.settings')
import django
django.setup()

from tasks import mongo

db = mongo.get_db()

def fix_email(e):
    if not e or not isinstance(e, str):
        return e
    e = e.strip().lower()
    if '@' not in e and '.' in e:
        # e.g. "darshan.gmail.com" -> "darshan@gmail.com"
        parts = e.split('.')
        if len(parts) >= 2:
            return parts[0] + '@' + '.'.join(parts[1:])
    return e

if db is not None:
    for u in db.users.find():
        old_e = u.get('email', '')
        new_e = fix_email(old_e)
        if new_e != old_e:
            db.users.update_one({'_id': u['_id']}, {'$set': {'email': new_e}})
            print(f"Updated user {u.get('name')}: {old_e} -> {new_e}")

    for p in db.projects.find():
        updates = {}
        old_mgr_e = p.get('managerEmail', '')
        new_mgr_e = fix_email(old_mgr_e)
        if new_mgr_e != old_mgr_e:
            updates['managerEmail'] = new_mgr_e

        members = p.get('teamMembers', [])
        members_changed = False
        for m in members:
            old_me = m.get('email', '')
            new_me = fix_email(old_me)
            if new_me != old_me:
                m['email'] = new_me
                members_changed = True
        
        if members_changed:
            updates['teamMembers'] = members

        if updates:
            db.projects.update_one({'_id': p['_id']}, {'$set': updates})
            print(f"Updated project {p.get('title')}: {updates}")

    print("MongoDB email normalization complete.")
