from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from bson import ObjectId
from datetime import datetime, timezone

from database import db
from dependencies import get_current_user


router = APIRouter(
    prefix="/tasks",
    tags=["Comments"]
)


class CommentCreate(BaseModel):
    message: str


def create_notification(
    user_id,
    notification_type,
    title,
    message,
    task_id=None,
    project_id=None
):
    db.notifications.insert_one({
        "user_id": str(user_id),
        "type": notification_type,
        "title": title,
        "message": message,
        "task_id": str(task_id) if task_id else None,
        "project_id": str(project_id) if project_id else None,
        "is_read": False,
        "created_at": datetime.now(timezone.utc)
    })


@router.post("/{task_id}/comments")
def add_comment(
    task_id: str,
    comment: CommentCreate,
    current_user=Depends(get_current_user)
):
    # Validate task ID
    try:
        task_object_id = ObjectId(task_id)
    except Exception:
        raise HTTPException(
            status_code=400,
            detail="Invalid task ID"
        )

    # Validate message
    message = comment.message.strip()

    if not message:
        raise HTTPException(
            status_code=400,
            detail="Comment cannot be empty"
        )

    # Find task
    task = db.tasks.find_one({
        "_id": task_object_id
    })

    if not task:
        raise HTTPException(
            status_code=404,
            detail="Task not found"
        )

    current_user_id = str(current_user["_id"])
    project_id = str(task["project_id"])

    # Check project access
    project = db.projects.find_one({
        "_id": ObjectId(project_id)
    })

    if not project:
        raise HTTPException(
            status_code=404,
            detail="Project not found"
        )

    owner_id = str(project["owner_id"])

    members = [
        str(member)
        for member in project.get("members", [])
    ]

    if current_user_id != owner_id and current_user_id not in members:
        raise HTTPException(
            status_code=403,
            detail="You do not have access to this project"
        )

    # Create comment
    comment_document = {
        "task_id": task_object_id,
        "user_id": current_user_id,
        "message": message,
        "created_at": datetime.now(timezone.utc)
    }

    result = db.comments.insert_one(comment_document)

    # ------------------------------------------------
    # NOTIFICATION LOGIC
    # ------------------------------------------------

    task_title = task.get("title", "Task")

    # Get task assignee
    assigned_to = task.get("assigned_to")

    # Get people who should receive notification
    notification_users = set()

    # Project owner should know about comments
    if owner_id != current_user_id:
        notification_users.add(owner_id)

    # Assigned developer should know about comments
    if assigned_to:
        assigned_user_id = str(assigned_to)

        if assigned_user_id != current_user_id:
            notification_users.add(assigned_user_id)

    # Send notifications
    for user_id in notification_users:
        create_notification(
            user_id=user_id,
            notification_type="comment",
            title="New comment",
            message=f"{current_user['name']} commented on '{task_title}'",
            task_id=task_object_id,
            project_id=project_id
        )

    return {
        "message": "Comment added successfully",
        "comment": {
            "id": str(result.inserted_id),
            "task_id": task_id,
            "user_id": current_user_id,
            "user_name": current_user["name"],
            "message": message,
            "created_at": comment_document["created_at"]
        }
    }


@router.get("/{task_id}/comments")
def get_comments(
    task_id: str,
    current_user=Depends(get_current_user)
):
    # Validate task ID
    try:
        task_object_id = ObjectId(task_id)
    except Exception:
        raise HTTPException(
            status_code=400,
            detail="Invalid task ID"
        )

    # Find task
    task = db.tasks.find_one({
        "_id": task_object_id
    })

    if not task:
        raise HTTPException(
            status_code=404,
            detail="Task not found"
        )

    project_id = str(task["project_id"])

    # Find project
    project = db.projects.find_one({
        "_id": ObjectId(project_id)
    })

    if not project:
        raise HTTPException(
            status_code=404,
            detail="Project not found"
        )

    current_user_id = str(current_user["_id"])

    owner_id = str(project["owner_id"])

    members = [
        str(member)
        for member in project.get("members", [])
    ]

    # Check access
    if current_user_id != owner_id and current_user_id not in members:
        raise HTTPException(
            status_code=403,
            detail="You do not have access to this project"
        )

    # Get comments
    comments = list(
        db.comments.find({
            "task_id": task_object_id
        }).sort("created_at", 1)
    )

    result = []

    for comment in comments:

        # Find comment author
        try:
            user = db.users.find_one({
                "_id": ObjectId(comment["user_id"])
            })
        except Exception:
            user = None

        result.append({
            "id": str(comment["_id"]),
            "task_id": str(comment["task_id"]),
            "user_id": str(comment["user_id"]),
            "user_name": (
                user["name"]
                if user
                else "Unknown User"
            ),
            "message": comment["message"],
            "created_at": comment["created_at"]
        })

    return result
