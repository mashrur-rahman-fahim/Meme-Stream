import React, { useState, useEffect, useContext } from "react";
import api from "../utils/axios";
import { useNavigate, Link } from "react-router-dom";
import { VerifyContext } from "../../context/create_verify_context";

export const ForgotPassValidationPage = () => {
  const params = new URLSearchParams(window.location.search);
  const token = params.get("token");
  
  const [validationStatus, setValidationStatus] = useState('pending'); // 'pending', 'valid', 'invalid'
  const [newPassword, setNewPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState(null);

  const { isVerified, verifyUser, loading } = useContext(VerifyContext);
  const navigate = useNavigate();

  useEffect(() => {
    verifyUser();
  }, []);

  useEffect(() => {
    if (isVerified && !loading) {
      navigate('/');
    }
  }, [isVerified, loading, navigate]);

  useEffect(() => {
    const validateToken = async () => {
      if (!token) {
        setValidationStatus('invalid');
        return;
      }
      try {
        await api.get("/ForgotPass/validate-token?token=" + token);
        setValidationStatus('valid');
      } catch (error) {
        setValidationStatus('invalid');
        console.log(error);
      }
    };
    validateToken();
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage(null);

    try {
      await api.post("/ForgotPass/reset-password", {
        token,
        newPassword,
      });
      setMessage({ type: 'success', text: 'Password reset successfully! Redirecting to login...' });

      setTimeout(() => {
        navigate("/auth");
      }, 2000);

    } catch (error) {
      setMessage({ type: 'error', text: 'An error occurred. Please try again.' });
      console.log(error);
      setIsSubmitting(false);
    }
  };

  const renderContent = () => {
    switch (validationStatus) {
      case 'pending':
        return <div className="text-center p-10"><span className="loading loading-lg loading-bars"></span></div>;
      
      case 'invalid':
        return (
          <div className="text-center">
            <div role="alert" className="alert alert-error">
              <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              <span>Invalid or expired token.</span>
            </div>
            <Link to="/auth" className="btn btn-primary btn-outline mt-6">
              Return to Login
            </Link>
          </div>
        );

      case 'valid':
        return (
          <>
            <div className="text-center">
              <h1 className="text-2xl font-bold">Reset Your Password</h1>
              <p className="mt-2 text-base-content/70">
                Please enter your new password below.
              </p>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4 mt-6">
              <div className="form-control">
                <label className="label">
                  <span className="label-text">New Password</span>
                </label>
                <input
                  type="password"
                  placeholder="Enter your new password"
                  className="input input-bordered w-full"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={8}
                />
              </div>
              {message && (
                <div role="alert" className={`alert ${message.type === 'success' ? 'alert-success' : 'alert-error'} text-sm p-2`}>
                  <span>{message.text}</span>
                </div>
              )}
              <div className="form-control">
                <button
                  type="submit"
                  className="btn btn-primary w-full"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? <span className="loading loading-bars"></span> : "Reset Password"}
                </button>
              </div>
            </form>
          </>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-base-200 flex items-center justify-center p-4">
      <div className="card w-full max-w-md bg-base-100 shadow-xl">
        <div className="card-body">
          {renderContent()}
        </div>
      </div>
    </div>
  );
};