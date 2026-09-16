from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from datetime import datetime, timezone
from bson import ObjectId

from database import db
from dependencies import get_current_user


router = APIRouter(
    prefix="/tasks",
    tags=["Tasks"]
)


# =========================================================
# REQUEST MODELS
# =========================================================

class TaskCreate(BaseModel):
    project_id: str
    title: str
    description: str = ""
    assigned_to: str | None = None
    priority: str = "Medium"
    due_date: str | None = None


class TaskUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    assigned_to: str | None = None
    priority: str | None = None
    due_date: str | None = None


class TaskStatusUpdate(BaseModel):
    status: str
    clear_assignment: bool = False


# =========================================================
# ALLOWED VALUES
# =========================================================

VALID_STATUSES = [
    "todo",
    "assigned",
    "review",
    "completed"
]

VALID_PRIORITIES = [
    "Low",
    "Medium",
    "High"
]


# =========================================================
# HELPER — CREATE NOTIFICATION
# =========================================================

def create_notification(
    user_id,
    notification_type,
    title,
    message,
    task_id=None,
    project_id=None
):
    """Create an in-app notification for a user."""
    if not user_id:
        return

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


# =========================================================
# HELPER — CHECK PROJECT ACCESS
#=========================================================

def check_project_access(project_id: str, user_id: str):

    if not ObjectId.is_valid(project_id):
        raise HTTPException(
            status_code=400,
            detail="Invalid project ID"
        )

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

    return project


# =========================================================
# CREATE TASK
# =========================================================

@router.post("/")
def create_task(
    task: TaskCreate,
    current_user=Depends(get_current_user)
):

    current_user_id = str(current_user["_id"])

    # Check project access
    project = check_project_access(
        task.project_id,
        current_user_id
    )

    # Validate priority
    if task.priority not in VALID_PRIORITIES:
        raise HTTPException(
            status_code=400,
            detail="Invalid priority"
        )

    # Check assigned user
    if task.assigned_to:

        if not ObjectId.is_valid(task.assigned_to):
            raise HTTPException(
                status_code=400,
                detail="Invalid assigned user ID"
            )

        # User must be part of project
        if (
            task.assigned_to != project["owner_id"]
            and task.assigned_to not in project.get("members", [])
        ):
            raise HTTPException(
                status_code=400,
                detail="Assigned user is not a member of this project"
            )

    # Determine initial status
    if task.assigned_to:
        initial_status = "assigned"
    else:
        initial_status = "todo"

    new_task = {
        "project_id": task.project_id,
        "title": task.title,
        "description": task.description,
        "assigned_to": task.assigned_to,
        "status": initial_status,
        "priority": task.priority,
        "due_date": task.due_date,
        "created_by": current_user_id,
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc)
    }

    result = db.tasks.insert_one(new_task)

    # Notify the assigned user when a task is created with an assignee.
    if task.assigned_to and task.assigned_to != current_user_id:
        create_notification(
            user_id=task.assigned_to,
            notification_type="assignment",
            title="New task assigned",
            message=f"{current_user['name']} assigned you '{task.title}'",
            task_id=result.inserted_id,
            project_id=task.project_id
        )

    return {
        "message": "Task created successfully",
        "task_id": str(result.inserted_id),
        "status": initial_status
    }


# =========================================================
# GET ALL TASKS FOR PROJECT
# =========================================================

@router.get("/project/{project_id}")
def get_project_tasks(
    project_id: str,
    current_user=Depends(get_current_user)
):

    current_user_id = str(current_user["_id"])

    # Check project access
    check_project_access(
        project_id,
        current_user_id
    )

    tasks = list(
        db.tasks.find({
            "project_id": project_id
        })
    )

    for task in tasks:
        task["_id"] = str(task["_id"])

    return {
        "project_id": project_id,
        "tasks": tasks
    }


# =========================================================
# GET ONE TASK
# =========================================================

@router.get("/{task_id}")
def get_task(
    task_id: str,
    current_user=Depends(get_current_user)
):

    if not ObjectId.is_valid(task_id):
        raise HTTPException(
            status_code=400,
            detail="Invalid task ID"
        )

    task = db.tasks.find_one({
        "_id": ObjectId(task_id)
    })

    if not task:
        raise HTTPException(
            status_code=404,
            detail="Task not found"
        )

    current_user_id = str(current_user["_id"])

    # Check project access
    check_project_access(
        task["project_id"],
        current_user_id
    )

    task["_id"] = str(task["_id"])

    return task


# =========================================================
# UPDATE TASK
# =========================================================

