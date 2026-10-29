import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { apiGet } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import PostCollectionPicker from "../components/PostCollectionPicker";

type PostCollectionsContextValue = {
  enabled: boolean;
  savedPostIds: ReadonlySet<string>;
  openPicker: (postId: string) => void;
  refreshMemberships: () => Promise<void>;
};

const PostCollectionsContext = createContext<PostCollectionsContextValue>({
  enabled: false,
  savedPostIds: new Set<string>(),
  openPicker: () => undefined,
  refreshMemberships: async () => undefined,
});

export function PostCollectionsProvider({ children }: { children: ReactNode }) {
  const { token } = useAuth();
  const [pickerPostId, setPickerPostId] = useState<string | null>(null);
  const [savedPostIds, setSavedPostIds] = useState<string[]>([]);

  const refreshMemberships = useCallback(async () => {
    if (!token) {
      setSavedPostIds([]);
      return;
    }

    try {
      const data = await apiGet<{ postIds: string[] }>(
        "/post-collections/memberships",
        { token },
      );
      setSavedPostIds(Array.isArray(data.postIds) ? data.postIds : []);
    } catch (error) {
      console.error("Failed to load saved post memberships", error);
      setSavedPostIds([]);
    }
  }, [token]);

  useEffect(() => {
    refreshMemberships();
  }, [refreshMemberships]);

  useEffect(() => {
    if (token) return;
    setPickerPostId(null);
  }, [token]);

  const value = useMemo<PostCollectionsContextValue>(
    () => ({
      enabled: Boolean(token),
      savedPostIds: new Set(savedPostIds),
      openPicker: (postId: string) => {
        if (!token) return;
        setPickerPostId(postId);
      },
      refreshMemberships,
    }),
    [refreshMemberships, savedPostIds, token],
  );

  return (
    <PostCollectionsContext.Provider value={value}>
      {children}
      {pickerPostId && token ? (
        <PostCollectionPicker
          token={token}
          postId={pickerPostId}
          onClose={() => setPickerPostId(null)}
          onChanged={refreshMemberships}
        />
      ) : null}
    </PostCollectionsContext.Provider>
  );
}

export function usePostCollections() {
  return useContext(PostCollectionsContext);
}
