from datetime import datetime, timezone
from django.http import HttpResponse
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from . import mongo
from . import export_excel

class HealthAndMongoStatusView(APIView):
    def get(self, request):
        return Response(mongo.get_mongo_status())

class ProjectListCreateView(APIView):
    def get(self, request):
        user_email = request.query_params.get("userEmail") or request.query_params.get("user") or request.headers.get("X-User-Email")
        user_id = request.query_params.get("userId") or request.headers.get("X-User-Id")
        username = request.query_params.get("username")
        projects = mongo.list_projects(user_email=user_email, user_id=user_id, username=username)
        return Response(projects)

    def post(self, request):
        data = request.data
        if not data.get("title"):
            return Response({"error": "Project title is required"}, status=status.HTTP_400_BAD_REQUEST)
        if not data.get("key"):
            return Response({"error": "Project key is required"}, status=status.HTTP_400_BAD_REQUEST)
        created = mongo.create_project(data)
        return Response(created, status=status.HTTP_201_CREATED)

def normalize_email(email):
    if not email or not isinstance(email, str):
        return ""
    e = email.strip().lower()
    if "@" not in e and "." in e:
        parts = e.split(".")
        if len(parts) >= 2:
            e = parts[0] + "@" + ".".join(parts[1:])
    return e

def is_project_manager_or_creator(project, request):
    if not project:
        return False
    user_email = normalize_email(request.query_params.get("userEmail") or request.query_params.get("user") or request.headers.get("X-User-Email") or "")
    user_id = str(request.query_params.get("userId") or request.headers.get("X-User-Id") or "").strip()

    if not user_email and not user_id:
        return True

    p_creator = str(project.get("createdBy") or "").strip()
    p_mgr_email = normalize_email(project.get("managerEmail") or "")

    # 1. Match by creator ID
    if user_id and p_creator and user_id == p_creator:
        return True

    # 2. Match by manager email
    if user_email and p_mgr_email and user_email == p_mgr_email:
        return True

    # 3. Fallback for seed demo projects (Alex Mercer)
    if user_email == "alex.mercer@company.com" and (not p_mgr_email or p_mgr_email == "alex.mercer@company.com"):
        if "alex" in (project.get("manager") or "").lower() or not p_creator or p_creator in ["None", "", "u1", "65f00990a0b1c2d3e4f50001"]:
            return True

    # Check user record in db by ID or Email
    db = mongo.get_db()
    if db is not None:
        user_doc = None
        if user_id:
            user_doc = db.users.find_one(mongo._build_id_query(user_id))
        if not user_doc and user_email:
            user_doc = db.users.find_one({"email": user_email})
        if user_doc:
            db_id = str(user_doc.get("_id") or user_doc.get("id") or "").strip()
            db_email = normalize_email(user_doc.get("email") or "")
            if db_id and p_creator and db_id == p_creator:
                return True
            if db_email and p_mgr_email and db_email == p_mgr_email:
                return True

    return False

def is_project_member_or_manager(project, request):
    if not project:
        return False
    if is_project_manager_or_creator(project, request):
        return True
    user_email = normalize_email(request.query_params.get("userEmail") or request.query_params.get("user") or request.headers.get("X-User-Email") or "")
    user_id = str(request.query_params.get("userId") or request.headers.get("X-User-Id") or "").strip()

    members = project.get("teamMembers", [])
    if isinstance(members, list):
        for m in members:
            if not isinstance(m, dict):
                continue
            m_email = normalize_email(m.get("email") or "")
            m_id = str(m.get("id") or m.get("_id") or m.get("userId") or "").strip()
            if user_id and m_id and user_id == m_id:
                return True
            if user_email and m_email and user_email == m_email:
                return True
    return False

class ProjectDetailView(APIView):
    def get(self, request, project_id):
        project = mongo.get_project_by_id(project_id)
        if not project:
            return Response({"error": "Project not found"}, status=status.HTTP_404_NOT_FOUND)
        return Response(project)

    def put(self, request, project_id):
        project = mongo.get_project_by_id(project_id)
        if not project:
            return Response({"error": "Project not found"}, status=status.HTTP_404_NOT_FOUND)
        if not is_project_manager_or_creator(project, request):
            return Response({
                "error": "Permission denied: Only the project manager can update project settings."
            }, status=status.HTTP_403_FORBIDDEN)
        updated = mongo.update_project(project_id, request.data)
        return Response(updated)

    def delete(self, request, project_id):
        project = mongo.get_project_by_id(project_id)
        if not project:
            return Response({"error": "Project not found"}, status=status.HTTP_404_NOT_FOUND)

        if not is_project_manager_or_creator(project, request):
            return Response({
                "error": "Permission denied: Only the project creator or manager can delete this project. Team members can leave the project instead."
            }, status=status.HTTP_403_FORBIDDEN)

        mongo.delete_project(project_id)
        return Response({"success": True, "message": "Project and associated tasks deleted"})

