import "../App.css";

function Loader({ size = "medium", center = true }) {
  return (
    <div className={center ? "loader-center" : "loader-inline"}>
      <div className={`theme-loader ${size}`}></div>
    </div>
  );
}

export default Loader;