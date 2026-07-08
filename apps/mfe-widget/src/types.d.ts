export interface CounterWidgetOptions {
  initialValue?: number;
  theme?: "light" | "dark";
  onCountChange?: (count: number) => void;
}

export declare class CounterWidget {
  constructor(container: HTMLElement, options?: CounterWidgetOptions);
  increment(): void;
  decrement(): void;
  reset(): void;
  getValue(): number;
  setValue(value: number): void;
  setTheme(theme: "light" | "dark"): void;
  destroy(): void;
}

export default CounterWidget;
