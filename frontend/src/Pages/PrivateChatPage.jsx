import { useParams } from "react-router-dom";
import ChatWindow from "../components/ChatWindow";
import { jwtDecode } from "jwt-decode";

const PrivateChatPage = () => {
  const { userId } = useParams();
  const token = localStorage.getItem("token");

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

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Private Chat</h2>
      <ChatWindow
        token={token}
        receiverId={userId}
        currentUserId={currentUserId} // ✅ Add this line
      />
    </div>
  );
};

export default PrivateChatPage;
