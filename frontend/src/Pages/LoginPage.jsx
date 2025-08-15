import React, { useContext, useEffect } from "react";
import api from "../utils/axios.js";
import { useNavigate } from "react-router-dom";
import { VerifyContext } from "../../context/create_verify_context.jsx";


export const LoginPage = () => {
  const {isVerified, verifyUser, setIsVerified} = useContext(VerifyContext);
  const navigate = useNavigate();
  const [formData, setFormData] = React.useState({
    email: "",
    password: "",
  });
  useEffect(() => {
    verifyUser();
  }, [verifyUser]);
  useEffect(() => {
    if(isVerified){
      navigate('/');
    }
  }, [isVerified, navigate]);
  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log("Form submitted:", formData);
    try {
      const res = await api.post("/User/login", formData, {
        headers: {
          "Content-Type": "application/json",
        },
      });
      console.log("Login successful:", res.data);

      localStorage.setItem("token", res.data.token); // Store the token in localStorage
      setIsVerified(true);
      navigate('/');
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
    </div>
  );
};
