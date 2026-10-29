import { useEffect, useState } from "react";
import { API_BASE } from "../api/base";
import { useAuth } from "./AuthContext";

export function useAdminStatus() {
  const { token } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  useEffect(() => {
    if (!token) { setIsAdmin(false); return; }
    const controller = new AbortController();
    setIsAdmin(false);
    fetch(API_BASE + "/users/me/admin-status", {
      headers: { Authorization: "Bearer " + token },
      signal: controller.signal,
    })
      .then(res => res.ok ? res.json() : { isAdmin: false })
      .then(data => { if (!controller.signal.aborted) setIsAdmin(data.isAdmin === true); })
      .catch(() => { if (!controller.signal.aborted) setIsAdmin(false); });
    return () => controller.abort();
  }, [token]);
  return isAdmin;
}
