import { useEffect, useState } from "react";
import {
  BookOpen,
  CheckCircle,
  Clock,
  Trophy,
  Users,
  Trash2,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import api from "../../services/api";
import { toast } from "react-hot-toast";
import { useAuth } from "../../context/AuthContext";
import Modal from "../../components/Modal";
import { AlertCircle } from "lucide-react";

interface DashboardStats {
  enrolled: number;
  completed: number;
  inProgress: number;
  certificates: number;
}

interface RecentCourse {
  courseId: number;
  title: string;
  description: string;
  progress: number;
}

interface RecommendedCourse {
  id: number;
  title: string;
  description: string;
}

interface MentorCourseStats {
  courseTitle: string;
  courseId: number;
  students: {
    studentId: number;
    name: string;
    email: string;
    assignedAt: string;
    progress: number;
  }[];
}

interface AdminStats {
  users: { role: string; count: number }[];
  totalCourses: number;
  totalEnrollments: number;
  totalCompletions: number;
}

interface AdminUser {
  id: number;
  name: string;
  email: string;
  role: "student" | "mentor" | "admin";
  isApproved: boolean;
  createdAt: string;
}

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats>({
    enrolled: 0,
    completed: 0,
    inProgress: 0,
    certificates: 0,
  });
  const [recentCourses, setRecentCourses] = useState<RecentCourse[]>([]);
  const [recommendedCourses, setRecommendedCourses] = useState<
    RecommendedCourse[]
  >([]);
  const [mentorStats, setMentorStats] = useState<MentorCourseStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "completed" | "progress">("all");

  // Admin specific
  const [adminStats, setAdminStats] = useState<AdminStats | null>(null);
  const [allUsers, setAllUsers] = useState<AdminUser[]>([]);
  const [adminFilter, setAdminFilter] = useState<"all" | "student" | "mentor">(
    "all"
  );
  const [isUserDeleteModalOpen, setIsUserDeleteModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<AdminUser | null>(null);
  const [isApprovalModalOpen, setIsApprovalModalOpen] = useState(false);
  const [userToToggleApprove, setUserToToggleApprove] =
    useState<AdminUser | null>(null);

  useEffect(() => {
    if (user?.role === "student") {
      fetchStudentStats();
    } else if (user?.role === "mentor") {
      fetchMentorStats();
    } else if (user?.role === "admin") {
      fetchAdminData();
    } else {
      setLoading(false);
    }
  }, [user]);

  const fetchStudentStats = async () => {
    try {
      const { data } = await api.get("/progress/stats");
      if (data && data.stats) {
        setStats(data.stats);
        setRecentCourses(data.recentCourses || []);
        setRecommendedCourses(data.recommendedCourses || []);
      }
    } catch (error) {
      console.error("Failed to fetch dashboard stats", error);
      toast.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  const fetchMentorStats = async () => {
    try {
      const { data } = await api.get("/courses/mentor/stats");
      setMentorStats(data);
    } catch (error) {
      console.error("Failed to fetch mentor stats", error);
      toast.error("Failed to load mentor dashboard");
    } finally {
      setLoading(false);
    }
  };

  const fetchAdminData = async () => {
    try {
      const [{ data: statsData }, { data: usersData }] = await Promise.all([
        api.get("/admin/stats"),
        api.get("/admin/users"),
      ]);
      setAdminStats(statsData);
      setAllUsers(usersData);
    } catch (error) {
      console.error("Failed to fetch admin data", error);
      toast.error("Failed to load admin dashboard");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleApproval = async () => {
    if (!userToToggleApprove) return;
    const { id, isApproved: currentStatus } = userToToggleApprove;
    try {
      await api.patch(`/admin/users/${id}/approval`, {
        isApproved: !currentStatus,
      });
      toast.success(currentStatus ? "User unapproved" : "User approved");
      // Update local state
      setAllUsers(
        allUsers.map((u) =>
          u.id === id ? { ...u, isApproved: !currentStatus } : u
        )
      );
      setIsApprovalModalOpen(false);
    } catch (error) {
      toast.error("Failed to update status");
    }
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    try {
      await api.delete(`/admin/users/${userToDelete.id}`);
      toast.success("User deleted");
      setAllUsers(allUsers.filter((u) => u.id !== userToDelete.id));
      setIsUserDeleteModalOpen(false);
    } catch (error) {
      toast.error("Failed to delete user");
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        Loading dashboard...
      </div>
    );
  }

  // --- ADMIN VIEW ---
  if (user?.role === "admin") {
    const totalStudents =
      adminStats?.users.find((u) => u.role === "student")?.count || 0;
    const totalMentors =
      adminStats?.users.find((u) => u.role === "mentor")?.count || 0;

    const filteredUsers = allUsers.filter((u) => {
      if (adminFilter === "all") return true;
      return u.role === adminFilter;
    });

    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Platform Overview
          </h1>
          <p className="text-gray-500">
            System-wide analytics and user management.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-lg bg-blue-50 text-blue-600">
                <Users size={24} />
              </div>
              <span className="text-2xl font-bold text-gray-900">
                {totalStudents}
              </span>
            </div>
            <h3 className="text-sm font-medium text-gray-500">
              Total Students
            </h3>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-lg bg-purple-50 text-purple-600">
                <Trophy size={24} />
              </div>
              <span className="text-2xl font-bold text-gray-900">
                {totalMentors}
              </span>
            </div>
            <h3 className="text-sm font-medium text-gray-500">Total Mentors</h3>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-lg bg-orange-50 text-orange-600">
                <BookOpen size={24} />
              </div>
              <span className="text-2xl font-bold text-gray-900">
                {adminStats?.totalCourses || 0}
              </span>
            </div>
            <h3 className="text-sm font-medium text-gray-500">Total Courses</h3>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-lg bg-green-50 text-green-600">
                <CheckCircle size={24} />
              </div>
              <span className="text-2xl font-bold text-gray-900">
                {adminStats?.totalCompletions || 0}
              </span>
            </div>
            <h3 className="text-sm font-medium text-gray-500">
              Course Completions
            </h3>
          </div>
        </div>

        {/* User Management Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex justify-between items-center">
            <h2 className="text-lg font-bold text-gray-900">User Management</h2>
            <div className="flex bg-gray-50 p-1 rounded-lg border border-gray-100">
              {(["all", "student", "mentor"] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setAdminFilter(r)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md capitalize transition-all ${
                    adminFilter === r
                      ? "bg-white text-gray-900 shadow-sm"
                      : "text-gray-500 hover:text-gray-700"
                  }`}>
                  {r}s
                </button>
              ))}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Joined
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="h-9 w-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 font-bold text-sm mr-3">
                          {u.name.charAt(0)}
                        </div>
                        <div>
                          <div className="text-sm font-bold text-gray-900">
                            {u.name}
                          </div>
                          <div className="text-xs text-gray-500">{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          u.role === "admin"
                            ? "bg-red-50 text-red-600"
                            : u.role === "mentor"
                            ? "bg-purple-50 text-purple-600"
                            : "bg-blue-50 text-blue-600"
                        }`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      {u.role === "mentor" ? (
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            u.isApproved
                              ? "bg-green-50 text-green-600"
                              : "bg-yellow-50 text-yellow-600"
                          }`}>
                          {u.isApproved ? "Approved" : "Pending"}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">N/A</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      {u.role === "mentor" && (
                        <button
                          onClick={() => {
                            setUserToToggleApprove(u);
                            setIsApprovalModalOpen(true);
                          }}
                          className={`text-xs font-bold uppercase tracking-tight px-3 py-1 rounded transition ${
                            u.isApproved
                              ? "text-orange-600 hover:bg-orange-50 border border-orange-100"
                              : "bg-orange-600 text-white hover:bg-orange-700"
                          }`}>
                          {u.isApproved ? "Reject" : "Approve"}
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setUserToDelete(u);
                          setIsUserDeleteModalOpen(true);
                        }}
                        className="text-xs font-bold uppercase tracking-tight text-gray-400 hover:text-red-600 transition p-1"
                        title="Delete User">
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Delete User Modal */}
        <Modal
          isOpen={isUserDeleteModalOpen}
          onClose={() => setIsUserDeleteModalOpen(false)}
          title="Delete User Account">
          <div className="space-y-4">
            <div className="p-4 bg-red-50 text-red-700 rounded-lg flex gap-3">
              <AlertCircle className="shrink-0" size={20} />
              <div>
                <p className="font-bold text-sm">Permanent Action</p>
                <p className="text-xs opacity-90">
                  Deleting this account will remove all associated data, including
                  enrolled courses and progress. This cannot be undone.
                </p>
              </div>
            </div>
            <p className="text-sm text-gray-600 px-1">
              Are you sure you want to delete the account for{" "}
              <span className="font-bold text-gray-900">{userToDelete?.name}</span> (
              {userToDelete?.email})?
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setIsUserDeleteModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition">
                Cancel
              </button>
              <button
                onClick={handleDeleteUser}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition">
                Delete Account
              </button>
            </div>
          </div>
        </Modal>

        {/* Toggle Approval Modal */}
        <Modal
          isOpen={isApprovalModalOpen}
          onClose={() => setIsApprovalModalOpen(false)}
          title={userToToggleApprove?.isApproved ? "Reject Mentor" : "Approve Mentor"}>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Are you sure you want to{" "}
              <span className="font-bold text-gray-900">
                {userToToggleApprove?.isApproved ? "reject" : "approve"}
              </span>{" "}
              <span className="font-bold text-gray-900">
                {userToToggleApprove?.name}
              </span>{" "}
              as a mentor?
            </p>
            {userToToggleApprove?.isApproved ? (
              <p className="text-xs text-orange-600 bg-orange-50 p-2 rounded">
                Rejecting an approved mentor will prevent them from managing their courses until re-approved.
              </p>
            ) : (
              <p className="text-xs text-blue-600 bg-blue-50 p-2 rounded">
                Approving this account will allow the mentor to start creating and managing courses immediately.
              </p>
            )}
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setIsApprovalModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition">
                Cancel
              </button>
              <button
                onClick={handleToggleApproval}
                className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition ${
                  userToToggleApprove?.isApproved
                    ? "bg-orange-600 hover:bg-orange-700"
                    : "bg-blue-600 hover:bg-blue-700"
                }`}>
                Confirm {userToToggleApprove?.isApproved ? "Rejection" : "Approval"}
              </button>
            </div>
          </div>
        </Modal>
      </div>
    );
  }

  // --- MENTOR VIEW ---
  if (user?.role === "mentor") {
    // Flatten stats for easier filtering and table display
    const allStudentsWithCourse = mentorStats.flatMap((course) =>
      course.students.map((student) => ({
        ...student,
        courseTitle: course.courseTitle,
        courseId: course.courseId,
      }))
    );

    const uniqueStudentIds = new Set(
      allStudentsWithCourse.map((s) => s.studentId)
    );
    const totalUniqueStudents = uniqueStudentIds.size;

    const totalCompleted = allStudentsWithCourse.filter(
      (s) => s.progress === 100
    ).length;
    const totalInProgress = allStudentsWithCourse.filter(
      (s) => s.progress < 100
    ).length;

    // Apply Filter
    const displayStudents = allStudentsWithCourse.filter((s) => {
      if (filter === "completed") return s.progress === 100;
      if (filter === "progress") return s.progress < 100;
      return true;
    });

    return (
      <div>
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">
            Instructor Dashboard
          </h1>
          <p className="text-gray-500">
            Manage your courses and track student progress.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Students widget */}
          <div
            onClick={() => setFilter("all")}
            className={`cursor-pointer transition-all p-6 rounded-xl shadow-sm border ${
              filter === "all"
                ? "border-blue-500 bg-blue-50/50"
                : "bg-white border-gray-100 hover:border-blue-200"
            }`}>
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-lg bg-blue-50 text-blue-600">
                <Users size={24} />
              </div>
              <span className="text-2xl font-bold text-gray-900">
                {totalUniqueStudents}
              </span>
            </div>
            <h3 className="text-sm font-medium text-gray-500">
              Total Students Enrolled
            </h3>
          </div>

          {/* Completed widget */}
          <div
            onClick={() => setFilter("completed")}
            className={`cursor-pointer transition-all p-6 rounded-xl shadow-sm border ${
              filter === "completed"
                ? "border-green-500 bg-green-50/50"
                : "bg-white border-gray-100 hover:border-green-200"
            }`}>
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-lg bg-green-50 text-green-600">
                <CheckCircle size={24} />
              </div>
              <span className="text-2xl font-bold text-gray-900">
                {totalCompleted}
              </span>
            </div>
            <h3 className="text-sm font-medium text-gray-500">
              Courses Completed
            </h3>
          </div>

          {/* In Progress widget */}
          <div
            onClick={() => setFilter("progress")}
            className={`cursor-pointer transition-all p-6 rounded-xl shadow-sm border ${
              filter === "progress"
                ? "border-yellow-500 bg-yellow-50/50"
                : "bg-white border-gray-100 hover:border-yellow-200"
            }`}>
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-lg bg-yellow-50 text-yellow-600">
                <Clock size={24} />
              </div>
              <span className="text-2xl font-bold text-gray-900">
                {totalInProgress}
              </span>
            </div>
            <h3 className="text-sm font-medium text-gray-500">In Progress</h3>
          </div>

          {/* Total Courses */}
          <div
            onClick={() => navigate("/courses")}
            className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 cursor-pointer hover:border-orange-200 transition-all">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-lg bg-orange-50 text-orange-600">
                <BookOpen size={24} />
              </div>
              <span className="text-2xl font-bold text-gray-900">
                {mentorStats.length}
              </span>
            </div>
            <h3 className="text-sm font-medium text-gray-500">My Courses</h3>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-gray-900">
                Student Progress Overview
              </h2>
              {filter !== "all" && (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-gray-100 text-gray-600 uppercase">
                  Filtered: {filter}
                </span>
              )}
            </div>
            <Link
              to="/courses"
              className="text-orange-600 hover:text-orange-700 font-medium text-sm">
              Manage Courses &rarr;
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Student
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Course
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Assigned At
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Progress
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {displayStudents.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-6 py-8 text-center text-gray-500">
                      No matching records found.
                    </td>
                  </tr>
                ) : (
                  displayStudents.map((student, idx) => (
                    <tr key={`${student.courseId}-${student.studentId}-${idx}`}>
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <div className="h-8 w-8 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 font-bold text-xs mr-3">
                            {student.name.charAt(0)}
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {student.name}
                            </div>
                            <div className="text-xs text-gray-500">
                              {student.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {student.courseTitle}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {new Date(student.assignedAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden min-w-[100px]">
                            <div
                              className="h-full bg-orange-500"
                              style={{ width: `${student.progress}%` }}></div>
                          </div>
                          <span className="text-xs font-bold text-gray-700">
                            {student.progress}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // --- STUDENT VIEW ---
  const statItems = [
    {
      label: "Enrolled Courses",
      value: stats.enrolled,
      icon: BookOpen,
      color: "bg-blue-50 text-blue-600",
    },
    {
      label: "Completed",
      value: stats.completed,
      icon: CheckCircle,
      color: "bg-green-50 text-green-600",
    },
    {
      label: "In Progress",
      value: stats.inProgress,
      icon: Clock,
      color: "bg-yellow-50 text-yellow-600",
    },
    {
      label: "Certificates",
      value: stats.certificates,
      icon: Trophy,
      color: "bg-purple-50 text-purple-600",
    },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500">Welcome back, continue learning!</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statItems.map((stat) => (
          <div
            key={stat.label}
            className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-lg ${stat.color}`}>
                <stat.icon size={24} />
              </div>
              <span className="text-2xl font-bold text-gray-900">
                {stat.value}
              </span>
            </div>
            <h3 className="text-sm font-medium text-gray-500">{stat.label}</h3>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Activity */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-bold text-gray-900">Recent Activity</h2>
            <Link
              to="/courses"
              className="text-orange-600 font-medium text-sm hover:underline">
              View All
            </Link>
          </div>

          <div className="space-y-4">
            {recentCourses.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                No courses in progress.
              </p>
            ) : (
              recentCourses.map((course) => (
                <Link
                  key={course.courseId}
                  to={`/course/${course.courseId}`}
                  className="block p-4 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors border border-transparent hover:border-gray-200">
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="font-semibold text-gray-900">
                        {course.title}
                      </h4>
                      <p className="text-sm text-gray-500">
                        Progress: {course.progress}%
                      </p>
                    </div>
                    <div className="px-3 py-1 bg-white rounded text-xs font-semibold text-gray-600 shadow-sm">
                      Continue
                    </div>
                  </div>
                  <div className="mt-3 h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-orange-500 rounded-full"
                      style={{ width: `${course.progress}%` }}></div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Recommended / New Courses */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 h-fit">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-bold text-gray-900">
              Explore New Courses
            </h2>
          </div>

          <div className="space-y-4">
            {recommendedCourses.length === 0 ? (
              <p className="text-gray-500 text-sm">
                You have enrolled in all available courses!
              </p>
            ) : (
              recommendedCourses.map((course) => (
                <div
                  key={course.id}
                  className="p-4 rounded-lg border border-gray-100 hover:border-orange-200 transition bg-gray-50">
                  <h4 className="font-semibold text-gray-900 mb-1">
                    {course.title}
                  </h4>
                  <p className="text-xs text-gray-500 line-clamp-2 mb-3">
                    {course.description}
                  </p>
                  <Link
                    to="/courses"
                    className="text-xs font-semibold text-orange-600 hover:text-orange-700 uppercase tracking-wide">
                    View Details &rarr;
                  </Link>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
