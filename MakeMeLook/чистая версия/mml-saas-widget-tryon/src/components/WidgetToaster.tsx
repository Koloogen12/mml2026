import type { FC } from 'react';
import { Toaster } from 'react-hot-toast';

export const WidgetToaster: FC = () => (
  <Toaster
    position="top-center"
    containerStyle={{
      position: 'absolute',
      top: 12,
      left: 0,
      right: 0,
      bottom: 0,
      pointerEvents: 'none',
    }}
    toastOptions={{
      duration: 4000,
      style: {
        background: '#fff',
        color: '#1a1a1a',
        fontSize: '14px',
        borderRadius: '12px',
        padding: '12px 20px',
        maxWidth: '320px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
        pointerEvents: 'auto',
      },
      error: {
        iconTheme: {
          primary: '#ff4b4b',
          secondary: '#fff',
        },
      },
    }}
  />
);
