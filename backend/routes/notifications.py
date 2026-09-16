from fastapi import APIRouter, Depends, HTTPException
from datetime import datetime, timezone
from bson import ObjectId

from database import db
from dependencies import get_current_user


router = APIRouter(
    prefix="/notifications",
    tags=["Notifications"]
)


# ---------------------------------------------------------
# GET MY NOTIFICATIONS
# ---------------------------------------------------------

@router.get("/")
def get_notifications(
    current_user=Depends(get_current_user)
):
    notifications = list(
        db.notifications.find(
            {
                "user_id": str(current_user["_id"])
            }
        ).sort(
            "created_at",
            -1
        ).limit(50)
    )

    result = []

    for notification in notifications:
        result.append({
            "id": str(notification["_id"]),
            "type": notification.get("type", "general"),
            "title": notification.get("title", ""),
            "message": notification.get("message", ""),
            "task_id": notification.get("task_id"),
            "project_id": notification.get("project_id"),
            "is_read": notification.get("is_read", False),
            "created_at": notification.get("created_at")
        })

    return result


# ---------------------------------------------------------
# GET UNREAD COUNT
# ---------------------------------------------------------

@router.get("/unread-count")
def get_unread_count(
    current_user=Depends(get_current_user)
):
    count = db.notifications.count_documents({
        "user_id": str(current_user["_id"]),
        "is_read": False
    })

    return {
        "count": count
    }


# ---------------------------------------------------------
# MARK ONE NOTIFICATION AS READ
# ---------------------------------------------------------

@router.patch("/{notification_id}/read")
def mark_notification_read(
    notification_id: str,
    current_user=Depends(get_current_user)
):
    try:
        notification = db.notifications.find_one({
            "_id": ObjectId(notification_id),
            "user_id": str(current_user["_id"])
        })
    except Exception:
        raise HTTPException(
            status_code=400,
            detail="Invalid notification ID"
        )

    if not notification:
        raise HTTPException(
            status_code=404,
            detail="Notification not found"
        )

    db.notifications.update_one(
        {
            "_id": ObjectId(notification_id),
            "user_id": str(current_user["_id"])
        },
        {
            "$set": {
                "is_read": True
            }
        }
    )

    return {
        "message": "Notification marked as read"
    }


# ---------------------------------------------------------
# MARK ALL NOTIFICATIONS AS READ
# ---------------------------------------------------------

@router.patch("/read-all")
def mark_all_notifications_read(
    current_user=Depends(get_current_user)
):
    db.notifications.update_many(
        {
            "user_id": str(current_user["_id"]),
            "is_read": False
        },
        {
            "$set": {
                "is_read": True
            }
        }
    )

    return {
        "message": "All notifications marked as read"
    }
