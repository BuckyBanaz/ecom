import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useEffect, useState } from "react";
import { faqs as defaultFaqs } from "@/data/faqs";

const Faqs = () => {
  const [faqs, setFaqs] = useState(defaultFaqs);

  useEffect(() => {
    const saved = localStorage.getItem("faq_data");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const published = parsed.filter((f: any) => f.published !== false);
        setFaqs(published);
      } catch {
        setFaqs(defaultFaqs);
      }
    }
  }, []);

  return (
    <div className="container-page max-w-3xl py-10">
      <h1 className="text-3xl font-bold">Frequently Asked Questions</h1>
      <p className="mt-2 text-muted-foreground">Find answers to common questions about our products and services.</p>
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
