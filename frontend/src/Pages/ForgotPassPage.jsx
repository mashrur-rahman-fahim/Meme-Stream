import React, { useEffect } from "react";
import { VerifyContext } from "../../context/create_verify_context";
import { useNavigate } from "react-router-dom";
import api from "../utils/axios";

export const ForgotPassPage = () => {
  const [email, setEmail] = React.useState("");
  const navigate = useNavigate();
  const { isVerified, verifyUser, loading } = React.useContext(VerifyContext);
  useEffect(() => {
    verifyUser();
  }, []);
  useEffect(() => {
    if (isVerified && !loading) {
      navigate("/");
    }
  }, [isVerified, loading, navigate]);
  const handleSendResetLink = async () => {
    try {
      const res = await api.post("/ForgotPass/send-reset", { to:email });
      console.log(res.data);
      alert("If the email is registered, a password reset link has been sent.");
      navigate("/login");
    } catch (error) {
      console.error("Error sending reset link:", error);
    }
  };

  return (
    <div>
      <h2>Forgot Password</h2>
      <input
        type="email"
        placeholder="Enter your email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <button onClick={handleSendResetLink}>Send Reset Link</button>
    </div>
  );
};
