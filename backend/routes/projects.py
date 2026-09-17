from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from datetime import datetime, timezone
from bson import ObjectId
import re

from database import db
from dependencies import get_current_user


router = APIRouter(
    prefix="/projects",
    tags=["Projects"]
)


# =========================================================
# REQUEST MODELS
# =========================================================

class ProjectCreate(BaseModel):
    name: str
    description: str = ""


class ProjectUpdate(BaseModel):
    name: str
    description: str = ""


class AddMemberRequest(BaseModel):
    user_id: str


# =========================================================
# CREATE PROJECT
# =========================================================

@router.post("/")
def create_project(
    project: ProjectCreate,
    current_user=Depends(get_current_user)
):

    new_project = {
        "name": project.name,
        "description": project.description,
        "owner_id": str(current_user["_id"]),
        "members": [],
        "created_at": datetime.now(timezone.utc)
    }

    result = db.projects.insert_one(new_project)

    return {
        "message": "Project created successfully",
        "project_id": str(result.inserted_id),
        "name": project.name,
        "description": project.description
    }


# =========================================================
# GET ALL PROJECTS
# =========================================================

@router.get("/")
def get_projects(
    current_user=Depends(get_current_user)
):

    user_id = str(current_user["_id"])

    projects = list(
        db.projects.find({
            "$or": [
                {"owner_id": user_id},
                {"members": user_id}
            ]
        })
    )

    for project in projects:
        project["_id"] = str(project["_id"])

    return {
        "projects": projects
    }


# =========================================================
# GET ONE PROJECT
# =========================================================

@router.get("/{project_id}")
def get_project(
    project_id: str,
    current_user=Depends(get_current_user)
):

    # Validate project ID
    if not ObjectId.is_valid(project_id):
        raise HTTPException(
            status_code=400,
            detail="Invalid project ID"
        )

    user_id = str(current_user["_id"])

    # Find project user owns or is a member of
    project = db.projects.find_one({
        "_id": ObjectId(project_id),
        "$or": [
            {"owner_id": user_id},
            {"members": user_id}
        ]
    })

    if not project:
        raise HTTPException(
            status_code=404,
            detail="Project not found or you do not have access"
        )

    project["_id"] = str(project["_id"])

    return project


# =========================================================
# ADD PROJECT MEMBER
# =========================================================

@router.post("/{project_id}/members")
def add_member(
    project_id: str,
    member: AddMemberRequest,
    current_user=Depends(get_current_user)
):

    # Validate project ID
    if not ObjectId.is_valid(project_id):
        raise HTTPException(
            status_code=400,
            detail="Invalid project ID"
        )

    current_user_id = str(current_user["_id"])

    # Only project owner can add members
    project = db.projects.find_one({
        "_id": ObjectId(project_id),
        "owner_id": current_user_id
    })

    if not project:
        raise HTTPException(
            status_code=404,
            detail="Project not found or you are not the owner"
        )

    member_identifier = member.user_id.strip()

    # Resolve either a Mongo user ID, email address, or employee ID.
    if ObjectId.is_valid(member_identifier):
        user = db.users.find_one({"_id": ObjectId(member_identifier)})
    else:
        user = db.users.find_one({
            "$or": [
                {
                    "email": {
                        "$regex": f"^{re.escape(member_identifier)}$",
                        "$options": "i"
                    }
                },
                {"employee_id": member_identifier}
            ]
        })

    if not user:
        raise HTTPException(
            status_code=404,
            detail="No user found with that ID or email"
        )

    resolved_user_id = str(user["_id"])

    # Don't add owner as a member
    if resolved_user_id == current_user_id:
        raise HTTPException(
            status_code=400,
            detail="Project owner is already part of the project"
        )

    # Check duplicate member
    if resolved_user_id in project.get("members", []):
        raise HTTPException(
            status_code=400,
            detail="User is already a project member"
        )

    # Add member atomically using $addToSet
    db.projects.update_one(
        {"_id": ObjectId(project_id)},
        {
            "$addToSet": {
                "members": resolved_user_id
            }
        }
    )

    return {
        "message": "Member added successfully",
        "user": {
            "id": str(user["_id"]),
            "name": user["name"],
            "email": user["email"],
            "avatar": user.get("avatar", "")
        }
    }


# =========================================================
# GET PROJECT MEMBERS
# =========================================================

@router.get("/{project_id}/members")
def get_project_members(
    project_id: str,
    current_user=Depends(get_current_user)
):

    # Validate project ID
    if not ObjectId.is_valid(project_id):
        raise HTTPException(
            status_code=400,
            detail="Invalid project ID"
        )

    current_user_id = str(current_user["_id"])

    # Check access to project
    project = db.projects.find_one({
        "_id": ObjectId(project_id),
        "$or": [
            {"owner_id": current_user_id},
            {"members": current_user_id}
        ]
    })

    if not project:
        raise HTTPException(
            status_code=404,
            detail="Project not found or you do not have access"
        )

    members = []

    for member_id in project.get("members", []):

        if not ObjectId.is_valid(member_id):
            continue

        user = db.users.find_one({
            "_id": ObjectId(member_id)
        })

        if user:
            members.append({
                "id": str(user["_id"]),
                "name": user["name"],
                "email": user["email"],
                "role": user.get("role", "Developer"),
                "custom_role": user.get("custom_role", ""),
                "avatar": user.get("avatar", "")
            })

    return {
        "project_id": project_id,
        "members": members
    }


# =========================================================
# REMOVE PROJECT MEMBER
# =========================================================

