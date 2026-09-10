import { motion } from 'framer-motion';
import React, { forwardRef } from 'react';

const draw = {
  hidden: { pathLength: 0, opacity: 0 },
  visible: (i: number) => {
    const delay = 0 + i * 0.5;
    return {
      pathLength: 1,
      opacity: 1,
      transition: {
        pathLength: { delay, type: 'spring', duration: 1, bounce: 0 },
        opacity: { delay, duration: 0.15 }
      }
    };
  }
};

interface IProps {
  className?: string;
}

const IconExampleChartDesktop = forwardRef<SVGSVGElement, IProps>(
  (props, ref: React.ForwardedRef<SVGSVGElement>) => {
    return (
      <motion.svg
        ref={ref}
        width="934"
        height="338"
        viewBox="0 0 934 338"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        initial="hidden"
        animate="visible"
        variants={draw}
        className={props.className}
      >
        <rect x="10" y="191" width="35" height="147" rx="10" fill="url(#paint0_linear_10098_732)" />

        <rect x="51" y="160" width="35" height="178" rx="10" fill="url(#paint1_linear_10098_732)" />

        <rect x="92" y="136" width="35" height="202" rx="10" fill="url(#paint2_linear_10098_732)" />

        <rect
          x="133"
          y="119"
          width="35"
          height="219"
          rx="10"
          fill="url(#paint3_linear_10098_732)"
        />

        <rect
          x="174"
          y="102"
          width="35"
          height="236"
          rx="10"
          fill="url(#paint4_linear_10098_732)"
        />

        <rect
          x="215"
          y="115"
          width="35"
          height="223"
          rx="10"
          fill="url(#paint5_linear_10098_732)"
        />

        <rect
          x="256"
          y="111"
          width="35"
          height="227"
          rx="10"
          fill="url(#paint6_linear_10098_732)"
        />

        <rect
          x="297"
          y="111"
          width="35"
          height="227"
          rx="10"
          fill="url(#paint7_linear_10098_732)"
        />

        <rect
          x="338"
          y="111"
          width="35"
          height="227"
          rx="10"
          fill="url(#paint8_linear_10098_732)"
        />

        <rect
          x="379"
          y="119"
          width="35"
          height="219"
          rx="10"
          fill="url(#paint9_linear_10098_732)"
        />

        <rect
          x="420"
          y="132"
          width="35"
          height="206"
          rx="10"
          fill="url(#paint10_linear_10098_732)"
        />

        <rect
          x="461"
          y="156"
          width="35"
          height="182"
          rx="10"
          fill="url(#paint11_linear_10098_732)"
        />

        <rect
          x="502"
          y="173"
          width="35"
          height="165"
          rx="10"
          fill="url(#paint12_linear_10098_732)"
        />

        <rect
          x="543"
          y="191"
          width="35"
          height="147"
          rx="10"
          fill="url(#paint13_linear_10098_732)"
        />

        <rect
          x="584"
          y="212"
          width="35"
          height="126"
          rx="10"
          fill="url(#paint14_linear_10098_732)"
        />

        <rect
          x="625"
          y="234"
          width="35"
          height="104"
          rx="10"
          fill="url(#paint15_linear_10098_732)"
        />

        <rect
          x="666"
          y="250"
          width="35"
          height="88"
          rx="10"
          fill="url(#paint16_linear_10098_732)"
        />

        <rect
          x="707"
          y="260"
          width="35"
          height="78"
          rx="10"
          fill="url(#paint17_linear_10098_732)"
        />

        <rect
          x="748"
          y="279"
          width="35"
          height="59"
          rx="10"
          fill="url(#paint18_linear_10098_732)"
        />

        <rect
          x="789"
          y="292"
          width="35"
          height="46"
          rx="10"
          fill="url(#paint19_linear_10098_732)"
        />

        <rect
          x="830"
          y="300"
          width="35"
          height="38"
          rx="10"
          fill="url(#paint20_linear_10098_732)"
        />

        <rect
          x="871"
          y="310"
          width="35"
          height="28"
          rx="10"
          fill="url(#paint21_linear_10098_732)"
        />

        <motion.path
          variants={draw}
          custom={1}
          d="M2 140.846C2 140.846 168.51 67 360.222 67C519.778 67 668.559 244.3 932 247"
          stroke="url(#paint22_linear_10098_732)"
          strokeWidth="3"
          strokeLinecap="round"
        />

        <motion.path
          d="M790.477 31.125V28C790.477 18.3646 792.339 11.3464 796.062 6.94531C799.812 2.51823 804.591 0.304688 810.398 0.304688C816.258 0.304688 820.711 1.90625 823.758 5.10938C826.831 8.3125 828.367 12.7526 828.367 18.4297V19.5234H823.68V18.4297C823.68 13.8203 822.573 10.3177 820.359 7.92188C818.172 5.52604 814.852 4.32812 810.398 4.32812C805.555 4.32812 801.792 6.26823 799.109 10.1484C796.453 14.0026 795.125 19.9531 795.125 28V31.125C795.125 39.0417 796.505 44.9661 799.266 48.8984C802.052 52.8047 805.841 54.7578 810.633 54.7578C814.878 54.7578 818.094 53.599 820.281 51.2812C822.495 48.9635 823.628 45.4349 823.68 40.6953V39.6016H828.367V41.0469C828.315 46.4375 826.792 50.7474 823.797 53.9766C820.802 57.1797 816.31 58.7812 810.32 58.7812C804.018 58.7812 799.135 56.5417 795.672 52.0625C792.208 47.5833 790.477 40.6042 790.477 31.125ZM830.93 31.125V28C830.93 18.2344 832.779 11.1771 836.477 6.82812C840.174 2.47917 845.005 0.304688 850.969 0.304688C856.958 0.304688 861.802 2.47917 865.5 6.82812C869.198 11.1771 871.047 18.2344 871.047 28V31.125C871.047 40.8906 869.198 47.9479 865.5 52.2969C861.802 56.6458 856.958 58.8203 850.969 58.8203C845.005 58.8203 840.174 56.6458 836.477 52.2969C832.779 47.9479 830.93 40.8906 830.93 31.125ZM835.578 31.125C835.578 39.6146 836.971 45.6693 839.758 49.2891C842.544 52.9089 846.281 54.7188 850.969 54.7188C855.656 54.7188 859.393 52.9089 862.18 49.2891C864.966 45.6693 866.359 39.6146 866.359 31.125V28C866.359 19.5104 864.966 13.4557 862.18 9.83594C859.393 6.21615 855.656 4.40625 850.969 4.40625C846.281 4.40625 842.544 6.21615 839.758 9.83594C836.971 13.4557 835.578 19.5104 835.578 28V31.125ZM871.852 74V70.9297L883.148 57.2656C884.32 55.7656 885.336 54.2812 886.195 52.8125C887.055 51.3281 887.484 49.8516 887.484 48.3828C887.484 46.5078 886.977 45.125 885.961 44.2344C884.945 43.3438 883.664 42.8984 882.117 42.8984C880.523 42.8984 879.18 43.375 878.086 44.3281C877.008 45.2812 876.469 46.9844 876.469 49.4375V50.0703H871.875V49.0859C871.875 46.0547 872.844 43.6797 874.781 41.9609C876.734 40.2422 879.211 39.3828 882.211 39.3828C885.211 39.3828 887.594 40.1797 889.359 41.7734C891.141 43.3516 892.039 45.4609 892.055 48.1016C892.055 50.1016 891.594 51.9375 890.672 53.6094C889.75 55.2812 888.414 57.1797 886.664 59.3047L878.109 70.2031H892.852V74H871.852Z"
          fill="#E9E9E9"
          initial="hidden"
          animate="visible"
          variants={draw}
        />

        <rect x="355" y="38" width="54" height="54" rx="27" fill="#292824" />

        <rect x="355" y="38" width="54" height="54" rx="27" fill="url(#paint23_linear_10098_732)" />

        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M374.124 68.2022L375.463 69.5428C375.713 69.7934 376.011 69.993 376.339 70.1305C376.668 70.2679 377.02 70.3405 377.377 70.3442C377.734 70.3479 378.088 70.2827 378.419 70.1521C378.751 70.0216 379.053 69.8282 379.308 69.583L389.077 60.2076L390.092 59.2337L390.596 58.7498C390.628 58.7197 390.668 58.699 390.712 58.6909C390.756 58.6828 390.801 58.6877 390.842 58.7048C390.883 58.722 390.918 58.7504 390.941 58.7861C390.965 58.8216 390.977 58.8631 390.977 58.905L390.828 72.399L393.325 72.425L393.474 58.9366L393.474 58.9338C393.485 58.4029 393.333 57.8814 393.037 57.4372C392.742 56.9938 392.318 56.6484 391.821 56.4452C391.327 56.2336 390.78 56.1727 390.251 56.2702C389.721 56.3679 389.232 56.6201 388.85 56.9944L388.848 56.9965L377.569 67.8207C377.524 67.8603 377.465 67.8824 377.404 67.8818C377.342 67.8812 377.284 67.8578 377.24 67.8174L375.909 66.4838C375.535 66.1016 375.052 65.8394 374.524 65.7306C373.997 65.6221 373.449 65.6715 372.951 65.8726C372.449 66.0654 372.018 66.4019 371.713 66.839C371.407 67.2768 371.243 67.795 371.243 68.3259L371.2 72.1947L373.698 72.2207L373.74 68.3497C373.741 68.3078 373.754 68.2666 373.778 68.2315C373.803 68.1963 373.838 68.1685 373.879 68.1522C373.921 68.1358 373.966 68.1319 374.01 68.1409C374.054 68.15 374.094 68.1715 374.124 68.2022Z"
          fill="white"
        />

        <defs>
          <linearGradient
            id="paint0_linear_10098_732"
            x1="27.5"
            y1="338"
            x2="27.5"
            y2="191"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#E9E9E9" />

            <stop offset="1" stopColor="white" stopOpacity="0" />
          </linearGradient>

          <linearGradient
            id="paint1_linear_10098_732"
            x1="68.5"
            y1="338"
            x2="68.5"
            y2="160"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#E9E9E9" />

            <stop offset="1" stopColor="white" stopOpacity="0" />
          </linearGradient>

          <linearGradient
            id="paint2_linear_10098_732"
            x1="109.5"
            y1="338"
            x2="109.5"
            y2="136"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#E9E9E9" />

            <stop offset="1" stopColor="white" stopOpacity="0" />
          </linearGradient>

          <linearGradient
            id="paint3_linear_10098_732"
            x1="150.5"
            y1="338"
            x2="150.5"
            y2="119"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#E9E9E9" />

            <stop offset="1" stopColor="white" stopOpacity="0" />
          </linearGradient>

          <linearGradient
            id="paint4_linear_10098_732"
            x1="191.5"
            y1="338"
            x2="191.5"
            y2="102"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#E9E9E9" />

            <stop offset="1" stopColor="white" stopOpacity="0" />
          </linearGradient>

          <linearGradient
            id="paint5_linear_10098_732"
            x1="232.5"
            y1="338"
            x2="232.5"
            y2="115"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#E9E9E9" />

            <stop offset="1" stopColor="white" stopOpacity="0" />
          </linearGradient>

          <linearGradient
            id="paint6_linear_10098_732"
            x1="273.5"
            y1="338"
            x2="273.5"
            y2="111"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#E9E9E9" />

            <stop offset="1" stopColor="white" stopOpacity="0" />
          </linearGradient>

          <linearGradient
            id="paint7_linear_10098_732"
            x1="314.5"
            y1="338"
            x2="314.5"
            y2="111"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#E9E9E9" />

            <stop offset="1" stopColor="white" stopOpacity="0" />
          </linearGradient>

          <linearGradient
            id="paint8_linear_10098_732"
            x1="355.5"
            y1="338"
            x2="355.5"
            y2="111"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#E9E9E9" />

            <stop offset="1" stopColor="white" stopOpacity="0" />
          </linearGradient>

          <linearGradient
            id="paint9_linear_10098_732"
            x1="396.5"
            y1="338"
            x2="396.5"
            y2="119"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#E9E9E9" />

            <stop offset="1" stopColor="white" stopOpacity="0" />
          </linearGradient>

          <linearGradient
            id="paint10_linear_10098_732"
            x1="437.5"
            y1="338"
            x2="437.5"
            y2="132"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#E9E9E9" />

            <stop offset="1" stopColor="white" stopOpacity="0" />
          </linearGradient>

          <linearGradient
            id="paint11_linear_10098_732"
            x1="478.5"
            y1="338"
            x2="478.5"
            y2="156"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#E9E9E9" />

            <stop offset="1" stopColor="white" stopOpacity="0" />
          </linearGradient>

          <linearGradient
            id="paint12_linear_10098_732"
            x1="519.5"
            y1="338"
            x2="519.5"
            y2="173"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#E9E9E9" />

            <stop offset="1" stopColor="white" stopOpacity="0" />
          </linearGradient>

          <linearGradient
            id="paint13_linear_10098_732"
            x1="560.5"
            y1="338"
            x2="560.5"
            y2="191"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#E9E9E9" />

            <stop offset="1" stopColor="white" stopOpacity="0" />
          </linearGradient>

          <linearGradient
            id="paint14_linear_10098_732"
            x1="601.5"
            y1="338"
            x2="601.5"
            y2="212"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#E9E9E9" />

            <stop offset="1" stopColor="white" stopOpacity="0" />
          </linearGradient>

          <linearGradient
            id="paint15_linear_10098_732"
            x1="642.5"
            y1="338"
            x2="642.5"
            y2="234"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#E9E9E9" />

            <stop offset="1" stopColor="white" stopOpacity="0" />
          </linearGradient>

          <linearGradient
            id="paint16_linear_10098_732"
            x1="683.5"
            y1="338"
            x2="683.5"
            y2="250"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#E9E9E9" />

            <stop offset="1" stopColor="white" stopOpacity="0" />
          </linearGradient>

          <linearGradient
            id="paint17_linear_10098_732"
            x1="724.5"
            y1="338"
            x2="724.5"
            y2="260"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#E9E9E9" />

            <stop offset="1" stopColor="white" stopOpacity="0" />
          </linearGradient>

          <linearGradient
            id="paint18_linear_10098_732"
            x1="765.5"
            y1="338"
            x2="765.5"
            y2="279"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#E9E9E9" />

            <stop offset="1" stopColor="white" stopOpacity="0" />
          </linearGradient>

          <linearGradient
            id="paint19_linear_10098_732"
            x1="806.5"
            y1="338"
            x2="806.5"
            y2="292"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#E9E9E9" />

            <stop offset="1" stopColor="white" stopOpacity="0" />
          </linearGradient>

          <linearGradient
            id="paint20_linear_10098_732"
            x1="847.5"
            y1="338"
            x2="847.5"
            y2="300"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#E9E9E9" />

            <stop offset="1" stopColor="white" stopOpacity="0" />
          </linearGradient>

          <linearGradient
            id="paint21_linear_10098_732"
            x1="888.5"
            y1="338"
            x2="888.5"
            y2="310"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#E9E9E9" />

            <stop offset="1" stopColor="white" stopOpacity="0" />
          </linearGradient>

          <linearGradient
            id="paint22_linear_10098_732"
            x1="1.99999"
            y1="141.395"
            x2="932"
            y2="141.395"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#FF9F9F" />

            <stop offset="1" stopColor="#A9F679" />
          </linearGradient>

          <linearGradient
            id="paint23_linear_10098_732"
            x1="382"
            y1="38"
            x2="382"
            y2="92"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#56DD97" />

            <stop offset="1" stopColor="#45B87C" />
          </linearGradient>
        </defs>
      </motion.svg>
    );
  }
);

IconExampleChartDesktop.displayName = 'IconExampleChartDesktop';

export const MotionIconExampleChartDesktop = motion(IconExampleChartDesktop);
