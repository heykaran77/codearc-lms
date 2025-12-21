import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  BookOpen,
  MessageSquare,
  Settings,
  LogOut,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { chatService } from "../services/chatService";

const Sidebar = () => {
  const location = useLocation();
  const { logout } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  const isActive = (path: string) => location.pathname === path;

  // Poll for unread messages count
  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchUnreadCount = async () => {
    try {
      const contacts = await chatService.getContacts();
      const count = contacts.reduce(
        (sum, contact) => sum + (contact.unreadCount || 0),
        0
      );
      setUnreadCount(count);
    } catch (error) {
      console.error("Failed to fetch unread count", error);
    }
  };

  return (
    <div className="h-screen w-64 bg-white border-r border-gray-200 flex flex-col fixed left-0 top-0 z-10">
      <div className="flex items-center justify-center border-b border-gray-50">
        <Link to="/dashboard" className="flex items-center gap-2">
          <img src="/logo.png" alt="CodeArc Logo" className="h-24 w-auto" />
        </Link>
      </div>

      <nav className="flex-1 px-4 space-y-2 mt-4">
        <h2 className="px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
          Menu
        </h2>

        <Link
          to="/dashboard"
          className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
            isActive("/dashboard")
              ? "bg-orange-50 text-orange-600 font-medium"
              : "text-gray-600 hover:bg-gray-50"
          }`}>
          <LayoutDashboard size={20} />
          Dashboard
        </Link>

        <Link
          to="/courses"
          className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
            isActive("/courses")
              ? "bg-orange-50 text-orange-600 font-medium"
              : "text-gray-600 hover:bg-gray-50"
          }`}>
          <BookOpen size={20} />
          Courses
        </Link>

        <Link
          to="/chat"
          className={`flex items-center justify-between px-4 py-3 rounded-lg transition-colors ${
            isActive("/chat")
              ? "bg-orange-50 text-orange-600 font-medium"
              : "text-gray-600 hover:bg-gray-50"
          }`}>
          <div className="flex items-center gap-3">
            <MessageSquare size={20} />
            Chat
          </div>
          {unreadCount > 0 && (
            <span className="bg-orange-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">
              {unreadCount}
            </span>
          )}
        </Link>
      </nav>

      <div className="p-4 border-t border-gray-100 space-y-2">
        <Link
          to="/settings"
          className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
            isActive("/settings")
              ? "bg-orange-50 text-orange-600 font-medium"
              : "text-gray-600 hover:bg-gray-50"
          }`}>
          <Settings size={20} />
          Settings
        </Link>
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-red-600 hover:bg-red-50 transition-colors">
          <LogOut size={20} />
          Logout
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
