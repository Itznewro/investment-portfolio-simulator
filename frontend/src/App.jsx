import "./App.css";

function App() {
  return (
    <div className="container">
      <div className="login-box">
        <h1>Sign In to Simulator</h1>

        <label>Email Address</label>
        <input
          type="email"
          placeholder="Enter Your Email Address"
        />

        <button>Continue</button>

        <div className="divider">
          <span></span>
          <p>OR</p>
          <span></span>
        </div>

        <p className="register">
          Register Now →
        </p>
      </div>
    </div>
  );
}

export default App;