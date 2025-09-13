import { useParams } from "react-router-dom";
import ChatWindow from "../components/Chat/ChatWindow";
import { jwtDecode } from "jwt-decode";

const GroupChatPage = ({ groupId, embedded = false }) => {
  const params = useParams();
  const token = localStorage.getItem("token");
  
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

  return (
    <div className={embedded ? "h-full" : "p-4"}>
      {!embedded && <h2 className="text-xl font-bold mb-4">Group Chat</h2>}
      <ChatWindow
        token={token}
        groupName={`group-${targetGroupId}`}
        currentUserId={currentUserId}
      />
    </div>
  );
};

export default GroupChatPage;