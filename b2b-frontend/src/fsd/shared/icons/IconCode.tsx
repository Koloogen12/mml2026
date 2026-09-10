import { SVGProps } from 'react';

export default function IconCode(props: SVGProps<SVGSVGElement>) {
  return (
    <svg width="26" height="26" viewBox="0 0 26 26" fill="none" {...props}>
      <path
        d="M9 8L4 13l5 5M17 8l5 5-5 5M14 6l-3 14"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
