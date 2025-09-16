import { useEffect, useState } from "react";
import api from "../src/utils/axios.js";
import { VerifyContext } from "./create_verify_context";
import connectionManager from "../src/services/ConnectionManagerService";
import { jwtDecode } from "jwt-decode";

export const VerifyProvider = ({ children }) => {
  // Check if token exists synchronously to avoid flicker
  const token = localStorage.getItem("token");
  const hasToken = !!token;
  
  // If we have a token, assume verified initially to prevent flash
  // Will be corrected if token is invalid
  const [isVerified, setIsVerified] = useState(hasToken ? null : false);
  const [loading, setLoading] = useState(hasToken);
  const verifyUser = async () => {
    const token = localStorage.getItem("token");
    
    if (!token) {
      setIsVerified(false);
      setLoading(false);
      return;
    }
    
    try {
      // Don't set loading to true if it's already true (avoid re-render)
      
      const res = await api.get("/Verification/verify", {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.status === 200) {
        setIsVerified(true);

        // Initialize WebSocket connections when user is verified
        try {
          // Decode token to get user ID
          const decoded = jwtDecode(token);
          const userId = parseInt(
            decoded["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier"]
          );

          // Initialize all connections (chat and notifications)
          console.log('🚀 VerifyProvider: Initializing WebSocket connections...');
          connectionManager.initialize(token, userId, {
            enableChat: true,
            enableNotifications: true,
            autoConnect: true
          }).then(() => {
            console.log('✅ VerifyProvider: WebSocket connections established');
          }).catch(error => {
            console.error('❌ VerifyProvider: WebSocket connection failed:', error);
            // Don't fail authentication if WebSocket fails
          });
        } catch (error) {
          console.error('❌ VerifyProvider: Error initializing connections:', error);
        }
      } else {
        setIsVerified(false);
      }
    } catch (error) {
      console.error("Error verifying user:", error);
      setIsVerified(false);
    } finally {
      setLoading(false);
    }
  };
  const checkEmailVerified = async (email) => {
    try {
      const res = await api.get(`/Verification/email-check?email=${email}`, {
        headers: {
          "Content-Type": "application/json",
        },
      });
      return res.data.email_verified;
    } catch (error) {
      console.error("Error checking email verification:", error);
      return false;
    }
  };
  const logout = async () => {
    console.log('🔌 VerifyProvider: Logging out and disconnecting...');

    // Disconnect all WebSocket connections
    try {
      await connectionManager.disconnect();
      console.log('✅ VerifyProvider: All connections disconnected');
    } catch (error) {
      console.error('❌ VerifyProvider: Error disconnecting:', error);
    }

    localStorage.removeItem("token");
    setIsVerified(false);
  };
  useEffect(() => {
    verifyUser();
  }, []);
  return (
    <VerifyContext.Provider
      value={{ isVerified, checkEmailVerified, verifyUser, loading, logout }}
    >
      {children}
    </VerifyContext.Provider>
  );
};
export default VerifyProvider;
