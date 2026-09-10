export interface IFaqItem {
  id: string;
  question: string;
  answer: string;
}

export const faqData: IFaqItem[] = [
  {
    id: '1',
    question: 'What is MakeMeLook AI-Stylist?',
    answer:
      'MakeMeLook is a plug-and-play chat widget that turns every shopper into a VIP client by delivering real-time, AI-powered outfit and product recommendations pulled from your own catalog.'
  },
  {
    id: '2',
    question: 'How does AI-Stylist work?',
    answer:
      'Shoppers receive complete, head-to-toe looks, size guidance based on body-type inputs, color-palette suggestions, and styling tips for any occasion—whether they type a request or upload a reference photo.'
  },
  {
    id: '3',
    question: 'What kind of fashion advice should I expect?',
    answer:
      'Our engine builds a style profile from a 30-second quiz and ongoing behavior, then matches it to product embeddings generated from your catalog. A text or photo prompt is converted to recommendations in < 0.3 s, filtered by stock, season, and your merchandising rules.'
  },
  {
    id: '4',
    question: "I'm a fashion retailer, how do I get your AI-Stylist?",
    answer:
      'Add one line of JavaScript to your site or install our Shopify/Magento app. Book a 15-minute onboarding call, and we’ll have a branded widget live—often the same day.'
  },
  {
    id: '5',
    question: 'Is this service free?',
    answer:
      'We offer a 30-day pilot at no licence cost for qualified retailers. After that, pricing is a monthly SaaS subscription based on active sessions, with an optional success-based component.'
  }
];
