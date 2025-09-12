import { useState, useEffect } from "react";
import axios from "axios";

export default function CreateGroup({ token: propToken, onGroupCreated }) {
  const [groupName, setGroupName] = useState("");
  const [friends, setFriends] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const token = propToken || localStorage.getItem("token");

  // Fetch friends list
  useEffect(() => {
    if (!token) return;

    setLoading(true);
    axios
      .get("http://localhost:5216/api/friendrequest/get/friends", {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => {
        const data = Array.isArray(res.data) ? res.data : [];
        setFriends(data);
        setError("");
      })
      .catch((err) => {
        console.error("Error fetching friends:", err);
        setFriends([]);
        setError("Failed to load friends list. You can still create a group and add members later.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [token]);

  const toggleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const createGroup = async () => {
    if (!token) {
      setError("You must be logged in to create a group.");
      return;
    }

    if (!groupName.trim()) {
      setError("Group name is required.");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      // Changed from /api/chat/create-group to /api/Group/create
      const res = await axios.post(
        "http://localhost:5216/api/Group/create", // Updated endpoint
        {
          name: groupName,
          memberIds: selectedIds,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      console.log("✅ Group created:", res.data);
      setSuccess(`Group "${res.data.name}" created successfully!`);
      setGroupName("");
      setSelectedIds([]);
      
      if (onGroupCreated) {
        onGroupCreated(res.data);
      }
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      console.error("❌ Error creating group:", err);
      if (err.response?.status === 401) {
        setError("Unauthorized. Please log in again.");
      } else if (err.response?.data) {
        setError(`Server error: ${err.response.data}`);
      } else {
        setError("Failed to create group. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-md mx-auto bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Create a Group</h2>
      
      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
          {error}
        </div>
      )}
      
      {success && (
        <div className="mb-4 p-3 bg-green-100 text-green-700 rounded-md">
          {success}
        </div>
      )}
      
      <div className="mb-4">
        <label className="block text-gray-700 mb-2" htmlFor="groupName">
          Group Name *
        </label>
        <input
          id="groupName"
          type="text"
          placeholder="Enter group name"
          value={groupName}
          onChange={(e) => setGroupName(e.target.value)}
          className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        />
      </div>
      
      <div className="mb-6">
        <h3 className="font-semibold text-gray-700 mb-3">
          Add Members (Optional - you can add them later)
        </h3>
        
        {loading ? (
          <p className="text-gray-500">Loading friends...</p>
        ) : friends.length === 0 ? (
          <div className="text-gray-500 text-sm p-3 bg-gray-50 rounded-md">
            <p>No friends available to add right now.</p>
            <p className="mt-1">You can still create the group and add members later.</p>
          </div>
        ) : (
          <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-md p-2">
            {friends.map((friend) => (
              <label key={friend.friendId} className="flex items-center p-2 hover:bg-gray-50 rounded-md">
                <input
                  type="checkbox"
                  checked={selectedIds.includes(friend.friendId)}
                  onChange={() => toggleSelect(friend.friendId)}
                  className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <span className="ml-2 text-gray-700">{friend.friendName}</span>
              </label>
            ))}
          </div>
        )}
      </div>
      
      <div className="flex flex-col gap-3">
        <button
          onClick={createGroup}
          disabled={loading || !groupName.trim()}
          className={`w-full py-3 px-4 rounded-md text-white font-medium
            ${loading || !groupName.trim()
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            }`}
        >
          {loading ? "Creating..." : "Create Group"}
        </button>
        
        <button
          onClick={() => {
            setGroupName("");
            setSelectedIds([]);
            setError("");
          }}
          className="w-full py-2 px-4 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50"
        >
          Clear Form
        </button>
      </div>
      
      {selectedIds.length > 0 && (
        <div className="mt-4 text-sm text-gray-600">
          <span className="font-medium">{selectedIds.length}</span> member{selectedIds.length !== 1 ? 's' : ''} selected
        </div>
      )}
      
      <div className="mt-4 p-3 bg-blue-50 text-blue-700 text-sm rounded-md">
        <p className="font-medium">Note:</p>
        <p>You will automatically be added as a member of the group.</p>
        <p className="mt-1">You can add more members to the group later from the group settings.</p>
      </div>
    </div>
  );
}