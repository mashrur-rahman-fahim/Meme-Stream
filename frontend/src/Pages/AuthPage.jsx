import React, { useContext, useEffect, useState } from "react";
import api from "../utils/axios.js";
import { useNavigate } from "react-router-dom";
import { VerifyContext } from "../../context/create_verify_context.jsx";

export const AuthPage = () => {
  const { isVerified, verifyUser, loading } = useContext(VerifyContext);
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  useEffect(() => {
    verifyUser();
  }, [verifyUser]);

  useEffect(() => {
    if (isVerified && !loading) {
      navigate("/");
    }
  }, [isVerified, navigate, loading]);

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post("/User/login", {
        email: formData.email,
        password: formData.password,
      }, {
        headers: {
          "Content-Type": "application/json",
        },
      });
      localStorage.setItem("token", res.data.token);
      navigate("/");
    } catch (error) {
      console.error("Login failed:", error);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      console.error("Passwords do not match");
      return;
    }
    try {
      const res = await api.post("/User/register", {
        name: formData.name,
        email: formData.email,
        password: formData.password,
      }, {
        headers: {
          "Content-Type": "application/json",
        },
      });
      localStorage.setItem("token", res.data.token);
      navigate("/");
    } catch (error) {
      console.error("Registration failed:", error);
    }
  };

  const backgroundStyle = {
    backgroundImage: `url(${isLogin ? "/login-bg.jpg" : "/register-bg.jpg"})`,
    backgroundSize: "cover",
    backgroundPosition: "center",
    transition: "background-image 0.5s ease-in-out",
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-base-200 transition-all duration-500 p-4" style={backgroundStyle}>
      <div className="card w-full max-w-md bg-base-100 bg-opacity-80 shadow-xl backdrop-blur-md">
        <div className="card-body">
          {/* Branding Section */}
          <div className="text-center mb-4">
            <h1 className="text-4xl font-extrabold text-primary">MemeStream</h1>
            <p className="mt-2 text-lg font-medium text-base-content">Your Daily Dose of Memes.</p>
          </div>

          <div className="tabs tabs-boxed grid grid-cols-2 mb-6">
            <a className={`tab tab-lg ${isLogin ? "tab-active" : ""}`} onClick={() => setIsLogin(true)}>Login</a>
            <a className={`tab tab-lg ${!isLogin ? "tab-active" : ""}`} onClick={() => setIsLogin(false)}>Register</a>
          </div>

          <div className="px-2">
            <form onSubmit={isLogin ? handleLogin : handleRegister} className="overflow-hidden relative">
              {/* Login Form */}
              <div className={`transition-all duration-500 ease-in-out ${isLogin ? "opacity-100 transform translate-x-0" : "opacity-0 transform -translate-x-full absolute"}`}>
                <div className="space-y-4">
                  <h2 className="text-2xl font-bold text-center">Welcome Back!</h2>
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">Email</span>
                    </label>
                    <input
                      type="email"
                      placeholder="email@example.com"
                      className="input input-bordered"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">Password</span>
                    </label>
                    <input
                      type="password"
                      placeholder="********"
                      className="input input-bordered"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-control mt-6">
                    <button className="btn btn-primary" type="submit">Login</button>
                  </div>
                </div>
              </div>

              {/* Register Form */}
              <div className={`transition-all duration-500 ease-in-out ${!isLogin ? "opacity-100 transform translate-x-0" : "opacity-0 transform translate-x-full absolute"}`}>
                <div className="space-y-4">
                  <h2 className="text-2xl font-bold text-center">Join the Funniest Community!</h2>
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">Name</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Your Meme Alias"
                      className="input input-bordered"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required={!isLogin}
                    />
                  </div>
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">Email</span>
                    </label>
                    <input
                      type="email"
                      placeholder="email@example.com"
                      className="input input-bordered"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required={!isLogin}
                    />
                  </div>
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">Password</span>
                    </label>
                    <input
                      type="password"
                      placeholder="Create a Secure Password"
                      className="input input-bordered"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      required={!isLogin}
                    />
                  </div>
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">Confirm Password</span>
                    </label>
                    <input
                      type="password"
                      placeholder="Confirm Your Password"
                      className="input input-bordered"
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                      required={!isLogin}
                    />
                  </div>
                  <div className="form-control mt-6">
                    <button className="btn btn-primary" type="submit">Create Account</button>
                  </div>
                </div>
              </div>
            </form>
          </div>
          <div className="text-center mt-6">
            <p className="text-sm">
              {isLogin ? "Don't have an account? " : "Already a member? "}
              <a href="#" className="link link-primary" onClick={(e) => { e.preventDefault(); setIsLogin(!isLogin); }}>
                {isLogin ? "Register now" : "Login here"}
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};