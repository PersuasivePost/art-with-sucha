import { useState } from "react";
import "./Header.css";

export default function Header() {
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <header>
      {/* Top Bar */}
      <div className="top-bar">
        <div className="social-icons">
          <a href="https://facebook.com" target="_blank" rel="noreferrer" className="facebook">
            <i className="fab fa-facebook-f"></i>
          </a>
          <a href="https://www.instagram.com/artwithsucha/" target="_blank" rel="noreferrer" className="instagram">
            <i className="fab fa-instagram"></i>
          </a>
        </div>
        <span className="welcome-text">Welcome to my Art Gallery!</span>
      </div>

      {/* Main Nav */}
      <div className="main-nav">
        {/* Logo */}
        <div className="logo">
          <img src="/logo.png" alt="Art Gallery Logo" />
        </div>

        {/* Nav Links + Search */}
        <div className="nav-right">
          <nav className="nav-links">
            <a href="#about">About Us</a>
            <a href="#contact">Contact Us</a>
          </nav>
          <div className="search-box">
            {searchOpen && (
              <input
                type="text"
                placeholder="Search artworks..."
                className="search-input"
              />
            )}
            <i
              className="fas fa-search"
              onClick={() => setSearchOpen(!searchOpen)}
            ></i>
          </div>
        </div>
      </div>
    </header>
  );
}
