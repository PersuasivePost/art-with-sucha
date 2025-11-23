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
  const [summary, setSummary] = useState<{
    orders: number;
    wishlist: number;
    memberSince?: string;
  }>({ orders: 0, wishlist: 0 });

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
        phone: data.mobno || data.phone || "",
        address: data.address || "",
      });
      // member since
      if (data.createdAt) {
        setSummary((s) => ({
          ...s,
          memberSince: new Date(data.createdAt).getFullYear().toString(),
        }));
      }
    } catch (e) {
      const stored = localStorage.getItem("profile");
      if (stored) setProfile(JSON.parse(stored));
    } finally {
      setLoading(false);
    }
  };

  const fetchSummary = async () => {
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
      if (!token) return;

      // Try fast count endpoints
      let orders = 0;
      let wishlist = 0;

      try {
        const cRes = await fetch(
          `${backendUrl}/orders/count?capturedOnly=true`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        if (cRes.ok) {
          const cd = await cRes.json();
          orders = typeof cd.count === "number" ? cd.count : orders;
        }
      } catch (err) {
        // ignore
      }

      try {
        const wRes = await fetch(`${backendUrl}/wishlist/count`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (wRes.ok) {
          const wd = await wRes.json();
          wishlist = typeof wd.count === "number" ? wd.count : wishlist;
        } else {
          const wList = await fetch(`${backendUrl}/wishlist?mine=true`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (wList.ok) {
            const wd = await wList.json();
            wishlist = (wd.items || []).length || (wd.wishlist || []).length;
          }
        }
      } catch (err) {
        // ignore
      }

      setSummary((s) => ({ ...s, orders, wishlist }));
    } catch (err) {
      // noop
    }
  };

  useEffect(() => {
    fetchProfile();
    fetchSummary();
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
          mobno: profile.phone,
          address: profile.address,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      setEditing(false);
      localStorage.setItem("profile", JSON.stringify(profile));
      // refresh summary in case profile change affects anything
      fetchProfile();
      fetchSummary();
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
              <h1 className="hero-name">{profile.name}</h1>
              <p className="hero-email">{profile.email}</p>
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
                  <div className="side-num">{summary.orders}</div>
                  <div className="side-label">Orders</div>
                </div>
                <div>
                  <div className="side-num">{summary.wishlist}</div>
                  <div className="side-label">Wishlist</div>
                </div>
              </div>
              <hr />
              <p>
                Member since <strong>{summary.memberSince || "—"}</strong>
              </p>
              <div className="side-actions"></div>
            </div>
          </aside>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Profile;
