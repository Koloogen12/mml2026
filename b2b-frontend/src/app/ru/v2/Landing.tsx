'use client';

import * as S from './sections';
import { StickyCta } from './StickyCta';
import { useLandingVals } from './useLandingVals';

export default function Landing() {
  const v = useLandingVals();

  return (
    <div className="mml-v2">
      <S.S01Hero v={v} />
      <S.S01bCompat v={v} />
      <S.S01cBridge v={v} />
      <S.S02Steps v={v} />
      <S.S03Guess v={v} />
      <S.S04Situations v={v} />
      <S.S05Calc v={v} />
      <S.S06WhyWorks v={v} />
      <S.S07WhyNow v={v} />
      <S.S08Product v={v} />
      <S.S09Connect v={v} />
      <S.S10Data v={v} />
      <S.S11Alternatives v={v} />
      <S.S12Journal v={v} />
      <S.S13Faq v={v} />
      <S.S14Cta v={v} />
      <S.S15Footer v={v} />
      <StickyCta />
    </div>
  );
}
