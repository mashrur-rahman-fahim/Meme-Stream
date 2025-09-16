import React, { useContext, useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { VerifyContext } from "../../context/create_verify_context";
import { Navbar } from "../components/Navbar";
import ChatWindow from "../components/Chat/ChatWindow";
import { jwtDecode } from "jwt-decode";

const GroupChatPage = ({ groupId, embedded = false }) => {
  const { isVerified, loading, logout } = useContext(VerifyContext);
  const navigate = useNavigate();
  const params = useParams();
  const [pageReady, setPageReady] = useState(false);
  const token = localStorage.getItem("token");

  useEffect(() => {
    if (isVerified === false && !loading) {
      navigate("/auth");
    } else if (isVerified === true && !pageReady) {
      setTimeout(() => setPageReady(true), 100);
    }
  }, [isVerified, navigate, loading, pageReady]);
  
  // Use the groupId prop if provided (from ChatLayout), otherwise use the URL param
  const targetGroupId = groupId || params.groupId;

  let currentUserId = null;
  if (token) {
    try {
      const decoded = jwtDecode(token);
      currentUserId = parseInt(
        decoded["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier"]
      );
    } catch (err) {
      console.error("JWT decode failed:", err);
    }
  }

  if (loading || isVerified === null || (isVerified === true && !pageReady)) {
    return (
      <div className="min-h-screen bg-base-200 flex items-center justify-center">
        <div className="text-center">
          <span className="loading loading-spinner loading-md sm:loading-lg text-primary"></span>
          <p className="mt-3 sm:mt-4 text-sm sm:text-base text-base-content">Loading...</p>
        </div>
      </div>
    );
  }

  if (isVerified === false) {
    return null;
  }

  return (
    <div className={embedded ? "h-full" : "min-h-screen bg-base-200 animate-fadeIn"}>
      {!embedded && <Navbar />}

      <div className={embedded ? "h-full" : "pt-16 sm:pt-18 md:pt-20 pb-3 sm:pb-4"}>
        <div className="max-w-6xl mx-auto px-2 sm:px-4 lg:px-6">
          {!embedded && <h2 className="text-lg sm:text-xl md:text-2xl font-bold mb-3 sm:mb-4 px-1 sm:px-2">Group Chat</h2>}
          <ChatWindow
            token={token}
            groupName={`group-${targetGroupId}`}
            currentUserId={currentUserId}
          />
        </div>
      </div>
    </div>
  );
};

export default GroupChatPage;