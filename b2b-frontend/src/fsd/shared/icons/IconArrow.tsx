import { SVGProps } from 'react';

export default function IconArrow(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="14"
      height="12"
      viewBox="0 0 14 12"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        d="M1.5 5.3C1.1134 5.3 0.8 5.6134 0.8 6C0.8 6.3866 1.1134 6.7 1.5 6.7V5.3ZM13.495 6.49497C13.7683 6.22161 13.7683 5.77839 13.495 5.50503L9.0402 1.05025C8.76684 0.776886 8.32362 0.776886 8.05025 1.05025C7.77689 1.32362 7.77689 1.76684 8.05025 2.0402L12.0101 6L8.05025 9.9598C7.77689 10.2332 7.77689 10.6764 8.05025 10.9497C8.32362 11.2231 8.76684 11.2231 9.0402 10.9497L13.495 6.49497ZM1.5 6.7H13V5.3H1.5V6.7Z"
        fill="currentColor"
      />
    </svg>
  );
}
