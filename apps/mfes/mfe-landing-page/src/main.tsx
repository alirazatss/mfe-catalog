import React from "react";
import ReactDOM from "react-dom/client";
import { LandingPage } from "@/modules/landing-page/pages/LandingPage";
import "./index.css";

const root = document.getElementById("root");
if (!root) throw new Error("Root element not found");

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <LandingPage />
  </React.StrictMode>,
);
