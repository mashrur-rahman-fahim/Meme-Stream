import { useEffect, useState } from "react";
import api from "../src/utils/axios.js";
import { VerifyContext } from "./create_verify_context";

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
  const logout = () => {
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
