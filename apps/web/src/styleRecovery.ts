/** Recover when an older app shell is paired with an outdated or missing stylesheet. */
export async function recoverMissingFeedStyles(): Promise<void> {
  if (!navigator.onLine || !document.body) return;

  const probe = document.createElement("div");
  probe.className = "fw-feed-community__people";
  probe.setAttribute("aria-hidden", "true");
  probe.style.cssText = "position:absolute;visibility:hidden;pointer-events:none";
  document.body.appendChild(probe);
  const stylesPresent = getComputedStyle(probe).display === "flex";
  probe.remove();
  if (stylesPresent) return;

  try {
    // An explicit query avoids the service worker's cached navigation shell.
    const root = new URL(import.meta.env.BASE_URL, window.location.href);
    root.searchParams.set("fw_style_recovery", Date.now().toString());
    const response = await fetch(root, { cache: "no-store", credentials: "same-origin" });
    if (!response.ok) return;
    const currentDocument = new DOMParser().parseFromString(await response.text(), "text/html");
    const cssHref = currentDocument.querySelector<HTMLLinkElement>('link[rel="stylesheet"][href]')?.getAttribute("href");
    if (!cssHref) return;
    const stylesheet = new URL(cssHref, root);
    if (stylesheet.origin !== window.location.origin || !stylesheet.pathname.endsWith(".css")) return;
    stylesheet.searchParams.set("fw_style_recovery", Date.now().toString());
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = stylesheet.href;
    link.dataset.fairwaydStyleRecovery = "true";
    link.onerror = () => link.remove();
    document.head.appendChild(link);
  } catch (error) {
    console.warn("Fairwayd stylesheet recovery failed", error);
  }
}
