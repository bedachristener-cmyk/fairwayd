import { createContext, useContext, useMemo, useState } from "react";

export type SelectedCourse = {
  id: string;

  name?: string;
  lat?: number;
  lon?: number;

  // optional metadata (used by RightRail / details UI)
  city?: string | null;
  country?: string | null;
  website?: string | null;
  holes?: number | null;

  // depending on your API naming this might be "access" string or enum-like
  access?: string | null;
} | null;

type Ctx = {
  selectedCourse: SelectedCourse;
  setSelectedCourse: (c: SelectedCourse) => void;
  clearSelectedCourse: () => void;
};

const SelectedCourseContext = createContext<Ctx | null>(null);

export function SelectedCourseProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [selectedCourse, setSelectedCourse] = useState<SelectedCourse>(null);

  const value = useMemo<Ctx>(
    () => ({
      selectedCourse,
      setSelectedCourse,
      clearSelectedCourse: () => setSelectedCourse(null),
    }),
    [selectedCourse],
  );

  return (
    <SelectedCourseContext.Provider value={value}>
      {children}
    </SelectedCourseContext.Provider>
  );
}

export function useSelectedCourse() {
  const ctx = useContext(SelectedCourseContext);
  if (!ctx) {
    throw new Error(
      "useSelectedCourse must be used within SelectedCourseProvider",
    );
  }
  return ctx;
}
