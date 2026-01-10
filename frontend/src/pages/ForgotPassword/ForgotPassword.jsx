import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import '../Login/LoginPage.css'; // Reusing login styles

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    // Later, we will connect this to the Backend to send a real email.
    // For now, we simulate success to keep the flow working.
    setMessage(`If an account exists for ${email}, a reset link has been sent.`);
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="header">
          <h1>Reset Password</h1>
          <p>Enter your email to receive instructions.</p>
        </div>

        {message && <div className="success-message" style={{color: 'green', marginBottom: '15px'}}>{message}</div>}

        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label className="input-label">Email Address</label>
            <input
              type="email"
              className="input-field"
              placeholder="user@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="submit-btn">
            Send Reset Link
          </button>
        </form>

        <div className="footer">
          Remembered it? <Link to="/login" className="link">Login</Link>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;