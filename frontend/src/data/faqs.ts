export type FAQ = {
  q: string;
  a: string;
};

export const faqs: FAQ[] = [
  {
    q: "When will my order be delivered?",
    a: "Orders placed before 22:00 on weekdays are shipped the same day and delivered the next day in the Netherlands and Belgium."
  },
  {
    q: "What is your return policy?",
    a: "You have 30 days to return an item for a full refund. Items must be unused and in original packaging."
  },
  {
    q: "Do you offer a warranty?",
    a: "All our lamps come with a 2-year warranty against manufacturing defects."
  },
  {
    q: "Can I order as a business?",
    a: "Yes — visit our Business page for VAT-exempt invoicing and bulk pricing."
  },
  {
    q: "Which payment methods do you accept?",
    a: "We accept iDEAL, credit/debit cards, PayPal, Klarna and bank transfer."
  }
];
