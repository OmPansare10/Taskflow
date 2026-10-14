import threading
from datetime import datetime, timezone
from bson import ObjectId
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from . import mongo

class AutomaticTeamMemberAssignmentTests(TestCase):
    def setUp(self):
        self.db = mongo.get_db()
        self.client = APIClient()
        self.test_prefix = f"test_{int(datetime.now(timezone.utc).timestamp() * 1000)}"
        self.created_user_ids = []
        self.created_project_ids = []
        self.created_task_ids = []

    def tearDown(self):
        if self.db is not None:
            if self.created_task_ids:
                self.db.tasks.delete_many({"_id": {"$in": self.created_task_ids}})
            if self.created_project_ids:
                self.db.projects.delete_many({"_id": {"$in": self.created_project_ids}})
                self.db.project_members.delete_many({"project_id": {"$in": self.created_project_ids}})
                self.db.activities.delete_many({"project_id": {"$in": self.created_project_ids}})
            if self.created_user_ids:
                self.db.users.delete_many({"_id": {"$in": self.created_user_ids}})

    def create_user(self, name, email, role="Developer", is_active=True, status="active"):
        uid = ObjectId()
        parts = name.split()
        first_name = parts[0]
        last_name = parts[1] if len(parts) > 1 else "User"
        user_doc = {
            "_id": uid,
            "first_name": first_name,
            "last_name": last_name,
            "email": f"{self.test_prefix}_{email}",
            "role": role,
            "is_active": is_active,
            "status": status,
            "created_at": datetime.now(timezone.utc)
        }
        self.db.users.insert_one(user_doc)
        self.created_user_ids.append(uid)
        return uid, user_doc

    def create_project(self, name, manager_uid):
        pid = ObjectId()
        proj_doc = {
            "_id": pid,
            "name": f"{self.test_prefix} {name}",
            "owner_id": manager_uid,
            "status": "In Progress",
            "start_date": "2026-10-14",
            "due_date": "2026-11-14",
            "created_at": datetime.now(timezone.utc)
        }
        self.db.projects.insert_one(proj_doc)
        self.created_project_ids.append(pid)

        # Manager in project_members
        self.db.project_members.insert_one({
            "_id": ObjectId(),
            "project_id": pid,
            "user_id": manager_uid,
            "role": "Project Manager",
            "joined_at": datetime.now(timezone.utc)
        })
        return pid

    # ---------------- Scenario A ----------------
    # Project has zero members; Team has three members.
    # Expected: No one is available for assignment when zero members are in the project.
    # When a person is added to the project, only that person is available in the assigned section.
    def test_scenario_a_zero_project_members_three_team_members(self):
        manager_id, _ = self.create_user("Manager Alpha", "mgr_a@example.com", role="Project Manager")
        m1_id, _ = self.create_user("Member One", "m1@example.com", role="Backend Dev")
        m2_id, _ = self.create_user("Member Two", "m2@example.com", role="Frontend Dev")
        m3_id, _ = self.create_user("Member Three", "m3@example.com", role="QA Engineer")

        # Create workspace project for manager so team members belong to manager's team
        ws_pid = self.create_project("Workspace A", manager_id)
        for mid in [m1_id, m2_id, m3_id]:
            self.db.project_members.insert_one({
                "_id": ObjectId(),
                "project_id": ws_pid,
                "user_id": mid,
                "role": "Developer",
                "joined_at": datetime.now(timezone.utc)
            })

        # New project with ZERO non-manager members
        target_pid = self.create_project("Zero Member Project", manager_id)

        # Check eligible assignees endpoint: must be empty since no members are added to target_pid
        res = mongo.get_eligible_assignees_for_project(target_pid, user_id=str(manager_id))
        self.assertEqual(res["projectMemberCount"], 0)
        self.assertEqual(res["eligibleAssignees"], [])
        self.assertIsNone(res["recommendedAssignee"])

        # Creating a task with no one in the project results in an unassigned task
        t1 = mongo.create_task({
            "projectId": str(target_pid),
            "title": "Task 1",
            "created_by": str(manager_id)
        })
        self.created_task_ids.append(ObjectId(t1["id"]))
        self.assertEqual(t1["assigned_to"], "")
        self.assertEqual(t1["assigneeName"], "Unassigned")

        # Now add ONLY Member One to the project
        self.db.project_members.insert_one({
            "_id": ObjectId(),
            "project_id": target_pid,
            "user_id": m1_id,
            "role": "Backend Dev",
            "joined_at": datetime.now(timezone.utc)
        })

        # Eligible assignees now ONLY contains Member One
        res_after = mongo.get_eligible_assignees_for_project(target_pid, user_id=str(manager_id))
        self.assertEqual(res_after["projectMemberCount"], 1)
        candidate_ids = [a["id"] for a in res_after["eligibleAssignees"]]
        self.assertEqual(candidate_ids, [str(m1_id)])
        self.assertNotIn(str(m2_id), candidate_ids)
        self.assertNotIn(str(m3_id), candidate_ids)

        # Next task created is assigned to the added member
        t2 = mongo.create_task({
            "projectId": str(target_pid),
            "title": "Task 2",
            "created_by": str(manager_id)
        })
        self.created_task_ids.append(ObjectId(t2["id"]))
        self.assertEqual(t2["assigned_to"], str(m1_id))

    # ---------------- Scenario B ----------------
    # Project has one member.
    # Expected: Assign new tasks to that eligible member.
    def test_scenario_b_project_has_one_member(self):
        manager_id, _ = self.create_user("Manager Beta", "mgr_b@example.com", role="Project Manager")
        solo_id, _ = self.create_user("Solo Member", "solo@example.com", role="Fullstack Dev")
        pid = self.create_project("Solo Project", manager_id)

        # Add 1 member to project
        self.db.project_members.insert_one({
            "_id": ObjectId(),
            "project_id": pid,
            "user_id": solo_id,
            "role": "Fullstack Dev",
            "joined_at": datetime.now(timezone.utc)
        })

        res = mongo.get_eligible_assignees_for_project(pid, user_id=str(manager_id))
        self.assertEqual(res["source"], "project")
        self.assertEqual(res["projectMemberCount"], 1)
        self.assertEqual(res["recommendedAssignee"]["id"], str(solo_id))

        t = mongo.create_task({
            "projectId": str(pid),
            "title": "Solo Task",
            "created_by": str(manager_id)
        })
        self.created_task_ids.append(ObjectId(t["id"]))
        self.assertEqual(t["assigned_to"], str(solo_id))

    # ---------------- Scenario C ----------------
    # Project has five members.
    # Expected: Assign tasks among eligible project members according to the selected strategy.
    def test_scenario_c_project_has_five_members(self):
        manager_id, _ = self.create_user("Manager Gamma", "mgr_c@example.com", role="Project Manager")
        member_ids = []
        for i in range(5):
            mid, _ = self.create_user(f"TeamMember {i+1}", f"tm{i+1}@example.com")
            member_ids.append(mid)

        pid = self.create_project("Five Members Project", manager_id)
        for mid in member_ids:
            self.db.project_members.insert_one({
                "_id": ObjectId(),
                "project_id": pid,
                "user_id": mid,
                "role": "Developer",
                "joined_at": datetime.now(timezone.utc)
            })

        res = mongo.get_eligible_assignees_for_project(pid, user_id=str(manager_id))
        self.assertEqual(res["source"], "project")
        self.assertEqual(res["projectMemberCount"], 5)

        # Create 5 tasks
        created_tasks = []
        for i in range(5):
            t = mongo.create_task({
                "projectId": str(pid),
                "title": f"Task {i+1}",
                "created_by": str(manager_id)
            })
            self.created_task_ids.append(ObjectId(t["id"]))
            created_tasks.append(t)

        assigned_uids = {t["assigned_to"] for t in created_tasks}
        self.assertEqual(len(assigned_uids), 5)
        for mid in member_ids:
            self.assertIn(str(mid), assigned_uids)

    # ---------------- Scenario D ----------------
    # Project has zero members; Team has zero eligible members.
    # Expected: Display a clear message and do not create an invalid user assignment.
    def test_scenario_d_zero_members_anywhere(self):
        # Create an isolated manager with no other active users in the system
        manager_id, _ = self.create_user("Lone Manager", "lone_mgr@example.com", role="Project Manager")
        pid = self.create_project("Empty Project", manager_id)

        # Snapshot active users before deactivation so we can restore them accurately
        active_uids = [
            u["_id"] for u in self.db.users.find({"is_active": {"$ne": False}}, {"_id": 1})
        ]
        # Deactivate all other test users in db temporarily for this test
        self.db.users.update_many(
            {"_id": {"$ne": manager_id}},
            {"$set": {"is_active": False}}
        )

        try:
            res = mongo.get_eligible_assignees_for_project(pid, user_id=str(manager_id))
            self.assertEqual(res["source"], "project")
            self.assertEqual(res["projectMemberCount"], 0)
            self.assertEqual(res["eligibleAssignees"], [])
            self.assertIsNone(res["recommendedAssignee"])
            self.assertEqual(res["message"], "No members added to this project yet.")

            # Creating a task with zero members creates an unassigned task
            task = mongo.create_task({
                "projectId": str(pid),
                "title": "Task in empty project",
                "created_by": str(manager_id)
            })
            self.created_task_ids.append(ObjectId(task["id"]))
            self.assertEqual(task["assigned_to"], "")
            self.assertEqual(task["assigneeName"], "Unassigned")

            # Attempting to assign to a non-existent or non-member user raises ValueError
            with self.assertRaises(ValueError):
                mongo.create_task({
                    "projectId": str(pid),
                    "title": "Invalid Assignee Task",
                    "assigned_to": str(ObjectId()),
                    "created_by": str(manager_id)
                })
        finally:
            # Re-activate all previously active users
            self.db.users.update_many(
                {"_id": {"$in": active_uids}},
                {"$set": {"is_active": True}}
            )

    # ---------------- Scenario E ----------------
    # A member is deactivated.
    # Expected: Exclude the member from future automatic assignments.
    def test_scenario_e_deactivated_member_excluded(self):
        manager_id, _ = self.create_user("Manager Delta", "mgr_d@example.com", role="Project Manager")
        active_mid, _ = self.create_user("Active Dev", "active@example.com")
        inactive_mid, _ = self.create_user("Inactive Dev", "inactive@example.com", is_active=False, status="inactive")

        pid = self.create_project("Deactivated Test Project", manager_id)
        # Add both to project members
        for mid in [active_mid, inactive_mid]:
            self.db.project_members.insert_one({
                "_id": ObjectId(),
                "project_id": pid,
                "user_id": mid,
                "role": "Developer",
                "joined_at": datetime.now(timezone.utc)
            })

        res = mongo.get_eligible_assignees_for_project(pid, user_id=str(manager_id))
        candidate_ids = [a["id"] for a in res["eligibleAssignees"] if a["id"] != str(manager_id)]
        self.assertIn(str(active_mid), candidate_ids)
        self.assertNotIn(str(inactive_mid), candidate_ids)

        # Automatic assignment must choose the active member
        t = mongo.create_task({
            "projectId": str(pid),
            "title": "Active Only Task",
            "created_by": str(manager_id)
        })
        self.created_task_ids.append(ObjectId(t["id"]))
        self.assertEqual(t["assigned_to"], str(active_mid))

    # ---------------- Scenario F ----------------
    # A task is created via API / Kanban Board.
    # Expected: Automatically assign the task and display the correct assignee.
    def test_scenario_f_api_task_creation_automatic_assignee(self):
        manager_id, _ = self.create_user("Manager Epsilon", "mgr_e@example.com", role="Project Manager")
        mid, _ = self.create_user("Kanban Assignee", "kanban@example.com", role="Frontend Engineer")

        pid = self.create_project("Kanban Project", manager_id)
        self.db.project_members.insert_one({
            "_id": ObjectId(),
            "project_id": pid,
            "user_id": mid,
            "role": "Frontend Engineer",
            "joined_at": datetime.now(timezone.utc)
        })

        client = APIClient()
        response = client.post(
            "/api/tasks/",
            {
                "projectId": str(pid),
                "title": "Kanban Card Task",
                "status": "todo",
                "priority": "high",
                "createdBy": str(manager_id)
            },
            format="json",
            HTTP_X_USER_ID=str(manager_id)
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        task_data = response.json()
        self.created_task_ids.append(ObjectId(task_data["id"]))

        # Verify assignee details
        self.assertEqual(task_data["assigned_to"], str(mid))
        self.assertIsNotNone(task_data.get("assignee"))
        self.assertEqual(task_data["assignee"]["id"], str(mid))
        self.assertEqual(task_data["assignee"]["role"], "Frontend Engineer")
        self.assertTrue(bool(task_data["assignee"]["avatar"]))

    # ---------------- Scenario G ----------------
    # A project member is added while the page is open.
    # Expected: Refresh the member list and use the updated project membership for subsequent assignments.
    def test_scenario_g_member_added_updates_subsequent_assignments(self):
        manager_id, _ = self.create_user("Manager Zeta", "mgr_z@example.com", role="Project Manager")
        m1_id, _ = self.create_user("First Member", "first@example.com")
        pid = self.create_project("Dynamic Membership Project", manager_id)

        # Initially 1 member
        self.db.project_members.insert_one({
            "_id": ObjectId(),
            "project_id": pid,
            "user_id": m1_id,
            "role": "Dev",
            "joined_at": datetime.now(timezone.utc)
        })

        # Task 1 goes to m1
        t1 = mongo.create_task({
            "projectId": str(pid),
            "title": "Task 1",
            "created_by": str(manager_id)
        })
        self.created_task_ids.append(ObjectId(t1["id"]))
        self.assertEqual(t1["assigned_to"], str(m1_id))

        # Now add Member 2 to the project
        m2_id, _ = self.create_user("Second Member", "second@example.com")
        self.db.project_members.insert_one({
            "_id": ObjectId(),
            "project_id": pid,
            "user_id": m2_id,
            "role": "Dev",
            "joined_at": datetime.now(timezone.utc)
        })

        # Check eligible assignees - project member count is now 2
        res = mongo.get_eligible_assignees_for_project(pid, user_id=str(manager_id))
        self.assertEqual(res["projectMemberCount"], 2)

        # Task 2 must go to m2 (m1 has 1 active task, m2 has 0 active tasks)
        t2 = mongo.create_task({
            "projectId": str(pid),
            "title": "Task 2",
            "created_by": str(manager_id)
        })
        self.created_task_ids.append(ObjectId(t2["id"]))
        self.assertEqual(t2["assigned_to"], str(m2_id))

    # ---------------- Scenario H ----------------
    # Two tasks are created simultaneously.
    # Expected: Avoid duplicate or inconsistent assignments where possible, using appropriate backend concurrency controls.
    def test_scenario_h_concurrent_task_creation(self):
        manager_id, _ = self.create_user("Manager Eta", "mgr_h@example.com", role="Project Manager")
        m1_id, _ = self.create_user("Conc Member 1", "c1@example.com")
        m2_id, _ = self.create_user("Conc Member 2", "c2@example.com")

        pid = self.create_project("Concurrency Project", manager_id)
        for mid in [m1_id, m2_id]:
            self.db.project_members.insert_one({
                "_id": ObjectId(),
                "project_id": pid,
                "user_id": mid,
                "role": "Developer",
                "joined_at": datetime.now(timezone.utc)
            })

        results = []
        errors = []

        def worker(title):
            try:
                t = mongo.create_task({
                    "projectId": str(pid),
                    "title": title,
                    "created_by": str(manager_id)
                })
                results.append(t)
            except Exception as e:
                errors.append(e)

        thread1 = threading.Thread(target=worker, args=("Concurrent Task 1",))
        thread2 = threading.Thread(target=worker, args=("Concurrent Task 2",))

        thread1.start()
        thread2.start()

        thread1.join()
        thread2.join()

        self.assertEqual(len(errors), 0)
        self.assertEqual(len(results), 2)
        for t in results:
            self.created_task_ids.append(ObjectId(t["id"]))

        assigned_uids = {t["assigned_to"] for t in results}
        # Concurrency control should ensure one task went to m1 and one went to m2
        self.assertEqual(len(assigned_uids), 2)
        self.assertEqual(assigned_uids, {str(m1_id), str(m2_id)})

    # ---------------- Unassigned Task in 0-member Project ----------------
    def test_zero_project_members_unassigned_task_creation(self):
        manager_id, _ = self.create_user("Manager Z", "mgr_z@example.com", role="Project Manager")
        self.create_user("Team Member 1", "tm1@example.com", role="Developer")
        pid = self.create_project("Unassigned Project", manager_id)

        # 1. Check eligible assignees: recommendedAssignee must be None when project has 0 members
        res = mongo.get_eligible_assignees_for_project(pid, user_id=str(manager_id))
        self.assertEqual(res["projectMemberCount"], 0)
        self.assertIsNone(res["recommendedAssignee"])

        # 2. Creating a task with assigneeName 'Unassigned' creates an Unassigned task
        task = mongo.create_task({
            "projectId": str(pid),
            "title": "Task with No Assignee",
            "assigneeName": "Unassigned",
            "assigned_to": None,
            "created_by": str(manager_id)
        })
        self.created_task_ids.append(ObjectId(task["id"]))

        self.assertEqual(task["assigned_to"], "")
        self.assertIsNone(task["assignee"])
        self.assertEqual(task["assigneeName"], "Unassigned")
