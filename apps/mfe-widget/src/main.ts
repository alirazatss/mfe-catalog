import { CounterWidget } from "./components/CounterWidget";

// When running standalone, render a demo instance
const demoContainer = document.getElementById("widget-demo");
if (demoContainer) {
  new CounterWidget(demoContainer, {
    initialValue: 0,
    theme: "light",
    onCountChange: (count) => {
      console.log("Counter changed:", count);
    },
  });
}

// Export for Module Federation
export { CounterWidget };
export default CounterWidget;
