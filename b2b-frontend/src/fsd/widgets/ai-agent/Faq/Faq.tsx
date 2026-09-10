import { useState } from 'react';

import IconArrowAccordion from '@/fsd/shared/icons/IconArrowAccordion';
import { faqData, IFaqItem } from '@/fsd/widgets/ai-agent/Faq/faq-data';

import s from './Faq.module.scss';

function FaqItem({ question, answer }: Omit<IFaqItem, 'id'>) {
  const [opened, setOpened] = useState<boolean>(false);

  return (
    <div className={s.faqItem}>
      <div className={s.faqItem_wrapper} onClick={() => setOpened(!opened)}>
        <h3 className={s.faqItemQuestion}>{question}</h3>

        {opened ? (
          <IconArrowAccordion
            className={`${s.svg} ${s.svgOpen}`}
            onClick={() => setOpened(!opened)}
          />
        ) : (
          <IconArrowAccordion
            className={`${s.svg} ${s.svgClose}`}
            onClick={() => setOpened(!opened)}
          />
        )}
      </div>

      <p className={`${s.answer} ${opened ? s.active : ''} `}>{answer}</p>
    </div>
  );
}

interface IProps {
  className?: string;
}

export default function Faq({ className }: IProps) {
  return (
    <section className={`${s.faqSection} ${className || ''}`}>
      <h2 className={s.title}>FAQ</h2>

      {faqData.map(({ id, question, answer }) => (
        <div key={id} className={s.faqItems}>
          <FaqItem answer={answer} question={question} />
        </div>
      ))}
    </section>
  );
}
