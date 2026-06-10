import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useTranslation } from "react-i18next";

const Help = () => {
  const { t } = useTranslation();
  return (
    <div className="container-page max-w-3xl py-10">
      <h1 className="text-3xl font-bold">{t("help.page_title")}</h1>
      <p className="mt-2 text-muted-foreground">{t("help.contact_email_prompt")}</p>
      <div className="mt-6">
        <p>{t("help.contact_desc")}</p>
        <p className="mt-4">
          {t("help.faq_prompt")} <a href="/faqs" className="text-primary hover:underline">{t("help.faq_link_text")}</a>.
        </p>
      </div>
    </div>
  );
};
export default Help;