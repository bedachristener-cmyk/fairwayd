import { useEffect, useRef, useState } from "react";
import { fileUrl } from "../api/fileUrl";

type LightboxImage = {
  url: string;
  resolvedUrl?: string;
};

type ImageLightboxProps = {
  images: LightboxImage[];
  initialIndex: number;
  isMobile: boolean;
  onClose: () => void;
};

export default function ImageLightbox({
  images,
  initialIndex,
  isMobile,
  onClose,
}: ImageLightboxProps) {
  const [activeIndex, setActiveIndex] = useState(() =>
    Math.min(Math.max(initialIndex, 0), Math.max(images.length - 1, 0)),
  );
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const touchStartXRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);

  const hasMultipleImages = images.length > 1;
  const activeImage = images[activeIndex];
  const activeImageUrl =
    activeImage?.resolvedUrl?.trim() || fileUrl(activeImage?.url);

  const showPreviousImage = () => {
    if (!hasMultipleImages) return;
    setActiveIndex((index) => (index === 0 ? images.length - 1 : index - 1));
  };

  const showNextImage = () => {
    if (!hasMultipleImages) return;
    setActiveIndex((index) => (index === images.length - 1 ? 0 : index + 1));
  };

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
        return;
      }

      if (event.key === "ArrowLeft") {
        showPreviousImage();
        return;
      }

      if (event.key === "ArrowRight") {
        showNextImage();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  });

  useEffect(() => {
    setActiveIndex(
      Math.min(Math.max(initialIndex, 0), Math.max(images.length - 1, 0)),
    );
  }, [images.length, initialIndex]);

  useEffect(() => {
    setLoadError(null);
    if (!activeImageUrl) return;

    console.debug("Post image viewer imageUrl", {
      imageUrl: activeImageUrl,
      rawImageUrl: activeImage?.url,
    });
  }, [activeImage?.url, activeImageUrl]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  const stopControlEvent = (
    event:
      | React.MouseEvent<HTMLButtonElement>
      | React.PointerEvent<HTMLButtonElement>
      | React.TouchEvent<HTMLButtonElement>,
  ) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const handleTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    if (event.touches.length !== 1) return;

    const touch = event.touches[0];
    touchStartXRef.current = touch.clientX;
    touchStartYRef.current = touch.clientY;
  };

  const handleTouchEnd = (event: React.TouchEvent<HTMLDivElement>) => {
    const startX = touchStartXRef.current;
    const startY = touchStartYRef.current;
    touchStartXRef.current = null;
    touchStartYRef.current = null;

    const touch = event.changedTouches[0];
    if (!hasMultipleImages || startX === null || startY === null || !touch) {
      return;
    }

    const deltaX = touch.clientX - startX;
    const deltaY = touch.clientY - startY;

    if (Math.abs(deltaX) <= 48 || Math.abs(deltaX) <= Math.abs(deltaY) * 1.35) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    if (deltaX < 0) {
      showNextImage();
    } else {
      showPreviousImage();
    }
  };

  const toggleFullscreen = async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();

    if (!document.fullscreenEnabled) return;

    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await document.documentElement.requestFullscreen();
      }
    } catch {
      // Fullscreen can fail when browser policy blocks it; keep the viewer usable.
    }
  };

  if (!activeImage) return null;

  return (
    <div
      onClick={onClose}
      role="presentation"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 2147483647,
        background: "rgba(0,0,0,0.92)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        animation: "fwLightboxFade 160ms ease-out",
      }}
    >
      <div
        onClick={(event) => event.stopPropagation()}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
          overflow: "auto",
          WebkitOverflowScrolling: "touch",
          touchAction: "pan-x pan-y pinch-zoom",
          display: "grid",
          placeItems: "center",
          padding: isMobile
            ? "54px 0 calc(54px + env(safe-area-inset-bottom, 0px))"
            : "70px 78px",
          boxSizing: "border-box",
          animation: "fwLightboxScale 180ms ease-out",
        }}
      >
        {loadError ? (
          <div
            style={{
              maxWidth: 520,
              padding: 18,
              borderRadius: 16,
              border: "1px solid rgba(255,255,255,0.22)",
              background: "rgba(0,0,0,0.42)",
              color: "#fff",
              textAlign: "center",
              lineHeight: 1.45,
            }}
          >
            <div style={{ fontSize: 16, fontWeight: 900 }}>
              Image could not be loaded
            </div>
            <div style={{ marginTop: 8, fontSize: 12, opacity: 0.82, overflowWrap: "anywhere" }}>
              {loadError}
            </div>
          </div>
        ) : (
          <img
            src={activeImageUrl}
            alt="Post image"
            draggable={false}
            onLoad={(event) => {
              const image = event.currentTarget;
              console.debug("Post image viewer loaded", {
                imageUrl: activeImageUrl,
                naturalWidth: image.naturalWidth,
                naturalHeight: image.naturalHeight,
              });
            }}
            onError={() => {
              console.error("Post image viewer failed to load", {
                imageUrl: activeImageUrl,
                rawImageUrl: activeImage.url,
              });
              setLoadError(activeImageUrl || "Empty image URL");
            }}
            style={{
              display: "block",
              maxWidth: "100%",
              maxHeight: isMobile
                ? "calc(100dvh - 108px - env(safe-area-inset-bottom, 0px))"
                : "calc(100dvh - 140px)",
              width: "auto",
              height: "auto",
              objectFit: "contain",
              userSelect: "none",
              boxShadow: "0 18px 70px rgba(0,0,0,0.42)",
            }}
          />
        )}

        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onClose();
          }}
          aria-label="Close image viewer"
          style={{
            position: "fixed",
            top: isMobile ? 12 : 20,
            right: isMobile ? 12 : 24,
            width: 42,
            height: 42,
            borderRadius: 999,
            border: "1px solid rgba(255,255,255,0.34)",
            background: "rgba(0,0,0,0.54)",
            color: "#fff",
            fontSize: 20,
            fontWeight: 900,
            lineHeight: 1,
            display: "grid",
            placeItems: "center",
            cursor: "pointer",
            zIndex: 2,
          }}
        >
          X
        </button>

        {!isMobile ? (
          <button
            type="button"
            onClick={toggleFullscreen}
            aria-label={
              isFullscreen ? "Exit fullscreen" : "Enter fullscreen"
            }
            style={{
              position: "fixed",
              top: 20,
              right: 74,
              width: 42,
              height: 42,
              borderRadius: 999,
              border: "1px solid rgba(255,255,255,0.34)",
              background: "rgba(0,0,0,0.54)",
              color: "#fff",
              fontSize: 20,
              fontWeight: 900,
              lineHeight: 1,
              display: "grid",
              placeItems: "center",
              cursor: "pointer",
              zIndex: 2,
            }}
          >
            {"\u26F6"}
          </button>
        ) : null}

        {hasMultipleImages ? (
          <>
            <div
              style={{
                position: "fixed",
                top: isMobile ? 16 : 24,
                left: "50%",
                transform: "translateX(-50%)",
                padding: "6px 10px",
                borderRadius: 999,
                background: "rgba(0,0,0,0.58)",
                color: "#fff",
                fontSize: 13,
                fontWeight: 800,
                lineHeight: 1,
                zIndex: 2,
              }}
            >
              {activeIndex + 1} / {images.length}
            </div>

            <button
              type="button"
              onPointerDown={stopControlEvent}
              onPointerUp={(event) => {
                stopControlEvent(event);
                showPreviousImage();
              }}
              aria-label="Previous image"
              style={{
                position: "fixed",
                left: isMobile ? 12 : 24,
                top: "50%",
                transform: "translateY(-50%)",
                width: isMobile ? 42 : 48,
                height: isMobile ? 42 : 48,
                borderRadius: 999,
                border: "1px solid rgba(255,255,255,0.34)",
                background: "rgba(0,0,0,0.54)",
                color: "#fff",
                fontSize: 30,
                fontWeight: 900,
                lineHeight: 1,
                display: "grid",
                placeItems: "center",
                cursor: "pointer",
                zIndex: 2,
              }}
            >
              {"<"}
            </button>

            <button
              type="button"
              onPointerDown={stopControlEvent}
              onPointerUp={(event) => {
                stopControlEvent(event);
                showNextImage();
              }}
              aria-label="Next image"
              style={{
                position: "fixed",
                right: isMobile ? 12 : 24,
                top: "50%",
                transform: "translateY(-50%)",
                width: isMobile ? 42 : 48,
                height: isMobile ? 42 : 48,
                borderRadius: 999,
                border: "1px solid rgba(255,255,255,0.34)",
                background: "rgba(0,0,0,0.54)",
                color: "#fff",
                fontSize: 30,
                fontWeight: 900,
                lineHeight: 1,
                display: "grid",
                placeItems: "center",
                cursor: "pointer",
                zIndex: 2,
              }}
            >
              {">"}
            </button>
          </>
        ) : null}
      </div>
    </div>
  );
}