@router.put("/{task_id}")
def update_task(
    task_id: str,
    task_data: TaskUpdate,
    current_user=Depends(get_current_user)
):

    if not ObjectId.is_valid(task_id):
        raise HTTPException(
            status_code=400,
            detail="Invalid task ID"
        )

    existing_task = db.tasks.find_one({
        "_id": ObjectId(task_id)
    })

    if not existing_task:
        raise HTTPException(
            status_code=404,
            detail="Task not found"
        )

    current_user_id = str(current_user["_id"])

    project = check_project_access(
        existing_task["project_id"],
        current_user_id
    )

    new_title = task_data.title if task_data.title is not None else existing_task.get("title", "")
    new_description = task_data.description if task_data.description is not None else existing_task.get("description", "")
    new_priority = task_data.priority if task_data.priority is not None else existing_task.get("priority", "Medium")
    new_due_date = task_data.due_date if task_data.due_date is not None else existing_task.get("due_date")
    new_assigned_to = task_data.assigned_to if task_data.assigned_to is not None else existing_task.get("assigned_to")

    # Developers may claim tasks for themselves, but only the owner can assign others.
    if (
        task_data.assigned_to is not None
        and project["owner_id"] != current_user_id
        and str(task_data.assigned_to) != current_user_id
    ):
        raise HTTPException(
            status_code=403,
            detail="Developers can only assign tasks to themselves"
        )

    # Validate priority
    if new_priority not in VALID_PRIORITIES:
        raise HTTPException(
            status_code=400,
            detail="Invalid priority"
        )

    # Validate assigned user
    if new_assigned_to:

        if not ObjectId.is_valid(new_assigned_to):
            raise HTTPException(
                status_code=400,
                detail="Invalid assigned user ID"
            )

        if (
            new_assigned_to != project["owner_id"]
            and new_assigned_to not in project.get("members", [])
        ):
            raise HTTPException(
                status_code=400,
                detail="Assigned user is not a member of this project"
            )

    # Keep existing status
    new_status = existing_task["status"]

    # If task was To Do and now assigned
    if new_assigned_to and existing_task["status"] == "todo":
        new_status = "assigned"

    old_assigned_to = existing_task.get("assigned_to")

    db.tasks.update_one(
        {"_id": ObjectId(task_id)},
        {
            "$set": {
                "title": new_title,
                "description": new_description,
                "assigned_to": new_assigned_to,
                "priority": new_priority,
                "due_date": new_due_date,
                "status": new_status,
                "updated_at": datetime.now(timezone.utc)
            }
        }
    )

    # Notify a newly assigned user.
    if (
        new_assigned_to
        and str(new_assigned_to) != str(old_assigned_to)
        and new_assigned_to != current_user_id
    ):
        create_notification(
            user_id=new_assigned_to,
            notification_type="assignment",
            title="Task assigned to you",
            message=f"{current_user['name']} assigned you '{new_title}'",
            task_id=task_id,
            project_id=existing_task["project_id"]
        )

    return {
        "message": "Task updated successfully"
    }


# =========================================================
# UPDATE TASK STATUS
# =========================================================

@router.patch("/{task_id}/status")
def update_task_status(
    task_id: str,
    status_data: TaskStatusUpdate,
    current_user=Depends(get_current_user)
):

    if not ObjectId.is_valid(task_id):
        raise HTTPException(
            status_code=400,
            detail="Invalid task ID"
        )

    if status_data.status not in VALID_STATUSES:
        raise HTTPException(
            status_code=400,
            detail="Invalid task status"
        )

    task = db.tasks.find_one({
        "_id": ObjectId(task_id)
    })

    if not task:
        raise HTTPException(
            status_code=404,
            detail="Task not found"
        )

    current_user_id = str(current_user["_id"])

    project = check_project_access(
        task["project_id"],
        current_user_id
    )

    current_status = task["status"]
    new_status = status_data.status

    assigned_to = (
        None
        if status_data.clear_assignment and new_status == "todo"
        else task.get("assigned_to")
    )

    # Update status
    db.tasks.update_one(
        {"_id": ObjectId(task_id)},
        {
            "$set": {
                "status": new_status,
                "assigned_to": assigned_to,
                "updated_at": datetime.now(timezone.utc)
            }
        }
    )

    task_title = task.get("title", "Task")
    project_owner = project.get("owner_id")

    # Assigned -> In Review: notify the project owner/reviewer.
    if current_status == "assigned" and new_status == "review":
        if project_owner != current_user_id:
            create_notification(
                user_id=project_owner,
                notification_type="review",
                title="Task submitted for review",
                message=f"{current_user['name']} submitted '{task_title}' for review",
                task_id=task_id,
                project_id=task["project_id"]
            )

    # In Review -> Completed: notify the assigned developer/member.
    elif current_status == "review" and new_status == "completed":
        if assigned_to and str(assigned_to) != current_user_id:
            create_notification(
                user_id=assigned_to,
                notification_type="completed",
                title="Task approved",
                message=f"Your task '{task_title}' was approved and completed",
                task_id=task_id,
                project_id=task["project_id"]
            )

    # In Review -> Assigned: notify the assigned developer/member.
    elif current_status == "review" and new_status == "assigned":
        if assigned_to and str(assigned_to) != current_user_id:
            create_notification(
                user_id=assigned_to,
                notification_type="rejected",
                title="Task sent back",
                message=f"Your task '{task_title}' was sent back for changes",
                task_id=task_id,
                project_id=task["project_id"]
            )

    return {
        "message": "Task status updated successfully",
        "old_status": current_status,
        "new_status": new_status
    }


# =========================================================
# DELETE TASK
# =========================================================

@router.delete("/{task_id}")
def delete_task(
    task_id: str,
    current_user=Depends(get_current_user)
):

    if not ObjectId.is_valid(task_id):
        raise HTTPException(
            status_code=400,
            detail="Invalid task ID"
        )

    task = db.tasks.find_one({
        "_id": ObjectId(task_id)
    })

    if not task:
        raise HTTPException(
            status_code=404,
            detail="Task not found"
        )

    current_user_id = str(current_user["_id"])

    project = check_project_access(
        task["project_id"],
        current_user_id
    )

    # Only project owner can delete tasks
    if project["owner_id"] != current_user_id:
        raise HTTPException(
            status_code=403,
            detail="Only the project owner can delete tasks"
        )

    db.tasks.delete_one({
        "_id": ObjectId(task_id)
    })

    return {
        "message": "Task deleted successfully"
    }