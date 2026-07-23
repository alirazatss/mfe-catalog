export interface CounterWidgetOptions {
  initialValue?: number;
  theme?: "light" | "dark";
  onCountChange?: (count: number) => void;
}

export class CounterWidget {
  private count: number;
  private container: HTMLElement;
  private options: CounterWidgetOptions;
  private countDisplay: HTMLElement | null = null;

  constructor(container: HTMLElement, options: CounterWidgetOptions = {}) {
    this.container = container;
    this.count = options.initialValue ?? 0;
    this.options = options;
    this.render();
  }

  private render(): void {
    const theme = this.options.theme ?? "light";

    this.container.innerHTML = `
      <div class="counter-widget" data-theme="${theme}">
        <div class="counter-widget__header">
          <h3>Counter Widget</h3>
          <span class="counter-widget__badge">Remote Module</span>
        </div>
        <div class="counter-widget__display">
          <span class="counter-widget__count">${this.count}</span>
        </div>
        <div class="counter-widget__controls">
          <button class="counter-widget__button counter-widget__button--decrement" type="button">
            <span>−</span>
          </button>
          <button class="counter-widget__button counter-widget__button--reset" type="button">
            Reset
          </button>
          <button class="counter-widget__button counter-widget__button--increment" type="button">
            <span>+</span>
          </button>
        </div>
        <div class="counter-widget__info">
          <small>Loaded via Module Federation</small>
        </div>
      </div>
    `;

    this.attachStyles();
    this.attachEventListeners();
  }

  private attachStyles(): void {
    if (!document.getElementById("counter-widget-styles")) {
      const style = document.createElement("style");
      style.id = "counter-widget-styles";
      style.textContent = `
        .counter-widget {
          font-family: system-ui, -apple-system, sans-serif;
          max-width: 400px;
          margin: 0 auto;
          padding: 2rem;
          border-radius: 12px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          transition: all 0.3s ease;
        }

        .counter-widget[data-theme="light"] {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
        }

        .counter-widget[data-theme="dark"] {
          background: linear-gradient(135deg, #1e3a8a 0%, #1e1b4b 100%);
          color: #e0e7ff;
        }

        .counter-widget__header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
        }

        .counter-widget__header h3 {
          margin: 0;
          font-size: 1.5rem;
          font-weight: 600;
        }

        .counter-widget__badge {
          font-size: 0.75rem;
          padding: 0.25rem 0.75rem;
          background: rgba(255, 255, 255, 0.2);
          border-radius: 12px;
          font-weight: 500;
        }

        .counter-widget__display {
          text-align: center;
          margin: 2rem 0;
        }

        .counter-widget__count {
          font-size: 4rem;
          font-weight: 700;
          line-height: 1;
          display: inline-block;
          min-width: 120px;
        }

        .counter-widget__controls {
          display: flex;
          gap: 0.75rem;
          justify-content: center;
          margin: 1.5rem 0;
        }

        .counter-widget__button {
          padding: 0.75rem 1.5rem;
          font-size: 1.125rem;
          font-weight: 600;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s ease;
          background: rgba(255, 255, 255, 0.9);
          color: #4c1d95;
        }

        .counter-widget__button:hover {
          background: white;
          transform: translateY(-2px);
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
        }

        .counter-widget__button:active {
          transform: translateY(0);
        }

        .counter-widget__button--decrement,
        .counter-widget__button--increment {
          width: 60px;
          font-size: 1.5rem;
        }

        .counter-widget__info {
          text-align: center;
          margin-top: 1.5rem;
          opacity: 0.8;
        }

        .counter-widget__info small {
          font-size: 0.875rem;
        }
      `;
      document.head.appendChild(style);
    }
  }

  private attachEventListeners(): void {
    this.countDisplay = this.container.querySelector(".counter-widget__count");

    const decrementBtn = this.container.querySelector(".counter-widget__button--decrement");
    const incrementBtn = this.container.querySelector(".counter-widget__button--increment");
    const resetBtn = this.container.querySelector(".counter-widget__button--reset");

    decrementBtn?.addEventListener("click", () => this.decrement());
    incrementBtn?.addEventListener("click", () => this.increment());
    resetBtn?.addEventListener("click", () => this.reset());
  }

  private updateDisplay(): void {
    if (this.countDisplay) {
      this.countDisplay.textContent = String(this.count);
    }
    this.options.onCountChange?.(this.count);
  }

  public increment(): void {
    this.count++;
    this.updateDisplay();
  }

  public decrement(): void {
    this.count--;
    this.updateDisplay();
  }

  public reset(): void {
    this.count = this.options.initialValue ?? 0;
    this.updateDisplay();
  }

  public getValue(): number {
    return this.count;
  }

  public setValue(value: number): void {
    this.count = value;
    this.updateDisplay();
  }

  public setTheme(theme: "light" | "dark"): void {
    this.options.theme = theme;
    const widget = this.container.querySelector(".counter-widget");
    if (widget) {
      widget.setAttribute("data-theme", theme);
    }
  }

  public destroy(): void {
    this.container.innerHTML = "";
  }
}

// Default export for Module Federation
export default CounterWidget;
