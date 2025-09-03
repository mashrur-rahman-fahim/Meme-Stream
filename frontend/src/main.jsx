import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import VerifyProvider from "../context/verify_context.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <VerifyProvider>
      <App />
    </VerifyProvider>
  </StrictMode>
);
