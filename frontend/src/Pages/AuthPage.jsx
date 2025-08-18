import React, { useContext, useEffect, useState } from "react";
import api from "../utils/axios.js";
import { useNavigate } from "react-router-dom";
import { VerifyContext } from "../../context/create_verify_context.jsx";

export const AuthPage = () => {
  const { isVerified, verifyUser, loading } = useContext(VerifyContext);
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [formError, setFormError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  useEffect(() => {
    verifyUser();
  }, []);

  useEffect(() => {
    if (isVerified && !loading) {
      navigate("/");
    }
  }, [isVerified, navigate, loading]);


  const handleValidation = (e) => {
    const { name, validationMessage } = e.target;
    setFieldErrors(prevErrors => ({ ...prevErrors, [name]: validationMessage }));
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setFormError(null);

    if (!e.target.checkValidity()) {
      return;
    }
    try {
      const res = await api.post(
        "/User/login",
        {
          email: formData.email,
          password: formData.password,
        },
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
      localStorage.setItem("token", res.data.token);
      navigate("/");
    } catch (error) {
      const message = error?.response?.data || "Incorrect email or password. Please try again.";
      setFormError(message);
      console.error("Login failed:", error);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setFormError(null);

    if (!e.target.checkValidity()) {
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setFormError("Passwords do not match.");
      return;
    }
    try {
      const res = await api.post(
        "/User/register",
        {
          name: formData.name,
          email: formData.email,
          password: formData.password,
        },
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
      localStorage.setItem("token", res.data.token);
      navigate("/");
    } catch (error) {
      const message = error?.response?.data || "Registration failed. The email may already be in use.";
      setFormError(message);
      console.error("Registration failed:", error);
    }
  };

  return (
    <div className="min-h-screen w-full bg-base-200 md:relative md:overflow-x-hidden flex flex-col md:flex-row">
      <div
        className={`w-full md:w-1/2 flex justify-center p-8 order-1 bg-base-100 
                   md:absolute md:top-0 md:h-full md:overflow-y-auto
                   transition-all duration-700 ease-in-out
                   ${isLogin ? "md:left-0" : "md:left-1/2"}`}
      >
        <div className="w-full max-w-md my-auto">
          <div className="text-center mb-4">
            <h1 className="text-4xl font-extrabold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              MemeStream
            </h1>
            <p className="mt-2 text-lg font-medium text-base-content">
              Your Daily Dose of Memes.
            </p>
          </div>

          <div className="tabs tabs-boxed grid grid-cols-2 mb-6">
            <a
              className={`tab tab-lg ${isLogin ? "tab-active" : ""}`}
              onClick={() => { setIsLogin(true); setFormError(null); }}
            >
              Login
            </a>
            <a
              className={`tab tab-lg ${!isLogin ? "tab-active" : ""}`}
              onClick={() => { setIsLogin(false); setFormError(null); }}
            >
              Register
            </a>
          </div>

          <div className="px-2">
            <form
              noValidate
              onSubmit={isLogin ? handleLogin : handleRegister}
              className={`overflow-hidden relative ${isLogin ? 'min-h-[300px]' : 'min-h-[350px]'
                }`}
            >
              {/* Login Form */}
              <div
                className={`transition-all duration-500 ease-in-out ${isLogin
                  ? "opacity-100 transform translate-x-0"
                  : "opacity-0 transform -translate-x-full absolute"
                  }`}
              >
                <div className="space-y-4">
                  <h2 className="text-2xl font-bold text-center">
                    Welcome Back!
                  </h2>
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">Email</span>
                    </label>
                    <input
                      type="email"
                      name="email"
                      placeholder="Enter Your Registered Email"
                      className={`input input-bordered transition-colors duration-300 focus:outline-none focus:border-primary ${fieldErrors.email ? 'border-error' : ''}`}
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                      onBlur={handleValidation}
                      onInvalid={handleValidation}
                      required
                    />
                    {/* Validation Error */}
                    {fieldErrors.email && (
                      <div className="label">
                        <span className="label-text-alt text-error text-xs">{fieldErrors.email}</span>
                      </div>
                    )}
                  </div>
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">Password</span>
                    </label>
                    <input
                      type="password"
                      name="password"
                      placeholder="Enter Your Password"
                      className={`input input-bordered transition-colors duration-300 focus:outline-none focus:border-primary ${fieldErrors.password ? 'border-error' : ''}`}
                      value={formData.password}
                      onChange={(e) =>
                        setFormData({ ...formData, password: e.target.value })
                      }
                      minLength={8}
                      onBlur={handleValidation}
                      onInvalid={handleValidation}
                      required
                    />
                    {/* Validation Error */}
                    {fieldErrors.password && (
                      <div className="label">
                        <span className="label-text-alt text-error text-xs">{fieldErrors.password}</span>
                      </div>
                    )}
                  </div>
                  {/* Login Error Alert */}
                  {formError && (
                    <div role="alert" className="alert alert-error text-sm p-2">
                      <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      <span>{formError}</span>
                    </div>
                  )}
                  <div className="form-control mt-6">
                    <button className="btn btn-primary" type="submit">
                      Login
                    </button>
                  </div>
                </div>
              </div>

              {/* Register Form */}
              <div
                className={`transition-all duration-500 ease-in-out ${!isLogin
                  ? "opacity-100 transform translate-x-0"
                  : "opacity-0 transform translate-x-full absolute"
                  }`}
              >
                <div className="space-y-4">
                  <h2 className="text-2xl font-bold text-center">
                    Join the Funniest Community!
                  </h2>
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">Name</span>
                    </label>
                    <input
                      type="text"
                      name="name"
                      placeholder="Your Profile Name"
                      className={`input input-bordered transition-colors duration-300 focus:outline-none focus:border-primary ${fieldErrors.name ? 'border-error' : ''}`}
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      minLength={2}
                      maxLength={30}
                      onBlur={handleValidation}
                      onInvalid={handleValidation}
                      required={!isLogin}
                    />
                    {/* Validation Error */}
                    {fieldErrors.name && (
                      <div className="label">
                        <span className="label-text-alt text-error text-xs">{fieldErrors.name}</span>
                      </div>
                    )}
                  </div>
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">Email</span>
                    </label>
                    <input
                      type="email"
                      name="email"
                      placeholder="Enter a Valid Email"
                      className={`input input-bordered transition-colors duration-300 focus:outline-none focus:border-primary ${fieldErrors.email ? 'border-error' : ''}`}
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                      onBlur={handleValidation}
                      onInvalid={handleValidation}
                      required={!isLogin}
                    />
                    {/* Validation Error */}
                    {fieldErrors.email && (
                      <div className="label">
                        <span className="label-text-alt text-error text-xs">{fieldErrors.email}</span>
                      </div>
                    )}
                  </div>
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">Password</span>
                    </label>
                    <input
                      type="password"
                      name="password"
                      placeholder="Create a Secure Password"
                      className={`input input-bordered transition-colors duration-300 focus:outline-none focus:border-primary ${fieldErrors.password ? 'border-error' : ''}`}
                      value={formData.password}
                      onChange={(e) =>
                        setFormData({ ...formData, password: e.target.value })
                      }
                      minLength={8}
                      onBlur={handleValidation}
                      onInvalid={handleValidation}
                      required={!isLogin}
                    />
                    {/* Validation Error */}
                    {fieldErrors.password && (
                      <div className="label">
                        <span className="label-text-alt text-error text-xs">{fieldErrors.password}</span>
                      </div>
                    )}
                  </div>
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">Confirm Password</span>
                    </label>
                    <input
                      type="password"
                      placeholder="Confirm Your Password"
                      className="input input-bordered focus:border-primary focus:outline-none"
                      value={formData.confirmPassword}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          confirmPassword: e.target.value,
                        })
                      }
                      required={!isLogin}
                    />
                  </div>
                  {/* Register Error Alert */}
                  {formError && (
                    <div role="alert" className="alert alert-error text-sm p-2">
                      <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      <span>{formError}</span>
                    </div>
                  )}
                  <div className="form-control mt-6">
                    <button className="btn btn-primary" type="submit">
                      Create Account
                    </button>
                  </div>
                </div>
              </div>
            </form>
          </div>
          <div className="text-center mt-6">
            <p className="text-sm">
              {isLogin ? "Don't have an account? " : "Already a member? "}
              <a
                href="#"
                className="link link-primary"
                onClick={(e) => {
                  e.preventDefault();
                  setIsLogin(!isLogin);
                }}
              >
                {isLogin ? "Register now" : "Login here"}
              </a>
            </p>
          </div>
        </div>
      </div>

      {/* Image Panel */}
      <div
        className={`w-full md:w-1/2 h-64 md:h-screen order-0 md:order-none relative 
                   md:absolute md:top-0
                   transition-all duration-700 ease-in-out
                   ${isLogin ? "md:left-1/2" : "md:left-0"}`}
      >
        <div
          className={`absolute inset-0 w-full h-full bg-cover bg-center transition-opacity duration-1000 ${isLogin ? "opacity-100" : "opacity-0"
            }`}
          style={{ backgroundImage: `url('/login-bg.jpg')` }}
        />
        <div
          className={`absolute inset-0 w-full h-full bg-cover bg-center transition-opacity duration-1000 ${!isLogin ? "opacity-100" : "opacity-0"
            }`}
          style={{ backgroundImage: `url('/register-bg.jpg')` }}
        />
      </div>
    </div>
  );
};