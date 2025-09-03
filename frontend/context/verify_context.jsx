import { useEffect, useState } from "react";
import api from "../src/utils/axios.js";
import { VerifyContext } from "./create_verify_context";

export const VerifyProvider = ({ children }) => {
  const [isVerified, setIsVerified] = useState(false);
  const [loading, setLoading] = useState(true);
  const verifyUser = async () => {
    try {
      setLoading(true);
      const res = await api.get("/Verification/verify", {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      if (res.status === 200) {
        setIsVerified(true);
      }
    } catch (error) {
      console.error("Error verifying user:", error);
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
