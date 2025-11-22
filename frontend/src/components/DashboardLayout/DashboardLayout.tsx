import React from "react";
import { Link } from "react-router-dom";
import Header from "../Header/Header";
import Footer from "../Footer/Footer";
import "./DashboardLayout.css";

interface Props {
  children: React.ReactNode;
  active?: "profile" | "wishlist" | "orders" | "settings";
}

export default function DashboardLayout({
  children,
  active = "profile",
}: Props) {
  return (
    <div className="dashboard-page">
      <Header searchTerm="" onSearchChange={() => {}} />
      <div className="dashboard-container">
        <aside className="dashboard-sidebar">
          <div className="sidebar-brand">
            <h2>Art With Sucha</h2>
            <div className="brand-accent">Exclusive</div>
          </div>

          <nav className="sidebar-nav">
            <Link
              to="/profile"
              className={`side-link ${active === "profile" ? "active" : ""}`}
            >
              Profile
            </Link>
            <Link
              to="/wishlist"
              className={`side-link ${active === "wishlist" ? "active" : ""}`}
            >
              Wishlist
            </Link>
            <Link
              to="/orders"
              className={`side-link ${active === "orders" ? "active" : ""}`}
            >
              My Orders
            </Link>
            {/* <Link
              to="/profile/settings"
              className={`side-link ${active === "settings" ? "active" : ""}`}
            >
              Settings
            </Link> */}
          </nav>

          <div className="sidebar-footer">
            <button
              className="logout-btn"
              onClick={() => {
                localStorage.removeItem("userToken");
                window.location.href = "/";
              }}
            >
              Logout
            </button>
          </div>
        </aside>

        <main className="dashboard-main">{children}</main>
      </div>
      <Footer />
    </div>
  );
}
