import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Bell,
  Shield,
  User,
  Save,
  RotateCcw,
  LogOut,
  TrendingUp,
  Palette,
} from "lucide-react";
import logo from "../assets/logo.png";
import Topbar from "../components/Topbar";
import "../App.css";

function SettingsPage() {
  const user = JSON.parse(localStorage.getItem("user"));
  const token = localStorage.getItem("token");
  const navigate = useNavigate();

  // Backend URL
  // If your backend is running on another port, change this.
  const API_BASE = "http://localhost:5000";

  const defaultSettings = {
    defaultTradeMode: "BUY",
    priceAlerts: true,
    marketNews: true,
    portfolioUpdates: true,
    riskMode: "balanced",
  };

  const [settings, setSettings] = useState(defaultSettings);
  const [savedMessage, setSavedMessage] = useState("");
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [saving, setSaving] = useState(false);

  const showMessage = (message) => {
    setSavedMessage(message);

    setTimeout(() => {
      setSavedMessage("");
    }, 3000);
  };

  const readJsonSafely = async (response) => {
    const text = await response.text();

    try {
      return text ? JSON.parse(text) : {};
    } catch {
      return {
        message: text || "Server returned an invalid response.",
      };
    }
  };

  useEffect(() => {
    const fetchSettings = async () => {
      if (!token) {
        navigate("/");
        return;
      }

      try {
        setLoadingSettings(true);

        const response = await fetch(`${API_BASE}/api/settings`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await readJsonSafely(response);

        if (!response.ok) {
          console.error(data.message || "Failed to load settings");

          if (response.status === 401) {
            localStorage.removeItem("user");
            localStorage.removeItem("token");
            navigate("/");
            return;
          }

          showMessage(data.message || "Could not load settings from server.");
          return;
        }

        setSettings({
          defaultTradeMode: data.defaultTradeMode || "BUY",
          priceAlerts: data.priceAlerts ?? true,
          marketNews: data.marketNews ?? true,
          portfolioUpdates: data.portfolioUpdates ?? true,
          riskMode: data.riskMode || "balanced",
        });
      } catch (error) {
        console.error("Settings fetch error:", error);
        showMessage(
          "Could not connect to server. Make sure backend is running on port 5000."
        );
      } finally {
        setLoadingSettings(false);
      }
    };

    fetchSettings();
  }, [token, navigate]);

  const handleChange = (key, value) => {
    setSettings((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSave = async () => {
    if (!token) {
      navigate("/");
      return;
    }

    try {
      setSaving(true);

      const response = await fetch(`${API_BASE}/api/settings`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(settings),
      });

      const data = await readJsonSafely(response);

      if (!response.ok) {
        showMessage(data.message || "Failed to save settings.");
        return;
      }

      showMessage("Settings saved successfully.");
    } catch (error) {
      console.error("Save settings error:", error);
      showMessage(
        "Could not connect to server. Make sure backend is running on port 5000."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!token) {
      navigate("/");
      return;
    }

    try {
      setSaving(true);

      const response = await fetch(`${API_BASE}/api/settings`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(defaultSettings),
      });

      const data = await readJsonSafely(response);

      if (!response.ok) {
        showMessage(data.message || "Failed to reset settings.");
        return;
      }

      setSettings(defaultSettings);
      showMessage("Settings reset to default.");
    } catch (error) {
      console.error("Reset settings error:", error);
      showMessage(
        "Could not connect to server. Make sure backend is running on port 5000."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch(`${API_BASE}/api/auth/logout`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      localStorage.removeItem("user");
      localStorage.removeItem("token");

      // Sends user back to Landing Page
      navigate("/");
    }
  };

  return (
    <div className="dashboard-page">
      <aside className="sidebar">
        <div>
          <div className="sidebar-logo">
            <img src={logo} alt="logo" className="logo-img" />
            <h2>IPSimulator</h2>
          </div>

          <nav className="sidebar-nav">
            <Link className="nav-item" to="/dashboard">
              Dashboard
            </Link>

            <Link className="nav-item" to="/portfolio">
              Portfolio
            </Link>

            <Link className="nav-item" to="/trade">
              Market
            </Link>

            <Link className="nav-item" to="/history">
              Transactions
            </Link>

            <Link className="nav-item active" to="/settings">
              Settings
            </Link>
          </nav>
        </div>

        <div className="sidebar-card">
          <p className="sidebar-card-title">Account Control</p>
          <p className="sidebar-card-text">
            Manage simulator preferences and account access.
          </p>
          <button className="sidebar-card-btn">Backend Synced</button>
        </div>
      </aside>

      <main className="main-content">
        <Topbar />

        <section className="settings-header">
          <div>
            <p className="settings-subtitle">Account Preferences</p>
            <h1>Settings</h1>
            <p>
              Manage your profile, alerts, trading defaults, security status,
              and account access.
            </p>
          </div>

          <div className="settings-header-actions">
            <button
              className="settings-reset-btn"
              onClick={handleReset}
              disabled={saving || loadingSettings}
            >
              <RotateCcw size={17} />
              Reset
            </button>

            <button
              className="settings-save-btn"
              onClick={handleSave}
              disabled={saving || loadingSettings}
            >
              <Save size={17} />
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </section>

        {savedMessage && <p className="settings-saved-msg">{savedMessage}</p>}

        {loadingSettings ? (
          <section className="settings-card">
            <p className="placeholder-text">Loading settings...</p>
          </section>
        ) : (
          <section className="settings-grid">
            <div className="settings-left">
              <div className="settings-card profile-card">
                <div className="settings-card-title">
                  <User size={20} />
                  <h3>Profile</h3>
                </div>

                <div className="profile-row">
                  <div className="profile-avatar-large">
                    {(user?.fullName || "U").charAt(0).toUpperCase()}
                  </div>

                  <div>
                    <h2>{user?.fullName || "User"}</h2>
                    <p>{user?.email || "student@example.com"}</p>
                  </div>
                </div>

                <div className="settings-form-grid">
                  <label>
                    Full Name
                    <input value={user?.fullName || ""} readOnly />
                  </label>

                  <label>
                    Email Address
                    <input value={user?.email || ""} readOnly />
                  </label>
                </div>

                <p className="settings-note">
                  Profile details are connected to your registered simulator
                  account.
                </p>
              </div>

              <div className="settings-card">
                <div className="settings-card-title">
                  <TrendingUp size={20} />
                  <h3>Trading Preferences</h3>
                </div>

                <div className="settings-form-grid">
                  <label>
                    Default Trade Mode
                    <select
                      className="settings-select"
                      value={settings.defaultTradeMode}
                      onChange={(e) =>
                        handleChange("defaultTradeMode", e.target.value)
                      }
                    >
                      <option value="BUY">Buy</option>
                      <option value="SELL">Sell</option>
                    </select>
                  </label>

                  <label>
                    Risk Mode
                    <select
                      className="settings-select"
                      value={settings.riskMode}
                      onChange={(e) => handleChange("riskMode", e.target.value)}
                    >
                      <option value="safe">Safe</option>
                      <option value="balanced">Balanced</option>
                      <option value="aggressive">Aggressive</option>
                    </select>
                  </label>
                </div>

                <p className="settings-note">
                  These preferences are saved to your backend account settings.
                </p>
              </div>

              <div className="settings-card logout-card">
                <div className="settings-card-title">
                  <LogOut size={20} />
                  <h3>Logout</h3>
                </div>

                <h4>End current session</h4>
                <p>
                  Logout will remove your saved login session from this browser
                  and return you to the landing page.
                </p>

                <button className="logout-btn" onClick={handleLogout}>
                  Logout
                </button>
              </div>
            </div>

            <div className="settings-right">
              <div className="settings-card">
                <div className="settings-card-title">
                  <Bell size={20} />
                  <h3>Notifications</h3>
                </div>

                <div className="settings-toggle-list">
                  <div className="settings-toggle-row">
                    <div>
                      <h4>Price Alerts</h4>
                      <p>Notify when watched stocks move strongly.</p>
                    </div>

                    <button
                      type="button"
                      className={`toggle-switch ${
                        settings.priceAlerts ? "on" : ""
                      }`}
                      onClick={() =>
                        handleChange("priceAlerts", !settings.priceAlerts)
                      }
                    >
                      <span></span>
                    </button>
                  </div>

                  <div className="settings-toggle-row">
                    <div>
                      <h4>Market News</h4>
                      <p>Show important market and economic updates.</p>
                    </div>

                    <button
                      type="button"
                      className={`toggle-switch ${
                        settings.marketNews ? "on" : ""
                      }`}
                      onClick={() =>
                        handleChange("marketNews", !settings.marketNews)
                      }
                    >
                      <span></span>
                    </button>
                  </div>

                  <div className="settings-toggle-row">
                    <div>
                      <h4>Portfolio Updates</h4>
                      <p>Show portfolio balance and trade updates.</p>
                    </div>

                    <button
                      type="button"
                      className={`toggle-switch ${
                        settings.portfolioUpdates ? "on" : ""
                      }`}
                      onClick={() =>
                        handleChange(
                          "portfolioUpdates",
                          !settings.portfolioUpdates
                        )
                      }
                    >
                      <span></span>
                    </button>
                  </div>
                </div>
              </div>

              <div className="settings-card">
                <div className="settings-card-title">
                  <Palette size={20} />
                  <h3>Appearance</h3>
                </div>

                <div className="theme-preview-card">
                  <div className="theme-preview-top"></div>

                  <div className="theme-preview-body">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>

                <p className="settings-note">
                  Current theme uses the IPSimulator dark layout with purple
                  highlights.
                </p>
              </div>

              <div className="settings-card">
                <div className="settings-card-title">
                  <Shield size={20} />
                  <h3>Security</h3>
                </div>

                <div className="security-status-list">
                  <div className="security-status-item">
                    <div className="security-status-left">
                      <span className="status-green-dot"></span>

                      <div>
                        <h4>Password Protected</h4>
                        <p>Your account password is securely protected.</p>
                      </div>
                    </div>

                    <span className="security-badge success">Protected</span>
                  </div>

                  <div className="security-status-item">
                    <div className="security-status-left">
                      <span className="status-green-dot"></span>

                      <div>
                        <h4>Account Verified</h4>
                        <p>Your simulator account is active and verified.</p>
                      </div>
                    </div>

                    <span className="security-badge success">Verified</span>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

export default SettingsPage;