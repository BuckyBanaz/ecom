import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { faqs as defaultFaqs } from "@/data/faqs";
import { cmsFaqsRepository } from "@/client/apiClient";
import { buildFaqPageSchema, removeJsonLd, upsertJsonLd } from "@/utils/seoMeta";
import { useCmsLabel } from "@/hooks/useCmsLabel";

function FaqAccordionItem({ faq, index }: { faq: { q: string; a: string }; index: number }) {
  const question = useCmsLabel(faq.q);
  const answer = useCmsLabel(faq.a);

  return (
    <AccordionItem value={`f-${index}`}>
      <AccordionTrigger className="text-left">{question}</AccordionTrigger>
      <AccordionContent>{answer}</AccordionContent>
    </AccordionItem>
  );
}

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

  useEffect(() => {
    if (faqs.length === 0) return;
    upsertJsonLd("faq-schema", buildFaqPageSchema(faqs));
    return () => removeJsonLd("faq-schema");
  }, [faqs]);

  return (
    <div className="container-page max-w-3xl py-10">
      <h1 className="text-3xl font-bold">{t("faqs.page_title")}</h1>
      <p className="mt-2 text-muted-foreground">{t("faqs.page_desc")}</p>
      <Accordion type="single" collapsible className="mt-6">
        {faqs.map((f, i) => (
          <FaqAccordionItem key={i} faq={f} index={i} />
        ))}
      </Accordion>
    </div>
  );
};
export default Faqs;
