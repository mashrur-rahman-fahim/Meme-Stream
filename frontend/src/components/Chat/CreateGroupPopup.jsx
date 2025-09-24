import { useState, useEffect } from "react";
import axios from "axios";
import { getApiBaseUrl } from "../../utils/api-config"; 

export default function CreateGroupPopup({ token: propToken, onGroupCreated, onClose }) {
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
      .get(`${getApiBaseUrl()}/friendrequest/get/friends`, {
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
      const res = await axios.post(
        `${getApiBaseUrl()}/Group/create`,
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
      
      // Clear success message after 3 seconds and close popup
      setTimeout(() => {
        setSuccess("");
        onClose();
      }, 3000);
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
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-hidden">
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-white">Create Group</h2>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-gray-800 hover:bg-gray-700 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          {/* Error/Success Messages */}
          {error && (
            <div className="mb-4 p-3 bg-red-900/50 border border-red-800 text-red-300 rounded-lg text-sm">
              {error}
            </div>
          )}
          
          {success && (
            <div className="mb-4 p-3 bg-green-900/50 border border-green-800 text-green-300 rounded-lg text-sm">
              {success}
            </div>
          )}
          
          {/* Group Name Input */}
          <div className="mb-6">
            <label className="block text-gray-300 mb-2 text-sm font-medium" htmlFor="groupName">
              Group Name
            </label>
            <input
              id="groupName"
              type="text"
              placeholder="Enter group name"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              required
            />
          </div>
          
          {/* Members Section */}
          <div className="mb-6">
            <h3 className="font-medium text-gray-300 mb-3 text-sm">
              Add Members <span className="text-gray-500">(Optional)</span>
            </h3>
            
            {loading ? (
              <div className="flex items-center gap-2 text-gray-400 text-sm p-3">
                <div className="w-4 h-4 border-2 border-gray-600 border-t-blue-500 rounded-full animate-spin"></div>
                Loading friends...
              </div>
            ) : friends.length === 0 ? (
              <div className="text-gray-400 text-sm p-3 bg-gray-800/50 rounded-lg border border-gray-700">
                <p>No friends available right now.</p>
                <p className="mt-1 text-gray-500">You can add members after creating the group.</p>
              </div>
            ) : (
              <div className="max-h-48 overflow-y-auto bg-gray-800/50 border border-gray-700 rounded-lg">
                {friends.map((friend) => (
                  <label key={friend.friendId} className="flex items-center p-3 hover:bg-gray-700/50 cursor-pointer transition-colors border-b border-gray-700 last:border-b-0">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(friend.friendId)}
                      onChange={() => toggleSelect(friend.friendId)}
                      className="h-4 w-4 text-blue-500 bg-gray-700 border-gray-600 rounded focus:ring-blue-500 focus:ring-2"
                    />
                    <span className="ml-3 text-gray-300 text-sm">{friend.friendName}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
          
          {/* Selected Count */}
          {selectedIds.length > 0 && (
            <div className="mb-4 text-xs text-gray-400 flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span>{selectedIds.length} member{selectedIds.length !== 1 ? 's' : ''} selected</span>
            </div>
          )}
          
          {/* Action Buttons */}
          <div className="flex flex-col gap-3">
            <button
              onClick={createGroup}
              disabled={loading || !groupName.trim()}
              className={`w-full py-3 px-4 rounded-lg font-medium transition-all relative overflow-hidden
                ${loading || !groupName.trim()
                  ? "bg-gray-700 text-gray-400 cursor-not-allowed"
                  : "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white shadow-lg hover:shadow-xl transform hover:scale-[1.02]"
                }`}
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-gray-400 border-t-white rounded-full animate-spin"></div>
                  Creating...
                </div>
              ) : (
                "Create Group"
              )}
            </button>
            
            <button
              onClick={() => {
                setGroupName("");
                setSelectedIds([]);
                setError("");
              }}
              className="w-full py-2 px-4 rounded-lg border border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
            >
              Clear Form
            </button>
          </div>
          
          {/* Info Note */}
          <div className="mt-4 p-3 bg-blue-900/20 border border-blue-800/30 text-blue-300 text-xs rounded-lg">
            <div className="flex items-start gap-2">
              <svg className="w-3 h-3 mt-0.5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <div>
                <p className="font-medium">You'll be added automatically</p>
                <p className="mt-1 text-blue-400/80">Invite more members anytime from group settings</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}