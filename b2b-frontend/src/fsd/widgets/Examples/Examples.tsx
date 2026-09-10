import { AnimatePresence, motion, Variants } from 'framer-motion';

import IconCloud from '@/fsd/shared/icons/IconCloud';
import { MotionIconExampleChartDesktop } from '@/fsd/shared/icons/IconExampleChartDesktop';
import { MotionIconExampleChartMobile } from '@/fsd/shared/icons/IconExampleChartMobile';
import IconGraph from '@/fsd/shared/icons/IconGraph';
import IconGraphRound from '@/fsd/shared/icons/IconGraphRound';
import IconComponent from '@/fsd/shared/ui/IconComponent/IconComponent';
import SectionTitle from '@/fsd/shared/ui/SectionTitle';
import Steps, { IStep } from '@/fsd/shared/ui/Steps/Steps';
import { IBarChartItem, MotionBarChart } from '@/fsd/widgets/BarChart/BarChart';

import s from './Examples.module.scss';

const textAppearenceVariants: Variants = {
  initial: {
    opacity: 0,
    y: 100,
    transition: {
      staggerChildren: 0.2
    }
  },
  whileInView: {
    opacity: 1,
    y: 0,
    transition: {
      staggerChildren: 0.2
    }
  }
};

interface IProps {
  className?: string;
  focusedStep?: number | null;
  activeStep: number;
  setActiveStep: React.Dispatch<React.SetStateAction<number>>;
  content: {
    titleSection?: string;
    title: string;
    steps: IStep[];
    slide1: {
      chartData: IBarChartItem[];
      title: string;
    };
    slide2: {
      chartData: IBarChartItem[];
      title: string;
    };
    slide3: {
      title: string;
    };
  };
  stylization?: {
    title?: string;
    text?: string;
    btn?: string;
  };
}

export default function Examples({ activeStep, setActiveStep, className, content }: IProps) {
  return (
    <section className={`${s.sectionTitle} ${className || ''}`}>
      <SectionTitle text={content.titleSection || ''} />

      <div className={s.container}>
        <h1 className={s.title2}>{content.title}</h1>

        <div className={s.cardStep}>
          <Steps steps={content.steps} onClickId={(id) => setActiveStep(id)} layoutId="step" />

          <AnimatePresence mode="wait">
            <motion.div
              key={activeStep}
              className={s.cardStepContent}
              initial={{ y: 10, opacity: 0 }}
              whileInView={{ y: 0, opacity: 1 }}
              viewport={{
                once: true,
                margin: '0px 0px -150px 0px'
              }}
              exit={{ y: -10, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              {activeStep === 0 && (
                <>
                  <motion.div
                    variants={textAppearenceVariants}
                    whileInView="whileInView"
                    initial="initial"
                    className={s.chartContainer}
                    viewport={{
                      once: true
                    }}
                  >
                    {content.slide1.chartData.map((item, id) => (
                      <MotionBarChart
                        viewport={{
                          once: true
                        }}
                        variants={textAppearenceVariants}
                        item={item}
                        key={id}
                        stylization={{
                          firstBar: s.firstBar1,
                          secondBar: s.secondBar1
                        }}
                      />
                    ))}
                  </motion.div>

                  <div className={s.titleWithIcon}>
                    <p className={s.titleWithIconTitle}>{content.slide1.title}</p>

                    <IconComponent
                      icon={<IconGraph />}
                      className={s.titleWithIconIcon}
                      bgColor="#f2e9ff"
                      iconColor="#9747ff"
                    />
                  </div>
                </>
              )}

              {activeStep === 1 && (
                <>
                  <motion.div
                    variants={textAppearenceVariants}
                    whileInView="whileInView"
                    initial="initial"
                    viewport={{
                      once: true
                    }}
                    className={s.chartContainer}
                  >
                    {content.slide2.chartData.map((item, id) => (
                      <MotionBarChart
                        viewport={{
                          once: true
                        }}
                        variants={textAppearenceVariants}
                        item={item}
                        key={id}
                        stylization={{
                          firstBar: s.firstBar2,
                          secondBar: s.secondBar2
                        }}
                      />
                    ))}
                  </motion.div>

                  <div className={s.titleWithIcon}>
                    <p className={s.titleWithIconTitle}>{content.slide2.title}</p>

                    <IconComponent
                      icon={<IconGraphRound />}
                      className={s.titleWithIconIcon}
                      bgColor="#eff7f2"
                      iconColor="#46ba7d"
                    />
                  </div>
                </>
              )}

              {activeStep === 2 && (
                <>
                  <div className={`${s.imageComponentFill} ${s.cardStepContentImg}`}>
                    <MotionIconExampleChartMobile className={s.linearChartMobile} />

                    <MotionIconExampleChartDesktop className={s.linearChartDesktop} />
                  </div>

                  <div className={s.titleWithIcon}>
                    <p className={s.titleWithIconTitle}>{content.slide3.title}</p>

                    <IconComponent
                      icon={<IconCloud />}
                      className={s.titleWithIconIcon}
                      bgColor="#edeefc"
                      iconColor="#4859F5"
                    />
                  </div>
                </>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
