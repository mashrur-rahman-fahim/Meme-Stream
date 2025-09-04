import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../utils/axios";

export const SendEmailVerificationPage = () => {
  const navigate = useNavigate();
  const { email } = useParams();
  const [message, setMessage] = useState(
    "Sending verification email to " + email + "..."
  );
  useEffect(() => {
    const sendVerificationEmail = async () => {
      try {
        const res = await api.post("/Email/send-verification", { email });
        if (res.status === 200) {
          setMessage("Verification email sent successfully");
          navigate("/auth");
        }
      } catch (error) {
        console.log(error);
        setMessage("Error sending verification email");
      }
    };
    sendVerificationEmail();
  }, [email, navigate]);

  return (
    <>
      <h1>Send Email Verification</h1>
      <p>{message}</p>
    </>
  );
};
