import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Button } from './Button';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div
        role="alert"
        style={{
          minHeight: '100dvh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '1rem',
          padding: '2rem',
          textAlign: 'center',
          color: 'var(--text, #e6ebff)',
        }}
      >
        <div style={{ fontSize: '2.5rem' }}>😕</div>
        <h1 style={{ margin: 0, fontSize: '1.25rem' }}>Algo deu errado</h1>
        <p style={{ margin: 0, color: 'var(--text-muted, #94a3c4)', maxWidth: 420 }}>
          Ocorreu um erro inesperado ao exibir esta tela. Você pode recarregar a página para
          tentar novamente.
        </p>
        <Button onClick={this.handleReload}>Recarregar</Button>
      </div>
    );
  }
}
