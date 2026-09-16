import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./Team.css";

function Team() {
  const { user } = useAuth();
  const [teamMembers, setTeamMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [removingMemberId, setRemovingMemberId] = useState(null);
  const [accountSearch, setAccountSearch] = useState("");
  const [accountResult, setAccountResult] = useState(null);
  const [checkingAccount, setCheckingAccount] = useState(false);
  const [addingMember, setAddingMember] = useState(false);

  const loadTeam = async () => {
    try {
      setLoading(true);
      setError("");

      const token = localStorage.getItem("access_token");
      const headers = {
        Authorization: `Bearer ${token}`,
      };

      const response = await fetch("http://127.0.0.1:8000/team/members", {
        headers,
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Failed to load team members");
      }

      setTeamMembers(Array.isArray(data) ? data : []);
    } catch (loadError) {
      console.error(loadError);
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTeam();
  }, [user]);

  const handleRemoveMember = async (member) => {
    const memberId = member.id || member._id;
    const confirmed = window.confirm(
      `Remove ${member.name || "this member"} from your team?`
    );

    if (!confirmed || !memberId) {
      return;
    }

    try {
      setRemovingMemberId(String(memberId));
      setError("");
      setSuccess("");
      const token = localStorage.getItem("access_token");

      const response = await fetch(
        `http://127.0.0.1:8000/team/members/${memberId}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || "Failed to remove member");
      }

      setSuccess(`${member.name || "Member"} removed from team.`);
      await loadTeam();
    } catch (removeError) {
      console.error(removeError);
      setError(removeError.message);
    } finally {
      setRemovingMemberId(null);
    }
  };

  const handleFindAccount = async (event) => {
    event.preventDefault();
    setSuccess("");

    if (!accountSearch.trim()) {
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
        `http://127.0.0.1:8000/auth/users/search?identifier=${encodeURIComponent(accountSearch.trim())}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "No registered account found.");
      }

      setAccountResult(data);
    } catch (lookupError) {
      setError(lookupError.message || "No registered account found.");
      setAccountResult(null);
    } finally {
      setCheckingAccount(false);
    }
  };

  const handleAddFoundMember = async () => {
    if (!accountResult) {
      setError("Find a registered account before adding a member.");
      return;
    }

    try {
      setAddingMember(true);
      setError("");
      setSuccess("");
      const token = localStorage.getItem("access_token");

      const response = await fetch(
        "http://127.0.0.1:8000/team/members",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ user_id: accountResult.id }),
        }
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Failed to add member to team");
      }

      setSuccess(`${accountResult.name} added to your team successfully.`);
      await loadTeam();
    } catch (addError) {
      setError(addError.message || "Failed to add member to team");
    } finally {
      setAddingMember(false);
    }
  };

  const currentUserId = user?.id || user?._id;
  const isCurrentUser = Boolean(
    accountResult &&
    String(accountResult.id || accountResult._id) === String(currentUserId)
  );

  const isAlreadyInTeam = Boolean(
    accountResult &&
    teamMembers.some(
      (m) => String(m.id || m._id) === String(accountResult.id || accountResult._id)
    )
  );

  const normalizedSearch = searchTerm.toLowerCase().trim();
  const filteredMembers = teamMembers.filter((member) => {
    const employeeId = member.employee_id || member.id || member._id || "";
    const searchableMemberData = [
      member.name,
      member.email,
      employeeId,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return searchableMemberData.includes(normalizedSearch);
  });

  return (
    <div className="team-page">

      <div className="page-header">
        <div>
          <Link to="/" className="back-link">
            ← Dashboard
          </Link>

          <h1>Team</h1>

          <p>
            Manage your team members
          </p>
        </div>

        <Link to="/projects" className="primary-button">
          View Projects
        </Link>
      </div>

      {loading && (
        <div className="team-empty-state glass">
          Loading team members...
        </div>
      )}

      {error && (
        <div className="auth-error">
          {error}
        </div>
      )}

      {success && (
        <div className="auth-success members-message">
          {success}
        </div>
      )}

      <section className="team-add-panel glass">
        <div>
          <h2>Add a registered member</h2>
          <p>Search by email or employee ID to add them to your team.</p>
        </div>

        <form className="team-account-search" onSubmit={handleFindAccount}>
          <input
            type="search"
            placeholder="Email or employee ID"
            value={accountSearch}
            onChange={(event) => setAccountSearch(event.target.value)}
          />
          <button type="submit" className="secondary-button" disabled={checkingAccount}>
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
              {isCurrentUser ? (
                <button type="button" className="secondary-button" disabled>
                  You
                </button>
              ) : isAlreadyInTeam ? (
                <button type="button" className="secondary-button" disabled>
                  Already in Team
                </button>
              ) : (
                <button
                  type="button"
                  className="primary-button"
                  onClick={handleAddFoundMember}
                  disabled={addingMember}
                >
                  {addingMember ? "Adding..." : "Add to Team"}
                </button>
              )}
            </div>
          </div>
        )}
      </section>

      {!loading && !error && teamMembers.length === 0 && (
        <div className="team-empty-state glass">
          <div className="team-empty-icon">👥</div>
          <h2>No team members yet</h2>
          <p>
            Search and add registered accounts above to build your team.
          </p>
        </div>
      )}

      {!loading && !error && teamMembers.length > 0 && (
        <>
          <div className="team-search glass">
            <span>🔍</span>
            <input
              type="search"
              placeholder="Search team by name or email..."
              aria-label="Search team members by name or email"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
            {searchTerm && (
              <button
                type="button"
                className="team-search-clear"
                aria-label="Clear team member search"
                onClick={() => setSearchTerm("")}
              >
                ×
              </button>
            )}
          </div>

          {filteredMembers.length === 0 ? (
            <div className="team-empty-state glass">
              <h2>No matching members</h2>
              <p>Try searching for a name such as Om or Sneha, or an email.</p>
            </div>
          ) : (
            <div className="team-grid">
              {filteredMembers.map((member) => (
                <div
                  key={member.id || member._id}
                  className="member-card glass"
                >
                  <div className="member-avatar">
                    {member.name.charAt(0)}
                  </div>

                  <h2>
                    {member.name}
                  </h2>

                  <p className="member-email">
                    {member.email}
                  </p>

                  <span className="member-role">
                    {member.role === "Other"
                      ? member.custom_role || "Other"
                      : member.role || "Developer"}
                  </span>

                  <div className="member-stats">
                    <div>
                      <strong>
                        {member.projects}
                      </strong>
                      <span>
                        Projects
                      </span>
                    </div>

                    <div>
                      <strong>
                        {member.tasks}
                      </strong>
                      <span>
                        Tasks
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="remove-member-button"
                    disabled={removingMemberId === String(member.id || member._id)}
                    onClick={() => handleRemoveMember(member)}
                  >
                    {removingMemberId === String(member.id || member._id)
                      ? "Removing..."
                      : "Remove from team"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}

    </div>
  );
}

export default Team;
