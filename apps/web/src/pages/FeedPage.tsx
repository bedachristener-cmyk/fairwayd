import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import ReactCrop, { type Crop, type PixelCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import { API_BASE } from "../api/base";
import { useAuth } from "../auth/AuthContext";
import CourseDropdown, { type CourseLite } from "../components/CourseDropdown";
import PostCard from "../components/PostCard";
import CommentModal from "../components/CommentModal";
import { useLocation } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { useSelectedCourse } from "../state/SelectedCourseContext";
import { getCroppedImageFile } from "../utils/cropImage";
import {
  getRatingSummary,
  getMyRating,
  type RatingSummary,
  type MyRating,
} from "../api/ratings";

type PostImage = { id: string; url: string };

type Post = {
  id: string;
  content: string;
  createdAt: string;
  visibility?: "PUBLIC" | "FOLLOWERS" | "PRIVATE";
  course: {
    id: string;
    name: string;
    lat: number;
    lon: number;
  };
  user: {
    id: string;
    handle: string;
    name?: string | null;
    avatarUrl?: string | null;
  };
  images?: PostImage[];
  likes?: { userId: string }[];
  comments?: unknown[];
  _count?: {
    likes?: number;
    comments?: number;
  };
};

type Course = {
  id: string;
  name: string;
  lat: number;
  lon: number;
  holes?: number | null;
  website?: string | null;
  isPrivate?: boolean | null;
  private?: boolean | null;
  visibility?: string | null;
  access?: string | null;
  city?: string | null;
  region?: string | null;
  country?: string | null;
};

type CourseRatingMap = Record<string, RatingSummary | null>;

async function resizeImage(file: File): Promise<File> {
  const img = document.createElement("img");
  const reader = new FileReader();

  const dataUrl: string = await new Promise((resolve) => {
    reader.onload = () => resolve(reader.result as string);
    reader.readAsDataURL(file);
  });

  img.src = dataUrl;
  await new Promise((resolve) => (img.onload = resolve));

  const canvas = document.createElement("canvas");

  const MAX_WIDTH = 1600;
  const scale = Math.min(1, MAX_WIDTH / img.width);

  canvas.width = img.width * scale;
  canvas.height = img.height * scale;

  const ctx = canvas.getContext("2d");
  ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);

  const blob: Blob = await new Promise((resolve) =>
    canvas.toBlob((b) => resolve(b!), "image/jpeg", 0.8),
  );

  return new File([blob], file.name, { type: "image/jpeg" });
}

