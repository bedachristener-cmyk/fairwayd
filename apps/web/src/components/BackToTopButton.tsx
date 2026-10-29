import { useEffect, useState } from "react";

type BackToTopButtonProps = {
  threshold?: number;
};

export default function BackToTopButton({
  threshold = 700,
}: BackToTopButtonProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setVisible(window.scrollY > threshold);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, [threshold]);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (!visible) return null;

  return (
    <button
      type="button"
      className="back-to-top-fab"
      onClick={scrollToTop}
      aria-label="Back to top"
    >
      {"\u2191"}
    </button>
  );
}
