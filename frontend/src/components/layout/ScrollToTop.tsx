import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { consumeLanguageScrollRestore, restoreLanguageScroll } from "@/utils/languageSwitch";

export function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    const savedY = consumeLanguageScrollRestore();
    if (savedY != null) {
      restoreLanguageScroll(savedY);
      return;
    }
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}
