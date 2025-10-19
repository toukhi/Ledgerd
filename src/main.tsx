import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Global handler to capture unhandled promise rejections and log them in a controlled way.
// This prevents vendor libs (e.g., WalletConnect) from surfacing uncaught rejections that
// crash the UI or flood the console during development.
window.addEventListener('unhandledrejection', (event) => {
	// eslint-disable-next-line no-console
	console.warn('Unhandled promise rejection (captured):', event.reason);
});

createRoot(document.getElementById("root")!).render(<App />);
