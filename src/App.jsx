import React from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  Link,
  useNavigate,
  useLocation,
} from "react-router-dom";

import OTPLogin   from "./components/Login/OTPLogin";
import UploadForm from "./components/Upload/UploadForm";
import SearchPage from "./components/Search/SearchPage";
import AdminPage  from "./components/Admin/AdminPage";

function ProtectedRoute({ children }) {
  const token = localStorage.getItem("token");
  if (!token) return <Navigate to="/" replace />;
  return children;
}

function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();

  if (location.pathname === "/") return null;

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user_id");
    navigate("/");
  };

  const linkClass = (path) =>
    `px-3 py-2 rounded-md text-sm font-medium transition-colors ${
      location.pathname === path
        ? "bg-blue-700 text-white"
        : "text-blue-100 hover:bg-blue-700 hover:text-white"
    }`;

  return (
    // sticky top-0 z-40 keeps navbar fixed at top while page scrolls
    <nav className="sticky top-0 z-40 bg-blue-900 shadow-md">
      <div className="max-w-6xl mx-auto px-4 flex items-center justify-between h-14">
        <span className="text-white font-bold text-lg">📁 DocManager</span>
        <div className="flex items-center gap-2">
          <Link to="/upload" className={linkClass("/upload")}>Upload</Link>
          <Link to="/search" className={linkClass("/search")}>Search</Link>
          <Link to="/admin"  className={linkClass("/admin")}>Admin</Link>
          <button
            onClick={handleLogout}
            className="ml-2 px-3 py-2 rounded-md text-sm font-medium bg-red-500 text-white hover:bg-red-600 transition-colors"
          >
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
}

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <Routes>
          <Route path="/" element={<OTPLogin />} />
          <Route path="/upload" element={<ProtectedRoute><UploadForm /></ProtectedRoute>} />
          <Route path="/search" element={<ProtectedRoute><SearchPage /></ProtectedRoute>} />
          <Route path="/admin"  element={<ProtectedRoute><AdminPage /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;