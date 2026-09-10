import { Component, type ReactNode } from 'react';
import { t } from '@/i18n';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.error('[MML] Widget error:', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          padding: 24,
          textAlign: 'center',
          fontFamily: 'Inter, sans-serif',
          color: '#1a1a1a',
        }}>
          <div>
            <p style={{ fontSize: 15, marginBottom: 12 }}>{t('common.error')}</p>
            <button
              style={{
                background: '#1a1a1a',
                color: '#fff',
                border: 'none',
                borderRadius: 500,
                padding: '10px 24px',
                fontSize: 14,
                cursor: 'pointer',
              }}
              onClick={() => this.setState({ hasError: false })}
            >
              {t('common.tryAgain')}
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
