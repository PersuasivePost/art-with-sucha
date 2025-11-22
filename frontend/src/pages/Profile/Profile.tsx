import { useEffect, useState } from "react";
import DashboardLayout from "../../components/DashboardLayout/DashboardLayout";
import "./Profile.css";

const Profile = () => {
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [profile, setProfile] = useState<any>({
    name: "",
    email: "",
    phone: "",
    address: "",
  });

  const fetchProfile = async () => {
    setLoading(true);
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
      const res = await fetch(`${backendUrl}/users/me`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("userToken")}`,
        },
      });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setProfile({
        name: data.name || "",
        email: data.email || "",
        phone: data.phone || "",
        address: data.address || "",
      });
    } catch (e) {
      const stored = localStorage.getItem("profile");
      if (stored) setProfile(JSON.parse(stored));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const saveProfile = async () => {
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
      const res = await fetch(`${backendUrl}/users/me`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("userToken")}`,
        },
        body: JSON.stringify({
          name: profile.name,
          phone: profile.phone,
          address: profile.address,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      setEditing(false);
      localStorage.setItem("profile", JSON.stringify(profile));
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <DashboardLayout active="profile">
      <div className="profile-page royal">
        <div className="profile-hero">
          <div className="hero-deco" />
          <div className="hero-inner">
            <div className="avatar-wrapper">
              <div className="avatar">
                {profile.name ? profile.name[0]?.toUpperCase() : "U"}
              </div>
              <div className="avatar-badge">Premium</div>
            </div>

            <div className="hero-meta">
              <h1 className="hero-name">{profile.name || "Your Name"}</h1>
              <p className="hero-email">{profile.email || "you@example.com"}</p>
              <div className="hero-actions">
                {!editing ? (
                  <button
                    className="btn-primary large"
                    onClick={() => setEditing(true)}
                  >
                    Edit Profile
                  </button>
                ) : (
                  <>
                    <button className="btn-primary large" onClick={saveProfile}>
                      Save Changes
                    </button>
                    <button
                      className="btn-plain large"
                      onClick={() => setEditing(false)}
                    >
                      Cancel
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="profile-grid expanded">
          <section className="profile-card grand">
            {loading ? (
              <p>Loading...</p>
            ) : (
              <div className="form-grid">
                <div className="form-col">
                  <label>Name</label>
                  <input
                    value={profile.name}
                    onChange={(e) =>
                      setProfile({ ...profile, name: e.target.value })
                    }
                    disabled={!editing}
                  />

                  <label>Phone</label>
                  <input
                    value={profile.phone}
                    onChange={(e) =>
                      setProfile({ ...profile, phone: e.target.value })
                    }
                    disabled={!editing}
                  />
                </div>

                <div className="form-col">
                  <label>Email</label>
                  <input value={profile.email} disabled className="muted" />

                  <label>Address</label>
                  <textarea
                    value={profile.address}
                    onChange={(e) =>
                      setProfile({ ...profile, address: e.target.value })
                    }
                    disabled={!editing}
                    rows={4}
                  />
                </div>
              </div>
            )}
          </section>

          <aside className="profile-side grand-side">
            <div className="side-card">
              <h3>Account Summary</h3>
              <div className="side-row">
                <div>
                  <div className="side-num">3</div>
                  <div className="side-label">Orders</div>
                </div>
                <div>
                  <div className="side-num">10</div>
                  <div className="side-label">Wishlist</div>
                </div>
              </div>
              <hr />
              <p>
                Member since <strong>2024</strong>
              </p>
              <div className="side-actions">
                <button className="btn-outline">Manage Addresses</button>
                <button className="btn-outline">Payment Methods</button>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Profile;
