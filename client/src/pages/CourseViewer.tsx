import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../services/api";
import type { Chapter, Course } from "../types";
import {
  PlayCircle,
  Lock,
  CheckCircle,
  ArrowLeft,
  Award,
  FileText,
} from "lucide-react";
import { toast } from "react-hot-toast";

import ConfirmationModal from "../components/ConfirmationModal";

const CourseViewer = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [course, setCourse] = useState<Course | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [currentChapter, setCurrentChapter] = useState<Chapter | null>(null);
  const [loading, setLoading] = useState(true);
  const [isCompleteModalOpen, setIsCompleteModalOpen] = useState(false);

  useEffect(() => {
    fetchCourseData();
  }, [id]);

  const fetchCourseData = async () => {
    try {
      setLoading(true);
      const courseRes = await api.get(`/courses/${id}`);
      setCourse(courseRes.data);

      const contentRes = await api.get(`/courses/${id}/content`);
      setChapters(contentRes.data);

      // Select first unlocked chapter or first chapter if not set
      if (contentRes.data.length > 0 && !currentChapter) {
        // Ideally find the first incomplete one, or just the first one
        const firstIncomplete = contentRes.data.find(
          (c: Chapter) => !c.isCompleted && !c.isLocked
        );
        setCurrentChapter(firstIncomplete || contentRes.data[0]);
      }
    } catch (error) {
      console.error("Failed to load course", error);
      toast.error("Failed to load course content");
    } finally {
      setLoading(false);
    }
  };

  const handleChapterSelect = (chapter: Chapter) => {
    if (chapter.isLocked) {
      toast.error("Complete previous chapters to unlock this one.");
      return;
    }
    setCurrentChapter(chapter);
  };

  const handleComplete = async () => {
    if (!currentChapter) return;

    try {
      await api.post(`/progress/${currentChapter.id}/complete`);
      toast.success("Chapter completed!");

      // Refresh chapters to update lock status
      const contentRes = await api.get(`/courses/${id}/content`);
      const updatedChapters = contentRes.data;
      setChapters(updatedChapters);

      // Find next chapter
      const currentIndex = updatedChapters.findIndex(
        (c: Chapter) => c.id === currentChapter.id
      );
      if (currentIndex < updatedChapters.length - 1) {
        const nextChapter = updatedChapters[currentIndex + 1];
        if (!nextChapter.isLocked) {
          setCurrentChapter(nextChapter);
        }
      }
    } catch (error: any) {
      toast.error(
        error.response?.data?.message || "Failed to complete chapter"
      );
    }
  };

  const handleDownloadCertificate = async () => {
    try {
      const res = await api.get(`/progress/certificate/${id}`, {
        responseType: "blob", // Important for PDF
      });

      // Create blob link to download
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `Certificate-${course?.title}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      toast.success("Certificate downloaded!");
    } catch (error: any) {
      toast.error(
        error.response?.data?.message || "Failed to download certificate"
      );
    }
  };

  const getEmbedUrl = (url: string) => {
    if (!url) return "";

    // Regex to extract video ID from various YouTube URL formats
    const regExp =
      /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);

    if (match && match[2].length === 11) {
      return `https://www.youtube.com/embed/${match[2]}`;
    }

    // Fallback: If it already looks like an embed link but didn't match strict 11 char check (rare)
    // or if it's another provider, just return strictly if it has 'embed'
    if (url.includes("embed")) return url;

    return url;
  };

  if (loading)
    return <div className="p-8 text-center">Loading course content...</div>;
  if (!course) return <div className="p-8 text-center">Course not found</div>;

  const allCompleted = chapters.every((c) => c.isCompleted);

  return (
    <div className="flex h-screen bg-white">
      {/* Sidebar */}
      <div className="w-80 bg-gray-50 border-r border-gray-200 flex flex-col h-full overflow-hidden">
        <div className="p-4 border-b border-gray-200 bg-white">
          <button
            onClick={() => navigate("/dashboard")}
            className="flex items-center text-sm text-gray-500 hover:text-gray-900 mb-4 transition-colors">
            <ArrowLeft size={16} className="mr-1" /> Back to Dashboard
          </button>
          <h2 className="font-bold text-gray-900 truncate" title={course.title}>
            {course.title}
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            {chapters.filter((c) => c.isCompleted).length} / {chapters.length}{" "}
            Completed
          </p>
          <div className="mt-2 h-1 w-full bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500 transition-all duration-300"
              style={{
                width: `${
                  (chapters.filter((c) => c.isCompleted).length /
                    chapters.length) *
                  100
                }%`,
              }}></div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {chapters.map((chapter, index) => (
            <button
              key={chapter.id}
              onClick={() => handleChapterSelect(chapter)}
              className={`w-full text-left p-3 rounded-lg flex items-center gap-3 transition-opacity ${
                currentChapter?.id === chapter.id
                  ? "bg-orange-50 text-orange-700 border border-orange-200 shadow-sm"
                  : "hover:bg-gray-100 text-gray-700"
              } ${
                chapter.isLocked
                  ? "opacity-60 cursor-not-allowed"
                  : "cursor-pointer"
              }`}>
              <div className="shrink-0">
                {chapter.isCompleted ? (
                  <CheckCircle size={18} className="text-green-500" />
                ) : chapter.isLocked ? (
                  <Lock size={18} className="text-gray-400" />
                ) : (
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center text-xs ${
                      currentChapter?.id === chapter.id
                        ? "border-orange-500 text-orange-600"
                        : "border-gray-400 text-gray-500"
                    }`}>
                    {index + 1}
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{chapter.title}</p>
                <p className="text-xs text-gray-500">
                  {chapter.isLocked ? "Locked" : "Video Lesson"}
                </p>
              </div>
            </button>
          ))}
        </div>

        {allCompleted && (
          <div className="p-4 border-t border-gray-200 bg-green-50">
            <button
              onClick={handleDownloadCertificate}
              className="w-full flex items-center justify-center gap-2 bg-green-600 text-white p-2 rounded-lg font-medium hover:bg-green-700 transition">
              <Award size={18} /> Download Certificate
            </button>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full overflow-y-auto">
        {currentChapter ? (
          <div className="max-w-4xl mx-auto w-full p-8">
            <div className="aspect-video bg-black rounded-xl overflow-hidden shadow-lg mb-8 relative group">
              {currentChapter.videoUrl ? (
                <div className="w-full h-full">
                  {currentChapter.videoUrl.includes("youtube") ||
                  currentChapter.videoUrl.includes("youtu.be") ? (
                    <iframe
                      className="w-full h-full"
                      src={getEmbedUrl(currentChapter.videoUrl)}
                      title={currentChapter.title}
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen></iframe>
                  ) : (
                    <div className="flex items-center justify-center h-full text-white">
                      <div className="text-center">
                        <PlayCircle size={64} className="mx-auto mb-4" />
                        <a
                          href={currentChapter.videoUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="underline hover:text-orange-400">
                          Watch Video (External Link)
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500 bg-gray-100">
                  <div className="text-center">
                    <FileText size={48} className="mx-auto mb-2" />
                    <p>No video content available.</p>
                  </div>
                </div>
              )}
            </div>

            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-4">
                {currentChapter.title}
              </h1>
              <div className="prose max-w-none text-gray-600">
                {currentChapter.description}
              </div>
            </div>

            <div className="flex justify-end pt-8 border-t border-gray-100">
              {!currentChapter.isCompleted && (
                <button
                  onClick={() => setIsCompleteModalOpen(true)}
                  className="bg-orange-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-orange-700 transition flex items-center gap-2 shadow-lg shadow-orange-200">
                  Mark as Completed <CheckCircle size={20} />
                </button>
              )}
              {currentChapter.isCompleted && (
                <div className="flex items-center gap-2 text-green-600 font-medium bg-green-50 px-4 py-2 rounded-lg">
                  <CheckCircle size={20} /> Completed
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            Select a chapter to begin
          </div>
        )}
      </div>

      <ConfirmationModal
        isOpen={isCompleteModalOpen}
        onClose={() => setIsCompleteModalOpen(false)}
        onConfirm={handleComplete}
        title="Complete Chapter"
        message="Are you sure you want to mark this chapter as completed? You can proceed to the next chapter afterwards."
        confirmText="Yes, Complete"
        cancelText="Cancel"
      />
    </div>
  );
};

export default CourseViewer;
