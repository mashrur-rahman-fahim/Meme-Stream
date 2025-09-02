import React, { useEffect, useState } from "react";
import api from "../utils/axios.js";
import { useContext } from "react";
import { VerifyContext } from "../../context/create_verify_context.jsx";
import { useNavigate } from "react-router-dom";
export const Post = () => {
  const { isVerified, verifyUser, loading } = useContext(VerifyContext);
  const navigate = useNavigate();
  const [FormData, setFormData] = useState({
    content: "",
    image: "",
  });
  useEffect(() => {
    verifyUser();
  }, []);
  useEffect(() => {
    if (!isVerified && !loading) {
      navigate("/Login");
    }
  }, [isVerified, loading, navigate]);
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await api.post("/Post/create", FormData, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`, // Include token in headers
        },
      });

      console.log("Post created:", response.data);
    } catch (error) {
      console.log(localStorage.getItem("token"));
      console.error("Error creating post:", error);
    }
  };

  return (
    <div>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Content"
          value={FormData.content}
          onChange={(e) =>
            setFormData({ ...FormData, content: e.target.value })
          }
        />
        <input
          type="text"
          placeholder="Image URL"
          value={FormData.image}
          onChange={(e) => setFormData({ ...FormData, image: e.target.value })}
        />
        <button type="submit">Create Post</button>
      </form>
    </div>
  );
};
