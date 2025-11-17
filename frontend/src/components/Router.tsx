import { Routes, Route, Navigate } from "react-router-dom";
import Home from "../pages/Home/Home";
import AdminLogin from "../pages/Login/Adminlogin/Adminlogin.tsx";
import Login from "../pages/Login/Userlogin/Login.tsx";
import About from "../pages/AboutUs/About";
import Contact from "../pages/ContactUs/Contact";
import SectionView from "../pages/Gallery/Section/SectionView";
import ProductView from "../pages/Gallery/Product/ProductView";

const AppRouter = () => {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      {/* <Route path="/signup" element={<Signup />} /> */}
      <Route path="/adminlogin" element={<AdminLogin />} />
      <Route path="/about-us" element={<About />} />
      <Route path="/contact-us" element={<Contact />} />
      <Route path="/:sectionName" element={<SectionView />} />
      <Route path="/:sectionName/:subsectionName" element={<ProductView />} />
      {/* Catch-all route for unknown paths - redirect to home */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default AppRouter;
