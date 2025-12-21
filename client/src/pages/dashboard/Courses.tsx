import { useEffect, useState } from "react";
import api from "../../services/api";
import type { Course, User } from "../../types";
import {
  Calendar,
  CheckCircle,
  Plus,
  Users,
  PlayCircle,
  Settings,
  Trash2,
  Edit,
} from "lucide-react";
import type { Chapter } from "../../types";
import { Link } from "react-router-dom";
import { toast } from "react-hot-toast";
import { useAuth } from "../../context/AuthContext";
import Modal from "../../components/Modal";

interface CourseWithStatus extends Course {
  isEnrolled?: boolean;
  isCompleted?: boolean;
}

const Courses = () => {
  const { user } = useAuth();
  const [courses, setCourses] = useState<CourseWithStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  // Modals
  const [isUnenrollModalOpen, setIsUnenrollModalOpen] = useState(false);
  const [courseToUnenroll, setCourseToUnenroll] = useState<number | null>(null);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newCourse, setNewCourse] = useState({ title: "", description: "" });
  const [createLoading, setCreateLoading] = useState(false);

  // Assign Modal
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null);
  const [students, setStudents] = useState<User[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(
    null
  );

  // Add Chapter Modal
  const [isChapterModalOpen, setIsChapterModalOpen] = useState(false);
  const [newChapter, setNewChapter] = useState({
    title: "",
    description: "",
    videoUrl: "",
    imageUrl: "",
    sequence: 1,
  });

  // Manage Chapters
  const [isChapterListModalOpen, setIsChapterListModalOpen] = useState(false);
  const [courseChapters, setCourseChapters] = useState<Chapter[]>([]);
  const [isEditChapterModalOpen, setIsEditChapterModalOpen] = useState(false);
  const [editingChapter, setEditingChapter] = useState<Chapter | null>(null);
  const [isDeleteChapterModalOpen, setIsDeleteChapterModalOpen] =
    useState(false);
  const [chapterToDeleteId, setChapterToDeleteId] = useState<number | null>(
    null
  );

  // Delete Course
  const [isDeleteCourseModalOpen, setIsDeleteCourseModalOpen] = useState(false);
  const [courseToDeleteId, setCourseToDeleteId] = useState<number | null>(null);

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    try {
      const { data } = await api.get("/courses");
      if (Array.isArray(data)) {
        setCourses(data);
      } else {
        console.warn("Unexpected data format", data);
      }
    } catch (error) {
      console.error("Failed to fetch courses", error);
      toast.error("Failed to load courses");
    } finally {
      setLoading(false);
    }
  };

  const handleEnroll = async (courseId: number) => {
    try {
      setActionLoading(courseId);
      await api.post(`/courses/${courseId}/enroll`);
      toast.success("Enrolled successfully!");
      fetchCourses(); // Refresh to update UI
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to enroll");
    } finally {
      setActionLoading(null);
    }
  };

  const confirmUnenroll = (courseId: number) => {
    setCourseToUnenroll(courseId);
    setIsUnenrollModalOpen(true);
  };

  const handleUnenroll = async () => {
    if (!courseToUnenroll) return;

    try {
      setActionLoading(courseToUnenroll);
      await api.delete(`/courses/${courseToUnenroll}/enroll`);
      toast.success("Unenrolled successfully!");
      fetchCourses();
      setIsUnenrollModalOpen(false);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to unenroll");
    } finally {
      setActionLoading(null);
      setCourseToUnenroll(null);
    }
  };

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setCreateLoading(true);
      await api.post("/courses", newCourse);
      toast.success("Course created successfully!");
      setIsCreateModalOpen(false);
      setNewCourse({ title: "", description: "" });
      fetchCourses();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to create course");
    } finally {
      setCreateLoading(false);
    }
  };

  // --- Assign Logic ---
  const openAssignModal = async (courseId: number) => {
    setSelectedCourseId(courseId);
    try {
      // Fetch students with enrollment status for this course
      const { data } = await api.get(`/users/students?courseId=${courseId}`);
      setStudents(data);
      setIsAssignModalOpen(true);
    } catch (error) {
      toast.error("Failed to fetch student list");
    }
  };

  const handleAssignStudent = async () => {
    if (!selectedCourseId || !selectedStudentId) return;
    try {
      await api.post("/courses/assign", {
        courseId: selectedCourseId,
        studentId: selectedStudentId,
      });
      toast.success("Student assigned successfully");
      setIsAssignModalOpen(false);
      setSelectedStudentId(null);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to assign student");
    }
  };

  // --- Chapter Logic ---
  const openChapterModal = (courseId: number) => {
    setSelectedCourseId(courseId);
    setNewChapter({
      title: "",
      description: "",
      videoUrl: "",
      imageUrl: "",
      sequence: 1,
    });
    setIsChapterModalOpen(true);
  };

  const handleAddChapter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourseId) return;
    try {
      await api.post(`/courses/${selectedCourseId}/chapters`, newChapter);
      toast.success("Chapter added");
      setIsChapterModalOpen(false);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to add chapter");
    }
  };

  const openChaptersList = async (courseId: number) => {
    setSelectedCourseId(courseId);
    try {
      const { data } = await api.get(`/courses/${courseId}/content`);
      setCourseChapters(data);
      setIsChapterListModalOpen(true);
    } catch (error) {
      toast.error("Failed to fetch chapters");
    }
  };

  const handleUpdateChapter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingChapter) return;
    try {
      await api.put(`/courses/chapters/${editingChapter.id}`, editingChapter);
      toast.success("Chapter updated");
      setIsEditChapterModalOpen(false);
      openChaptersList(selectedCourseId!); // Refresh list
    } catch (error) {
      toast.error("Failed to update chapter");
    }
  };

  const handleDeleteChapter = async () => {
    if (!chapterToDeleteId) return;
    try {
      await api.delete(`/courses/chapters/${chapterToDeleteId}`);
      toast.success("Chapter deleted");
      setIsDeleteChapterModalOpen(false);
      openChaptersList(selectedCourseId!); // Refresh list
    } catch (error) {
      toast.error("Failed to delete chapter");
    }
  };

  const confirmDeleteCourse = (courseId: number) => {
    setCourseToDeleteId(courseId);
    setIsDeleteCourseModalOpen(true);
  };

  const handleDeleteCourse = async () => {
    if (!courseToDeleteId) return;
    try {
      await api.delete(`/courses/${courseToDeleteId}`);
      toast.success("Course deleted successfully");
      setIsDeleteCourseModalOpen(false);
      setCourseToDeleteId(null);
      fetchCourses();
    } catch (error) {
      toast.error("Failed to delete course");
    }
  };

  if (loading) return <div className="p-8">Loading courses...</div>;

  const isMentor = user?.role === "mentor" || user?.role === "admin";

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">All Courses</h1>
          <p className="text-gray-500">
            {isMentor
              ? "Manage courses and assignments"
              : "Browse available courses and manage your enrollments"}
          </p>
        </div>
        {isMentor && (
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2 bg-orange-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-orange-700 transition">
            <Plus size={20} /> Create Course
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left py-4 px-6 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Course Title
                </th>
                <th className="text-left py-4 px-6 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Created Date
                </th>
                {/* Only show Status for students? Or show "Owner" for mentor? */}
                {!isMentor && (
                  <th className="text-left py-4 px-6 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                )}
                <th className="text-right py-4 px-6 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {courses.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-gray-500">
                    No courses found.
                  </td>
                </tr>
              ) : (
                courses.map((course) => (
                  <tr
                    key={course.id}
                    className="hover:bg-gray-50 transition-colors">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2">
                        {isMentor ? (
                          <button
                            onClick={() => openChaptersList(course.id)}
                            className="font-medium text-gray-900 hover:text-orange-600 transition text-left">
                            {course.title}
                          </button>
                        ) : (
                          <div className="font-medium text-gray-900">
                            {course.title}
                          </div>
                        )}
                        {isMentor && (
                          <span className="text-[10px] bg-gray-100 text-gray-400 px-1 rounded">
                            ID: {course.id}
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-500 truncate max-w-xs">
                        {course.description}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Calendar size={14} />
                        {new Date(course.createdAt).toLocaleDateString()}
                      </div>
                    </td>

                    {!isMentor && (
                      <td className="py-4 px-6">
                        {course.isCompleted ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            <CheckCircle size={12} />
                            Completed
                          </span>
                        ) : course.isEnrolled ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                            <Calendar size={12} />
                            Enrolled
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                            Available
                          </span>
                        )}
                      </td>
                    )}

                    <td className="py-4 px-6 text-right space-x-3">
                      {isMentor ? (
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => openChapterModal(course.id)}
                            className="bg-blue-50 text-blue-600 px-3 py-1.5 rounded-md text-xs font-medium hover:bg-blue-100 transition flex items-center gap-1">
                            <PlayCircle size={14} /> Add Chapter
                          </button>
                          <button
                            onClick={() => openAssignModal(course.id)}
                            className="bg-purple-50 text-purple-600 px-3 py-1.5 rounded-md text-xs font-medium hover:bg-purple-100 transition flex items-center gap-1">
                            <Users size={14} /> Assign
                          </button>
                          <button
                            onClick={() => confirmDeleteCourse(course.id)}
                            className="bg-red-50 text-red-600 p-1.5 rounded-md text-xs font-medium hover:bg-red-100 transition flex items-center gap-1"
                            title="Delete Course">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ) : course.isEnrolled ? (
                        <>
                          <Link
                            to={`/course/${course.id}`}
                            className="text-orange-600 hover:text-orange-700 text-sm font-medium">
                            Continue
                          </Link>
                          <button
                            onClick={() => confirmUnenroll(course.id)}
                            disabled={actionLoading === course.id}
                            className="text-red-500 hover:text-red-700 text-sm font-medium disabled:opacity-50 ml-2">
                            Unenroll
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => handleEnroll(course.id)}
                          disabled={actionLoading === course.id}
                          className="bg-orange-600 text-white px-4 py-1.5 rounded-md text-sm font-medium hover:bg-orange-700 transition disabled:opacity-50">
                          {actionLoading === course.id
                            ? "Enrolling..."
                            : "Enroll Now"}
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Unenroll Modal */}
      <Modal
        isOpen={isUnenrollModalOpen}
        onClose={() => setIsUnenrollModalOpen(false)}
        title="Confirm Unenrollment"
        footer={
          <>
            <button
              onClick={() => setIsUnenrollModalOpen(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
              Cancel
            </button>
            <button
              onClick={handleUnenroll}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700">
              Yes, Unenroll
            </button>
          </>
        }>
        <p className="text-gray-600">
          Are you sure you want to unenroll from this course? Your progress
          tracking for this course might be reset or archived.
        </p>
      </Modal>

      {/* Create Course Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create New Course">
        <form
          id="create-course-form"
          onSubmit={handleCreateCourse}
          className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Course Title
            </label>
            <input
              required
              type="text"
              value={newCourse.title}
              onChange={(e) =>
                setNewCourse({ ...newCourse, title: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-orange-500 focus:border-orange-500"
              placeholder="e.g. Advanced React Patterns"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              required
              rows={4}
              value={newCourse.description}
              onChange={(e) =>
                setNewCourse({ ...newCourse, description: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-orange-500 focus:border-orange-500"
              placeholder="Briefly describe what students will learn..."
            />
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-gray-100 mt-6 -mx-6 px-6 -mb-6 pb-6 bg-gray-50 rounded-b-xl">
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
              Cancel
            </button>
            <button
              type="submit"
              disabled={createLoading}
              className="px-4 py-2 text-sm font-medium text-white bg-orange-600 rounded-lg hover:bg-orange-700 disabled:opacity-50">
              {createLoading ? "Creating..." : "Create Course"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Assign Student Modal */}
      <Modal
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        title="Assign Student to Course">
        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            Select a student to enroll them in this course. They will receive a
            notification.
          </p>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Select Student
            </label>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-orange-500 focus:border-orange-500"
              value={selectedStudentId || ""}
              onChange={(e) => setSelectedStudentId(Number(e.target.value))}>
              <option value="">-- Choose a Student --</option>
              {students.map((s) => (
                <option
                  key={s.id}
                  value={s.id}
                  disabled={s.isEnrolled}
                  className={s.isEnrolled ? "text-gray-400 bg-gray-50" : ""}>
                  {s.name} ({s.email}) {s.isEnrolled ? " - Enrolled" : ""}
                </option>
              ))}
            </select>
          </div>
          <div className="pt-4 flex justify-end gap-3">
            <button
              onClick={() => setIsAssignModalOpen(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
              Cancel
            </button>
            <button
              onClick={handleAssignStudent}
              disabled={!selectedStudentId}
              className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 disabled:opacity-50">
              Assign Student
            </button>
          </div>
        </div>
      </Modal>

      {/* Add Chapter Modal */}
      <Modal
        isOpen={isChapterModalOpen}
        onClose={() => setIsChapterModalOpen(false)}
        title="Add Chapter">
        <form onSubmit={handleAddChapter} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Chapter Title
            </label>
            <input
              required
              type="text"
              value={newChapter.title}
              onChange={(e) =>
                setNewChapter({ ...newChapter, title: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-orange-500 focus:border-orange-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              required
              rows={3}
              value={newChapter.description}
              onChange={(e) =>
                setNewChapter({ ...newChapter, description: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-orange-500 focus:border-orange-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Video URL (Optional)
              </label>
              <input
                type="text"
                value={newChapter.videoUrl}
                onChange={(e) =>
                  setNewChapter({ ...newChapter, videoUrl: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-orange-500 focus:border-orange-500"
                placeholder="https://..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sequence Number
              </label>
              <input
                type="number"
                min={1}
                value={newChapter.sequence}
                onChange={(e) =>
                  setNewChapter({
                    ...newChapter,
                    sequence: Number(e.target.value),
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-orange-500 focus:border-orange-500"
              />
            </div>
          </div>
          <div className="pt-4 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsChapterModalOpen(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700">
              Add Chapter
            </button>
          </div>
        </form>
      </Modal>

      {/* Chapters List / Manage Modal */}
      <Modal
        isOpen={isChapterListModalOpen}
        onClose={() => setIsChapterListModalOpen(false)}
        title="Manage Course Chapters">
        <div className="space-y-4 min-w-[400px]">
          <div className="flex justify-between items-center bg-blue-50 p-3 rounded-lg border border-blue-100 mb-4">
            <span className="text-sm font-medium text-blue-800">
              Total Chapters: {courseChapters.length}
            </span>
            <button
              onClick={() => {
                setIsChapterListModalOpen(false);
                openChapterModal(selectedCourseId!);
              }}
              className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-800 uppercase">
              <Plus size={14} /> Add New
            </button>
          </div>

          <div className="max-h-[60vh] overflow-y-auto space-y-2 pr-2">
            {courseChapters.length === 0 ? (
              <p className="text-center py-8 text-gray-500 text-sm">
                No chapters added to this course yet.
              </p>
            ) : (
              courseChapters.map((chapter) => (
                <div
                  key={chapter.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:bg-gray-50 group">
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded bg-gray-100 flex items-center justify-center text-[10px] font-bold text-gray-500">
                      {chapter.sequence}
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-gray-900">
                        {chapter.title}
                      </h4>
                      {chapter.videoUrl && (
                        <p className="text-[10px] text-blue-500 truncate max-w-[200px]">
                          {chapter.videoUrl}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => {
                        setEditingChapter(chapter);
                        setIsEditChapterModalOpen(true);
                      }}
                      className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition">
                      <Edit size={14} />
                    </button>
                    <button
                      onClick={() => {
                        setChapterToDeleteId(chapter.id);
                        setIsDeleteChapterModalOpen(true);
                      }}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </Modal>

      {/* Edit Chapter Modal */}
      <Modal
        isOpen={isEditChapterModalOpen}
        onClose={() => setIsEditChapterModalOpen(false)}
        title="Edit Chapter">
        {editingChapter && (
          <form onSubmit={handleUpdateChapter} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Chapter Title
              </label>
              <input
                required
                type="text"
                value={editingChapter.title}
                onChange={(e) =>
                  setEditingChapter({
                    ...editingChapter,
                    title: e.target.value,
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-orange-500 focus:border-orange-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                required
                rows={3}
                value={editingChapter.description}
                onChange={(e) =>
                  setEditingChapter({
                    ...editingChapter,
                    description: e.target.value,
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-orange-500 focus:border-orange-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Video URL
                </label>
                <input
                  type="text"
                  value={editingChapter.videoUrl || ""}
                  onChange={(e) =>
                    setEditingChapter({
                      ...editingChapter,
                      videoUrl: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-orange-500 focus:border-orange-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Sequence
                </label>
                <input
                  type="number"
                  value={editingChapter.sequence}
                  onChange={(e) =>
                    setEditingChapter({
                      ...editingChapter,
                      sequence: Number(e.target.value),
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-orange-500 focus:border-orange-500"
                />
              </div>
            </div>
            <div className="pt-4 flex justify-end gap-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setIsEditChapterModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-orange-600 rounded-lg hover:bg-orange-700">
                Update Chapter
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Delete Chapter Confirmation Modal */}
      <Modal
        isOpen={isDeleteChapterModalOpen}
        onClose={() => setIsDeleteChapterModalOpen(false)}
        title="Delete Chapter">
        <div className="space-y-4">
          <p className="text-gray-600">
            Are you sure you want to delete this chapter? This action cannot be
            undone and will remove all student progress for this chapter.
          </p>
          <div className="pt-4 flex justify-end gap-3">
            <button
              onClick={() => setIsDeleteChapterModalOpen(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
              Cancel
            </button>
            <button
              onClick={handleDeleteChapter}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700">
              Delete Chapter
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete Course Confirmation Modal */}
      <Modal
        isOpen={isDeleteCourseModalOpen}
        onClose={() => setIsDeleteCourseModalOpen(false)}
        title="Delete Course">
        <div className="space-y-4">
          <div className="p-4 bg-red-50 text-red-700 rounded-lg text-sm flex items-start gap-3">
            <Settings className="shrink-0 mt-0.5" size={16} />
            <p>
              <strong>Warning:</strong> Deleting this course will also delete
              all its chapters, student enrollments, and progress tracking data.
              This is a permanent action.
            </p>
          </div>
          <p className="text-gray-600">
            Are you sure you want to proceed and delete this course?
          </p>
          <div className="pt-4 flex justify-end gap-3">
            <button
              onClick={() => setIsDeleteCourseModalOpen(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
              Cancel
            </button>
            <button
              onClick={handleDeleteCourse}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700">
              Confirm Delete
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Courses;