class ProjectLeaveView(APIView):
    def post(self, request, project_id):
        project = mongo.get_project_by_id(project_id)
        if not project:
            return Response({"error": "Project not found"}, status=status.HTTP_404_NOT_FOUND)

        user_data = dict(request.data or {})
        if not user_data.get("userEmail") and request.headers.get("X-User-Email"):
            user_data["userEmail"] = request.headers.get("X-User-Email")
        if not user_data.get("userId") and request.headers.get("X-User-Id"):
            user_data["userId"] = request.headers.get("X-User-Id")

        updated = mongo.leave_project(project_id, user_data)
        return Response(updated or {"success": True, "message": "Successfully left the project"})

class TaskListCreateView(APIView):
    def get(self, request):
        project_id = request.query_params.get("projectId")
        task_status = request.query_params.get("status")
        priority = request.query_params.get("priority")
        search = request.query_params.get("search")

        tasks = mongo.list_tasks(
            project_id=project_id,
            status=task_status,
            priority=priority,
            search=search
        )
        return Response(tasks)

    def post(self, request):
        data = request.data
        if not data.get("title"):
            return Response({"error": "Task title is required"}, status=status.HTTP_400_BAD_REQUEST)
        if not data.get("projectId"):
            return Response({"error": "Project ID is required"}, status=status.HTTP_400_BAD_REQUEST)
        
        project = mongo.get_project_by_id(data.get("projectId"))
        if project and not is_project_manager_or_creator(project, request):
            return Response({
                "error": "Permission denied: Only the project manager can create tasks in this project."
            }, status=status.HTTP_403_FORBIDDEN)

        created = mongo.create_task(data)
        return Response(created, status=status.HTTP_201_CREATED)

class TaskDetailView(APIView):
    def get(self, request, task_id):
        task = mongo.get_task_by_id(task_id)
        if not task:
            return Response({"error": "Task not found"}, status=status.HTTP_404_NOT_FOUND)
        return Response(task)

    def put(self, request, task_id):
        task = mongo.get_task_by_id(task_id)
        if not task:
            return Response({"error": "Task not found"}, status=status.HTTP_404_NOT_FOUND)
        
        project = mongo.get_project_by_id(task.get("projectId"))
        if project and not is_project_member_or_manager(project, request):
            return Response({
                "error": "Permission denied: Only project members or manager can update task."
            }, status=status.HTTP_403_FORBIDDEN)

        updated = mongo.update_task(task_id, request.data)
        return Response(updated)

    def delete(self, request, task_id):
        task = mongo.get_task_by_id(task_id)
        if not task:
            return Response({"error": "Task not found"}, status=status.HTTP_404_NOT_FOUND)

        project = mongo.get_project_by_id(task.get("projectId"))
        if project and not is_project_manager_or_creator(project, request):
            return Response({
                "error": "Permission denied: Only the project manager can delete tasks."
            }, status=status.HTTP_403_FORBIDDEN)

        user_name = request.query_params.get("userName") or "Project Manager"
        mongo.delete_task(task_id, user_name=user_name)
        return Response({"success": True, "message": "Task deleted"})

class TaskCommentView(APIView):
    def post(self, request, task_id):
        task = mongo.get_task_by_id(task_id)
        if not task:
            return Response({"error": "Task not found"}, status=status.HTTP_404_NOT_FOUND)
        text = request.data.get("text", "").strip()
        if not text:
            return Response({"error": "Comment text cannot be empty"}, status=status.HTTP_400_BAD_REQUEST)
        updated = mongo.add_task_comment(task_id, request.data)
        return Response(updated)

class TaskBatchOrderView(APIView):
    def post(self, request):
        items = request.data.get("items", [])
        if not isinstance(items, list):
            return Response({"error": "items must be a list of task updates"}, status=status.HTTP_400_BAD_REQUEST)
        updated_by = request.data.get("updatedBy") or request.headers.get("X-User-Username") or "Team Member"
        mongo.batch_update_tasks_order(items, updated_by=updated_by)
        return Response({"success": True, "updatedCount": len(items)})

