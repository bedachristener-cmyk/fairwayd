import { API_BASE } from "./base";

export type FxReferenceRate = {
  from: string;
  to: string;
  rate: number;
  date: string;
  source: string;
};

export async function fetchFxReferenceRate(
  from: string,
  to: string,
  token: string,
  signal?: AbortSignal,
): Promise<FxReferenceRate> {
  const response = await fetch(
    `${API_BASE}/fx/rate?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
    {
      headers: { Authorization: `Bearer ${token}` },
      signal,
    },
  );

  if (!response.ok) {
    throw new Error("Reference exchange rate unavailable");
  }

  const value = (await response.json()) as Partial<FxReferenceRate>;
  if (
    typeof value.from !== "string" ||
    typeof value.to !== "string" ||
    typeof value.rate !== "number" ||
    !Number.isFinite(value.rate) ||
    value.rate <= 0 ||
    typeof value.date !== "string" ||
    typeof value.source !== "string"
  ) {
    throw new Error("Invalid reference exchange rate response");
  }

  return value as FxReferenceRate;
}
