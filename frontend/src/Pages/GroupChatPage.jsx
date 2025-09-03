import { useParams } from "react-router-dom";
import ChatWindow from "../components/ChatWindow";

const GroupChatPage = () => {
  const { groupId } = useParams();
  const token = localStorage.getItem("token");

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Group Chat</h2>
      <ChatWindow token={token} groupName={`group-${groupId}`} />
    </div>
  );
};

export default GroupChatPage;
