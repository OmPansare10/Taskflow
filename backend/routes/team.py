from fastapi import APIRouter, Depends, HTTPException
from bson import ObjectId
from database import db
from dependencies import get_current_user

router = APIRouter(
    prefix="/team",
    tags=["Team"]
)


@router.get("/members")
def get_team_members(current_user=Depends(get_current_user)):
    """Get all members belonging to the current user's team."""
    current_user_id = str(current_user["_id"])
    team_member_ids = set(current_user.get("team_members", []))

    # Also include any members from projects owned by current user
    owned_projects = list(db.projects.find({"owner_id": current_user_id}))
    for p in owned_projects:
        for m in p.get("members", []):
            team_member_ids.add(str(m))

    valid_ids = [ObjectId(m_id) for m_id in team_member_ids if ObjectId.is_valid(m_id)]
    email_ids = [m_id for m_id in team_member_ids if not ObjectId.is_valid(m_id)]

    query_parts = []
    if valid_ids:
        query_parts.append({"_id": {"$in": valid_ids}})
    if email_ids:
        query_parts.append({"email": {"$in": email_ids}})

    if query_parts:
        team_users = list(db.users.find({"$or": query_parts}))
    else:
        team_users = []

    # Get all projects accessible to current user to compute task and project counts
    user_projects = list(db.projects.find({
        "$or": [
            {"owner_id": current_user_id},
            {"members": current_user_id}
        ]
    }))
    project_ids = [str(p["_id"]) for p in user_projects]
    tasks = list(db.tasks.find({"project_id": {"$in": project_ids}}))

    results = []
    for u in team_users:
        u_id = str(u["_id"])
        member_tasks = [t for t in tasks if str(t.get("assigned_to", "")) == u_id]
        member_projects = [p for p in user_projects if u_id in p.get("members", [])]
        results.append({
            "id": u_id,
            "_id": u_id,
            "name": u.get("name", "User"),
            "email": u.get("email", ""),
            "employee_id": u.get("employee_id", ""),
            "role": u.get("role", "Developer"),
            "custom_role": u.get("custom_role", ""),
            "avatar": u.get("avatar", u.get("name", "U")[0].upper() if u.get("name") else "U"),
            "tasks": len(member_tasks),
            "projects": len(member_projects),
            "projectIds": [str(p["_id"]) for p in member_projects],
            "manageableProjectIds": [str(p["_id"]) for p in member_projects if str(p.get("owner_id")) == current_user_id]
        })

    # Sort by task count descending
    results.sort(key=lambda m: m["tasks"], reverse=True)
    return results


@router.post("/members")
def add_team_member(body: dict, current_user=Depends(get_current_user)):
    """Add a registered user to the current user's team (NOT to any project)."""
    user_id = str(body.get("user_id", "")).strip()
    if not user_id:
        raise HTTPException(status_code=400, detail="User ID is required")

    current_user_id = str(current_user["_id"])
    if user_id == current_user_id:
        raise HTTPException(status_code=400, detail="You cannot add yourself to your team")

    # Resolve target user
    if ObjectId.is_valid(user_id):
        target_user = db.users.find_one({"_id": ObjectId(user_id)})
    else:
        target_user = db.users.find_one({
            "$or": [
                {"email": user_id},
                {"employee_id": user_id}
            ]
        })

    if not target_user:
        raise HTTPException(status_code=404, detail="No registered account found.")

    resolved_id = str(target_user["_id"])
    if resolved_id == current_user_id:
        raise HTTPException(status_code=400, detail="You cannot add yourself to your team")

    current_team = current_user.get("team_members", [])
    if resolved_id in current_team:
        raise HTTPException(status_code=400, detail="User is already in your team")

    db.users.update_one(
        {"_id": current_user["_id"]},
        {"$addToSet": {"team_members": resolved_id}}
    )

    return {
        "message": "Member added to team successfully",
        "user": {
            "id": resolved_id,
            "name": target_user.get("name", "User"),
            "email": target_user.get("email", ""),
            "avatar": target_user.get("avatar", target_user.get("name", "U")[0].upper() if target_user.get("name") else "U"),
            "role": target_user.get("role", "Developer"),
            "custom_role": target_user.get("custom_role", "")
        }
    }


@router.delete("/members/{member_id}")
def remove_team_member(member_id: str, current_user=Depends(get_current_user)):
    """Remove a member from the user's team and from any projects owned by current user."""
    current_user_id = str(current_user["_id"])

    possible_ids = [member_id]
    if ObjectId.is_valid(member_id):
        u = db.users.find_one({"_id": ObjectId(member_id)})
        if u:
            possible_ids.append(str(u["_id"]))
            if u.get("email"):
                possible_ids.append(u["email"])
    else:
        u = db.users.find_one({"email": member_id})
        if u:
            possible_ids.append(str(u["_id"]))
            possible_ids.append(u["email"])

    db.users.update_one(
        {"_id": current_user["_id"]},
        {"$pull": {"team_members": {"$in": possible_ids}}}
    )

    # Also remove from any projects owned by current_user
    db.projects.update_many(
        {"owner_id": current_user_id},
        {"$pull": {"members": {"$in": possible_ids}}}
    )

    return {
        "message": "Member removed from team successfully"
    }
