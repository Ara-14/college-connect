import './App.css'

function App() {
  return (
    <div className="app">
      <div className="welcome-card">
        <div className="logo">🎓</div>

        <h1>College Connect</h1>

        <p className="tagline">
          Your Campus. Your Community.
        </p>

        <p className="description">
          Connect with students, share moments,
          discover events, and make college life
          more exciting.
        </p>

        <div className="buttons">
          <button className="login-btn">
            Login
          </button>

          <button className="signup-btn">
            Create Account
          </button>
        </div>

        <p className="footer">
          Made for students, by students ❤️
        </p>
      </div>
    </div>
  )
}

export default App