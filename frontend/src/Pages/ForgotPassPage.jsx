import React, { useState, useEffect, useContext } from "react";
import { VerifyContext } from "../../context/create_verify_context";
import { useNavigate, Link } from "react-router-dom";
import api from "../utils/axios";

export const ForgotPassPage = () => {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState(null); // To show success/error alerts
  const navigate = useNavigate();
  const { isVerified, verifyUser, loading } = useContext(VerifyContext);

  useEffect(() => {
    verifyUser();
  }, []);

  useEffect(() => {
    if (isVerified && !loading) {
      navigate("/");
    }
  }, [isVerified, loading, navigate]);

  const handleSendResetLink = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage(null);

    try {
      await api.post("/ForgotPass/send-reset", { to: email });
      setMessage({
        type: "success",
        text: "If the email is registered to an account, a password reset link has been sent to the email.",
      });
    } catch (error) {
      setMessage({
        type: "error",
        text: "An error occurred. Please try again later.",
      });
      console.error("Error sending reset link:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-base-200 flex items-center justify-center p-4">
      <div className="card w-full max-w-md bg-base-100 shadow-xl">
        <div className="card-body">
          <div className="text-center">
            <h1 className="text-2xl font-bold">Forgot Your Password?</h1>
            <p className="mt-2 text-base-content/70">
              Enter your email address below and we'll send you a link to reset it.
            </p>
          </div>

          <form onSubmit={handleSendResetLink} className="space-y-4 mt-6">
            <div className="form-control">
              <label className="label">
                <span className="label-text">Email</span>
              </label>
              <input
                type="email"
                placeholder="Enter your email"
                className="input input-bordered w-full"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            {/* Success or Error Alert */}
            {message && (
              <div role="alert" className={`alert ${message.type === 'success' ? 'alert-success' : 'alert-error'} text-sm p-2`}>
                <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <span>{message.text}</span>
              </div>
            )}

            <div className="form-control">
              <button
                type="submit"
                className="btn btn-primary w-full"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <span className="loading loading-bars"></span>
                ) : (
                  "Send Password Reset Link"
                )}
              </button>
            </div>
          </form>

          <div className="text-center mt-4">
            <Link to="/auth" className="link link-hover text-sm">
              &larr; Back to Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};