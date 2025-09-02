import React, { useContext, useEffect } from "react";
import api from "../utils/axios.js";
import { useNavigate } from "react-router-dom";
import { VerifyContext } from "../../context/create_verify_context.jsx";

export const LoginPage = () => {
  const { isVerified, verifyUser, loading, checkEmailVerified } =
    useContext(VerifyContext);
  const navigate = useNavigate();
  const [formData, setFormData] = React.useState({
    email: "",
    password: "",
  });
  useEffect(() => {
    verifyUser();
  }, []);
  useEffect(() => {
    if (isVerified && !loading) {
      navigate("/");
    }
  }, [navigate, loading, isVerified]);
  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log("Form submitted:", formData);
    try {
      const res1 = await checkEmailVerified(formData.email);

      if (!res1) {
        const res = await api.post("/Email/send-verification", {
          to: formData.email,
        });
        if (res.status === 200) {
          alert(
            "Email not verified. Verification email sent. Please verify your email before logging in."
          );
        }
        return;
      }
      const res = await api.post("/User/login", formData, {
        headers: {
          "Content-Type": "application/json",
        },
      });
      localStorage.setItem("token", res.data.token);
      await verifyUser();
      navigate("/");
    } catch (error) {
      console.error("Login failed:", error);
    }
  };
  return (
    <div>
      <h1>Login</h1>
      <form>
        <input
          className="imput imput-primary"
          type="text"
          placeholder="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
        />
        <input
          className="imput imput-primary"
          type="text"
          placeholder="password"
          value={formData.password}
          onChange={(e) =>
            setFormData({ ...formData, password: e.target.value })
          }
        />
        <button
          className="btn btn-primary"
          type="submit"
          onClick={handleSubmit}
        >
          Login
        </button>
      </form>
      <button onClick={() => navigate("/forgot-password")}>
        Forgot Password
      </button>
    </div>
  );
};
