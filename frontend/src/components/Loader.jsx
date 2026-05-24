import "../App.css";

function Loader({
  size = "medium",
  center = true,
  fullScreen = false,
  message = "Loading data...",
}) {
  if (fullScreen) {
    return (
      <div className="loader-fullscreen">
        <div className="loader-card">
          <div className="loader-logo-wrap">
            <div className={`theme-loader ${size}`}></div>
            <div className="loader-core">IP</div>
          </div>

          <h2>IPSimulator</h2>
          <p>{message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={center ? "loader-center" : "loader-inline"}>
      <div className={`theme-loader ${size}`}></div>
    </div>
  );
}

export default Loader;