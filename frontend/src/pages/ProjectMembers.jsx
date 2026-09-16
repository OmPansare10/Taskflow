import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function ProjectMembers() {
  const { id } = useParams();
  const { user } = useAuth();

  const [project, setProject] = useState(null);
  const [members, setMembers] = useState([]);
  const [teamList, setTeamList] = useState([]);

  const [accountSearch, setAccountSearch] = useState("");
  const [accountResult, setAccountResult] = useState(null);
  const [checkingAccount, setCheckingAccount] = useState(false);
  const [memberSearch, setMemberSearch] = useState("");

  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [addingMemberId, setAddingMemberId] = useState(null);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const currentUserId = user?.id || user?._id;
  const isProjectOwner = Boolean(
    project &&
    currentUserId &&
    String(project.owner_id || project.ownerId) === String(currentUserId)
  );

  const isAccountOwner = Boolean(
    accountResult &&
    project &&
    String(project.owner_id || project.ownerId) === String(accountResult.id)
  );

  const isAccountMember = Boolean(
    accountResult &&
    members.some(
      (m) => String(m.id || m._id || m.user_id || m) === String(accountResult.id)
    )
  );

  const filteredTeamMembers = teamList.filter((member) => {
    const search = memberSearch.toLowerCase().trim();
    const memberId = member.id || member._id || member.user_id || "";

    return `${member.name || ""} ${member.email || ""} ${memberId}`
      .toLowerCase()
      .includes(search);
  });

  // =====================================================
  // FETCH PROJECT
  // =====================================================
  const fetchProject = async () => {
    const token = localStorage.getItem("access_token");
    const response = await fetch(
      `http://127.0.0.1:8000/projects/${id}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.detail || "Failed to load project");
    }
    setProject(data);
  };

  // =====================================================
  // FETCH PROJECT MEMBERS
  // =====================================================
  const fetchMembers = async () => {
    const token = localStorage.getItem("access_token");
    const response = await fetch(
      `http://127.0.0.1:8000/projects/${id}/members`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.detail || "Failed to load members");
    }

    if (Array.isArray(data)) {
      setMembers(data);
    } else {
      setMembers(data.members || []);
    }
  };

  // =====================================================
  // FETCH USER'S GLOBAL TEAM
  // =====================================================
  const fetchTeam = async () => {
    try {
      const token = localStorage.getItem("access_token");
      const response = await fetch("http://127.0.0.1:8000/team/members", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setTeamList(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error("Failed to load user team", err);
    }
  };

  // =====================================================
  // LOAD PAGE
  // =====================================================
  useEffect(() => {
    const loadPage = async () => {
      try {
        setLoading(true);
        setError("");
        await Promise.all([
          fetchProject(),
          fetchMembers(),
          fetchTeam(),
        ]);
      } catch (err) {
        console.error(err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadPage();
  }, [id]);

  // =====================================================
  // FIND ACCOUNT
  // =====================================================
  const handleFindAccount = async (e, directQuery) => {
    if (e) e.preventDefault();
    setSuccess("");

    const query = directQuery !== undefined ? directQuery : accountSearch;
    if (!query || !query.trim()) {
      setError("Please enter an email or employee ID.");
      setAccountResult(null);
      return;
    }

    try {
      setCheckingAccount(true);
      setError("");
      setAccountResult(null);

      const token = localStorage.getItem("access_token");
      const response = await fetch(
        `http://127.0.0.1:8000/auth/users/search?identifier=${encodeURIComponent(query.trim())}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || "No registered account found.");
      }
      setAccountResult(data);
    } catch (err) {
      setError(err.message || "No registered account found.");
      setAccountResult(null);
    } finally {
      setCheckingAccount(false);
    }
  };

  // =====================================================
  // ADD SEARCHED ACCOUNT TO PROJECT
  // =====================================================
  const handleAddMember = async () => {
    if (!accountResult) {
      setError("Please find a registered account first.");
      return;
    }

    try {
      setAdding(true);
      setError("");
      setSuccess("");

      const token = localStorage.getItem("access_token");
      const response = await fetch(
        `http://127.0.0.1:8000/projects/${id}/members`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            user_id: accountResult.id,
          }),
        }
      );

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || "Failed to add member to project");
      }

      setSuccess("Member added to project successfully.");
      await Promise.all([fetchMembers(), fetchProject(), fetchTeam()]);
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to add member to project");
    } finally {
      setAdding(false);
    }
  };

  // =====================================================
  // ADD TEAM MEMBER TO PROJECT (1-CLICK FROM YOUR TEAM)
  // =====================================================
  const handleAddTeamMemberToProject = async (targetUserId) => {
    try {
      setAddingMemberId(String(targetUserId));
      setError("");
      setSuccess("");

      const token = localStorage.getItem("access_token");
      const response = await fetch(
        `http://127.0.0.1:8000/projects/${id}/members`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            user_id: targetUserId,
          }),
        }
      );

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || "Failed to add member to project");
      }

      setSuccess("Member added to project successfully.");
      await Promise.all([fetchMembers(), fetchProject(), fetchTeam()]);
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to add member to project");
    } finally {
      setAddingMemberId(null);
    }
  };

  // =====================================================
  // REMOVE MEMBER FROM PROJECT
  // =====================================================
  const handleRemoveMember = async (memberId) => {
    const confirmed = window.confirm(
      "Remove this member from the project?"
    );

    if (!confirmed) {
      return;
    }

    try {
      setError("");
      setSuccess("");

      const token = localStorage.getItem("access_token");
      const response = await fetch(
        `http://127.0.0.1:8000/projects/${id}/members/${memberId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || "Failed to remove member from project");
      }

      setSuccess("Member removed from project successfully.");
      await Promise.all([fetchMembers(), fetchProject(), fetchTeam()]);
    } catch (err) {
      console.error(err);
      setError(err.message);
    }
  };

  // =====================================================
  // LOADING
  // =====================================================
  if (loading) {
    return (
      <div className="project-page-loading">
        <div className="loading-text">
          Loading team...
        </div>
      </div>
    );
  }

  // =====================================================
  // UI
  // =====================================================
  return (
    <div className="project-page">

      {/* ================= BACK ================= */}
      <Link
        to={`/project/${id}`}
        className="back-link"
      >
        ← Back to Project
      </Link>

      {/* ================= HEADER ================= */}
      <div className="members-header">
        <div>
          <p className="small-text">
            {project?.name}
          </p>
          <h1>
            Team Members
          </h1>
          <p>
            Manage people who have access to this project.
          </p>
        </div>
      </div>

      {/* ================= TABS ================= */}
      <div className="project-tabs glass">
        <Link
          to={`/project/${id}`}
          className="project-tab"
        >
          Overview
        </Link>
        <Link
          to={`/project/${id}/tasks`}
          className="project-tab"
        >
          Tasks
        </Link>
        <Link
          to={`/project/${id}/members`}
          className="project-tab active"
        >
          Team
        </Link>
      </div>

      {/* ================= ERROR ================= */}
      {error && (
        <div className="auth-error members-message">
          {error}
        </div>
      )}

      {/* ================= SUCCESS ================= */}
      {success && (
        <div className="auth-success members-message">
          {success}
        </div>
      )}

      <div className="members-layout">

        {/* =================================================
            ADD MEMBER (LEFT PANEL)
        ================================================= */}
        {isProjectOwner ? (
          <section className="member-panel glass">
            <h2>Add Member</h2>
            <p className="member-panel-description">
              Assign members from your team to this project, or search for a registered user.
            </p>

            <div className="project-team-picker">
              <label>Your Team</label>

              <div className="project-team-search">
                <span>🔍</span>
                <input
                  type="search"
                  placeholder="Search team members..."
                  value={memberSearch}
                  onChange={(event) => setMemberSearch(event.target.value)}
                />
              </div>

              <div className="project-team-picker-list">
                {filteredTeamMembers.length === 0 ? (
                  <p className="project-team-picker-empty">
                    {teamList.length === 0
                      ? "No members in your team yet. Add members on the Team page."
                      : "No matching team member."}
                  </p>
                ) : (
                  filteredTeamMembers.map((teamMember) => {
                    const memberId = teamMember._id || teamMember.id;
                    const memberName = teamMember.name || "Team Member";
                    const memberRole =
                      teamMember.role === "Other"
                        ? teamMember.custom_role || "Other"
                        : teamMember.role || "Developer";
                    const isMemberInProject = members.some(
                      (m) => String(m.id || m._id || m.user_id || m) === String(memberId)
                    );

                    return (
                      <div className="project-team-picker-row" key={memberId}>
                        <div className="project-team-picker-person">
                          <span className="picker-avatar">
                            {memberName.charAt(0).toUpperCase()}
                          </span>
                          <span>
                            <strong>{memberName}</strong>
                            <small className="picker-member-role">
                              {memberRole}
                            </small>
                            <small>{teamMember.email || memberId}</small>
                          </span>
                        </div>

                        {isMemberInProject ? (
                          <span className="picker-in-project-badge">
                            In Project
                          </span>
                        ) : (
                          <button
                            type="button"
                            className="picker-add-button"
                            disabled={addingMemberId === String(memberId)}
                            onClick={() => handleAddTeamMemberToProject(memberId)}
                          >
                            {addingMemberId === String(memberId)
                              ? "Adding..."
                              : "+ Add to Project"}
                          </button>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <form onSubmit={handleFindAccount} className="team-account-search">
              <input
                type="search"
                placeholder="Email or employee ID"
                value={accountSearch}
                onChange={(e) => setAccountSearch(e.target.value)}
              />
              <button
                type="submit"
                className="secondary-button"
                disabled={checkingAccount}
              >
                {checkingAccount ? "Searching..." : "Find Account"}
              </button>
            </form>

            {accountResult && (
              <div className="account-result-card glass">
                <span className="account-result-badge">Account Found</span>
                <div className="account-result-body">
                  <div className="account-result-avatar">
                    {accountResult.avatar || accountResult.name?.charAt(0)?.toUpperCase() || "U"}
                  </div>
                  <div className="account-result-info">
                    <strong>{accountResult.name}</strong>
                    <span className="account-result-email">{accountResult.email}</span>
                    <span className="member-role">
                      {accountResult.role === "Other"
                        ? accountResult.custom_role || "Other"
                        : accountResult.role || "Developer"}
                    </span>
                  </div>
                </div>

                <div className="account-result-actions">
                  {isAccountOwner ? (
                    <button type="button" className="secondary-button" disabled>
                      Project Owner
                    </button>
                  ) : isAccountMember ? (
                    <button type="button" className="secondary-button" disabled>
                      Already in Project
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="primary-button"
                      onClick={handleAddMember}
                      disabled={adding}
                    >
                      {adding ? "Adding..." : "Add to Project"}
                    </button>
                  )}
                </div>
              </div>
            )}
          </section>
        ) : (
          <section className="member-panel glass member-permission-panel">
            <h2>Project Team</h2>
            <p className="member-panel-description">
              Only the project manager can add members to this project.
            </p>
          </section>
        )}

        {/* =================================================
            MEMBERS LIST (RIGHT PANEL)
        ================================================= */}
        <section className="members-list-panel glass">
          <div className="members-list-header">
            <div>
              <h2>Project Team</h2>
              <p>
                {members.length} member{members.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>

          {/* ================= EMPTY ================= */}
          {members.length === 0 && (
            <div className="empty-panel">
              <div className="empty-icon">👥</div>
              <h3>No members yet</h3>
              <p>Add members from your team to this project.</p>
            </div>
          )}

          {/* ================= MEMBERS ================= */}
          {members.length > 0 && (
            <div className="members-list">
              {members.map((member, index) => {
                const memberId =
                  member._id || member.id || member.user_id || member;
                const memberName = member.name || "Team Member";
                const memberEmail = member.email || memberId;
                const memberRole =
                  member.role === "Other"
                    ? member.custom_role || "Other"
                    : member.role || "Developer";
                const avatar =
                  member.avatar ||
                  memberName?.charAt(0)?.toUpperCase() ||
                  "U";

                return (
                  <div
                    className="member-row"
                    key={memberId || index}
                  >
                    <div className="member-profile">
                      <div className="member-avatar">
                        {avatar}
                      </div>
                      <div className="member-details">
                        <strong>{memberName}</strong>
                        <span>{memberEmail} · {memberRole}</span>
                      </div>
                    </div>

                    {isProjectOwner && (
                      <button
                        className="remove-member-button"
                        onClick={() => handleRemoveMember(memberId)}
                      >
                        Remove
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

      </div>

    </div>
  );
}

export default ProjectMembers;