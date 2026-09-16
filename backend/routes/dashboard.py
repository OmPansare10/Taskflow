from fastapi import APIRouter, Depends
from datetime import datetime, timezone
from bson import ObjectId

from database import db
from dependencies import get_current_user


router = APIRouter(
    prefix="/dashboard",
    tags=["Dashboard"]
)


@router.get("/analytics")
def get_dashboard_analytics(
    current_user=Depends(get_current_user)
):
    current_user_id = str(current_user["_id"])

    # =========================================================
    # GET USER PROJECTS
    # =========================================================

    projects = list(
        db.projects.find({
            "$or": [
                {"owner_id": current_user_id},
                {"members": current_user_id}
            ]
        })
    )

    project_ids = [
        str(project["_id"])
        for project in projects
    ]

    total_projects = len(projects)

    # =========================================================
    # GET USER PROJECT TASKS
    # =========================================================

    if project_ids:
        tasks = list(
            db.tasks.find({
                "project_id": {
                    "$in": project_ids
                }
            })
        )
    else:
        tasks = []

    total_tasks = len(tasks)

    # =========================================================
    # TASK STATUS COUNTS
    # =========================================================

    todo_count = sum(
        1 for task in tasks
        if task.get("status") == "todo"
    )

    assigned_count = sum(
        1 for task in tasks
        if task.get("status") == "assigned"
    )

    review_count = sum(
        1 for task in tasks
        if task.get("status") == "review"
    )

    completed_count = sum(
        1 for task in tasks
        if task.get("status") == "completed"
    )

    # =========================================================
    # OVERDUE TASKS
    # =========================================================

    today = datetime.now(timezone.utc).date()

    overdue_count = 0

    for task in tasks:

        due_date = task.get("due_date")

        if not due_date:
            continue

        if task.get("status") == "completed":
            continue

        try:
            due = datetime.strptime(
                due_date,
                "%Y-%m-%d"
            ).date()

            if due < today:
                overdue_count += 1

        except (ValueError, TypeError):
            continue

    # =========================================================
    # COMPLETION PERCENTAGE
    # =========================================================

    if total_tasks > 0:
        completion_percentage = round(
            (completed_count / total_tasks) * 100,
            1
        )
    else:
        completion_percentage = 0

    # =========================================================
    # RECENT TASKS
    # =========================================================

    recent_tasks = sorted(
        tasks,
        key=lambda task: task.get(
            "updated_at",
            task.get("created_at", datetime.min)
        ),
        reverse=True
    )[:5]

    recent_task_list = []

    for task in recent_tasks:

        project_name = "Unknown Project"

        for project in projects:
            if str(project["_id"]) == str(
                task.get("project_id")
            ):
                project_name = project.get(
                    "name",
                    "Unknown Project"
                )
                break

        recent_task_list.append({
            "id": str(task["_id"]),
            "title": task.get("title", ""),
            "status": task.get(
                "status",
                "todo"
            ),
            "priority": task.get(
                "priority",
                "Medium"
            ),
            "project_id": str(
                task.get("project_id")
            ),
            "project_name": project_name,
            "assigned_to": task.get(
                "assigned_to"
            ),
            "due_date": task.get(
                "due_date"
            ),
            "updated_at": task.get(
                "updated_at"
            )
        })

    # =========================================================
    # RETURN DASHBOARD DATA
    # =========================================================

    return {
        "total_projects": total_projects,
        "total_tasks": total_tasks,

        "todo": todo_count,
        "assigned": assigned_count,
        "review": review_count,
        "completed": completed_count,

        "overdue": overdue_count,

        "completion_percentage": completion_percentage,

        "recent_tasks": recent_task_list
    }