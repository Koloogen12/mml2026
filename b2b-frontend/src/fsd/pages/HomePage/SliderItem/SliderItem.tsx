import Image from 'next/image';

import s from './SliderItem.module.scss';

export interface ISliderItem {
  size: string;
  image: string;
  title: string;
}

interface ISliderItemProps {
  item: ISliderItem;
}

export default function SliderItem({ item }: ISliderItemProps) {
  return (
    <div className={s.container}>
      <div className={s.size}>{item.size}</div>

      <Image src={item.image} alt={item.title} width={115} height={129} className={s.image} />

      <h4 className={s.title}>{item.title}</h4>
    </div>
  );
}