class ProjectDailyActivityView(APIView):
    def get(self, request, project_id):
        project = mongo.get_project_by_id(project_id)
        if not project:
            return Response({"error": "Project not found"}, status=status.HTTP_404_NOT_FOUND)

        if not is_project_manager_or_creator(project, request):
            return Response({
                "error": "Permission denied: Only the project manager can view the daily activity audit."
            }, status=status.HTTP_403_FORBIDDEN)

        start_date = request.query_params.get("startDate") or request.query_params.get("from") or request.query_params.get("date")
        end_date = request.query_params.get("endDate") or request.query_params.get("to") or request.query_params.get("date")
        user_filter = request.query_params.get("user")
        data = mongo.get_project_daily_activities(
            project_id,
            start_date=start_date,
            end_date=end_date,
            user_filter=user_filter
        )
        return Response(data)

class ProjectActivityExportView(APIView):
    def get(self, request, project_id):
        project = mongo.get_project_by_id(project_id)
        if not project:
            return Response({"error": "Project not found"}, status=status.HTTP_404_NOT_FOUND)

        if not is_project_manager_or_creator(project, request):
            return Response({
                "error": "Permission denied: Only the project manager can export activity reports."
            }, status=status.HTTP_403_FORBIDDEN)

        start_date = request.query_params.get("startDate") or request.query_params.get("from") or request.query_params.get("date")
        end_date = request.query_params.get("endDate") or request.query_params.get("to") or request.query_params.get("date")
        user_filter = request.query_params.get("user")
        data = mongo.get_project_daily_activities(
            project_id,
            start_date=start_date,
            end_date=end_date,
            user_filter=user_filter
        )
        
        manager_name = project.get("manager") or "Project Manager"
        user_email = (request.query_params.get("userEmail") or request.headers.get("X-User-Email") or "").strip().lower()
        if user_email:
            db = mongo.get_db()
            if db is not None:
                u_doc = db.users.find_one({"email": user_email})
                if u_doc:
                    name_found = f"{u_doc.get('firstName', '')} {u_doc.get('lastName', '')}".strip()
                    if name_found:
                        manager_name = name_found

        xlsx_bytes = export_excel.generate_activity_excel(
            project=project,
            date_str=data["date"],
            activities=data["activities"],
            manager_name=manager_name,
            start_date=data["startDate"],
            end_date=data["endDate"]
        )

        proj_key = project.get("key", "PRJ")
        clean_tag = f"{data['startDate']}_to_{data['endDate']}" if data['startDate'] != data['endDate'] else data['startDate']
        filename = f"TaskFlow_{proj_key}_Activity_{clean_tag}.xlsx"
        response = HttpResponse(
            xlsx_bytes,
            content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        )
        response["Content-Disposition"] = f'attachment; filename="{filename}"'
        response["Access-Control-Expose-Headers"] = "Content-Disposition"
        return response

