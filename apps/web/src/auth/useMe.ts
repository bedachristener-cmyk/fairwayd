import { useCallback, useEffect, useState } from "react";
import { apiGet } from "../api";

export type Me = {
  id: string;
  email: string | null;
  handle: string | null;
  name: string | null;
  avatarUrl: string | null;
  privacy: "PRIVATE" | "PUBLIC";
  bio?: string | null;
  handicap?: number | null;
  homeGolfClub?: string | null;
  golfSlogan?: string | null;
  favoriteGolfDestination?: string | null;
  bioPrivacy?: FieldPrivacy;
  handicapPrivacy?: FieldPrivacy;
  homeGolfClubPrivacy?: FieldPrivacy;
  golfSloganPrivacy?: FieldPrivacy;
  favoriteGolfDestinationPrivacy?: FieldPrivacy;
  termsAcceptedAt: string | null;
  termsVersion: string | null;
  privacyAcceptedAt?: string | null;
  privacyVersion?: string | null;
  hasPasswordLogin?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type FieldPrivacy = "PUBLIC" | "FOLLOWERS" | "PRIVATE";

export function useMe(enabled: boolean) {
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setErr(null);
    setLoading(true);
    try {
      const data = await apiGet<Me>("/users/me");
      setMe(data);
    } catch (e: any) {
      setMe(null);
      setErr(e?.message ?? "Failed to load /users/me");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    refresh();
  }, [enabled, refresh]);

  return { me, setMe, loading, err, refresh };
}
