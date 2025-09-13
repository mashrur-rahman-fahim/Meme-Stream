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
    if (!FormData.content.trim() && !FormData.image.trim()) {
      setPostStatus("Bruh, at least give me something to work with! 🤷‍♂️");
      return;
    }

    setIsCheckingMeme(true);
    setPostStatus("Running the meme detector... *robot noises* 🤖");

    try {
      const response = await api.post("/Post/check-meme", FormData, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      setMemeCheckResult(response.data);

      // Update status with analysis mode information
      const analysisMode = response.data.analysisMode || "unknown";
      const analysisTypeText = {
        text: "📝 Text Analysis",
        image: "🖼️ Image Analysis", 
        combined: "🎯 Combined Analysis",
        none: "❌ No Analysis",
        unknown: "❓ Analysis"
      }[analysisMode] || "❓ Analysis";

      if (!response.data.isMeme) {
        setPostStatus(
          `${analysisTypeText}: ${response.data.message || "That's not it, chief! This ain't meme-worthy content 😬"}`
        );
      } else {
        setPostStatus(
          `${analysisTypeText}: ${response.data.message || "YESSS! 🔥 This is prime meme material, ready to go viral!"}`
        );
      }
    } catch (error) {
      console.error("Error checking meme:", error);
      setPostStatus("Oops! The meme detector had a brain fart. Try again? 🤔");
      setMemeCheckResult(null);
    } finally {
      setIsCheckingMeme(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!memeCheckResult || !memeCheckResult.isMeme) {
      setPostStatus("Hold up! Make sure your content passes the vibe check first! ✋");
      return;
    }

    try {
      setPostStatus("Uploading your masterpiece to the meme verse... 🚀");
      const response = await api.post("/Post/create", FormData, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      console.log("Post created:", response.data);
      setPostStatus("BOOM! 💥 Your meme is live and ready to break the internet!");

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
        const analysisMode = error.response?.data?.analysisMode || "unknown";
        const analysisTypeText = {
          text: "📝 Text",
          image: "🖼️ Image", 
          combined: "🎯 Combined",
          unknown: "❓"
        }[analysisMode] || "❓";
        
        setPostStatus(`Post rejected! (${analysisTypeText} Analysis): Only fire memes allowed here! 🚫🔥`);
      } else {
        setPostStatus("Uh oh! Something went wrong. Even the memes are having tech issues 😅");
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
      Time to Cook Up Some Fire Content 🔥
    </h2>

    {/* Meme Content */}
    <div>
      <label className="block text-sm font-medium text-base-content mb-1">
        Your Legendary Content ✨
      </label>
      <textarea
        className="textarea textarea-bordered w-full min-h-[6rem] sm:min-h-[7rem] resize-none text-base p-3"
        placeholder="Drop your spiciest meme or roast the day away... 🔥"
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
        Add Visual Chaos (optional) 🎨
      </label>
      <ImageUpload
        onImageUpload={handleImageUpload}
        currentImageUrl={FormData.image}
        onImageRemove={handleImageRemove}
      />
      {uploadedImageData && (
        <div className="mt-2 text-xs text-base-content/60">
          <p>✅ Visual locked and loaded: {uploadedImageData.originalName}</p>
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
          disabled={isCheckingMeme || (!FormData.content.trim() && !FormData.image.trim())}
          className={`btn w-full text-base sm:text-lg font-semibold transition-all duration-200 ${
            isCheckingMeme || (!FormData.content.trim() && !FormData.image.trim())
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
            "Check the Vibe ✨"
          )}
        </button>
        {(!FormData.content.trim() && !FormData.image.trim()) && (
          <p className="text-sm text-base-content/60 pl-1">
            ✍️ Need some content first before we can verify the vibes!
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
          Drop the Fire 🚀
        </button>
        {(!memeCheckResult || !memeCheckResult.isMeme) && (
          <p className="text-sm text-base-content/60 pl-1">
            ✅ Get the vibe check approval first, then you can drop that fire!
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