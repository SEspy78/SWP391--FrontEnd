import { Syringe } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "./ui/button";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { logout } from "../utils/logout";

interface UserInfo {
  userId: string;
  fullName: string;
  roleId: string;
  roleName: string;
  email?: string;
}

const Header: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [user, setUser] = useState<UserInfo | null>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem("userInfo");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  const handleLogout = () => {
    logout();
    setUser(null);
    navigate("/");
  };

  // Get dashboard link based on user role
  const getDashboardLink = () => {
    if (!user) return "/patient/dashboard";

    switch (user.roleId) {
      case "ROLE_1":
        return "/admin/dashboard";
      case "ROLE_2":
        return "/doctor/dashboard";
      case "ROLE_3":
      default:
        return "/patient/dashboard";
    }
  };

  return (
    <header className="fixed top-0 w-full z-50 bg-white/90 backdrop-blur-md shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center space-x-3">
          <Link to="/">
            <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center">
              <Syringe size={24} className="text-white" />
            </div>
            <span className="text-2xl font-bold text-gray-800">
              FertilityCare
            </span>
          </Link>
        </div>

        {/* Navigation - Desktop */}
        <nav className="hidden md:flex space-x-8">
          <Link
            to="/"
            className={`${
              location.pathname === "/"
                ? "text-blue-600 font-medium"
                : "text-gray-600"
            } hover:text-blue-600 transition-colors`}
          >
            Trang chủ
          </Link>
          <Link
            to="/services"
            className={`${
              location.pathname.includes("/services")
                ? "text-blue-600 font-medium"
                : "text-gray-600"
            } hover:text-blue-600 transition-colors`}
          >
            Dịch vụ
          </Link>
          <Link
            to="/doctors"
            className={`${
              location.pathname.includes("/doctors")
                ? "text-blue-600 font-medium"
                : "text-gray-600"
            } hover:text-blue-600 transition-colors`}
          >
            Bác sĩ
          </Link>
          <Link
            to="/blog"
            className={`${
              location.pathname.includes("/blog")
                ? "text-blue-600 font-medium"
                : "text-gray-600"
            } hover:text-blue-600 transition-colors`}
          >
            Blog
          </Link>
          <Link
            to="/booking"
            className={`${
              location.pathname === "/booking"
                ? "text-blue-600 font-medium"
                : "text-gray-600"
            } hover:text-blue-600 transition-colors`}
          >
            Đặt lịch
          </Link>
        </nav>

        {user ? (
          <div className="flex gap-4 items-center">
            <Link to={getDashboardLink()}>
              <div className="flex items-center px-4 py-2 rounded-lg hover:bg-gray-50 transition-all cursor-pointer">
                <span className="text-gray-700">Welcome </span>
                <h2 className="text-red-500 font-bold ml-1">{user.fullName}</h2>
              </div>
            </Link>
            <Button
              onClick={handleLogout}
              className="bg-blue-600 border-none hover:bg-blue-700 shadow-lg hover:shadow-xl transition-all"
            >
              Đăng xuất
            </Button>
          </div>
        ) : (
          <div className="hidden md:flex items-center space-x-4">
            <Link
              to="/login"
              className="text-blue-600 font-semibold hover:text-blue-800 transition-colors"
            >
              Đăng nhập
            </Link>
            <Link to="/register">
              <Button className="bg-blue-600 border-none hover:bg-blue-700 shadow-lg hover:shadow-xl transition-all">
                Đăng ký ngay
              </Button>
            </Link>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