class TeamMembersListView(APIView):
    def get(self, request):
        owner = request.query_params.get("owner") or request.headers.get("X-User-Email") or request.headers.get("X-User-Id")
        members = mongo.list_team_members(owner=owner)
        return Response(members)

    def post(self, request):
        query = request.data.get("query") or request.data.get("email") or request.data.get("memberId")
        owner = request.data.get("owner") or request.query_params.get("owner") or request.headers.get("X-User-Email")
        owner_id = request.data.get("ownerId") or request.headers.get("X-User-Id")
        owner_email = request.data.get("ownerEmail") or request.headers.get("X-User-Email") or owner

        if not query:
            return Response({"error": "Please enter an email or employee/member ID to search."}, status=status.HTTP_400_BAD_REQUEST)
        try:
            member = mongo.add_team_member_by_query(query, owner=owner, owner_email=owner_email, owner_id=owner_id)
            return Response(member, status=status.HTTP_201_CREATED)
        except ValueError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({"error": "Failed to add team member: " + str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class TeamMemberDetailView(APIView):
    def delete(self, request, member_id):
        owner = request.query_params.get("owner") or request.headers.get("X-User-Email")
        mongo.delete_team_member(member_id, owner=owner)
        return Response({"success": True, "message": "Team member removed successfully"})



class AnalyticsView(APIView):
    def get(self, request):
        project_id = request.query_params.get("projectId")
        stats = mongo.get_project_analytics(project_id=project_id)
        return Response(stats)

class AuthRegisterView(APIView):
    def post(self, request):
        try:
            user = mongo.register_user(request.data)
            return Response(user, status=status.HTTP_201_CREATED)
        except ValueError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({"error": "Failed to register user: " + str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class AuthLoginView(APIView):
    def post(self, request):
        email = request.data.get("email") or request.data.get("username")
        password = request.data.get("password")
        if not email or not password:
            return Response({"error": "Email and password are required"}, status=status.HTTP_400_BAD_REQUEST)

        user = mongo.authenticate_user(email, password)
        if not user:
            return Response({"error": "Invalid email or password"}, status=status.HTTP_401_UNAUTHORIZED)
        return Response(user)


class AuthProfileView(APIView):
    def get(self, request):
        identifier = (
            request.query_params.get("userId")
            or request.query_params.get("id")
            or request.query_params.get("email")
            or request.headers.get("X-User-Email")
            or request.headers.get("X-User-Id")
        )
        if not identifier:
            return Response({"error": "User identifier is required"}, status=status.HTTP_400_BAD_REQUEST)
        profile = mongo.get_user_profile(identifier)
        if not profile:
            return Response({"error": "User not found"}, status=status.HTTP_404_NOT_FOUND)
        return Response(profile)

    def put(self, request):
        identifier = (
            request.data.get("userId")
            or request.data.get("id")
            or request.data.get("email")
            or request.headers.get("X-User-Email")
            or request.headers.get("X-User-Id")
        )
        if not identifier:
            return Response({"error": "User identifier is required"}, status=status.HTTP_400_BAD_REQUEST)
        try:
            updated = mongo.update_user_profile(identifier, request.data)
            return Response(updated)
        except ValueError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({"error": "Failed to update profile: " + str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class AuthChangePasswordView(APIView):
    def post(self, request):
        identifier = (
            request.data.get("userId")
            or request.data.get("id")
            or request.data.get("email")
            or request.headers.get("X-User-Email")
            or request.headers.get("X-User-Id")
        )
        current_password = request.data.get("currentPassword")
        new_password = request.data.get("newPassword")

        if not identifier:
            return Response({"error": "User identifier is required"}, status=status.HTTP_400_BAD_REQUEST)
        if not current_password:
            return Response({"error": "Current password is required"}, status=status.HTTP_400_BAD_REQUEST)
        if not new_password:
            return Response({"error": "New password is required"}, status=status.HTTP_400_BAD_REQUEST)
        if len(new_password) < 6:
            return Response({"error": "New password must be at least 6 characters long"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            res = mongo.change_user_password(identifier, current_password, new_password)
            return Response(res, status=status.HTTP_200_OK)
        except ValueError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({"error": "Failed to change password: " + str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class NotificationListView(APIView):
    def get(self, request):
        user_email = (
            request.query_params.get("userEmail")
            or request.query_params.get("email")
        )
        if not user_email or user_email.strip() == "[object Object]":
            user_email = request.headers.get("X-User-Email") or request.headers.get("x-user-email")
        
        if not user_email or user_email.strip() == "[object Object]":
            return Response({"error": "userEmail is required"}, status=status.HTTP_400_BAD_REQUEST)
        notifs = mongo.list_notifications(user_email)
        return Response(notifs)


class NotificationMarkReadView(APIView):
    def post(self, request):
        notif_id = request.data.get("id") or request.data.get("notificationId")
        user_email = request.data.get("userEmail") or request.headers.get("X-User-Email")
        mark_all = bool(request.data.get("all", False))
        res = mongo.mark_notification_read(notification_id=notif_id, user_email=user_email, mark_all=mark_all)
        return Response(res)


class NotificationRespondTeamRequestView(APIView):
    def post(self, request):
        notif_id = request.data.get("notificationId") or request.data.get("id")
        action = request.data.get("action")  # 'accept' | 'decline'
        user_email = request.data.get("userEmail") or request.headers.get("X-User-Email")
        user_id = request.data.get("userId") or request.headers.get("X-User-Id")

        if not notif_id or not action:
            return Response({"error": "notificationId and action ('accept'|'decline') are required."}, status=status.HTTP_400_BAD_REQUEST)
        try:
            res = mongo.respond_team_request(notif_id, action, user_email=user_email, user_id=user_id)
            return Response(res)
        except ValueError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class TeamSendRequestView(APIView):
    def post(self, request):
        query = request.data.get("query") or request.data.get("email")
        sender_email = request.data.get("senderEmail") or request.headers.get("X-User-Email")
        sender_id = request.data.get("senderId") or request.headers.get("X-User-Id")
        sender_name = request.data.get("senderName")
        if not query:
            return Response({"error": "Please enter an email or Employee ID to send invitation."}, status=status.HTTP_400_BAD_REQUEST)
        try:
            res = mongo.send_team_request(sender_email=sender_email, query_str=query, sender_id=sender_id, sender_name=sender_name)
            return Response(res, status=status.HTTP_201_CREATED)
        except ValueError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)



