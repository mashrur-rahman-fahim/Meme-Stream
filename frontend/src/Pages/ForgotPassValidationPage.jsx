import React, {  useEffect } from "react";
import api from "../utils/axios";
import { useNavigate } from "react-router-dom";
import { VerifyContext } from "../../context/create_verify_context";

export const ForgotPassValidationPage = () => {
  const params = new URLSearchParams(window.location.search);
  const token = params.get("token");
  const [validateToken, setValidateToken] = React.useState(false);
  const [newPassword, setNewPassword] = React.useState("");
  const {isVerified, verifyUser, loading} = React.useContext(VerifyContext);
  const navigate = useNavigate();
  useEffect(()=>{verifyUser()},[])
  useEffect(()=>{
    if(isVerified && !loading){
      navigate('/');
    }
  },[isVerified,loading,navigate])
  useEffect(() => {
    const validateToken = async () => {
      try {
        const res = await api.get("/ForgotPass/validate-token?token=" + token);
        if (res.status === 200) {
          setValidateToken(true);
        }
      } catch (error) {
        console.log(error);
      }
    };
    validateToken();
  }, [validateToken, token]);
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post("/ForgotPass/reset-password", {
        token,
        newPassword,
      });
      if (res.status === 200) {
        alert(
          "Password reset successfully. You can now log in with your new password."
        );
        navigate("/login");
      }
    } catch (error) {
      console.log(error);
    }
  };
  return (
    <div>
      {validateToken ? (
        <>
          <p>Token is valid. You can now reset your password.</p>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
          <button onClick={handleSubmit}>submit</button>
        </>
      ) : (
        <p>Invalid or expired token.</p>
      )}
    </div>
  );
};
