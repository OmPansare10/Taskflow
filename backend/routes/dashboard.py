from fastapi import APIRouter, Depends, HTTPException
from datetime import datetime, timezone, timedelta
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

    min_utc = datetime.min.replace(tzinfo=timezone.utc)

    recent_tasks = sorted(
        tasks,
        key=lambda task: task.get(
            "updated_at",
            task.get("created_at", min_utc)
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


# =========================================================
# DETAILED SINGLE PROJECT ANALYTICS
# =========================================================

@router.get("/project-analytics/{project_id}")
def get_project_analytics(
    project_id: str,
    current_user=Depends(get_current_user)
):
    """Fetch Jira-style performance analytics for a single project."""
    if not ObjectId.is_valid(project_id):
        raise HTTPException(
            status_code=400,
            detail="Invalid project ID"
        )

    current_user_id = str(current_user["_id"])

    # Verify project access
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
            detail="Project not found or access denied"
        )

    # Fetch owner info
    owner = None
    if ObjectId.is_valid(project.get("owner_id", "")):
        owner = db.users.find_one({"_id": ObjectId(project["owner_id"])})

    owner_name = owner.get("name", "Owner") if owner else "Owner"

    # Fetch project tasks
    tasks = list(db.tasks.find({"project_id": project_id}))
    total_tasks = len(tasks)

    # Status counts
    todo_count = sum(1 for t in tasks if t.get("status") == "todo")
    assigned_count = sum(1 for t in tasks if t.get("status") == "assigned")
    review_count = sum(1 for t in tasks if t.get("status") == "review")
    completed_count = sum(1 for t in tasks if t.get("status") == "completed")

    # Priority counts
    priority_high = sum(1 for t in tasks if t.get("priority") == "High")
    priority_medium = sum(1 for t in tasks if t.get("priority") == "Medium")
    priority_low = sum(1 for t in tasks if t.get("priority") == "Low")

    # Overdue calculation
    today = datetime.now(timezone.utc).date()
    overdue_count = 0
    for t in tasks:
        due_date = t.get("due_date")
        if due_date and t.get("status") != "completed":
            try:
                due = datetime.strptime(due_date, "%Y-%m-%d").date()
                if due < today:
                    overdue_count += 1
            except (ValueError, TypeError):
                pass

    completion_percentage = round((completed_count / total_tasks) * 100, 1) if total_tasks > 0 else 0.0

    # Jira-style Health Indicator
    if overdue_count >= 3 or (total_tasks >= 5 and completion_percentage < 25):
        health_status = "At Risk"
        health_color = "red"
    elif overdue_count >= 1 or (total_tasks >= 5 and completion_percentage < 50):
        health_status = "Needs Attention"
        health_color = "amber"
    else:
        health_status = "On Track"
        health_color = "green"

    # Velocity: Completed tasks in last 7 days
    seven_days_ago = datetime.now(timezone.utc) - timedelta(days=7)
    velocity = 0
    for t in tasks:
        if t.get("status") == "completed":
            updated_at = t.get("updated_at")
            if updated_at and isinstance(updated_at, datetime) and updated_at >= seven_days_ago:
                velocity += 1

    # Team Workload & Member Breakdown
    all_member_ids = list(set([str(project.get("owner_id"))] + [str(m) for m in project.get("members", [])]))
    valid_obj_ids = [ObjectId(mid) for mid in all_member_ids if ObjectId.is_valid(mid)]

    member_users = list(db.users.find({"_id": {"$in": valid_obj_ids}})) if valid_obj_ids else []

    workload_list = []
    for u in member_users:
        u_id = str(u["_id"])
        member_assigned = [t for t in tasks if str(t.get("assigned_to", "")) == u_id]
        member_completed = [t for t in member_assigned if t.get("status") == "completed"]
        
        assigned_c = len(member_assigned)
        completed_c = len(member_completed)
        workload_pct = round((assigned_c / total_tasks) * 100, 1) if total_tasks > 0 else 0.0

        workload_list.append({
            "id": u_id,
            "name": u.get("name", "User"),
            "email": u.get("email", ""),
            "role": u.get("role", "Developer"),
            "avatar": u.get("avatar", u.get("name", "U")[0].upper() if u.get("name") else "U"),
            "assigned_tasks": assigned_c,
            "completed_tasks": completed_c,
            "workload_percentage": workload_pct
        })

    workload_list.sort(key=lambda x: x["assigned_tasks"], reverse=True)

    return {
        "project": {
            "id": str(project["_id"]),
            "name": project.get("name", "Untitled Project"),
            "description": project.get("description", ""),
            "owner_id": str(project.get("owner_id")),
            "owner_name": owner_name,
            "members_count": len(project.get("members", [])) + 1,
            "created_at": project.get("created_at")
        },
        "total_tasks": total_tasks,
        "todo": todo_count,
        "assigned": assigned_count,
        "review": review_count,
        "completed": completed_count,
        "priority": {
            "high": priority_high,
            "medium": priority_medium,
            "low": priority_low
        },
        "overdue": overdue_count,
        "completion_percentage": completion_percentage,
        "health_status": health_status,
        "health_color": health_color,
        "velocity_last_7_days": velocity,
        "team_workload": workload_list
    }


# =========================================================
# ADMIN / PORTFOLIO OVERVIEW
# =========================================================

@router.get("/admin-overview")
def get_admin_overview(
    current_user=Depends(get_current_user)
):
    """Fetch portfolio overview of all user-created and managed projects."""
    current_user_id = str(current_user["_id"])

    projects = list(
        db.projects.find({
            "$or": [
                {"owner_id": current_user_id},
                {"members": current_user_id}
            ]
        })
    )

    project_list = []
    portfolio_total_tasks = 0
    portfolio_completed_tasks = 0
    portfolio_overdue_tasks = 0

    today = datetime.now(timezone.utc).date()

    for project in projects:
        p_id = str(project["_id"])
        tasks = list(db.tasks.find({"project_id": p_id}))
        total_p_tasks = len(tasks)
        completed_p_tasks = sum(1 for t in tasks if t.get("status") == "completed")
        
        overdue_p = 0
        for t in tasks:
            due_date = t.get("due_date")
            if due_date and t.get("status") != "completed":
                try:
                    due = datetime.strptime(due_date, "%Y-%m-%d").date()
                    if due < today:
                        overdue_p += 1
                except (ValueError, TypeError):
                    pass

        pct = round((completed_p_tasks / total_p_tasks) * 100, 1) if total_p_tasks > 0 else 0.0

        if overdue_p >= 3 or (total_p_tasks >= 5 and pct < 25):
            health = "At Risk"
            h_color = "red"
        elif overdue_p >= 1 or (total_p_tasks >= 5 and pct < 50):
            health = "Needs Attention"
            h_color = "amber"
        else:
            health = "On Track"
            h_color = "green"

        owner_name = "You" if str(project.get("owner_id")) == current_user_id else "Teammate"
        if owner_name != "You" and ObjectId.is_valid(project.get("owner_id", "")):
            owner_u = db.users.find_one({"_id": ObjectId(project["owner_id"])})
            if owner_u:
                owner_name = owner_u.get("name", "Teammate")

        portfolio_total_tasks += total_p_tasks
        portfolio_completed_tasks += completed_p_tasks
        portfolio_overdue_tasks += overdue_p

        project_list.append({
            "id": p_id,
            "name": project.get("name", "Untitled"),
            "description": project.get("description", ""),
            "owner_name": owner_name,
            "is_owner": str(project.get("owner_id")) == current_user_id,
            "members_count": len(project.get("members", [])) + 1,
            "total_tasks": total_p_tasks,
            "completed_tasks": completed_p_tasks,
            "completion_percentage": pct,
            "overdue_tasks": overdue_p,
            "health_status": health,
            "health_color": h_color
        })

    avg_completion = (
        round((portfolio_completed_tasks / portfolio_total_tasks) * 100, 1)
        if portfolio_total_tasks > 0
        else 0.0
    )

    return {
        "portfolio_projects": len(projects),
        "portfolio_total_tasks": portfolio_total_tasks,
        "portfolio_completed_tasks": portfolio_completed_tasks,
        "portfolio_overdue_tasks": portfolio_overdue_tasks,
        "average_completion_rate": avg_completion,
        "projects": project_list
    }


# =========================================================
# REAL-WORLD DASHBOARD SUMMARY API
# =========================================================

@router.get("/summary")
def get_dashboard_summary(
    current_user=Depends(get_current_user)
):
    """Fetch complete aggregated real-world metrics for the user dashboard."""
    current_user_id = str(current_user["_id"])
    today_date = datetime.now(timezone.utc).date()

    # 1. Accessible Projects
    projects = list(
        db.projects.find({
            "$or": [
                {"owner_id": current_user_id},
                {"members": current_user_id}
            ]
        })
    )

    project_map = {str(p["_id"]): p.get("name", "Untitled Project") for p in projects}
    project_ids = list(project_map.keys())

    # 2. Accessible Tasks
    tasks = list(db.tasks.find({"project_id": {"$in": project_ids}})) if project_ids else []

    total_projects = len(projects)
    total_tasks = len(tasks)

    # 3. Status Breakdown & Overdue Calculation
    todo_count = 0
    assigned_count = 0
    review_count = 0
    completed_count = 0
    overdue_count = 0
    unassigned_count = 0
    due_today_count = 0

    my_work_raw = []
    upcoming_deadlines_raw = []

    for task in tasks:
        t_id = str(task["_id"])
        status = task.get("status", "todo")
        assigned_to = str(task.get("assigned_to", "")) if task.get("assigned_to") else ""
        due_date_str = task.get("due_date", "")
        p_id = str(task.get("project_id", ""))
        p_name = project_map.get(p_id, "Project")

        # Counts
        if status == "todo":
            todo_count += 1
        elif status == "assigned":
            assigned_count += 1
        elif status == "review":
            review_count += 1
        elif status == "completed":
            completed_count += 1

        if not assigned_to:
            unassigned_count += 1

        # Due Date Analysis
        is_overdue = False
        is_due_today = False
        is_due_soon = False

        if due_date_str and status != "completed":
            try:
                due_d = datetime.strptime(due_date_str, "%Y-%m-%d").date()
                if due_d < today_date:
                    is_overdue = True
                    overdue_count += 1
                elif due_d == today_date:
                    is_due_today = True
                    due_today_count += 1
                elif today_date < due_d <= (today_date + timedelta(days=7)):
                    is_due_soon = True
            except (ValueError, TypeError):
                pass

        formatted_task = {
            "id": t_id,
            "title": task.get("title", ""),
            "description": task.get("description", ""),
            "status": status,
            "priority": task.get("priority", "Medium"),
            "project_id": p_id,
            "project_name": p_name,
            "assigned_to": assigned_to,
            "due_date": due_date_str,
            "is_overdue": is_overdue,
            "is_due_today": is_due_today,
            "is_due_soon": is_due_soon,
            "updated_at": task.get("updated_at")
        }

        # Feature 1: My Work (tasks assigned to current user)
        if assigned_to == current_user_id:
            my_work_raw.append(formatted_task)

        # Feature 2: Upcoming Deadlines (non-completed tasks with due date)
        if due_date_str and status != "completed":
            upcoming_deadlines_raw.append(formatted_task)

    # Sort Upcoming Deadlines by due_date ascending
    upcoming_deadlines_raw.sort(key=lambda t: t.get("due_date") or "9999-99-99")

    completion_pct = round((completed_count / total_tasks) * 100, 1) if total_tasks > 0 else 0.0

    # 4. Feature 4: Project Health (with transparent rules)
    project_health_list = []
    for project in projects:
        p_id = str(project["_id"])
        p_tasks = [t for t in tasks if str(t.get("project_id")) == p_id]
        p_total = len(p_tasks)
        p_completed = sum(1 for t in p_tasks if t.get("status") == "completed")
        p_review = sum(1 for t in p_tasks if t.get("status") == "review")
        p_overdue = 0
        for t in p_tasks:
            d_str = t.get("due_date")
            if d_str and t.get("status") != "completed":
                try:
                    if datetime.strptime(d_str, "%Y-%m-%d").date() < today_date:
                        p_overdue += 1
                except (ValueError, TypeError):
                    pass

        p_pct = round((p_completed / p_total) * 100, 1) if p_total > 0 else 0.0

        # Transparent Health Rule:
        # - Delayed: If overdue tasks exist (>0)
        # - Attention: If no overdue tasks, but review tasks >= 2 or low progress (<30% when total >= 3)
        # - On Track: Otherwise
        if p_overdue > 0:
            health_status = "Delayed"
            health_color = "red"
        elif p_review >= 2 or (p_total >= 3 and p_pct < 30.0):
            health_status = "Attention"
            health_color = "amber"
        else:
            health_status = "On Track"
            health_color = "green"

        project_health_list.append({
            "id": p_id,
            "name": project.get("name", "Untitled"),
            "description": project.get("description", ""),
            "completion_percentage": p_pct,
            "total_tasks": p_total,
            "completed_tasks": p_completed,
            "review_tasks": p_review,
            "overdue_tasks": p_overdue,
            "health_status": health_status,
            "health_color": health_color
        })

    # 5. Feature 5: Team Workload Summary (across user's accessible projects)
    member_ids = set()
    for p in projects:
        member_ids.add(str(p.get("owner_id")))
        for m in p.get("members", []):
            member_ids.add(str(m))

    valid_member_oids = [ObjectId(m) for m in member_ids if ObjectId.is_valid(m)]
    member_users = list(db.users.find({"_id": {"$in": valid_member_oids}})) if valid_member_oids else []

    team_workload_list = []
    for u in member_users:
        u_id = str(u["_id"])
        active_count = sum(1 for t in tasks if str(t.get("assigned_to", "")) == u_id and t.get("status") != "completed")
        team_workload_list.append({
            "id": u_id,
            "name": u.get("name", "User"),
            "email": u.get("email", ""),
            "active_tasks": active_count,
            "avatar": u.get("name", "U")[0].upper() if u.get("name") else "U"
        })
    team_workload_list.sort(key=lambda m: m["active_tasks"], reverse=True)

    # 6. Feature 6: Recent Activity (from task audit events)
    recent_activity_list = []
    sorted_tasks = sorted(
        tasks,
        key=lambda t: t.get("updated_at", t.get("created_at", datetime.min.replace(tzinfo=timezone.utc))),
        reverse=True
    )[:15]

    for t in sorted_tasks:
        p_name = project_map.get(str(t.get("project_id")), "Project")
        status = t.get("status", "todo")
        action = f"updated task '{t.get('title')}' to {status.upper()} in {p_name}"
        if status == "completed":
            action = f"completed '{t.get('title')}' in {p_name}"
        elif status == "review":
            action = f"submitted '{t.get('title')}' for review in {p_name}"

        recent_activity_list.append({
            "id": str(t["_id"]),
            "title": t.get("title"),
            "project_name": p_name,
            "action": action,
            "timestamp": t.get("updated_at") or t.get("created_at")
        })

    user_role = current_user.get("role", "Developer")

    return {
        "user": {
            "id": current_user_id,
            "name": current_user.get("name", "User"),
            "email": current_user.get("email", ""),
            "role": user_role
        },
        "kpis": {
            "total_projects": total_projects,
            "total_tasks": total_tasks,
            "review": review_count,
            "completed": completed_count,
            "overdue": overdue_count,
            "completion_percentage": completion_pct
        },
        "my_work": my_work_raw[:20],
        "upcoming_deadlines": upcoming_deadlines_raw[:15],
        "attention_required": {
            "overdue_tasks": overdue_count,
            "review_tasks": review_count,
            "unassigned_tasks": unassigned_count,
            "due_today_tasks": due_today_count
        },
        "projects_health": project_health_list,
        "team_workload": team_workload_list[:10],
        "recent_activity": recent_activity_list[:10]
    }


# =========================================================
# GLOBAL SEARCH API (STRICTLY READ-ONLY)
# =========================================================

@router.get("/search")
def global_search(
    q: str = "",
    current_user=Depends(get_current_user)
):
    """
    Global search for Projects, Tasks, and Team Members.
    CRITICAL SECURITY GUARANTEE:
    This endpoint is 100% READ-ONLY. It NEVER modifies project.members or database documents.
    Permission-Aware: Only searches within projects accessible to the current user.
    """
    query = q.strip().lower()
    if not query:
        return {"projects": [], "tasks": [], "members": []}

    current_user_id = str(current_user["_id"])

    # 1. Accessible Projects
    accessible_projects = list(
        db.projects.find({
            "$or": [
                {"owner_id": current_user_id},
                {"members": current_user_id}
            ]
        })
    )

    p_map = {str(p["_id"]): p.get("name", "") for p in accessible_projects}
    accessible_p_ids = list(p_map.keys())

    # Search Projects
    matched_projects = []
    for p in accessible_projects:
        p_name = p.get("name", "")
        p_desc = p.get("description", "")
        if query in p_name.lower() or query in p_desc.lower():
            matched_projects.append({
                "id": str(p["_id"]),
                "name": p_name,
                "description": p_desc,
                "type": "project"
            })

    # Search Tasks (within accessible projects only)
    matched_tasks = []
    if accessible_p_ids:
        tasks = list(db.tasks.find({"project_id": {"$in": accessible_p_ids}}))
        for t in tasks:
            t_title = t.get("title", "")
            t_desc = t.get("description", "")
            if query in t_title.lower() or query in t_desc.lower():
                matched_tasks.append({
                    "id": str(t["_id"]),
                    "title": t_title,
                    "description": t_desc,
                    "status": t.get("status", "todo"),
                    "priority": t.get("priority", "Medium"),
                    "project_id": str(t.get("project_id")),
                    "project_name": p_map.get(str(t.get("project_id")), "Project"),
                    "type": "task"
                })

    # Search Members (among team members in accessible projects ONLY)
    member_ids = set()
    for p in accessible_projects:
        member_ids.add(str(p.get("owner_id")))
        for m in p.get("members", []):
            member_ids.add(str(m))

    valid_member_oids = [ObjectId(m) for m in member_ids if ObjectId.is_valid(m)]
    member_users = list(db.users.find({"_id": {"$in": valid_member_oids}})) if valid_member_oids else []

    matched_members = []
    for u in member_users:
        u_name = u.get("name", "")
        u_email = u.get("email", "")
        if query in u_name.lower() or query in u_email.lower():
            matched_members.append({
                "id": str(u["_id"]),
                "name": u_name,
                "email": u_email,
                "role": u.get("role", "Team Member"),
                "type": "member"
            })

    return {
        "projects": matched_projects[:10],
        "tasks": matched_tasks[:15],
        "members": matched_members[:10]
    }
