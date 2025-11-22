import { Routes, Route, Navigate } from "react-router-dom";
import Home from "../pages/Home/Home";
import AdminLogin from "../pages/Login/Adminlogin/Adminlogin.tsx";
import Login from "../pages/Login/Userlogin/Login.tsx";
import About from "../pages/AboutUs/About";
import Contact from "../pages/ContactUs/Contact";
import SectionView from "../pages/Gallery/Section/SectionView";
import ProductView from "../pages/Gallery/Product/ProductView";
import ProductDetail from "../pages/Gallery/Product/ProductDetail";
import Profile from "../pages/Profile/Profile";
import Cart from "../pages/Cart/Cart";
import Orders from "../pages/Orders/Orders";
import Wishlist from "../pages/Wishlist/Wishlist";
import ProtectedRoute from "./ProtectedRoute";

const AppRouter = () => {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      {/* <Route path="/signup" element={<Signup />} /> */}
      <Route path="/adminlogin" element={<AdminLogin />} />
      <Route path="/about-us" element={<About />} />
      <Route path="/contact-us" element={<Contact />} />
      {/* Protected routes - redirect to login if not authenticated */}
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        }
      />
      <Route
        path="/cart"
        element={
          <ProtectedRoute>
            <Cart />
          </ProtectedRoute>
        }
      />
      <Route
        path="/orders"
        element={
          <ProtectedRoute>
            <Orders />
          </ProtectedRoute>
        }
      />
      <Route
        path="/wishlist"
        element={
          <ProtectedRoute>
            <Wishlist />
          </ProtectedRoute>
        }
      />
      <Route path="/:sectionName" element={<SectionView />} />
      <Route path="/:sectionName/:subsectionName" element={<ProductView />} />
      <Route path="/product/:id" element={<ProductDetail />} />
      <Route
        path="/:sectionName/:subsectionName/product/:id"
        element={<ProductDetail />}
      />
      {/* Catch-all route for unknown paths - redirect to home */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default AppRouter;
