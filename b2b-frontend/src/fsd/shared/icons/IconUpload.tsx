import { SVGProps } from 'react';

export default function IconUpload(props: SVGProps<SVGSVGElement>) {
  return (
    <svg width="26" height="26" viewBox="0 0 26 26" fill="none" {...props}>
      <path
        d="M13 16V6M13 6L9 10M13 6l4 4"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      <path
        d="M5 18v1a2 2 0 002 2h12a2 2 0 002-2v-1"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </svg>
  );
}
