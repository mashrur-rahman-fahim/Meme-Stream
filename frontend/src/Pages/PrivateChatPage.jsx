import { useParams } from "react-router-dom";
import ChatWindow from "../components/ChatWindow";

const PrivateChatPage = () => {
  const { userId } = useParams();
  const token = localStorage.getItem("token");

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Private Chat</h2>
      <ChatWindow token={token} receiverId={userId} />
    </div>
  );
};

export default PrivateChatPage;
