import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const Help = () => {
  return (
    <div className="container-page max-w-3xl py-10">
      <h1 className="text-3xl font-bold">Customer service</h1>
      <p className="mt-2 text-muted-foreground">Can't find your answer? Email us at hello@lampgigant.demo.</p>
      <div className="mt-6">
        <p>If you need help with your order or have any questions, please contact our support team.</p>
        <p className="mt-4">
          Looking for quick answers? <a href="/faqs" className="text-primary hover:underline">Check out our FAQ page</a>.
        </p>
      </div>
    </div>
  );
};
export default Help;