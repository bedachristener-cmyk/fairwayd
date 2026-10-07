import { useEffect, useRef, type Dispatch, type SetStateAction } from "react";
import { fetchFxReferenceRate } from "../api/fx";
import {
  applyFxSuggestion,
  isFxSuggestionEligible,
  markFxSuggestionUnavailable,
  type FxSuggestionDraft,
} from "../utils/fxRateSuggestions";

export { formatFxSuggestionDate, type FxSuggestionDraft } from "../utils/fxRateSuggestions";

export function useFxRateSuggestions<T extends FxSuggestionDraft>({
  drafts,
  setDrafts,
  baseCurrency,
  token,
}: {
  drafts: T[];
  setDrafts: Dispatch<SetStateAction<T[]>>;
  baseCurrency: string;
  token: string | null;
}) {
  const requested = useRef(new Set<string>());

  useEffect(() => {
    if (!token || !baseCurrency) return;

    for (const draft of drafts) {
      if (!isFxSuggestionEligible(draft, baseCurrency)) continue;

      const from = draft.currency;
      const to = baseCurrency;
      const requestVersion = draft.fxSuggestionVersion;
      const requestKey = `${draft.localId}:${from}:${to}:${requestVersion}`;
      if (requested.current.has(requestKey)) continue;
      requested.current.add(requestKey);

      setDrafts((current) =>
        current.map((item) =>
          item.localId === draft.localId &&
          item.fxSuggestionVersion === requestVersion &&
          isFxSuggestionEligible(item, baseCurrency)
            ? { ...item, fxSuggestionStatus: "loading" }
            : item,
        ),
      );

      void fetchFxReferenceRate(from, to, token)
        .then((suggestion) => {
          setDrafts((current) =>
            current.map((item) =>
              item.localId === draft.localId
                ? applyFxSuggestion(item, baseCurrency, suggestion, requestVersion)
                : item,
            ),
          );
        })
        .catch(() => {
          setDrafts((current) =>
            current.map((item) =>
              item.localId === draft.localId
                ? markFxSuggestionUnavailable(
                    item,
                    from,
                    to,
                    baseCurrency,
                    requestVersion,
                  )
                : item,
            ),
          );
        });
    }
  }, [baseCurrency, drafts, setDrafts, token]);
}