@router.delete("/{project_id}/members/{user_id}")
def remove_project_member(
    project_id: str,
    user_id: str,
    current_user=Depends(get_current_user)
):

    # Validate project ID
    if not ObjectId.is_valid(project_id):
        raise HTTPException(
            status_code=400,
            detail="Invalid project ID"
        )

    # Validate user ID
    if not ObjectId.is_valid(user_id):
        raise HTTPException(
            status_code=400,
            detail="Invalid user ID"
        )

    current_user_id = str(current_user["_id"])

    # Only owner can remove members
    project = db.projects.find_one({
        "_id": ObjectId(project_id),
        "owner_id": current_user_id
    })

    if not project:
        raise HTTPException(
            status_code=404,
            detail="Project not found or you are not the owner"
        )

    # Check member exists
    if user_id not in project.get("members", []):
        raise HTTPException(
            status_code=404,
            detail="User is not a project member"
        )

    # Remove member
    db.projects.update_one(
        {"_id": ObjectId(project_id)},
        {
            "$pull": {
                "members": user_id
            }
        }
    )

    return {
        "message": "Member removed successfully"
    }


# =========================================================
# UPDATE PROJECT
# =========================================================

@router.put("/{project_id}")
def update_project(
    project_id: str,
    project: ProjectUpdate,
    current_user=Depends(get_current_user)
):

    # Validate project ID
    if not ObjectId.is_valid(project_id):
        raise HTTPException(
            status_code=400,
            detail="Invalid project ID"
        )

    current_user_id = str(current_user["_id"])

    # Only owner can update
    existing_project = db.projects.find_one({
        "_id": ObjectId(project_id),
        "owner_id": current_user_id
    })

    if not existing_project:
        raise HTTPException(
            status_code=404,
            detail="Project not found or you are not the owner"
        )

    db.projects.update_one(
        {"_id": ObjectId(project_id)},
        {
            "$set": {
                "name": project.name,
                "description": project.description,
                "updated_at": datetime.now(timezone.utc)
            }
        }
    )

    return {
        "message": "Project updated successfully"
    }


# =========================================================
# DELETE PROJECT
# =========================================================

@router.delete("/{project_id}/leave")
def leave_project(
    project_id: str,
    current_user=Depends(get_current_user)
):

    if not ObjectId.is_valid(project_id):
        raise HTTPException(
            status_code=400,
            detail="Invalid project ID"
        )

    current_user_id = str(current_user["_id"])

    project = db.projects.find_one({
        "_id": ObjectId(project_id)
    })

    if not project:
        raise HTTPException(
            status_code=404,
            detail="Project not found"
        )

    if str(project.get("owner_id")) == current_user_id:
        raise HTTPException(
            status_code=400,
            detail="Project owner cannot leave the project. Delete it instead."
        )

    if current_user_id not in project.get("members", []):
        raise HTTPException(
            status_code=404,
            detail="You are not a member of this project"
        )

    db.projects.update_one(
        {"_id": ObjectId(project_id)},
        {"$pull": {"members": current_user_id}}
    )

    return {
        "message": "You left the project successfully"
    }


@router.delete("/{project_id}")
def delete_project(
    project_id: str,
    current_user=Depends(get_current_user)
):

    # Validate project ID
    if not ObjectId.is_valid(project_id):
        raise HTTPException(
            status_code=400,
            detail="Invalid project ID"
        )

    current_user_id = str(current_user["_id"])

    # Only owner can delete
    existing_project = db.projects.find_one({
        "_id": ObjectId(project_id),
        "owner_id": current_user_id
    })

    if not existing_project:
        raise HTTPException(
            status_code=404,
            detail="Project not found or you are not the owner"
        )

    db.projects.delete_one({
        "_id": ObjectId(project_id)
    })

    return {
        "message": "Project deleted successfully"
    }


# =========================================================
# PROJECT ACTIVITY AUDIT TRAIL
# =========================================================

@router.get("/{project_id}/activity")
def get_project_activity(
    project_id: str,
    current_user=Depends(get_current_user)
):
    """Generate a real-time audit log of recent project activities."""
    if not ObjectId.is_valid(project_id):
        raise HTTPException(status_code=400, detail="Invalid project ID")

    current_user_id = str(current_user["_id"])

    # Check project access
    project = db.projects.find_one({
        "_id": ObjectId(project_id),
        "$or": [
            {"owner_id": current_user_id},
            {"members": current_user_id}
        ]
    })

    if not project:
        raise HTTPException(status_code=404, detail="Project not found or access denied")

    activities = []

    # 1. Project creation activity
    activities.append({
        "id": f"proj-created-{project_id}",
        "type": "project",
        "title": "Project Created",
        "description": f"Project '{project.get('name')}' was established",
        "timestamp": project.get("created_at")
    })

    # 2. Task activities
    tasks = list(db.tasks.find({"project_id": project_id}).sort("updated_at", -1).limit(20))
    for t in tasks:
        t_id = str(t["_id"])
        created = t.get("created_at")
        updated = t.get("updated_at")

        if created:
            activities.append({
                "id": f"task-created-{t_id}",
                "type": "task",
                "title": f"Task Created: '{t.get('title')}'",
                "description": f"Priority: {t.get('priority', 'Medium')} | Status: {t.get('status', 'todo').upper()}",
                "timestamp": created
            })

        if updated and updated != created:
            activities.append({
                "id": f"task-updated-{t_id}",
                "type": "status",
                "title": f"Task Updated: '{t.get('title')}'",
                "description": f"Current status is now {t.get('status', 'todo').upper()}",
                "timestamp": updated
            })

    # Sort activities descending by timestamp
    min_utc = datetime.min.replace(tzinfo=timezone.utc)
    activities.sort(
        key=lambda a: a.get("timestamp") if isinstance(a.get("timestamp"), datetime) else min_utc,
        reverse=True
    )

    return {
        "project_id": project_id,
        "activities": activities[:30]
    }