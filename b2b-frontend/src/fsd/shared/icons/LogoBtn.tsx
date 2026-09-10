import { SVGProps } from 'react';

export default function LogoBtn(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="80"
      height="80"
      viewBox="0 0 80 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <circle cx="40" cy="40" r="40" fill="url(#paint0_radial_10178_4775)" />

      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M32.3515 43.2736L33.6565 44.5982C33.9003 44.8457 34.1907 45.043 34.5109 45.1787C34.8312 45.3145 35.1751 45.3863 35.523 45.3899C35.871 45.3936 36.2164 45.3291 36.5394 45.2002C36.8625 45.0712 37.1571 44.8802 37.4062 44.6378L46.9313 35.3752L47.9209 34.4129L48.4124 33.9349C48.443 33.9052 48.4823 33.8847 48.5252 33.8767C48.5682 33.8687 48.6126 33.8735 48.6526 33.8905C48.6925 33.9074 48.726 33.9355 48.7491 33.9707C48.7722 34.0059 48.7841 34.0468 48.7837 34.0882L48.6384 47.42L51.0737 47.4457L51.2189 34.1194L51.219 34.1167C51.2297 33.5922 51.0811 33.0769 50.7928 32.6381C50.505 32.2001 50.0915 31.8588 49.6066 31.658C49.1253 31.449 48.5918 31.3888 48.0757 31.4851C47.5587 31.5816 47.0825 31.8308 46.7095 32.2006L46.7075 32.2027L35.7103 42.8968C35.6666 42.9359 35.6092 42.9577 35.5492 42.9571C35.4892 42.9565 35.4323 42.9334 35.3897 42.8935L34.0915 41.5759C33.7266 41.1984 33.2559 40.9392 32.7412 40.8318C32.2273 40.7246 31.6927 40.7734 31.207 40.9721C30.7179 41.1625 30.2971 41.495 29.9999 41.9268C29.7022 42.3594 29.5424 42.8713 29.5417 43.3959L29.5 47.2181L31.9353 47.2438L31.977 43.4194C31.9774 43.378 31.9902 43.3373 32.0141 43.3026C32.0381 43.2678 32.0722 43.2403 32.1126 43.2242C32.153 43.2081 32.1974 43.2042 32.2402 43.2131C32.2829 43.2221 32.3216 43.2433 32.3515 43.2736Z"
        fill="url(#paint1_linear_10178_4775)"
      />

      <circle cx="40" cy="40" r="36.5" stroke="url(#paint2_linear_10178_4775)" strokeWidth="3" />

      <defs>
        <radialGradient
          id="paint0_radial_10178_4775"
          cx="0"
          cy="0"
          r="1"
          gradientUnits="userSpaceOnUse"
          gradientTransform="translate(40 40) rotate(90) scale(40)"
        >
          <stop offset="0.3" stopColor="#011010" />

          <stop offset="1" stopColor="#000606" />
        </radialGradient>

        <linearGradient
          id="paint1_linear_10178_4775"
          x1="11"
          y1="28.0002"
          x2="59.325"
          y2="63.71"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#F5BFD7" />

          <stop offset="0.244063" stopColor="#F5FFE0" />

          <stop offset="0.49501" stopColor="#CAEFD7" />

          <stop offset="0.873021" stopColor="#ABC9E9" />
        </linearGradient>

        <linearGradient
          id="paint2_linear_10178_4775"
          x1="1.18812"
          y1="29.604"
          x2="98.2178"
          y2="65.297"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#F5BFD7" />

          <stop offset="0.244063" stopColor="#F5FFE0" />

          <stop offset="0.49501" stopColor="#CAEFD7" />

          <stop offset="0.873021" stopColor="#ABC9E9" />
        </linearGradient>
      </defs>
    </svg>
  );
}
