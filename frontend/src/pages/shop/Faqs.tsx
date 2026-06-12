import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { faqs as defaultFaqs } from "@/data/faqs";
import { cmsFaqsRepository } from "@/client/apiClient";

const Faqs = () => {
  const { t } = useTranslation();
  const [faqs, setFaqs] = useState(defaultFaqs);

  useEffect(() => {
    let active = true;
    cmsFaqsRepository.get().then(res => {
      if (active && res.success && res.data) {
        setFaqs(res.data.filter((f: any) => f.published !== false));
      }
    }).catch(err => {
      console.error("Failed to load FAQs", err);
      const saved = localStorage.getItem("faq_data");
      if (saved && active) {
        try {
          const parsed = JSON.parse(saved);
          const published = parsed.filter((f: any) => f.published !== false);
          setFaqs(published);
        } catch {
          setFaqs(defaultFaqs);
        }
      }
    });
    return () => { active = false; };
  }, []);

  return (
    <div className="container-page max-w-3xl py-10">
      <h1 className="text-3xl font-bold">{t("faqs.page_title")}</h1>
      <p className="mt-2 text-muted-foreground">{t("faqs.page_desc")}</p>
      <Accordion type="single" collapsible className="mt-6">
        {faqs.map((f, i) => (
          <AccordionItem key={i} value={`f-${i}`}>
            <AccordionTrigger className="text-left">{f.q}</AccordionTrigger>
            <AccordionContent>{f.a}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
};
export default Faqs;
