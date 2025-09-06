import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";

const ChatSidebar = () => {
  const [friends, setFriends] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const token = localStorage.getItem("token");

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch friends
        const friendsRes = await axios.get("http://localhost:5216/api/friendrequest/get/friends", {
          headers: { Authorization: `Bearer ${token}` },
        });
        
        // Transform friends data to match expected format
        const formattedFriends = friendsRes.data.map(friend => ({
          id: friend.friendId || friend.FriendId,
          name: friend.friendName || friend.FriendName
        }));
        setFriends(formattedFriends);
        
        // Fetch groups
        const groupsRes = await axios.get("http://localhost:5216/api/chat/my-groups", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setGroups(groupsRes.data);
        
      } catch (err) {
        console.error("Error fetching chat data:", err);
        setError("Failed to load chat data");
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      fetchData();
    }
  }, [token]);

  if (loading) {
    return (
      <div className="w-64 bg-base-200 p-4 border-r border-base-300 h-screen overflow-y-auto">
        <h2 className="text-lg font-bold mb-4">Chats</h2>
        <div className="flex justify-center items-center h-32">
          <span className="loading loading-spinner loading-md"></span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-64 bg-base-200 p-4 border-r border-base-300 h-screen overflow-y-auto">
        <h2 className="text-lg font-bold mb-4">Chats</h2>
        <div className="alert alert-error">
          <span>{error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-64 bg-base-200 p-4 border-r border-base-300 h-screen overflow-y-auto">
      <h2 className="text-lg font-bold mb-4">Chats</h2>

      <div className="mb-6">
        <h3 className="text-sm font-semibold mb-2">Friends ({friends.length})</h3>
        {friends.length === 0 ? (
          <p className="text-sm text-gray-500">No friends yet</p>
        ) : (
          friends.map((friend) => (
            <Link
              key={friend.id}
              to={`/chat/private/${friend.id}`}
              className="block p-2 rounded hover:bg-base-300 mb-1 w-full text-left transition-colors"
            >
              <div className="flex items-center">
                <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white text-sm mr-2">
                  {friend.name.charAt(0).toUpperCase()}
                </div>
                <span className="truncate">{friend.name}</span>
              </div>
            </Link>
          ))
        )}
      </div>

      <div className="mb-6">
        <h3 className="text-sm font-semibold mb-2">Groups ({groups.length})</h3>
        {groups.length === 0 ? (
          <p className="text-sm text-gray-500">No groups yet</p>
        ) : (
          groups.map((group) => (
            <Link
              key={group.id}
              to={`/chat/group/${group.id}`}
              className="block p-2 rounded hover:bg-base-300 mb-1 w-full text-left transition-colors"
            >
              <div className="flex items-center">
                <div className="w-8 h-8 bg-secondary rounded-full flex items-center justify-center text-white text-sm mr-2">
                  {group.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <span className="truncate block">{group.name}</span>
                  <span className="text-xs text-gray-500">
                    {group.memberCount} member{group.memberCount !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>
            </Link>
          ))
        )}
      </div>

      <Link 
        to="/groups/create" 
        className="btn btn-primary btn-sm w-full mb-4"
      >
        + Create Group
      </Link>
    </div>
  );
};

export default ChatSidebar;