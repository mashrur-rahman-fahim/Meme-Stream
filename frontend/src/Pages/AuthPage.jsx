import React, { useContext, useEffect, useState } from "react";
import api from "../utils/axios.js";
import { useNavigate, Link } from "react-router-dom";
import { VerifyContext } from "../../context/create_verify_context.jsx";

export const AuthPage = () => {
  const { isVerified, verifyUser, loading, checkEmailVerified } = useContext(VerifyContext);
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [formError, setFormError] = useState(null);
  const [formSuccess, setFormSuccess] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] = useState(false);
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
    setFormSuccess(null);

    if (!e.target.checkValidity()) {
      return;
    }

    setIsSubmitting(true);
    try {
      const isEmailVerified = await checkEmailVerified(formData.email);
      if (!isEmailVerified) {
        const res = await api.post("/Email/send-verification", {
          to: formData.email,
        });
        if (res.status === 200) {
          setFormSuccess(null);
          setFormError("Your email is not verified. We've sent a new verification link to your email address. Please verify your email before logging in.");
        }
        return;
      }

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
    } finally {
      setIsSubmitting(false);
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

    setIsSubmitting(true);
    try {
      await api.post(
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

      const res = await api.post("/Email/send-verification", {
        to: formData.email,
      });
      if (res.status === 200) {
        setFormSuccess("Registration successful! A verification email has been sent. Please check your email to verify your account.");
      }

      setIsLogin(true);
    } catch (error) {
      const message = error?.response?.data || "Registration failed. The email may already be in use.";
      setFormError(message);
      console.error("Registration failed:", error);
    } finally {
      setIsSubmitting(false);
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

          {/* success alert */}
          {formSuccess && (
            <div role="alert" className="alert alert-success text-sm p-3 mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              <span>{formSuccess}</span>
            </div>
          )}

          <div className="tabs tabs-boxed grid grid-cols-2 mb-6">
            <a
              className={`tab tab-lg ${isLogin ? "tab-active" : ""}`}
              onClick={() => { setIsLogin(true); setFormError(null); setFormSuccess(null); }}
            >
              Login
            </a>
            <a
              className={`tab tab-lg ${!isLogin ? "tab-active" : ""}`}
              onClick={() => { setIsLogin(false); setFormError(null); setFormSuccess(null); }}
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
                    <div className="relative">
                      <input
                        type={isPasswordVisible ? "text" : "password"}
                        name="password"
                        placeholder="Enter Your Password"
                        className={`input input-bordered w-full transition-colors duration-300 focus:outline-none focus:border-primary pr-10 ${fieldErrors.password ? 'border-error' : ''}`}
                        value={formData.password}
                        onChange={(e) =>
                          setFormData({ ...formData, password: e.target.value })
                        }
                        minLength={8}
                        onBlur={handleValidation}
                        onInvalid={handleValidation}
                        required
                      />
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm absolute top-1/2 right-2 -translate-y-1/2"
                        onClick={() => setIsPasswordVisible(!isPasswordVisible)}
                      >
                        {isPasswordVisible ? (
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.243 4.243L6.228 6.228" /></svg>
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.432 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                        )}
                      </button>
                    </div>
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
                    <button className="btn btn-primary" type="submit" disabled={isSubmitting}>
                      {isSubmitting ? (
                        <span className="loading loading-bars loading-lg"></span>
                      ) : (
                        "Login"
                      )}
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
                    <div className="relative">
                      <input
                        type={isPasswordVisible ? "text" : "password"}
                        name="password"
                        placeholder="Enter Your Password"
                        className={`input input-bordered w-full transition-colors duration-300 focus:outline-none focus:border-primary pr-10 ${fieldErrors.password ? 'border-error' : ''}`}
                        value={formData.password}
                        onChange={(e) =>
                          setFormData({ ...formData, password: e.target.value })
                        }
                        minLength={8}
                        onBlur={handleValidation}
                        onInvalid={handleValidation}
                        required
                      />
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm absolute top-1/2 right-2 -translate-y-1/2"
                        onClick={() => setIsPasswordVisible(!isPasswordVisible)}
                      >
                        {isPasswordVisible ? (
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.243 4.243L6.228 6.228" /></svg>
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.432 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                        )}
                      </button>
                    </div>
                    {/* Validation Error */}
                    {fieldErrors.password && (
                      <div className="label">
                        <span className="label-text-alt text-error text-xs">{fieldErrors.password}</span>
                      </div>
                    )}
                  </div>
                  <div className="form-control relative">
                    <label className="label">
                      <span className="label-text">Confirm Password</span>
                    </label>
                    <div className="relative">
                      <input
                        type={isConfirmPasswordVisible ? "text" : "password"}
                        name="confirmPassword"
                        placeholder="Enter Your Password"
                        className={`input input-bordered w-full transition-colors duration-300 focus:outline-none focus:border-primary pr-10 ${fieldErrors.password ? 'border-error' : ''}`}
                        value={formData.confirmPassword}
                        onChange={(e) =>
                          setFormData({ ...formData, confirmPassword: e.target.value })
                        }
                        minLength={8}
                        onBlur={handleValidation}
                        onInvalid={handleValidation}
                        required
                      />
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm absolute top-1/2 right-2 -translate-y-1/2"
                        onClick={() => setIsConfirmPasswordVisible(!isConfirmPasswordVisible)}
                      >
                        {isConfirmPasswordVisible ? (
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.243 4.243L6.228 6.228" /></svg>
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.432 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                        )}
                      </button>
                    </div>
                  </div>
                  {/* Register Error Alert */}
                  {formError && (
                    <div role="alert" className="alert alert-error text-sm p-2">
                      <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      <span>{formError}</span>
                    </div>
                  )}
                  <div className="form-control mt-6">
                    <button className="btn btn-primary" type="submit" disabled={isSubmitting}>
                      {isSubmitting ? (
                        <span className="loading loading-bars loading-lg"></span>
                      ) : (
                        "Create Account"
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </form>
          </div>
          {isLogin &&
            <div className="text-center mt-6">
              <p>Forgot your password? <Link to="/forgot-password" className="link link-primary">Reset it here</Link></p>
            </div>}
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