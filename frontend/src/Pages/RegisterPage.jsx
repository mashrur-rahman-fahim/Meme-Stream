import React, { useContext, useEffect } from "react";
import api from "../utils/axios";
import { useNavigate } from "react-router-dom";
import { VerifyContext } from "../../context/create_verify_context";

export const RegisterPage = () => {
  const navigate = useNavigate();

  const { isVerified, verifyUser, loading } = useContext(VerifyContext);

  const [formData, setFormData] = React.useState({
    email: "",
    password: "",
    name: "",
    bio: "",
    image: "",
  });
  useEffect(() => {
    verifyUser();
  }, []);
  useEffect(() => {
    if (isVerified && !loading) {
      navigate("/");
    }
  }, [isVerified, navigate, loading]);
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post("/User/register", formData, {
        headers: {
          "Content-Type": "application/json",
        },
      });
      const res = await api.post("/Email/send-verification", {
        to: formData.email,
      });
      if (res.status === 200) {
        alert(
          "Registration successful. Verification email sent. Please verify your email before logging in."
        );
      }

      navigate("/auth");
    } catch (error) {
      console.error("Registration failed:", error);
    }
  };
  return (
    <div>
      <form>
        <input
          type="text"
          placeholder="Name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        />
        <input
          type="text"
          placeholder="Bio"
          value={formData.bio}
          onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
        />
        <input
          type="text"
          placeholder="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
        />
        <input
          type="text"
          placeholder="Password"
          value={formData.password}
          onChange={(e) =>
            setFormData({ ...formData, password: e.target.value })
          }
        />
        <input
          type="text"
          placeholder="Image URL"
          value={formData.image}
          onChange={(e) => setFormData({ ...formData, image: e.target.value })}
        />
        <button onClick={handleSubmit} type="submit">
          Register
        </button>
      </form>
    </div>
  );
};
