import { Search, Settings, Bell } from "lucide-react";
import { useNavigate } from "react-router-dom";

function Topbar({ title = "Dashboard" }) {
  const user = JSON.parse(localStorage.getItem("user"));
  const navigate = useNavigate();

  return (
    <header className="portfolio-topbar">
      <div className="portfolio-search">
        <input placeholder="Search here..." />
        <Search size={18} />
      </div>

      <div className="portfolio-user-actions">
        <button className="top-icon-btn" onClick={() => navigate("/settings")}>
          <Settings size={18} />
        </button>

        <button className="top-icon-btn notification-btn">
          <Bell size={18} />
          <span className="notification-dot"></span>
        </button>

        <div className="portfolio-user-info">
          <strong>{user?.fullName || "User"}</strong>
          <p>{user?.email || "student@example.com"}</p>
        </div>

        <div className="user-avatar">
          {(user?.fullName || "U").charAt(0).toUpperCase()}
        </div>
      </div>
    </header>
  );
}

export default Topbar;