import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";
import { AuthProvider } from "./contexts/AuthContext";
import "./lib/i18n";
// import { detectLocationAndSetLanguage } from "./lib/i18n";

// Auto-detect location and set language
// detectLocationAndSetLanguage();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <AuthProvider>
  <App />
</AuthProvider>
);
