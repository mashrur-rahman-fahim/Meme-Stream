import React, { useContext, useEffect, useState } from "react";
import api from "../utils/axios.js";
import { useNavigate, Link } from "react-router-dom";
import { VerifyContext } from "../../context/create_verify_context.jsx";
import ThemeSwitcher from "../components/ThemeSwitcher.jsx";

export const AuthPage = () => {
  const { isVerified, verifyUser, loading, checkEmailVerified } = useContext(VerifyContext);
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [formError, setFormError] = useState(null);
  const [formSuccess, setFormSuccess] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
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
          setFormError("Hold up! Check your email and verify it first. We just sent you another verification link because we're nice like that 📧✨");
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
      const message = error?.response?.data || "Nah fam, that email or password ain't it. Try again! 🤷‍♂️";
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
      setFormError("Passwords don't match! Come on, you got this 💪");
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
    <div className="min-h-screen w-full bg-base-200 lg:relative lg:overflow-x-hidden flex flex-col lg:flex-row">
      {/* Theme Switcher - Fixed position with responsive positioning */}
      <div className="fixed top-3 right-3 sm:top-4 sm:right-4 md:top-5 md:right-5 z-50">
        <div className="transform scale-90 sm:scale-100">
          <ThemeSwitcher />
        </div>
      </div>

      {/* Add responsive styles for theme switcher on auth page */}
      <style jsx>{`
        @media (max-width: 480px) {
          :global(.dropdown-content) {
            width: calc(100vw - 24px) !important;
            right: -12px !important;
            max-height: 80vh !important;
          }
        }
      `}</style>

      <div
        className={`w-full lg:w-1/2 flex justify-center p-3 sm:p-4 md:p-6 lg:p-8 order-1 bg-base-100
                   lg:absolute lg:top-0 lg:h-full lg:overflow-y-auto
                   transition-all duration-700 ease-in-out
                   ${isLogin ? "lg:left-0" : "lg:left-1/2"}`}
      >
        <div className="w-full max-w-sm sm:max-w-md my-auto">
          <div className="text-center mb-3 sm:mb-4 md:mb-6">
            <h1 className="text-2xl xs:text-3xl sm:text-4xl lg:text-5xl font-extrabold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              MemeStream
            </h1>
            <p className="mt-1 sm:mt-2 text-sm xs:text-base sm:text-lg font-medium text-base-content">
              Your Daily Dose of Memes.
            </p>
          </div>

          {/* success alert */}
          {formSuccess && (
            <div role="alert" className="alert alert-success text-xs sm:text-sm p-2 sm:p-3 mb-3 sm:mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-4 w-4 sm:h-6 sm:w-6" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              <span className="text-xs sm:text-sm">{formSuccess}</span>
            </div>
          )}

          <div className="tabs tabs-boxed grid grid-cols-2 mb-3 sm:mb-4 md:mb-6">
            <a
              className={`tab tab-sm sm:tab-md lg:tab-lg text-xs sm:text-sm lg:text-base ${isLogin ? "tab-active" : ""}`}
              onClick={() => { setIsLogin(true); setFormError(null); setFormSuccess(null); }}
            >
              Login
            </a>
            <a
              className={`tab tab-sm sm:tab-md lg:tab-lg text-xs sm:text-sm lg:text-base ${!isLogin ? "tab-active" : ""}`}
              onClick={() => { setIsLogin(false); setFormError(null); setFormSuccess(null); }}
            >
              Register
            </a>
          </div>

          <div className="px-1 sm:px-2">
            <form
              noValidate
              onSubmit={isLogin ? handleLogin : handleRegister}
              className={`overflow-hidden relative ${isLogin ? 'min-h-[280px] sm:min-h-[300px]' : 'min-h-[320px] sm:min-h-[350px]'
                }`}
            >
              {/* Login Form */}
              <div
                className={`transition-all duration-500 ease-in-out ${isLogin
                  ? "opacity-100 transform translate-x-0"
                  : "opacity-0 transform -translate-x-full absolute"
                  }`}
              >
                <div className="space-y-2 sm:space-y-3 md:space-y-4">
                  <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-center">
                    Welcome Back!
                  </h2>
                  <div className="form-control">
                    <label className="label py-1">
                      <span className="label-text text-xs sm:text-sm">Email</span>
                    </label>
                    <input
                      type="email"
                      name="email"
                      placeholder="Your email (the one that gets all the spam) 📧"
                      className={`input input-bordered input-sm sm:input-md transition-colors duration-300 focus:outline-none focus:border-primary text-xs sm:text-sm ${fieldErrors.email ? 'border-error' : ''}`}
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
                      <div className="label py-1">
                        <span className="label-text-alt text-error text-xs">{fieldErrors.email}</span>
                      </div>
                    )}
                  </div>
                  <div className="form-control">
                    <label className="label py-1">
                      <span className="label-text text-xs sm:text-sm">Password</span>
                    </label>
                    <input
                      type="password"
                      name="password"
                      placeholder="Your super secret password 🤫"
                      className={`input input-bordered input-sm sm:input-md transition-colors duration-300 focus:outline-none focus:border-primary text-xs sm:text-sm ${fieldErrors.password ? 'border-error' : ''}`}
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
                      <div className="label py-1">
                        <span className="label-text-alt text-error text-xs">{fieldErrors.password}</span>
                      </div>
                    )}
                  </div>
                  {/* Login Error Alert */}
                  {formError && (
                    <div role="alert" className="alert alert-error text-xs sm:text-sm p-2">
                      <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-4 w-4 sm:h-6 sm:w-6" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      <span className="text-xs sm:text-sm">{formError}</span>
                    </div>
                  )}
                  <div className="form-control mt-3 sm:mt-4 md:mt-6">
                    <button className="btn btn-primary btn-sm sm:btn-md text-xs sm:text-sm" type="submit" disabled={isSubmitting}>
                      {isSubmitting ? (
                        <span className="loading loading-bars loading-sm sm:loading-md"></span>
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
                <div className="space-y-2 sm:space-y-3 md:space-y-4">
                  <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-center">
                    Join the Funniest Community!
                  </h2>
                  <div className="form-control">
                    <label className="label py-1">
                      <span className="label-text text-xs sm:text-sm">Name</span>
                    </label>
                    <input
                      type="text"
                      name="name"
                      placeholder="Your legendary username ⭐"
                      className={`input input-bordered input-sm sm:input-md transition-colors duration-300 focus:outline-none focus:border-primary text-xs sm:text-sm ${fieldErrors.name ? 'border-error' : ''}`}
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
                      <div className="label py-1">
                        <span className="label-text-alt text-error text-xs">{fieldErrors.name}</span>
                      </div>
                    )}
                  </div>
                  <div className="form-control">
                    <label className="label py-1">
                      <span className="label-text text-xs sm:text-sm">Email</span>
                    </label>
                    <input
                      type="email"
                      name="email"
                      placeholder="Drop your email here (promise no spam... mostly) 📮"
                      className={`input input-bordered input-sm sm:input-md transition-colors duration-300 focus:outline-none focus:border-primary text-xs sm:text-sm ${fieldErrors.email ? 'border-error' : ''}`}
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
                      <div className="label py-1">
                        <span className="label-text-alt text-error text-xs">{fieldErrors.email}</span>
                      </div>
                    )}
                  </div>
                  <div className="form-control">
                    <label className="label py-1">
                      <span className="label-text text-xs sm:text-sm">Password</span>
                    </label>
                    <input
                      type="password"
                      name="password"
                      placeholder="Make it secure but memorable (not 'password123') 🔐"
                      className={`input input-bordered input-sm sm:input-md transition-colors duration-300 focus:outline-none focus:border-primary text-xs sm:text-sm ${fieldErrors.password ? 'border-error' : ''}`}
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
                      <div className="label py-1">
                        <span className="label-text-alt text-error text-xs">{fieldErrors.password}</span>
                      </div>
                    )}
                  </div>
                  <div className="form-control">
                    <label className="label py-1">
                      <span className="label-text text-xs sm:text-sm">Confirm Password</span>
                    </label>
                    <input
                      type="password"
                      placeholder="Type it again (we know, it's annoying) 🔄"
                      className="input input-bordered input-sm sm:input-md focus:border-primary focus:outline-none text-xs sm:text-sm"
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
                    <div role="alert" className="alert alert-error text-xs sm:text-sm p-2">
                      <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-4 w-4 sm:h-6 sm:w-6" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      <span className="text-xs sm:text-sm">{formError}</span>
                    </div>
                  )}
                  <div className="form-control mt-3 sm:mt-4 md:mt-6">
                    <button className="btn btn-primary btn-sm sm:btn-md text-xs sm:text-sm" type="submit" disabled={isSubmitting}>
                      {isSubmitting ? (
                        <span className="loading loading-bars loading-sm sm:loading-md"></span>
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
          <div className="text-center mt-3 sm:mt-4 md:mt-6 px-1 sm:px-2">
              <p className="text-xs sm:text-sm md:text-base">Forgot your password? <Link to="/forgot-password" className="link link-primary">Reset it here</Link></p>
          </div>}
        </div>
      </div>

      {/* Image Panel */}
      <div
        className={`w-full lg:w-1/2 h-32 xs:h-40 sm:h-48 md:h-64 lg:h-screen order-0 lg:order-none relative
                   lg:absolute lg:top-0
                   transition-all duration-700 ease-in-out
                   ${isLogin ? "lg:left-1/2" : "lg:left-0"}`}
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