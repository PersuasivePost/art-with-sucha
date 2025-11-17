import { useState } from "react";
import { UserPlus, ArrowRight, Shield, Zap, Lock } from "lucide-react";
import "./Login.css";

export default function Login() {
  const [currentPage, setCurrentPage] = useState("login");
  const envBackend = (import.meta.env.VITE_BACKEND_URL || "").replace(
    /\/+$/g,
    ""
  );
  const isLocalFront =
    typeof window !== "undefined" &&
    (window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1");
  // Force localhost backend during local frontend development to avoid hitting deployed backend
  const backendBase = isLocalFront
    ? import.meta.env.VITE_LOCAL_BACKEND || "http://localhost:5000"
    : envBackend || "https://art-with-sucha.onrender.com";

  // Renders the Login Page view
  const LoginPage = () => (
    <div className="login-container">
      <div className="login-card">
        {/* Logo/Brand */}
        <div className="login-header">
          <div className="login-logo">
            <Shield className="login-logo-icon" />
          </div>
          <h1 className="login-title">Welcome Back</h1>
          <p className="login-subtitle">Sign in to continue to your account</p>
        </div>

        {/* Login Card */}
        <div className="login-form">
          {/* Google Login Button */}
          <a
            href={`${backendBase}/auth/google/login`}
            className="google-login-btn"
          >
            <svg className="google-icon" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            <span>Continue with Google</span>
            <ArrowRight className="google-arrow" />
          </a>

          {/* Divider */}
          <div className="divider">
            <div className="divider-line"></div>
            <div className="divider-text">
              <span className="divider-span">
                Secure authentication powered by{" "}
                <a
                  href="https://github.com/PersuasivePost/zoogle"
                  className="zoogle-link"
                >
                  Zoogle
                </a>
              </span>
            </div>
          </div>

          {/* Features */}
          <div className="features">
            <div className="feature">
              <Zap className="feature-icon blue" />
              <span>2-minute setup</span>
            </div>
            <div className="feature">
              <Lock className="feature-icon purple" />
              <span>Secure OAuth</span>
            </div>
          </div>
        </div>

        {/* Sign Up Link */}
        <div className="signup-link">
          <p className="signup-text">
            Don't have an account?{" "}
            <button
              onClick={() => setCurrentPage("signup")}
              className="signup-btn"
            >
              Sign up
            </button>
          </p>
        </div>

        {/* Footer */}
        <div className="footer">
          <p>Protected by Google OAuth 2.0</p>
        </div>
      </div>
    </div>
  );

  // Renders the Sign Up Page view
  const SignupPage = () => (
    <div className="signup-container">
      <div className="signup-card">
        {/* Logo/Brand */}
        <div className="signup-header">
          <div className="signup-logo">
            <UserPlus className="signup-logo-icon" />
          </div>
          <h1 className="signup-title">Create Account</h1>
          <p className="signup-subtitle">Get started in seconds with Google</p>
        </div>

        {/* Signup Card */}
        <div className="signup-form">
          <a
            href={`${backendBase}/auth/google/login`}
            className="google-signup-btn"
          >
            <svg className="google-signup-icon" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            <span>Sign up with Google</span>
            <ArrowRight className="google-signup-arrow" />
          </a>

          <div className="signup-features">
            <div className="signup-feature">
              <div className="check-icon">
                <svg
                  className="check-svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={3}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <div>
                <p className="feature-title">No password needed</p>
                <p className="feature-desc">
                  Sign in securely with your Google account
                </p>
              </div>
            </div>

            <div className="signup-feature">
              <div className="check-icon">
                <svg
                  className="check-svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={3}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <div>
                <p className="feature-title">Quick setup</p>
                <p className="feature-desc">Get started in under 2 minutes</p>
              </div>
            </div>

            <div className="signup-feature">
              <div className="check-icon">
                <svg
                  className="check-svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={3}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <div>
                <p className="feature-title">Always secure</p>
                <p className="feature-desc">Protected by OAuth 2.0 standards</p>
              </div>
            </div>
          </div>

          <p className="terms">
            By signing up, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>

        <div className="signin-link">
          <p className="signin-text">
            Already have an account?{" "}
            <button
              onClick={() => setCurrentPage("login")}
              className="signin-btn"
            >
              Sign in
            </button>
          </p>
        </div>

        <div className="signup-footer">
          <p>
            Powered by{" "}
            <a
              href="https://github.com/PersuasivePost/zoogle"
              className="zoogle-link"
            >
              Zoogle
            </a>{" "}
            🚀
          </p>
        </div>
      </div>
    </div>
  );

  // Main component return logic
  return (
    <div className="font-sans">
      {currentPage === "login" ? <LoginPage /> : <SignupPage />}
    </div>
  );
}
