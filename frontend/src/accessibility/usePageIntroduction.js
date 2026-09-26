import { useCallback, useRef } from "react";
import { useAccessibility } from "../context/AccessibilityContext";
import { getPageIntroText, pageDescriptions } from "./pageDescriptions";

export function usePageIntroduction() {
  const { announce, speak, pageIntroEnabled, autoRead } = useAccessibility();
  const lastAnnouncedRouteRef = useRef("");

  /**
   * Generates introduction text for a given page key and optional dynamic metadata.
   */
  const getPageIntro = useCallback((routeKey, meta = {}) => {
    return getPageIntroText(routeKey, meta);
  }, []);

  /**
   * Automatically announces page orientation on route change if pageIntroEnabled is active.
   */
  const announcePageIntro = useCallback(
    (routeKey, meta = {}, force = false) => {
      const text = getPageIntro(routeKey, meta);
      if (!text) return text;

      // Prevent duplicate immediate announcements on re-render unless route changed or forced
      const routeId = `${routeKey}-${JSON.stringify(meta)}`;
      if (lastAnnouncedRouteRef.current === routeId && !force) {
        return text;
      }
      lastAnnouncedRouteRef.current = routeId;

      if (pageIntroEnabled || force) {
        announce(text);
        if (autoRead || force) {
          speak(text);
        }
      }

      return text;
    },
    [getPageIntro, pageIntroEnabled, autoRead, announce, speak]
  );

  return {
    getPageIntro,
    announcePageIntro,
    pageDescriptions,
    pageIntroEnabled,
  };
}
