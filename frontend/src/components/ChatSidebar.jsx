import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";

const ChatSidebar = () => {
  const [friends, setFriends] = useState([]);
  const [groups, setGroups] = useState([]);
  const token = localStorage.getItem("token");

  useEffect(() => {
    const fetchFriends = async () => {
      const res = await axios.get("http://localhost:5216/api/friends", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setFriends(res.data);
    };

    const fetchGroups = async () => {
      const res = await axios.get("http://localhost:5216/api/chat/mygroups", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setGroups(res.data);
    };

    fetchFriends();
    fetchGroups();
  }, []);

  return (
    <div className="w-64 bg-base-200 p-4 border-r border-base-300 h-screen overflow-y-auto">
      <h2 className="text-lg font-bold mb-4">Chats</h2>

      <div className="mb-6">
        <h3 className="text-sm font-semibold mb-2">Friends</h3>
        {friends.map((friend) => (
          <Link
            key={friend.id}
            to={`/chat/private/${friend.id}`}
            className="block btn btn-sm btn-outline mb-1 w-full text-left"
          >
            {friend.name}
          </Link>
        ))}
      </div>

      <div className="mb-6">
        <h3 className="text-sm font-semibold mb-2">Groups</h3>
        {groups.map((group) => (
          <Link
            key={group.id}
            to={`/chat/group/${group.id}`}
            className="block btn btn-sm btn-outline mb-1 w-full text-left"
          >
            {group.name}
          </Link>
        ))}
      </div>

      <Link to="/chat/group/create" className="btn btn-primary btn-sm w-full">
        + Create Group
      </Link>
    </div>
  );
};

export default ChatSidebar;
