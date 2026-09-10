import { Component, type ReactNode } from "react";
import { sx } from "../sx";

/*
 * Граница ошибок вокруг экранов.
 *
 * Без неё любое исключение при рендере уносит всё приложение в белый экран:
 * React размонтирует дерево, а текст ошибки остаётся только в консоли — человек
 * видит пустоту и не понимает, сломался сайт или не загрузился. Именно так у нас
 * и произошло с главной.
 *
 * Показываем честное «сломалось», кнопку перезагрузки и — в dev — сам текст
 * ошибки, чтобы чинить, а не гадать.
 */
interface Props { children: ReactNode }
interface State { err: Error | null }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { err: null };

  static getDerivedStateFromError(err: Error): State {
    return { err };
  }

  componentDidCatch(err: Error, info: { componentStack?: string | null }) {
    // Логируем всегда: на проде это единственный след того, что человек упёрся
    // в белый экран.
    console.error("Экран упал:", err, info.componentStack);
  }

  render() {
    if (!this.state.err) return this.props.children;
    return (
      <div style={sx("min-height:60vh;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;padding:40px;text-align:center")}>
        <div style={sx("font:400 26px 'Spectral',Georgia,serif")}>Здесь что-то сломалось</div>
        <p style={sx("font:400 14px 'Inter',sans-serif;color:rgba(0,0,0,.55);margin:0;max-width:420px")}>
          Ошибка на нашей стороне — мы уже видим её. Попробуйте обновить страницу.
        </p>
        <span
          className="dp-btn"
          onClick={() => window.location.reload()}
          style={sx("font:500 14px 'Inter',sans-serif;background:#000;color:#fff;border-radius:999px;padding:12px 24px")}
        >
          Обновить
        </span>
        {import.meta.env.DEV && (
          <pre style={sx("max-width:90vw;overflow:auto;text-align:left;font:400 12px/1.5 ui-monospace,Menlo,monospace;color:#C0392B;background:#FBEAE8;padding:14px;border-radius:8px")}>
            {this.state.err.message}
            {"\n"}
            {this.state.err.stack?.split("\n").slice(1, 6).join("\n")}
          </pre>
        )}
      </div>
    );
  }
}
