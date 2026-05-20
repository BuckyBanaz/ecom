import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

import { faqs } from "@/data/faqs";

const Help = () => (
  <div className="container-page max-w-3xl py-10">
    <h1 className="text-3xl font-bold">Customer service</h1>
    <p className="mt-2 text-muted-foreground">Frequently asked questions. Can't find your answer? Email us at hello@lampgigant.demo.</p>
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
export default Help;