function Card({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const isMobile = window.innerWidth <= 980;

  return (
    <div
      style={{
        background: "var(--card)",
        borderRadius: isMobile ? 0 : 16,
        border: "1px solid var(--border)",
        padding: isMobile ? "0 0 12px" : 12,
        color: "var(--text)",
      }}
    >
      <div
        style={{
          fontWeight: 900,
          marginBottom: 10,
          padding: isMobile ? 12 : 0,
        }}
      >
        {title}
      </div>
      <div style={{ padding: isMobile ? 0 : 0 }}>{children}</div>
    </div>
  );
}

export default function FeedPage() {
  const isMobile = window.innerWidth <= 980;
  const location = useLocation();
  const { selectedCourse, setSelectedCourse, clearSelectedCourse } =
    useSelectedCourse();

  const { token, user, loading, logout, isAuthenticated } = useAuth();

  const handle =
    user?.handle || localStorage.getItem("fairwayd_handle") || "me";

  const searchParams = useMemo(
    () => new URLSearchParams(location.search),
    [location.search],
  );

  const focusCourse = (location.state as any)?.focusCourse ?? null;
  const focusPostIdFromState = (location.state as any)?.focusPostId ?? null;
  const openCommentFromState = (location.state as any)?.openComment ?? false;

  const focusPostIdFromQuery = searchParams.get("postId");
  const openCommentFromQuery = searchParams.get("comment") === "1";

  const focusPostId = focusPostIdFromState ?? focusPostIdFromQuery;
  const openComment = openCommentFromState || openCommentFromQuery;

  const [posts, setPosts] = useState<Post[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [courseRatings, setCourseRatings] = useState<CourseRatingMap>({});
  const [myRatings, setMyRatings] = useState<Record<string, MyRating | null>>(
    {},
  );
  const [activeRatingCourseId, setActiveRatingCourseId] = useState<
    string | null
  >(null);
  const [ratingDraft, setRatingDraft] = useState(4);
  const [activeCommentPostId, setActiveCommentPostId] = useState<string | null>(
    null,
  );

  const [followedCourseIds, setFollowedCourseIds] = useState<string[]>([]);
  const [courseFollowBusyId, setCourseFollowBusyId] = useState<string | null>(
    null,
  );

  const [draft, setDraft] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [visibility, setVisibility] = useState<
    "PUBLIC" | "FOLLOWERS" | "PRIVATE"
  >("PUBLIC");

  const [editorOpen, setEditorOpen] = useState(false);
  const [editorImageSrc, setEditorImageSrc] = useState<string | null>(null);
  const [editorFileName, setEditorFileName] = useState("image.jpg");
  const [crop, setCrop] = useState<Crop>({
    unit: "%",
    x: 10,
    y: 10,
    width: 80,
    height: 80,
  });
  const [completedCrop, setCompletedCrop] = useState<PixelCrop | null>(null);
  const [rotation, setRotation] = useState(0);
  const [applyingEdit, setApplyingEdit] = useState(false);

  const [err, setErr] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);
  const [composerHint, setComposerHint] = useState<string | null>(null);

  const draftRef = useRef<HTMLTextAreaElement | null>(null);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const editorImageRef = useRef<HTMLImageElement | null>(null);
  const nav = useNavigate();

  const resetEditorState = useCallback(() => {
    setEditorOpen(false);
    setEditorImageSrc(null);
    setEditorFileName("image.jpg");
    setCrop({
      unit: "%",
      x: 10,
      y: 10,
      width: 80,
      height: 80,
    });
    setCompletedCrop(null);
    setRotation(0);
    setApplyingEdit(false);
  }, []);

  const openEditorForFile = useCallback(async (picked: File) => {
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error("Failed to read image file"));

      reader.readAsDataURL(picked);
    });

    setEditorFileName(picked.name || "image.jpg");
    setEditorImageSrc(dataUrl);
    setCrop({
      unit: "%",
      x: 10,
      y: 10,
      width: 80,
      height: 80,
    });
    setCompletedCrop(null);
    setRotation(0);
    setEditorOpen(true);
  }, []);

  useEffect(() => {
    const run = async () => {
      try {
        const r = await fetch(`${API_BASE}/courses`);
        if (!r.ok) return;
        const d = await r.json();
        setCourses(Array.isArray(d) ? d : []);
      } catch {
        setCourses([]);
      }
    };
    run();
  }, []);

  useEffect(() => {
    if (!file) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    if (!editorOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [editorOpen]);

  const loadFeed = useCallback(async () => {
    if (!token) return;

    try {
      setErr(null);

      const res = await fetch(`${API_BASE}/posts/feed`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.status === 401 || res.status === 403) {
        logout();
        return;
      }

      if (!res.ok) {
        const t = await res.text().catch(() => "");
        throw new Error(`HTTP ${res.status} ${res.statusText} ${t}`.trim());
      }

      const data = await res.json();
      const items = Array.isArray(data?.items) ? data.items : [];

      setPosts(
        items.map((post: any) => ({
          ...post,
          likes: Array.isArray(post?.likes) ? post.likes : [],
          comments: Array.isArray(post?.comments) ? post.comments : [],
          _count: {
            likes:
              typeof post?._count?.likes === "number"
                ? post._count.likes
                : Array.isArray(post?.likes)
                  ? post.likes.length
                  : 0,
            comments:
              typeof post?._count?.comments === "number"
                ? post._count.comments
                : Array.isArray(post?.comments)
                  ? post.comments.length
                  : 0,
          },
        })),
      );
    } catch (e: any) {
      setErr(e?.message ?? "Failed to load feed");
    }
  }, [token, logout]);

  const loadFollowedCourses = useCallback(async () => {
    if (!token) return;

    try {
      const res = await fetch(`${API_BASE}/courses/me/following`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.status === 401 || res.status === 403) {
        logout();
        return;
      }

      if (!res.ok) {
        throw new Error(`Failed to load followed courses: ${res.status}`);
      }

      const data = await res.json();
      const items = Array.isArray(data?.items) ? data.items : [];

      setFollowedCourseIds(
        items
          .map((course: { id?: string }) => course.id)
          .filter(
            (id: string | undefined): id is string =>
              typeof id === "string" && id.length > 0,
          ),
      );
    } catch (err) {
      console.error("Failed to load followed courses", err);
      setFollowedCourseIds([]);
    }
  }, [token, logout]);

  useEffect(() => {
    if (loading) return;
    if (!token) return;
    loadFeed();
  }, [loading, token, loadFeed]);

  useEffect(() => {
    if (loading) return;
    if (!token) return;
    loadFollowedCourses();
  }, [loading, token, loadFollowedCourses]);

  useEffect(() => {
    if (!selectedCourse) return;
    const t = window.setTimeout(() => {
      draftRef.current?.focus();
    }, 50);
    return () => window.clearTimeout(t);
  }, [selectedCourse]);

  useEffect(() => {
    if (!focusCourse) return;

    setSelectedCourse({
      id: focusCourse.id,
      name: focusCourse.name,
      lat: Number(focusCourse.lat ?? 0),
      lon: Number(focusCourse.lon ?? 0),
    });
  }, [focusCourse, setSelectedCourse]);

  useEffect(() => {
    if (!openComment) return;
    if (!focusPostId) return;

    setActiveCommentPostId(focusPostId);
  }, [openComment, focusPostId]);

  useEffect(() => {
    const uniqueCourseIds = Array.from(
      new Set(
        posts
          .map((post) => post.course?.id)
          .filter(
            (courseId): courseId is string =>
              typeof courseId === "string" && courseId.length > 0,
          ),
      ),
    );

    if (uniqueCourseIds.length === 0) {
      setCourseRatings({});
      setMyRatings({});
      return;
    }

    let cancelled = false;

    const emptySummary: RatingSummary = {
      overall: 0,
      count: 0,
      breakdown: {
        condition: 0,
        layout: 0,
        scenery: 0,
        value: 0,
      },
    };

    const run = async () => {
      try {
        const nextCourseRatings: Record<string, RatingSummary | null> = {};
        const nextMyRatings: Record<string, MyRating | null> = {};

        for (const courseId of uniqueCourseIds) {
          try {
            const summary = await getRatingSummary(courseId);
            nextCourseRatings[courseId] = summary ?? emptySummary;
          } catch (err) {
            console.error("Rating summary failed for course", courseId, err);
            nextCourseRatings[courseId] = emptySummary;
          }

          try {
            nextMyRatings[courseId] = token
              ? await getMyRating(courseId, token)
              : null;
          } catch (err) {
            console.error("My rating failed for course", courseId, err);
            nextMyRatings[courseId] = null;
          }
        }

        if (cancelled) return;

        setCourseRatings(nextCourseRatings);
        setMyRatings(nextMyRatings);
      } catch (err) {
        console.error("Failed to load feed ratings", err);
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [posts, token]);

  const coursesLite: CourseLite[] = useMemo(
    () => courses.map((c) => ({ id: c.id, name: c.name })),
    [courses],
  );

  const selectedCourseId = selectedCourse?.id ?? null;
  const selectedCourseFull =
    courses.find((course) => course.id === selectedCourseId) ?? null;

  const selectedName = selectedCourseFull?.name ?? selectedCourse?.name;
  const selectedLat = selectedCourseFull?.lat ?? selectedCourse?.lat;
  const selectedLon = selectedCourseFull?.lon ?? selectedCourse?.lon;

  const selectedHoles = selectedCourseFull?.holes ?? null;
  const selectedWebsite = selectedCourseFull?.website ?? null;

  const selectedVisibilityRaw =
    selectedCourseFull?.visibility ?? selectedCourseFull?.access ?? null;

  const selectedIsPrivate =
    typeof selectedCourseFull?.isPrivate === "boolean"
      ? selectedCourseFull.isPrivate
      : typeof selectedCourseFull?.private === "boolean"
        ? selectedCourseFull.private
        : typeof selectedVisibilityRaw === "string"
          ? selectedVisibilityRaw.toLowerCase() === "private"
          : null;

  const selectedCity = selectedCourseFull?.city ?? null;
  const selectedRegion = selectedCourseFull?.region ?? null;
  const selectedCountry = selectedCourseFull?.country ?? null;

  const selectedLocationLabel = [selectedCity, selectedRegion, selectedCountry]
    .filter(
      (value): value is string =>
        typeof value === "string" && value.trim().length > 0,
    )
    .join(", ");

  const isSelectedCourseFollowed = selectedCourseId
    ? followedCourseIds.includes(selectedCourseId)
    : false;
  const isSelectedCourseFollowBusy = courseFollowBusyId === selectedCourseId;

  const supportsDirectCamera =
    typeof navigator !== "undefined" &&
    /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

  const normalizedSelectedWebsite =
    selectedWebsite && selectedWebsite.trim().length > 0
      ? /^https?:\/\//i.test(selectedWebsite)
        ? selectedWebsite
        : `https://${selectedWebsite}`
      : null;

  const selectedIsComplete =
    Boolean(selectedCourse?.id) &&
    typeof selectedName === "string" &&
    selectedName.trim().length > 0 &&
    typeof selectedLat === "number" &&
    typeof selectedLon === "number";

  const handleComposerImageChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const picked = e.target.files?.[0] ?? null;
    e.target.value = "";

    if (!picked) return;

    setFile(picked);
    setErr(null);
  };

  const applyImageEdits = useCallback(async () => {
    if (!editorImageSrc || !completedCrop || !editorImageRef.current) return;

    try {
      setApplyingEdit(true);

      const img = editorImageRef.current;
      const rect = img.getBoundingClientRect();

      if (!rect.width || !rect.height) {
        throw new Error("Image size could not be determined");
      }

      const scaleX = img.naturalWidth / rect.width;
      const scaleY = img.naturalHeight / rect.height;

      const editedFile = await getCroppedImageFile(
        editorImageSrc,
        {
          x: Math.round(completedCrop.x * scaleX),
          y: Math.round(completedCrop.y * scaleY),
          width: Math.round(completedCrop.width * scaleX),
          height: Math.round(completedCrop.height * scaleY),
        },
        rotation,
        editorFileName || "image.jpg",
      );

      setFile(editedFile);
      setErr(null);
      resetEditorState();
    } catch (e: any) {
      console.error("Apply image edits failed", e);
      setErr(e?.message ?? "Failed to edit image");
    } finally {
      setApplyingEdit(false);
    }
  }, [
    editorImageSrc,
    completedCrop,
    rotation,
    editorFileName,
    resetEditorState,
  ]);

  const openGalleryPicker = () => {
    if (posting) return;

    if (!selectedCourse) {
      setComposerHint("Please choose a course first ⛳");
      draftRef.current?.focus();
      return;
    }

    setComposerHint(null);
    galleryInputRef.current?.click();
  };

  const openCameraPicker = () => {
    if (posting) return;

    if (!selectedCourse) {
      setComposerHint("Please choose a course first ⛳");
      draftRef.current?.focus();
      return;
    }

    setComposerHint(null);
    cameraInputRef.current?.click();
  };

  const handleToggleCourseFollow = useCallback(
    async (courseId: string) => {
      if (!token) return;
      if (courseFollowBusyId) return;

      const currentlyFollowed = followedCourseIds.includes(courseId);

      try {
        setCourseFollowBusyId(courseId);

        setFollowedCourseIds((prev) =>
          currentlyFollowed
            ? prev.filter((id: string) => id !== courseId)
            : prev.includes(courseId)
              ? prev
              : [...prev, courseId],
        );

        const res = await fetch(`${API_BASE}/courses/${courseId}/follow`, {
          method: currentlyFollowed ? "DELETE" : "POST",
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.status === 401 || res.status === 403) {
          logout();
          throw new Error("Unauthorized");
        }

        if (!res.ok) {
          throw new Error(`Course follow request failed: ${res.status}`);
        }
      } catch (err) {
        setFollowedCourseIds((prev) =>
          currentlyFollowed
            ? prev.includes(courseId)
              ? prev
              : [...prev, courseId]
            : prev.filter((id: string) => id !== courseId),
        );
        console.error("Course follow toggle failed", err);
      } finally {
        setCourseFollowBusyId(null);
      }
    },
    [token, logout, courseFollowBusyId, followedCourseIds],
  );
  const submitPost = async () => {
    console.log("submitPost clicked", {
      selectedCourse,
      selectedIsComplete,
      draft,
      file,
      token: Boolean(token),
      visibility,
      selectedName,
      selectedLat,
      selectedLon,
      typeLat: typeof selectedLat,
      typeLon: typeof selectedLon,
    });

    if (!selectedCourse) {
      setErr("Choose a course first.");
      alert("Choose a course first.");
      return;
    }

    if (!selectedIsComplete) {
      setErr(
        "Selected course is missing details (name/coordinates). Please re-select the course.",
      );
      alert("Selected course is missing details. Please re-select the course.");
      return;
    }

    const text = draft.trim();
    if (!text && !file) {
      setErr("Write something or add a photo.");
      alert("Write something or add a photo.");
      return;
    }

    if (!token) {
      setErr("Missing auth token. Please login again.");
      alert("Missing auth token. Please login again.");
      return;
    }

    setPosting(true);
    setErr(null);

    const optimisticId = `optimistic-${Date.now()}`;
    const optimistic: Post = {
      id: optimisticId,
      content: text,
      createdAt: new Date().toISOString(),
      visibility,
      course: {
        id: selectedCourse.id,
        name: selectedName!,
        lat: selectedLat!,
        lon: selectedLon!,
      },
      user: { id: "me", handle },
      images: preview ? [{ id: "preview", url: preview }] : [],
    };

    setPosts((prev) => [optimistic, ...prev]);

    try {
      const fd = new FormData();
      fd.append("courseId", selectedCourse.id);
      fd.append("content", text);
      fd.append("visibility", visibility);
      if (file) {
        const resized = await resizeImage(file);
        fd.append("image", resized);
      }

      const res = await fetch(`${API_BASE}/posts`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });

      if (res.status === 401 || res.status === 403) {
        logout();
        throw new Error("Unauthorized. Please login again.");
      }

      if (!res.ok) {
        const t = await res.text().catch(() => "");
        throw new Error(`HTTP ${res.status} ${res.statusText} ${t}`.trim());
      }

      const created = (await res.json()) as Post;

      setDraft("");
      setFile(null);
      setPreview(null);
      resetEditorState();

      setPosts((prev) => {
        const rest = prev.filter((p) => p.id !== optimisticId);
        return [created, ...rest];
      });
    } catch (e: any) {
      setPosts((prev) => prev.filter((p) => p.id !== optimisticId));
      setErr(e?.message ?? "Failed to post");
    } finally {
      setPosting(false);
    }
  };

  const activeCommentPost =
    posts.find((p) => p.id === activeCommentPostId) ?? null;

  const composerBoxStyle: React.CSSProperties = {
    padding: isMobile ? "0 12px 12px" : 12,
    borderRadius: isMobile ? 0 : 14,
    background: "var(--card)",
    border: isMobile ? "none" : "1px solid var(--border)",
  };

  if (loading) return null;

  if (!isAuthenticated) {
    return (
      <div
        style={{
          display: "grid",
          gap: 12,
          paddingBottom: isMobile
            ? "calc(64px + env(safe-area-inset-bottom, 0px))"
            : 0,
        }}
      >
        <Card title="Feed">
          <div style={{ color: "var(--sub)", fontSize: 13 }}>
            Bitte neu einloggen (DB Reset hat den alten Token ungültig gemacht).
          </div>
        </Card>
      </div>
    );
  }

  return (
    <>
      <div style={{ display: "grid", gap: 12 }}>
        {err && (
          <div
            style={{
              padding: 10,
              borderRadius: 12,
              background: "rgba(255,0,0,.08)",
              border: "1px solid var(--border)",
              fontSize: 13,
            }}
          >
            <strong>Error:</strong> {err}
          </div>
        )}

        <Card title="Feed">
          <div
            style={{
              position: "sticky",
              top: 12,
              zIndex: 20,
              paddingBottom: 12,
            }}
          >
            <div style={composerBoxStyle}>
              <div
                style={{
                  display: "flex",
                  gap: 10,
                  alignItems: isMobile ? "stretch" : "flex-start",
                  flexWrap: "wrap",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                    flex: 1,
                    minWidth: isMobile ? "100%" : 260,
                  }}
                >
                  <CourseDropdown
                    courses={coursesLite}
                    selectedCourseId={selectedCourse?.id ?? null}
                    onSelect={(id) => {
                      const c = courses.find((x) => x.id === id);
                      if (c) {
                        setSelectedCourse(c);
                        setComposerHint(null);
                      }
                    }}
                    onClear={() => {
                      clearSelectedCourse();
                      setComposerHint(null);
                    }}
                    placeholder="Choose course"
                  />

                  {!selectedCourse ? (
                    <div
                      style={{
                        fontSize: 12,
                        color: composerHint ? "var(--text)" : "var(--sub)",
                        fontWeight: composerHint ? 800 : 400,
                      }}
                    >
                      {composerHint ?? "Pick a course before posting."}
                    </div>
                  ) : (
                    <div
                      style={{
                        display: "flex",
                        alignItems: isMobile ? "stretch" : "center",
                        justifyContent: "space-between",
                        gap: 12,
                        flexWrap: isMobile ? "wrap" : "nowrap",
                        padding: isMobile ? "12px" : "12px 14px",
                        borderRadius: 16,
                        border: "1px solid var(--border)",
                        background: "var(--card)",
                        boxShadow: isMobile
                          ? "none"
                          : "0 4px 14px rgba(0,0,0,0.04)",
                      }}
                    >
                      <div
                        style={{
                          minWidth: 0,
                          display: "flex",
                          flexDirection: "column",
                          gap: 4,
                          flex: 1,
                        }}
                      >
                        <div
                          style={{
                            fontSize: 11,
                            fontWeight: 800,
                            color: "var(--sub)",
                            textTransform: "uppercase",
                            letterSpacing: 0.5,
                          }}
                        >
                          Selected course
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            if (!selectedCourseId) return;
                            nav(`/courses/${selectedCourseId}`);
                          }}
                          style={{
                            padding: 0,
                            margin: 0,
                            border: "none",
                            background: "transparent",
                            color: "var(--text)",
                            fontSize: isMobile ? 15 : 16,
                            fontWeight: 900,
                            textAlign: "left",
                            cursor: selectedCourseId ? "pointer" : "default",
                            lineHeight: 1.25,
                            wordBreak: "break-word",
                          }}
                        >
                          {selectedCourse.name}
                        </button>
                        <div
                          style={{
                            fontSize: 12,
                            color: "var(--sub)",
                            lineHeight: 1.35,
                          }}
                        >
                          Posts and images will be linked to this course
                        </div>

                        {(selectedLocationLabel ||
                          selectedHoles !== null ||
                          selectedIsPrivate !== null ||
                          normalizedSelectedWebsite) && (
                          <div
                            style={{
                              display: "flex",
                              flexWrap: "wrap",
                              gap: 8,
                              marginTop: 4,
                            }}
                          >
                            {selectedLocationLabel ? (
                              <span
                                style={{
                                  fontSize: 12,
                                  color: "var(--sub)",
                                  padding: "6px 10px",
                                  borderRadius: 999,
                                  border: "1px solid var(--border)",
                                  background: "var(--bg)",
                                }}
                              >
                                📍 {selectedLocationLabel}
                              </span>
                            ) : null}

                            {selectedHoles !== null ? (
                              <span
                                style={{
                                  fontSize: 12,
                                  color: "var(--sub)",
                                  padding: "6px 10px",
                                  borderRadius: 999,
                                  border: "1px solid var(--border)",
                                  background: "var(--bg)",
                                }}
                              >
                                ⛳ {selectedHoles} holes
                              </span>
                            ) : null}

                            {selectedIsPrivate !== null ? (
                              <span
                                style={{
                                  fontSize: 12,
                                  color: "var(--sub)",
                                  padding: "6px 10px",
                                  borderRadius: 999,
                                  border: "1px solid var(--border)",
                                  background: "var(--bg)",
                                }}
                              >
                                {selectedIsPrivate ? "🔒 Private" : "🌍 Public"}
                              </span>
                            ) : null}

                            {normalizedSelectedWebsite ? (
                              <a
                                href={normalizedSelectedWebsite}
                                target="_blank"
                                rel="noreferrer"
                                style={{
                                  fontSize: 12,
                                  color: "var(--text)",
                                  padding: "6px 10px",
                                  borderRadius: 999,
                                  border: "1px solid var(--border)",
                                  background: "var(--bg)",
                                  textDecoration: "none",
                                  fontWeight: 700,
                                }}
                              >
                                Website
                              </a>
                            ) : null}
                          </div>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          if (!selectedCourseId || isSelectedCourseFollowBusy) {
                            return;
                          }
                          handleToggleCourseFollow(selectedCourseId);
                        }}
                        disabled={
                          !selectedCourseId || isSelectedCourseFollowBusy
                        }
                        style={{
                          alignSelf: isMobile ? "stretch" : "center",
                          minWidth: isMobile ? "100%" : 132,
                          minHeight: 42,
                          padding: "10px 14px",
                          borderRadius: 999,
                          border: isSelectedCourseFollowed
                            ? "1px solid rgba(39,196,107,0.45)"
                            : "1px solid var(--border)",
                          background: isSelectedCourseFollowed
                            ? "rgba(39,196,107,0.18)"
                            : "var(--bg)",
                          color: "var(--text)",
                          fontWeight: 800,
                          fontSize: 13,
                          cursor:
                            !selectedCourseId || isSelectedCourseFollowBusy
                              ? "default"
                              : "pointer",
                          opacity:
                            !selectedCourseId || isSelectedCourseFollowBusy
                              ? 0.7
                              : 1,
                          whiteSpace: "nowrap",
                          boxShadow: isSelectedCourseFollowed
                            ? "0 0 0 1px rgba(39,196,107,0.12)"
                            : "none",
                          transition:
                            "background 0.15s ease, border-color 0.15s ease, opacity 0.15s ease",
                        }}
                      >
                        {isSelectedCourseFollowBusy
                          ? "Updating..."
                          : isSelectedCourseFollowed
                            ? "Following"
                            : "Follow"}
                      </button>
                    </div>
                  )}
                </div>

                <div
                  style={{
                    marginLeft: isMobile ? 0 : "auto",
                    minWidth: isMobile ? "100%" : "auto",
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: 14,
                    paddingRight: 10,
                    display: "flex",
                    alignItems: "center",
                    boxShadow: isMobile
                      ? "none"
                      : "0 2px 10px rgba(0,0,0,0.03)",
                  }}
                >
                  <select
                    value={visibility}
                    onChange={(e) =>
                      setVisibility(
                        e.target.value as "PUBLIC" | "FOLLOWERS" | "PRIVATE",
                      )
                    }
                    style={{
                      padding: "10px 12px",
                      border: "none",
                      outline: "none",
                      background: "var(--card)",
                      color: "var(--text)",
                      fontWeight: 800,
                      fontSize: 13,
                      appearance: "none",
                      WebkitAppearance: "none",
                      MozAppearance: "none",
                      borderRadius: 14,
                      cursor: posting ? "default" : "pointer",
                      width: isMobile ? "100%" : "auto",
                    }}
                    disabled={posting}
                  >
                    <option
                      value="PUBLIC"
                      style={{
                        background: "var(--card)",
                        color: "var(--text)",
                      }}
                    >
                      🌍 Public
                    </option>
                    <option
                      value="FOLLOWERS"
                      style={{
                        background: "var(--card)",
                        color: "var(--text)",
                      }}
                    >
                      👥 Followers
                    </option>
                    <option
                      value="PRIVATE"
                      style={{
                        background: "var(--card)",
                        color: "var(--text)",
                      }}
                    >
                      🔒 Private
                    </option>
                  </select>
                </div>
              </div>

              <textarea
                ref={draftRef}
                value={draft}
                onChange={(e) => {
                  setDraft(e.target.value);
                  if (err) setErr(null);
                  if (composerHint) setComposerHint(null);
                }}
                placeholder="What’s your golf moment?"
                rows={3}
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  marginTop: 10,
                  borderRadius: isMobile ? 0 : 12,
                  border: isMobile ? "none" : "1px solid var(--border)",
                  padding: 12,
                  background: "var(--bg)",
                  color: "var(--text)",
                }}
                disabled={posting}
              />
              <div
                style={{
                  display: "flex",
                  gap: 10,
                  alignItems: "center",
                  marginTop: 12,
                  padding: isMobile ? "12px 0 0" : "12px",
                  flexWrap: "wrap",
                  rowGap: 10,
                  justifyContent: "space-between",
                  borderTop: "1px solid var(--border)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    flexWrap: "wrap",
                  }}
                >
                  <input
                    ref={galleryInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleComposerImageChange}
                    disabled={posting}
                    style={{ display: "none" }}
                  />

                  <input
                    ref={cameraInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleComposerImageChange}
                    disabled={posting}
                    style={{ display: "none" }}
                  />

                  {supportsDirectCamera ? (
                    <>
                      <button
                        type="button"
                        onClick={openCameraPicker}
                        disabled={posting}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 8,
                          padding: "8px 12px",
                          borderRadius: 999,
                          border: "1px solid var(--border)",
                          background: "var(--bg)",
                          color: posting ? "var(--sub)" : "var(--text)",
                          fontWeight: 700,
                          fontSize: 12,
                          cursor: posting ? "default" : "pointer",
                          opacity: posting ? 0.6 : 1,
                          whiteSpace: "nowrap",
                        }}
                      >
                        📸 Camera
                      </button>

                      <button
                        type="button"
                        onClick={openGalleryPicker}
                        disabled={posting}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 8,
                          padding: "8px 12px",
                          borderRadius: 999,
                          border: "1px solid var(--border)",
                          background: "var(--bg)",
                          color: posting ? "var(--sub)" : "var(--text)",
                          fontWeight: 700,
                          fontSize: 12,
                          cursor: posting ? "default" : "pointer",
                          opacity: posting ? 0.6 : 1,
                          whiteSpace: "nowrap",
                        }}
                      >
                        🖼️ Gallery
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={openGalleryPicker}
                      disabled={posting}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 8,
                        padding: "8px 12px",
                        borderRadius: 999,
                        border: "1px solid var(--border)",
                        background: "var(--bg)",
                        color: posting ? "var(--sub)" : "var(--text)",
                        fontWeight: 700,
                        fontSize: 12,
                        cursor: posting ? "default" : "pointer",
                        opacity: posting ? 0.6 : 1,
                        whiteSpace: "nowrap",
                      }}
                    >
                      📷 Add image
                    </button>
                  )}
                </div>

                {file ? (
                  <div
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 10,
                      minWidth: 0,
                      maxWidth: isMobile ? "100%" : 360,
                      padding: "10px 12px",
                      borderRadius: 14,
                      background: "var(--bg)",
                      border: "1px solid var(--border)",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        minWidth: 0,
                        gap: 2,
                        flex: 1,
                      }}
                    >
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 800,
                          color: "var(--text)",
                        }}
                      >
                        1 image ready
                      </span>

                      <span
                        style={{
                          fontSize: 12,
                          color: "var(--sub)",
                          minWidth: 0,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                        title={file.name}
                      >
                        {file.name}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={async () => {
                        if (!file) return;

                        try {
                          await openEditorForFile(file);
                          setErr(null);
                        } catch (err: any) {
                          console.error("Re-open editor failed", err);
                          setErr(
                            err?.message ?? "Failed to reopen image editor",
                          );
                        }
                      }}
                      disabled={posting}
                      style={{
                        border: "1px solid var(--border)",
                        background: "var(--card)",
                        color: posting ? "var(--sub)" : "var(--text)",
                        fontSize: 12,
                        fontWeight: 800,
                        cursor: posting ? "default" : "pointer",
                        padding: "8px 10px",
                        borderRadius: 999,
                        whiteSpace: "nowrap",
                        opacity: posting ? 0.6 : 1,
                      }}
                    >
                      Edit
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setFile(null);
                        setPreview(null);
                        resetEditorState();
                      }}
                      disabled={posting}
                      style={{
                        border: "1px solid var(--border)",
                        background: "var(--card)",
                        color: posting ? "var(--sub)" : "var(--text)",
                        fontSize: 12,
                        fontWeight: 800,
                        cursor: posting ? "default" : "pointer",
                        padding: "8px 10px",
                        borderRadius: 999,
                        whiteSpace: "nowrap",
                        opacity: posting ? 0.6 : 1,
                      }}
                    >
                      Remove
                    </button>
                  </div>
                ) : null}

                <div
                  style={{
                    marginLeft: "auto",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    flexWrap: "wrap",
                    justifyContent: "flex-end",
                  }}
                >
                  {!selectedCourse && (
                    <span
                      style={{
                        fontSize: 12,
                        color: "var(--sub)",
                        fontWeight: 700,
                      }}
                    >
                      Choose a course first to enable posting
                    </span>
                  )}

                  {selectedCourse && !draft.trim() && !file && (
                    <span
                      style={{
                        fontSize: 12,
                        color: "var(--sub)",
                        fontWeight: 700,
                      }}
                    >
                      Write something or add an image
                    </span>
                  )}

                  {selectedCourse && file && !draft.trim() && (
                    <span
                      style={{
                        fontSize: 12,
                        color: "var(--sub)",
                      }}
                    >
                      Image ready to post
                    </span>
                  )}

                  <button
                    onClick={submitPost}
                    disabled={
                      posting || !selectedCourse || (!draft.trim() && !file)
                    }
                    style={{
                      padding: "10px 16px",
                      borderRadius: 999,
                      border: "1px solid var(--border)",
                      background: "var(--text)",
                      color: "var(--bg)",
                      fontWeight: 800,
                      cursor:
                        posting || !selectedCourse || (!draft.trim() && !file)
                          ? "default"
                          : "pointer",
                      opacity:
                        posting || !selectedCourse || (!draft.trim() && !file)
                          ? 0.5
                          : 1,
                    }}
                    type="button"
                  >
                    {posting
                      ? "Posting..."
                      : file && !draft.trim()
                        ? "Post image"
                        : "Post"}
                  </button>
                </div>
              </div>

              {preview && (
                <div
                  style={{
                    marginTop: 12,
                    display: "flex",
                    flexDirection: "column",
                    gap: 10,
                    width: isMobile ? "100%" : "min(420px, 100%)",
                  }}
                >
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 800,
                      color: "var(--sub)",
                    }}
                  >
                    Image preview
                  </div>

                  <div
                    style={{
                      borderRadius: 16,
                      overflow: "hidden",
                      border: "1px solid var(--border)",
                      background: "var(--bg)",
                      boxShadow: "0 4px 18px rgba(0,0,0,0.08)",
                    }}
                  >
                    <img
                      src={preview}
                      alt="preview"
                      style={{
                        display: "block",
                        width: "100%",
                        maxHeight: isMobile ? 320 : 360,
                        objectFit: "cover",
                        background: "var(--card)",
                      }}
                    />
                  </div>
                </div>
              )}

              {editorOpen &&
                editorImageSrc &&
                createPortal(
                  <div
                    style={{
                      position: "fixed",
                      inset: 0,
                      zIndex: 2147483647,
                      background: "rgba(0,0,0,0.82)",
                    }}
                  >
                    <div
                      style={{
                        position: "absolute",
                        inset: 0,
                        background: "var(--card)",
                        color: "var(--text)",
                        display: "grid",
                        gridTemplateRows: "auto minmax(0, 1fr) auto",
                      }}
                    >
                      <div
                        style={{
                          padding: isMobile
                            ? "12px 14px 10px"
                            : "14px 16px 10px",
                          borderBottom: "1px solid var(--border)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: 12,
                          background: "var(--card)",
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 900, fontSize: 16 }}>
                            Edit image
                          </div>
                          <div
                            style={{
                              fontSize: 12,
                              color: "var(--sub)",
                              marginTop: 4,
                            }}
                          >
                            Crop freely and rotate before posting
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            if (applyingEdit) return;
                            resetEditorState();
                          }}
                          disabled={applyingEdit}
                          style={{
                            border: "1px solid var(--border)",
                            background: "var(--bg)",
                            color: "var(--text)",
                            borderRadius: 999,
                            padding: "8px 12px",
                            fontWeight: 700,
                            cursor: applyingEdit ? "default" : "pointer",
                            opacity: applyingEdit ? 0.6 : 1,
                          }}
                        >
                          Close
                        </button>
                      </div>

                      <div
                        style={{
                          minHeight: 0,
                          overflow: "auto",
                          background: "#111",
                          padding: isMobile ? 10 : 20,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <div
                          style={{
                            maxWidth: "100%",
                            width: "100%",
                            display: "flex",
                            justifyContent: "center",
                          }}
                        >
                          <ReactCrop
                            crop={crop}
                            onChange={(nextCrop) => setCrop(nextCrop)}
                            onComplete={(pixelCrop) =>
                              setCompletedCrop(pixelCrop)
                            }
                          >
                            <img
                              ref={editorImageRef}
                              src={editorImageSrc}
                              alt="Edit preview"
                              style={{
                                display: "block",
                                maxWidth: "100%",
                                maxHeight: isMobile ? "44dvh" : "60vh",
                                objectFit: "contain",
                                transform: `rotate(${rotation}deg)`,
                                transformOrigin: "center center",
                              }}
                            />
                          </ReactCrop>
                        </div>
                      </div>

                      <div
                        style={{
                          padding: isMobile
                            ? "10px 12px calc(10px + env(safe-area-inset-bottom, 0px))"
                            : 16,
                          borderTop: "1px solid var(--border)",
                          background: "var(--card)",
                          display: "grid",
                          gap: 10,
                        }}
                      >
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: isMobile
                              ? "1fr 1fr"
                              : "auto auto",
                            gap: 10,
                          }}
                        >
                          <button
                            type="button"
                            onClick={() => setRotation((prev) => prev - 90)}
                            disabled={applyingEdit}
                            style={{
                              padding: "11px 12px",
                              borderRadius: 999,
                              border: "1px solid var(--border)",
                              background: "var(--bg)",
                              color: "var(--text)",
                              fontWeight: 700,
                              cursor: applyingEdit ? "default" : "pointer",
                              opacity: applyingEdit ? 0.6 : 1,
                              width: "100%",
                            }}
                          >
                            ↺ Rotate -90°
                          </button>

                          <button
                            type="button"
                            onClick={() => setRotation((prev) => prev + 90)}
                            disabled={applyingEdit}
                            style={{
                              padding: "11px 12px",
                              borderRadius: 999,
                              border: "1px solid var(--border)",
                              background: "var(--bg)",
                              color: "var(--text)",
                              fontWeight: 700,
                              cursor: applyingEdit ? "default" : "pointer",
                              opacity: applyingEdit ? 0.6 : 1,
                              width: "100%",
                            }}
                          >
                            ↻ Rotate +90°
                          </button>
                        </div>

                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "1fr 1fr",
                            gap: 10,
                          }}
                        >
                          <button
                            type="button"
                            onClick={() => {
                              if (applyingEdit) return;
                              resetEditorState();
                            }}
                            disabled={applyingEdit}
                            style={{
                              padding: "12px 14px",
                              borderRadius: 999,
                              border: "1px solid var(--border)",
                              background: "var(--bg)",
                              color: "var(--text)",
                              fontWeight: 700,
                              cursor: applyingEdit ? "default" : "pointer",
                              opacity: applyingEdit ? 0.6 : 1,
                              width: "100%",
                            }}
                          >
                            Cancel
                          </button>

                          <button
                            type="button"
                            onClick={applyImageEdits}
                            disabled={applyingEdit || !completedCrop}
                            style={{
                              padding: "12px 14px",
                              borderRadius: 999,
                              border: "1px solid var(--border)",
                              background: "var(--text)",
                              color: "var(--bg)",
                              fontWeight: 800,
                              cursor:
                                applyingEdit || !completedCrop
                                  ? "default"
                                  : "pointer",
                              opacity: applyingEdit || !completedCrop ? 0.5 : 1,
                              width: "100%",
                            }}
                          >
                            {applyingEdit ? "Applying..." : "Apply"}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>,
                  document.body,
                )}
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gap: 10,
              paddingBottom: isMobile
                ? "calc(96px + env(safe-area-inset-bottom, 0px))"
                : 0,
            }}
          >
            {posts.length === 0 ? (
              <div
                style={{
                  color: "var(--sub)",
                  fontSize: 13,
                  padding: 16,
                  border: "1px solid var(--border)",
                  borderRadius: 14,
                  background: "var(--card)",
                  textAlign: "center",
                }}
              >
                <div
                  style={{
                    fontSize: 18,
                    marginBottom: 8,
                    color: "var(--text)",
                  }}
                >
                  Dein Feed ist noch leer 👀
                </div>

                <div style={{ opacity: 0.85, lineHeight: 1.5 }}>
                  Folge anderen Golfern oder Golfplätzen, um Posts in deinem
                  Feed zu sehen.
                </div>

                <div style={{ marginTop: 12 }}>
                  <button
                    type="button"
                    onClick={() => nav("/map")}
                    style={{
                      padding: "8px 14px",
                      borderRadius: 10,
                      border: "1px solid var(--border)",
                      background: "var(--bg)",
                      color: "var(--text)",
                      cursor: "pointer",
                    }}
                  >
                    Plätze entdecken
                  </button>
                </div>
              </div>
            ) : null}

            {posts.map((p) => {
              const lat = Number(p.course.lat);
              const lon = Number(p.course.lon);
              const canSelectCourse =
                Number.isFinite(lat) && Number.isFinite(lon);
              const isCourseFollowed = followedCourseIds.includes(p.course.id);
              const isCourseFollowBusy = courseFollowBusyId === p.course.id;

              return (
                <div key={p.id}>
                  <PostCard
                    post={p}
                    isMobile={isMobile}
                    isCommentTarget={activeCommentPostId === p.id}
                    onCommentClick={(postId) => setActiveCommentPostId(postId)}
                    onOpenPost={(postId) => setActiveCommentPostId(postId)}
                    onSelectCourse={
                      canSelectCourse
                        ? () => {
                            nav(`/courses/${p.course.id}`);
                          }
                        : undefined
                    }
                    courseFollowed={isCourseFollowed}
                    courseFollowBusy={isCourseFollowBusy}
                    courseRating={
                      courseRatings[p.course.id]
                        ? {
                            overall: courseRatings[p.course.id]!.overall,
                            count: courseRatings[p.course.id]!.count,
                          }
                        : null
                    }
                    myRating={myRatings[p.course.id] ?? null}
                    onPostDeleted={(postId) => {
                      setPosts((prev) =>
                        prev.filter((item) => item.id !== postId),
                      );
                    }}
                    onCourseFollowToggle={handleToggleCourseFollow}
                    onPostUpdated={(updatedPost) => {
                      setPosts((prev) =>
                        prev.map((item) =>
                          item.id === updatedPost.id
                            ? {
                                ...item,
                                ...updatedPost,
                              }
                            : item,
                        ),
                      );
                    }}
                  />
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {activeCommentPost ? (
        <CommentModal
          post={activeCommentPost}
          isMobile={isMobile}
          onClose={() => setActiveCommentPostId(null)}
        />
      ) : null}

      {activeRatingCourseId ? (
        <div
          onClick={() => setActiveRatingCourseId(null)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 200,
            background: "rgba(0,0,0,0.35)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "min(520px, 100%)",
              padding: 18,
              borderRadius: 18,
              border: "1px solid var(--border)",
              background: "var(--card)",
              color: "var(--text)",
              boxShadow: "0 20px 60px rgba(0,0,0,0.28)",
              display: "grid",
              gap: 14,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                gap: 12,
              }}
            >
              <div>
                <div style={{ fontSize: 18, fontWeight: 900 }}>
                  Rate this course
                </div>
                <div
                  style={{
                    marginTop: 4,
                    fontSize: 13,
                    color: "var(--sub)",
                  }}
                >
                  Selected course id: {activeRatingCourseId}
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  gap: 8,
                  alignItems: "center",
                  flexWrap: "wrap",
                }}
              >
                <button
                  type="button"
                  onClick={() => setActiveRatingCourseId(null)}
                  style={{
                    padding: "8px 12px",
                    borderRadius: 999,
                    border: "1px solid var(--border)",
                    background: "var(--bg)",
                    color: "var(--text)",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  Close
                </button>
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gap: 14,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                  flexWrap: "wrap",
                }}
              >
                <div
                  style={{
                    fontSize: 14,
                    color: "var(--sub)",
                    lineHeight: 1.5,
                  }}
                >
                  Set your overall rating for this course.
                </div>

                <div
                  style={{
                    fontSize: 28,
                    fontWeight: 900,
                    color: "var(--text)",
                    lineHeight: 1,
                    minWidth: 52,
                    textAlign: "right",
                  }}
                >
                  {ratingDraft.toFixed(1)}
                </div>
              </div>

              <input
                type="range"
                min={1}
                max={5}
                step={0.2}
                value={ratingDraft}
                onChange={(e) => setRatingDraft(Number(e.target.value))}
                style={{
                  width: "100%",
                  margin: 0,
                  cursor: "pointer",
                }}
              />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
