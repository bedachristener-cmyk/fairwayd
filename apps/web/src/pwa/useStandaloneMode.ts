import { useEffect, useState } from "react";

function getStandaloneMode() {
  const navigatorWithStandalone = navigator as Navigator & {
    standalone?: boolean;
  };

  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    Boolean(navigatorWithStandalone.standalone)
  );
}

export function useStandaloneMode() {
  const [isStandalone, setIsStandalone] = useState(() => getStandaloneMode());

  useEffect(() => {
    const mediaQuery = window.matchMedia("(display-mode: standalone)");

    const updateStandaloneMode = () => {
      setIsStandalone(getStandaloneMode());
    };

    updateStandaloneMode();
    mediaQuery.addEventListener("change", updateStandaloneMode);

    return () => {
      mediaQuery.removeEventListener("change", updateStandaloneMode);
    };
  }, []);

  useEffect(() => {
    document.body.classList.toggle("is-pwa-standalone", isStandalone);

    return () => {
      document.body.classList.remove("is-pwa-standalone");
    };
  }, [isStandalone]);

  return isStandalone;
}
