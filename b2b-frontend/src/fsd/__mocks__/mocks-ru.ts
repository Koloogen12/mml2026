import { ISliderItem } from '@/fsd/pages/HomePage/SliderItem/SliderItem';
import { IChatMessage } from '@/fsd/shared/ui/ChatMessage/ChatMessage';
import { IBarChartItem } from '@/fsd/widgets/BarChart/BarChart';

export const slider: ISliderItem[] = [
  {
    size: 'L',
    title: 'Красное платье-мини',
    image: '/assets/images/slider/1.jpg'
  },
  {
    size: 'S',
    title: 'Платье от Couture',
    image: '/assets/images/slider/2.jpg'
  },
  {
    size: 'L',
    title: 'Зеленый вельветовый тренч',
    image: '/assets/images/slider/3.jpg'
  },
  {
    size: 'XL',
    title: 'Черная кожаная куртка',
    image: '/assets/images/slider/4.jpg'
  },
  {
    size: 'M',
    title: 'Серый пиджак',
    image: '/assets/images/slider/5.jpg'
  },
  //   duplicate
  {
    size: 'L',
    title: 'Красное платье-мини',
    image: '/assets/images/slider/1.jpg'
  },
  {
    size: 'S',
    title: 'Платье от Couture',
    image: '/assets/images/slider/2.jpg'
  },
  {
    size: 'L',
    title: 'Зеленый вельветовый тренч',
    image: '/assets/images/slider/3.jpg'
  },
  {
    size: 'XL',
    title: 'Черная кожаная куртка',
    image: '/assets/images/slider/4.jpg'
  },
  {
    size: 'M',
    title: 'Серый пиджак',
    image: '/assets/images/slider/5.jpg'
  },
  //   duplicate
  {
    size: 'L',
    title: 'Красное платье-мини',
    image: '/assets/images/slider/1.jpg'
  },
  {
    size: 'S',
    title: 'Платье от Couture',
    image: '/assets/images/slider/2.jpg'
  },
  {
    size: 'L',
    title: 'Зеленый вельветовый тренч',
    image: '/assets/images/slider/3.jpg'
  },
  {
    size: 'XL',
    title: 'Черная кожаная куртка',
    image: '/assets/images/slider/4.jpg'
  },
  {
    size: 'M',
    title: 'Серый пиджак',
    image: '/assets/images/slider/5.jpg'
  }
];

export const chat: IChatMessage[] = [
  {
    text: 'Привет! Видели ваш виджет, хотели бы использовать для нашего маркетплейса',
    type: 'user'
  },
  {
    text: 'Конечно! Наши разработчики помогут интегрировать виджет в течение дня!',
    type: 'bot'
  },
  {
    text: 'Тогда пересылаю вам доступы и контакты нашего специалиста',
    type: 'user'
  },
  {
    text: 'Виджет интегрирован в карточки ваших товаров, проверяйте',
    type: 'bot'
  },
  {
    text: 'Что нужно сделать чтобы проверить его работу?',
    type: 'user'
  },
  {
    text: 'Просто перейдите в карточку товара и нажмите на кнопку “примерить”',
    type: 'bot'
  },
  {
    text: 'Отлично! теперь осталось проверить реакцию наших клиентов.',
    type: 'user'
  },
  {
    text: 'Рады помочь вам!',
    type: 'bot'
  }
];

export const barChart1: IBarChartItem[] = [
  {
    label: '8-12х',
    description: 'просмотры страниц товаров',
    values: [20, 100]
  },
  {
    label: '5-50%',
    description: 'рост конверсии',
    values: [20, 70]
  },
  {
    label: '10-15х',
    description: ' удержание на сайте',
    values: [20, 100]
  }
];

export const barChart2: IBarChartItem[] = [
  {
    label: '50х',
    description: 'коэффициент ROI',
    values: [20, 60]
  },
  {
    label: '7-40%',
    description: 'cокращение возвратов',
    values: [20, 100]
  },
  {
    label: '2-5х',
    description: 'рост среднего чека',
    values: [20, 85]
  }
];
