import {
  IChatMessage,
  IProduct
} from '@/fsd/widgets/ai-agent/AgentChat/AgentChatMessage/AgentChatMessage';

const products: IProduct[] = [
  {
    name: 'Fanez jumper',
    image: '/assets/images/ai-agent/chat/p1.png',
    price: 784.53,
    discount_price: 484.53
  },
  {
    name: 'Weird jumper',
    image: '/assets/images/ai-agent/chat/p2.png',
    price: 484.53
  },
  {
    name: 'Curve; BSO1',
    image: '/assets/images/ai-agent/chat/p3.png',
    price: 354.53,
    color: 'Nori',
    hex: '#33333C',
    in_favorites: true
  }
];

const products2: IProduct[] = [
  {
    name: 'Fanez jumper',
    image: '/assets/images/ai-agent/chat/p4.png',
    price: 784.53,
    discount_price: 484.53
  },
  {
    name: 'Weird jumper',
    image: '/assets/images/ai-agent/chat/p5.png',
    price: 484.53,
    in_favorites: true
  },
  {
    name: 'Curve; BSO1',
    image: '/assets/images/ai-agent/chat/p6.png',
    price: 354.53,
    color: 'Nori',
    hex: '#33333C'
  }
];

export const chat: IChatMessage[] = [
  {
    text: "Hello! I'm your personal fashion stylist. Tell me what kind of outfit you're looking for, and I'll help you create the perfect look! ✨",
    type: 'bot',
    suggestions: [
      'Fall outfit ideas',
      'Date night look',
      'Business casual',
      'What to wear to a workout'
    ]
  },
  {
    text: 'Can you recommend some fall outfit?',
    type: 'user'
  },
  {
    text: 'Of course! Here are a few options you might like:',
    type: 'bot',
    products: products
  },
  {
    text: 'What else could you suggest?',
    type: 'user'
  },
  {
    text: 'Here are a few more options:',
    type: 'bot',
    products: products2
  }
];
