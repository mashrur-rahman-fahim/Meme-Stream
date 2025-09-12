import React, { useEffect, useState } from "react";
import api from "../utils/axios.js";
import { useContext } from "react";
import { VerifyContext } from "../../context/create_verify_context.jsx";
import { useNavigate } from "react-router-dom";
import ImageUpload from "./ImageUpload";

export const Post = ({ onSuccess }) => {
  const { isVerified, verifyUser, loading } = useContext(VerifyContext);
  const navigate = useNavigate();
  const [FormData, setFormData] = useState({
    content: "",
    image: "",
  });
  const [uploadedImageData, setUploadedImageData] = useState(null);
  const [memeCheckResult, setMemeCheckResult] = useState(null);
  const [isCheckingMeme, setIsCheckingMeme] = useState(false);
  const [postStatus, setPostStatus] = useState("");

  useEffect(() => {
    verifyUser();
  }, []);

  useEffect(() => {
    if (!isVerified && !loading) {
      navigate("/auth");
    }
  }, [isVerified, loading, navigate]);

  const handleMemeCheck = async () => {
    if (!FormData.content.trim()) {
      setPostStatus("Please enter some content to check.");
      return;
    }

    setIsCheckingMeme(true);
    setPostStatus("Checking if content is a meme...");

    try {
      const response = await api.post("/Post/check-meme", FormData, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      setMemeCheckResult(response.data);

      if (!response.data.isMeme) {
        setPostStatus(
          "This content is not a meme and cannot be posted. Only memes are allowed!"
        );
      } else {
        setPostStatus("Great! This is meme content and can be posted!");
      }
    } catch (error) {
      console.error("Error checking meme:", error);
      setPostStatus("Error checking content. Please try again.");
      setMemeCheckResult(null);
    } finally {
      setIsCheckingMeme(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!memeCheckResult || !memeCheckResult.isMeme) {
      setPostStatus("Please ensure your content is a meme before posting.");
      return;
    }

    try {
      setPostStatus("Creating post...");
      const response = await api.post("/Post/create", FormData, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      console.log("Post created:", response.data);
      setPostStatus("Post created successfully!");

      // Reset form
      setFormData({ content: "", image: "" });
      setUploadedImageData(null);
      setMemeCheckResult(null);
      
      // Call success callback if provided (for mobile modal)
      if (onSuccess) {
        setTimeout(() => onSuccess(), 1000);
      }
      
      // Reload the page to show new post
      setTimeout(() => window.location.reload(), 1500);
    } catch (error) {
      console.error("Error creating post:", error);
      if (error.response?.data?.error === "Non-meme content detected") {
        setPostStatus("Post blocked: Only meme content is allowed!");
      } else {
        setPostStatus("Error creating post. Please try again.");
      }
    }
  };

  // Handle image upload
  const handleImageUpload = (imageData) => {
    setUploadedImageData(imageData);
    setFormData({ ...FormData, image: imageData.url });
  };

  // Handle image removal
  const handleImageRemove = () => {
    setUploadedImageData(null);
    setFormData({ ...FormData, image: "" });
  };

return (
  <div className="max-w-2xl mx-auto p-4 sm:p-6 bg-base-100 rounded-lg shadow-md space-y-6">
    <h2 className="text-2xl font-bold text-center text-base-content">
      Create a Meme Post
    </h2>

    {/* Meme Content */}
    <div>
      <label className="block text-sm font-medium text-base-content mb-1">
        Meme Content
      </label>
      <textarea
        className="textarea textarea-bordered w-full min-h-[6rem] sm:min-h-[7rem] resize-none text-base p-3"
        placeholder="What's on your mind?"
        value={FormData.content}
        onChange={(e) => {
          setFormData({ ...FormData, content: e.target.value });
          setMemeCheckResult(null);
          setPostStatus("");
        }}
      />
    </div>

    {/* Image Upload */}
    <div>
      <label className="block text-sm font-medium text-base-content mb-2">
        Upload Image (optional)
      </label>
      <ImageUpload
        onImageUpload={handleImageUpload}
        currentImageUrl={FormData.image}
        onImageRemove={handleImageRemove}
      />
      {uploadedImageData && (
        <div className="mt-2 text-xs text-base-content/60">
          <p>✅ Image uploaded: {uploadedImageData.originalName}</p>
          <p>📏 {uploadedImageData.width}x{uploadedImageData.height} • {(uploadedImageData.size / 1024).toFixed(1)}KB</p>
        </div>
      )}
    </div>

    {/* Buttons */}
    <div className="flex flex-col gap-4 mt-4">
      {/* Check if Meme Button */}
      <div className="flex flex-col gap-1">
        <button
          type="button"
          onClick={handleMemeCheck}
          disabled={isCheckingMeme || !FormData.content.trim()}
          className={`btn w-full text-base sm:text-lg font-semibold transition-all duration-200 ${
            isCheckingMeme || !FormData.content.trim()
              ? "btn-disabled"
              : "btn-outline btn-primary hover:scale-105"
          }`}
        >
          {isCheckingMeme ? (
            <>
              <span className="loading loading-spinner loading-sm mr-2"></span>
              Checking...
            </>
          ) : (
            "Check if Meme"
          )}
        </button>
        {!FormData.content.trim() && (
          <p className="text-sm text-base-content/60 pl-1">
            ✍️ Write something first to check if it's a meme
          </p>
        )}
      </div>

      {/* Create Post Button */}
      <div className="flex flex-col gap-1">
        <button
          onClick={handleSubmit}
          disabled={!memeCheckResult || !memeCheckResult.isMeme}
          className={`btn w-full text-base sm:text-lg font-semibold transition-all duration-200 ${
            !memeCheckResult || !memeCheckResult.isMeme
              ? "btn-disabled"
              : "btn-primary hover:scale-105"
          }`}
        >
          Create Post
        </button>
        {(!memeCheckResult || !memeCheckResult.isMeme) && (
          <p className="text-sm text-base-content/60 pl-1">
            ✅ First check and confirm your content is a meme
          </p>
        )}
      </div>
    </div>

    {/* Status Alert */}
    {postStatus && (
      <div className="mt-6">
        <div
          className={`alert text-sm sm:text-base font-medium ${
            postStatus.includes("successfully")
              ? "alert-success"
              : postStatus.includes("not a meme") ||
                postStatus.includes("blocked")
              ? "alert-error"
              : "alert-info"
          }`}
        >
          <span>{postStatus}</span>
        </div>
      </div>
    )}
  </div>
);


};