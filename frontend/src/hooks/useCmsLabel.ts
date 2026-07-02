import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { labelT } from "@/utils/i18nLabel";
import { translateCmsText } from "@/utils/translator";

/**
 * Translate CMS / API plain-text labels for the active storefront language.
 * Static cmsPhrases/i18n first, then async Google auto-detect → target locale (cached).
 */
export function useCmsLabel(text: string | undefined | null): string {
  const { t, i18n } = useTranslation();
  const source = text?.trim() ?? "";

  const [label, setLabel] = useState(() =>
    source ? labelT(t, source, i18n.language) : "",
  );

  useEffect(() => {
    if (!source) {
      setLabel("");
      return;
    }

    const lang = i18n.language.split("-")[0].toLowerCase();
    const immediate = labelT(t, source, i18n.language);
    setLabel(immediate);

    // Async Google/cmsPhrases when static lookup did not change the text.
    if (immediate.trim() === source) {
      let cancelled = false;
      translateCmsText(source, lang, t).then((translated) => {
        if (!cancelled && translated?.trim()) setLabel(translated);
      });
      return () => {
        cancelled = true;
      };
    }
  }, [source, i18n.language, t]);

  return label;
}
