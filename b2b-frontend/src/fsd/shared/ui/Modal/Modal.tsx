import { ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { SubmitHandler, useForm } from 'react-hook-form';
import { useOnClickOutside, useScrollLock } from 'usehooks-ts';

import IconClose from '@/fsd/shared/icons/IconClose';
import IconMail from '@/fsd/shared/icons/IconMail';
import IconPhone from '@/fsd/shared/icons/IconPhone';
import IconTg from '@/fsd/shared/icons/IconTg';
import IconWb from '@/fsd/shared/icons/IconWb';
import { TLang } from '@/fsd/shared/types/lang';
import Button from '@/fsd/shared/ui/Button/Button';
import Input from '@/fsd/shared/ui/Input/Input';
import Steps, { IStep } from '@/fsd/shared/ui/Steps/Steps';

import s from './Modal.module.scss';

interface IProps {
  lang: TLang;
  opened?: boolean;
  onClose: () => void;
}

interface IModalFormInput {
  name: string | null;
  type: string;
  data: string | null;
}

const titleSection: Record<TLang, ReactNode> = {
  ru: 'Оставьте заявку на демонстрацию виджета',
  en: 'Submit a request for widget demo'
};

const subTitleSection: Record<TLang, ReactNode> = {
  ru: 'Продемонстрируем возможности и ответим на ваши вопросы о настройке и интеграции',
  en: 'We will demonstrate the features and answer your questions about customization and integration'
};

const stepsSection: Record<
  TLang,
  { tg: ReactNode; wb: ReactNode; tel: ReactNode; email: ReactNode }
> = {
  ru: {
    tg: 'Telegram',
    wb: 'Whatsapp',
    tel: 'Телефон',
    email: 'Email'
  },
  en: {
    tg: 'Telegram',
    wb: 'Whatsapp',
    tel: 'Phone',
    email: 'Email'
  }
};

const errorsSection: Record<TLang, { name: string; data: string }> = {
  ru: {
    data: 'Обязательно',
    name: 'Обязательно'
  },
  en: {
    data: 'Necessary',
    name: 'Necessary'
  }
};

const placeholderSection: Record<TLang, { name: string; data: string }> = {
  ru: {
    data: 'Введите',
    name: 'ФИО'
  },
  en: {
    data: 'Enter your',
    name: 'Your name'
  }
};

const btnText: Record<TLang, ReactNode> = {
  ru: 'Отправить заявку',
  en: 'Send'
};

const radioLabel: Record<TLang, ReactNode> = {
  ru: 'Удобный способ связи',
  en: 'Convenient way of communication'
};

const agreementSection: Record<TLang, { text: ReactNode; link: ReactNode }> = {
  ru: {
    text: 'Нажимая кнопку «Отправить заявку» я даю согласие на обработку моих личных данных в соответствии с',
    link: 'Политикой конфиденциальности'
  },
  en: {
    text: 'By clicking "Send" I consent to the processing of my personal data in accordance with the',
    link: 'Privacy Policy'
  }
};

export default function Modal({ opened, onClose, lang }: IProps) {
  const modalRef = useRef<HTMLDivElement | null>(null);
  const [activeStep, setActiveStep] = useState(0);

  const { lock, unlock } = useScrollLock({
    autoLock: false,
    lockTarget: 'body'
  });

  const handleClose = () => {
    onClose();
    reset();
    unlock();
  };

  useOnClickOutside(modalRef, handleClose);

  const steps = useMemo<IStep[]>((): IStep[] => {
    return [
      {
        content: (
          <>
            <IconTg />

            <span>{stepsSection[lang].tg}</span>
          </>
        ),
        data: 'tg',
        active: activeStep === 0
      },
      {
        content: (
          <>
            <IconWb />

            <span>{stepsSection[lang].wb}</span>
          </>
        ),
        data: 'wb',
        active: activeStep === 1
      },
      {
        content: (
          <>
            <IconMail />

            <span>{stepsSection[lang].email}</span>
          </>
        ),
        data: 'email',
        active: activeStep === 2
      },
      {
        content: (
          <>
            <IconPhone />

            <span>{stepsSection[lang].tel}</span>
          </>
        ),
        data: 'tel',
        active: activeStep === 3
      }
    ];
  }, [activeStep, lang]);

  const {
    watch,
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    setError
  } = useForm<IModalFormInput>({
    defaultValues: {
      name: null,
      type: steps.find((step) => step.active)!.data,
      data: null
    }
  });

  const onSubmit: SubmitHandler<IModalFormInput> = async (data) => {
    try {
      const response = await fetch('/api', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });

      const responseData = await response.json();

      if (!responseData.errors) {
        handleClose();
      } else {
        responseData.inner.forEach((error: any) => {
          setError(error.path, {
            type: 'server',
            message: error.message[lang]
          });
        });
      }
    } catch (error) {
      console.log('error: ', error);
    }
  };

  const dataPlaceholder = useMemo(() => {
    switch (steps[activeStep].data) {
      case 'email':
        return stepsSection[lang].email;
      case 'tg':
        return stepsSection[lang].tg;
      case 'wb':
        return stepsSection[lang].wb;
      case 'tel':
        return stepsSection[lang].tel;
      default:
        return stepsSection[lang].tg;
    }
  }, [activeStep, steps, lang]);

  useEffect(() => {
    if (opened) {
      lock();
    } else {
      unlock();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opened]);

  return (
    <div className={`${s.overlay} ${opened ? s.modalOpened : ''}`}>
      <section ref={modalRef} className={s.container}>
        <IconClose className={s.closeIcon} onClick={handleClose} />

        <div className={s.header}>
          <h2 className={s.title}>{titleSection[lang]}</h2>

          <h4 className={s.subTitle}>{subTitleSection[lang]}</h4>
        </div>

        <form className={s.form} onSubmit={handleSubmit(onSubmit)}>
          <div className={s.formInputs}>
            <Input
              isChanged={watch('name')}
              {...register('name', {
                required: errorsSection[lang].name
              })}
              placeholder={placeholderSection[lang].name}
              error={errors.name}
            />

            <div>
              <p className={s.radioBtnHeader}>{radioLabel[lang]}</p>

              <Steps
                layoutId="modalRu"
                className={s.radioBtns}
                stepClassName={s.radioBtn}
                contentClassName={s.radioBtnContent}
                steps={steps}
                onClickId={(id) => {
                  setActiveStep(id);
                }}
                onSendData={(data) => {
                  setValue('type', data);
                }}
              />
            </div>

            <Input
              isChanged={watch('data')}
              {...register('data', {
                required: errorsSection[lang].data
              })}
              placeholder={`${placeholderSection[lang].data} ${dataPlaceholder}`}
              error={errors.data}
            />
          </div>

          <Button className={`${s.btn} uix-x-button-thirdly-solid`} type={'submit'}>
            <span>{btnText[lang]}</span>
          </Button>
        </form>

        <p className={s.agreement}>
          <span>{agreementSection[lang].text} </span>

          <a href="https://www.makemelook.ai/privacy-policy" target="_blank">
            {agreementSection[lang].link}
          </a>
        </p>
      </section>
    </div>
  );
}
