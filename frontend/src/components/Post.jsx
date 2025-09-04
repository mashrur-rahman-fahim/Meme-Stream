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
          "❌ This content is not a meme and cannot be posted. Only memes are allowed!"
        );
      } else {
        setPostStatus("✅ Great! This is meme content and can be posted!");
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
      setPostStatus("✅ Post created successfully!");

      // Reset form
      setFormData({ content: "", image: "" });
      setMemeCheckResult(null);
    } catch (error) {
      console.error("Error creating post:", error);
      if (error.response?.data?.error === "Non-meme content detected") {
        setPostStatus("❌ Post blocked: Only meme content is allowed!");
      } else {
        setPostStatus("Error creating post. Please try again.");
      }
    }
  };

  return (
    <div>
      <h2>Create New Meme Post</h2>
      <p>
        <em>Note: Only meme content is allowed on this platform!</em>
      </p>

      <form onSubmit={handleSubmit}>
        <div>
          <label>Content:</label>
          <textarea
            placeholder="Share your best memes here!"
            value={FormData.content}
            onChange={(e) => {
              setFormData({ ...FormData, content: e.target.value });
              setMemeCheckResult(null); // Reset check when content changes
              setPostStatus("");
            }}
            rows="4"
            cols="50"
          />
        </div>

        <div>
          <label>Image URL:</label>
          <input
            type="text"
            placeholder="Image URL (optional)"
            value={FormData.image}
            onChange={(e) =>
              setFormData({ ...FormData, image: e.target.value })
            }
          />
        </div>

        <div>
          <button
            type="button"
            onClick={handleMemeCheck}
            disabled={isCheckingMeme || !FormData.content.trim()}
          >
            {isCheckingMeme ? "Checking..." : "Check if this is a Meme"}
          </button>
        </div>

        <div>
          <button
            type="submit"
            disabled={!memeCheckResult || !memeCheckResult.isMeme}
          >
            Create Post (Memes Only)
          </button>
        </div>
      </form>

      {postStatus && (
        <div>
          <h3>Status:</h3>
          <p>{postStatus}</p>
        </div>
      )}

      {memeCheckResult && (
        <div>
          <h3>Meme Detection Results:</h3>
          <p>
            <strong>Is Meme:</strong> {memeCheckResult.isMeme ? "Yes" : "No"}
          </p>
          <p>
            <strong>Can Post:</strong> {memeCheckResult.canPost ? "Yes" : "No"}
          </p>
          <p>
            <strong>Message:</strong> {memeCheckResult.message}
          </p>

          {memeCheckResult.analysis && (
            <div>
              <h4>Detailed Analysis:</h4>
              <p>
                <strong>Meme Probability:</strong>{" "}
                {(memeCheckResult.analysis.memeProbability * 100).toFixed(1)}%
              </p>
              <p>
                <strong>Humor Score:</strong>{" "}
                {memeCheckResult.analysis.humorScore}/10
              </p>
              <p>
                <strong>Sentiment:</strong> {memeCheckResult.analysis.sentiment}
              </p>
              <p>
                <strong>Language:</strong>{" "}
                {memeCheckResult.analysis.detectedLanguage}
              </p>

              {memeCheckResult.analysis.memeReferences &&
                memeCheckResult.analysis.memeReferences.length > 0 && (
                  <div>
                    <strong>Meme References:</strong>
                    <ul>
                      {memeCheckResult.analysis.memeReferences.map(
                        (ref, index) => (
                          <li key={index}>{ref}</li>
                        )
                      )}
                    </ul>
                  </div>
                )}

              {memeCheckResult.analysis.keywords &&
                memeCheckResult.analysis.keywords.length > 0 && (
                  <div>
                    <strong>Keywords:</strong>{" "}
                    {memeCheckResult.analysis.keywords.join(", ")}
                  </div>
                )}

              {memeCheckResult.analysis.analysis && (
                <div>
                  <strong>Analysis:</strong>
                  <p>{memeCheckResult.analysis.analysis}</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
