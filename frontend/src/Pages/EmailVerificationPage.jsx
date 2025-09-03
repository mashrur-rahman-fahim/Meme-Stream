import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../utils/axios";
import { VerifyContext } from "../../context/create_verify_context";

export const EmailVerificationPage = () => {
  const params = new URLSearchParams(window.location.search);
  const { isVerified, verifyUser, loading } = React.useContext(VerifyContext);
  const token = params.get("token");
  const navigate = useNavigate();

  useEffect(() => {
    verifyUser();
  }, []);
  useEffect(() => {
    if (isVerified && !loading) {
      navigate("/");
    }
  }, [isVerified, loading, navigate]);

  useEffect(() => {
    const verifyEmail = async () => {
      try {
        console.log("Verifying email with token:", token);

        const res = await api.get("/Email/verify-email?token=" + token);
        if (res.status === 200) {
          localStorage.setItem("token", res.data.token);
          navigate("/");
        }
      } catch (error) {
        console.log(error);
      }
    };
    verifyEmail();
  });
  return (
    <>
      <h1>Email Verification</h1>
      <p>Verifying your email</p>
    </>
  );
};
