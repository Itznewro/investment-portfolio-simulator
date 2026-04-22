import { useNavigate } from "react-router-dom";
import "../App.css";

function IntroPage() {
  const user = JSON.parse(localStorage.getItem("user"));
  const navigate = useNavigate();

  return (
    <div className="container">
      <div className="auth-box">
        <h1>Welcome to Simulator</h1>
        <p style={{ color: "#ccc", marginBottom: "20px" }}>
          Hello {user?.fullName || "User"} 👋
        </p>
        <p style={{ color: "#aaa", fontSize: "14px", lineHeight: "1.6" }}>
          This is the intro page. Next, you can enter the dashboard and view
          your portfolio layout.
        </p>

        <button
          style={{ marginTop: "22px" }}
          onClick={() => navigate("/dashboard")}
        >
          Go to Dashboard
        </button>
      </div>
    </div>
  );
}

export default IntroPage;