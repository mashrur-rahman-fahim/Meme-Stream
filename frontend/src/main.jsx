import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import VerifyProvider from "../context/verify_context.jsx";
import { Toaster } from "react-hot-toast";
import { ChatProvider } from "../context/ChatContext.jsx";


createRoot(document.getElementById("root")).render(
  <StrictMode>
    <VerifyProvider>
      <ChatProvider>
        <App />
        <Toaster position="bottom-right" />
      </ChatProvider>
    </VerifyProvider>
  </StrictMode>
);
