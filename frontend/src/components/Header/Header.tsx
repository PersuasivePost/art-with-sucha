import "./Header.css";
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";

interface HeaderProps {
  searchTerm: string;
  onSearchChange: (term: string) => void;
}

export default function Header({ searchTerm, onSearchChange }: HeaderProps) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [artistEmail, setArtistEmail] = useState<string | null>(null);
  const [userLoggedIn, setUserLoggedIn] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [dashboardOpen, setDashboardOpen] = useState(false);
  const [cartCount, setCartCount] = useState(0);

  useEffect(() => {
    const token = localStorage.getItem("artistToken");
    const email = localStorage.getItem("artistEmail");
    setIsLoggedIn(!!token);
    setArtistEmail(email);
    const userToken = localStorage.getItem("userToken");
    setUserLoggedIn(!!userToken);
    // If redirected from Google OAuth, frontend receives token and userName in query params
    try {
      const params = new URLSearchParams(window.location.search);
      const redirectedToken = params.get("userToken");
      if (redirectedToken) {
        localStorage.setItem("userToken", redirectedToken);
        // update state to reflect login
        setUserLoggedIn(true);
        // remove params from URL for cleanliness
        params.delete("userToken");
        params.delete("userName");
        const url =
          window.location.pathname +
          (params.toString() ? `?${params.toString()}` : "");
        window.history.replaceState({}, document.title, url);
      }
    } catch (e) {
      /* ignore URL parsing errors */
    }
    // fetch cart count when header initializes
    fetchCartCount();
  }, []);

  // fetch cart total quantity for badge
  const fetchCartCount = async () => {
    try {
      const envBackend = (import.meta.env.VITE_BACKEND_URL || "").replace(
        /\/+$/g,
        ""
      );
      const isLocalFront =
        typeof window !== "undefined" &&
        (window.location.hostname === "localhost" ||
          window.location.hostname === "127.0.0.1");
      const backendBase = isLocalFront
        ? import.meta.env.VITE_LOCAL_BACKEND || "http://localhost:5000"
        : envBackend || "https://art-with-sucha.onrender.com";
      const backendUrl = backendBase.replace(/\/+$/g, "");
      const token = localStorage.getItem("userToken");
      if (!token) {
        setCartCount(0);
        return;
      }
      const res = await fetch(`${backendUrl}/cart`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        setCartCount(0);
        return;
      }
      const data = await res.json().catch(() => ({}));
      const total = (data.cartItems || []).reduce(
        (s: number, it: any) => s + (it.quantity || 0),
        0
      );
      setCartCount(total || 0);
    } catch (err) {
      setCartCount(0);
    }
  };

  // refresh cart count when user logs in/out or in other tabs
  useEffect(() => {
    fetchCartCount();
    const onStorage = (e: StorageEvent) => {
      if (e.key === "userToken" || e.key === "cartUpdated") fetchCartCount();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userLoggedIn]);

  const handleLogout = () => {
    localStorage.removeItem("artistToken");
    localStorage.removeItem("artistEmail");
    setIsLoggedIn(false);
    setArtistEmail(null);
    // reload to update UI or navigate home
    window.location.href = "/";
  };

  const handleUserLogout = () => {
    localStorage.removeItem("userToken");
    localStorage.removeItem("userEmail");
    setUserLoggedIn(false);
    window.location.href = "/";
  };

  return (
    <header>
      {/* Top Bar */}
      <div className="top-bar">
        <div className="facebook-icons-header">
          <a
            href="https://www.facebook.com/share/19cPWKZhSD/?mibextid=wwXIfr"
            target="_blank"
            className="social-icon facebook"
            aria-label="Facebook"
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="currentColor"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
            </svg>
          </a>
          <a
            href="https://www.instagram.com/artwithsucha/"
            target="_blank"
            rel="noreferrer"
            className="social-icon instagram"
            aria-label="Instagram"
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="currentColor"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
            </svg>
          </a>
        </div>
        <span className="welcome-text">Welcome to my Art Gallery!</span>

        <div className="auth-status">
          {isLoggedIn ? (
            <>
              {artistEmail ? (
                <span className="artist-email">{artistEmail}</span>
              ) : null}
              <button className="logout-button" onClick={handleLogout}>
                Logout
              </button>
            </>
          ) : null}
        </div>
      </div>

      {/* Main Nav */}
      <div className="main-nav">
        {/* Logo */}
        <div className="logo">
          <Link to="/">
            <img src="/logo.png" alt="Art Gallery Logo" />
          </Link>
        </div>

        {/* Nav Links + Search */}
        <div className="nav-right">
          <button
            aria-label="Toggle menu"
            className="menu-toggle"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {/* simple hamburger */}
            <span
              style={{
                display: "inline-block",
                width: 20,
                height: 2,
                background: "#333",
                marginBottom: 4,
              }}
            ></span>
            <span
              style={{
                display: "inline-block",
                width: 20,
                height: 2,
                background: "#333",
                marginBottom: 4,
              }}
            ></span>
            <span
              style={{
                display: "inline-block",
                width: 20,
                height: 2,
                background: "#333",
              }}
            ></span>
          </button>

          <nav className={`nav-links ${menuOpen ? "open" : ""}`}>
            <Link to="/">Home</Link>
            <Link to="/about-us">About Us</Link>
            <Link to="/contact-us">Contact Us</Link>
            {userLoggedIn ? (
              <div className="nav-dashboard-group">
                <div className="dashboard-wrapper">
                  <button
                    className="dashboard-toggle"
                    onClick={() => setDashboardOpen(!dashboardOpen)}
                    aria-expanded={dashboardOpen}
                  >
                    Dashboard ▾
                  </button>
                  {dashboardOpen && (
                    <div className="dashboard-menu">
                      <Link to="/profile">My Profile</Link>
                      <Link to="/orders">My Orders</Link>
                      <Link to="/wishlist">Wishlist</Link>
                      <button onClick={handleUserLogout}>Logout</button>
                    </div>
                  )}
                </div>
                <Link to="/cart" className="cart-btn" title="Cart">
                  <div className="cart-badge-wrapper" aria-hidden={false}>
                    {/* Inline SVG cart icon - scales nicely with badge */}
                    <svg
                      className="cart-icon-svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      role="img"
                      aria-label="Cart"
                    >
                      <path
                        d="M7 4h-2l-1 2v2h2l3.6 7.59-1.35 2.44A1 1 0 0 0 9 19h9v-2H9.42a.25.25 0 0 1-.23-.15L9.1 16h7.45a1 1 0 0 0 .92-.62l1.72-4.58A1 1 0 0 0 18.3 9H7.21l-.94-2H3V4h4z"
                        fill="#0b1220"
                      />
                      <circle cx="10" cy="21" r="1" fill="#0b1220" />
                      <circle cx="18" cy="21" r="1" fill="#0b1220" />
                    </svg>
                    {cartCount > 0 && (
                      <span className="cart-count-badge">{cartCount}</span>
                    )}
                  </div>
                </Link>
              </div>
            ) : (
              <Link to="/login">Login</Link>
            )}
          </nav>
          <div className="search-box">
            <input
              type="text"
              id="header-search"
              name="site-search"
              placeholder="Search artworks..."
              className="search-input"
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              aria-label="Search artworks"
            />
            <div className="search-icon">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="currentColor"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
