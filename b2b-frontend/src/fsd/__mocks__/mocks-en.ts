import { ISliderItem } from '@/fsd/pages/HomePage/SliderItem/SliderItem';
import { IChatMessage } from '@/fsd/shared/ui/ChatMessage/ChatMessage';
import { IBarChartItem } from '@/fsd/widgets/BarChart/BarChart';

export const slider: ISliderItem[] = [
  {
    size: 'L',
    title: 'Red mini dress',
    image: '/assets/images/slider/1.jpg'
  },
  {
    size: 'S',
    title: 'Couture dress',
    image: '/assets/images/slider/2.jpg'
  },
  {
    size: 'L',
    title: 'Green velvet trench coat classic',
    image: '/assets/images/slider/3.jpg'
  },
  {
    size: 'XL',
    title: 'Black leather jacket',
    image: '/assets/images/slider/4.jpg'
  },
  {
    size: 'M',
    title: 'Gray cotton jacket',
    image: '/assets/images/slider/5.jpg'
  },
  // duplicate
  {
    size: 'L',
    title: 'Red mini dress',
    image: '/assets/images/slider/1.jpg'
  },
  {
    size: 'S',
    title: 'Couture dress',
    image: '/assets/images/slider/2.jpg'
  },
  {
    size: 'L',
    title: 'Green velvet trench coat classic',
    image: '/assets/images/slider/3.jpg'
  },
  {
    size: 'XL',
    title: 'Black leather jacket',
    image: '/assets/images/slider/4.jpg'
  },
  {
    size: 'M',
    title: 'Gray cotton jacket',
    image: '/assets/images/slider/5.jpg'
  },
  // duplicate
  {
    size: 'L',
    title: 'Red mini dress',
    image: '/assets/images/slider/1.jpg'
  },
  {
    size: 'S',
    title: 'Couture dress',
    image: '/assets/images/slider/2.jpg'
  },
  {
    size: 'L',
    title: 'Green velvet trench coat classic',
    image: '/assets/images/slider/3.jpg'
  },
  {
    size: 'XL',
    title: 'Black leather jacket',
    image: '/assets/images/slider/4.jpg'
  },
  {
    size: 'M',
    title: 'Gray cotton jacket',
    image: '/assets/images/slider/5.jpg'
  }
];

export const chat: IChatMessage[] = [
  {
    text: 'Hi, saw your widget, would like to use it for our marketplace',
    type: 'user'
  },
  {
    text: 'Sure! Our developers will help integrate the widget within a few days!',
    type: 'bot'
  },
  {
    text: 'Then I am forwarding you the access and contacts of our specialist',
    type: 'user'
  },
  {
    text: 'The widget is integrated into your product cards, check it out',
    type: 'bot'
  },
  {
    text: 'What do I need to do to check its operation?',
    type: 'user'
  },
  {
    text: 'Simply go to the product card and click on the "try on" button',
    type: 'bot'
  },
  {
    text: 'Great! Now we just need to see how our customers react.',
    type: 'user'
  },
  {
    text: 'Happy to help you!',
    type: 'bot'
  }
];

export const barChart1: IBarChartItem[] = [
  {
    label: '8-12х',
    description: 'product page views',
    values: [20, 100]
  },
  {
    label: '5-50%',
    description: 'conversion growth',
    values: [20, 70]
  },
  {
    label: '10-15х',
    description: 'retention rate',
    values: [20, 100]
  }
];

export const barChart2: IBarChartItem[] = [
  {
    label: '50х',
    description: 'ROI',
    values: [20, 60]
  },
  {
    label: '7-40%',
    description: 'reduced returns',
    values: [20, 100]
  },
  {
    label: '2-5х',
    description: 'increase in average check',
    values: [20, 85]
  }
];
