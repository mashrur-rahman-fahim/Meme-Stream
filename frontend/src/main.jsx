import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import VerifyProvider from "../context/verify_context.jsx";
import { Toaster } from "react-hot-toast";
import { ChatProvider } from "../context/ChatContext.jsx";
import { NotificationProvider } from "../context/NotificationContext.jsx";


createRoot(document.getElementById("root")).render(
  <StrictMode>
    <VerifyProvider>
      <NotificationProvider>
        <ChatProvider>
          <App />
          <Toaster 
            position="top-center"
            reverseOrder={false}
            gutter={8}
            containerClassName="toast-container"
            containerStyle={{
              top: 80,
              left: 20,
              right: 20,
              '@media (max-width: 768px)': {
                top: 70,
                left: 16,
                right: 16,
              },
              '@media (max-width: 480px)': {
                top: 60,
                left: 12,
                right: 12,
              }
            }}
            toastOptions={{
              // Define default options for all toasts
              duration: 4000,
              className: 'custom-toast',
              style: {
                background: 'hsl(var(--b1))',
                color: 'hsl(var(--bc))',
                border: '1px solid hsl(var(--b3))',
                borderRadius: '0.5rem',
                fontSize: 'clamp(13px, 2.5vw, 14px)',
                fontWeight: '500',
                padding: 'clamp(10px, 2vw, 12px) clamp(12px, 3vw, 16px)',
                maxWidth: 'min(500px, calc(100vw - 40px))',
                minWidth: '200px',
                wordBreak: 'break-word',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
              },
              // Success toasts
              success: {
                duration: 3000,
                style: {
                  background: 'hsl(var(--su))',
                  color: 'hsl(var(--suc))',
                  border: '1px solid hsl(var(--su))',
                },
                iconTheme: {
                  primary: 'hsl(var(--suc))',
                  secondary: 'hsl(var(--su))',
                },
              },
              // Error toasts
              error: {
                duration: 5000,
                style: {
                  background: 'hsl(var(--er))',
                  color: 'hsl(var(--erc))',
                  border: '1px solid hsl(var(--er))',
                },
                iconTheme: {
                  primary: 'hsl(var(--erc))',
                  secondary: 'hsl(var(--er))',
                },
              },
              // Loading toasts
              loading: {
                duration: Infinity,
                style: {
                  background: 'hsl(var(--b2))',
                  color: 'hsl(var(--bc))',
                  border: '1px solid hsl(var(--b3))',
                },
              },
            }}
          />
        </ChatProvider>
      </NotificationProvider>
    </VerifyProvider>
  </StrictMode>
);
