import { SVGProps } from 'react';

export default function IconSettings(props: SVGProps<SVGSVGElement>) {
  return (
    <svg width="26" height="26" viewBox="0 0 26 26" fill="none" {...props}>
      <circle cx="13" cy="13" r="3" stroke="currentColor" strokeWidth="2.2" />

      <path
        d="M13 3v2M13 21v2M3 13h2M21 13h2M5.64 5.64l1.42 1.42M18.94 18.94l1.42 1.42M18.94 7.06l1.42-1.42M5.64 20.36l1.42-1.42"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </svg>
  );
}
