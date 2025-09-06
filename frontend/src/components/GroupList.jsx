import { useState, useEffect } from "react";
import axios from "axios";
import GroupManager from "./GroupManager";

export default function GroupList({ token: propToken }) {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedGroup, setSelectedGroup] = useState(null);

  const token = propToken || localStorage.getItem("token");

  useEffect(() => {
    fetchGroups();
  }, [token]);

  const fetchGroups = async () => {
    if (!token) return;

    try {
      setLoading(true);
      const response = await axios.get("http://localhost:5216/api/chat/my-groups", {
        headers: { Authorization: `Bearer ${token}` }
      });
      setGroups(response.data);
      setError("");
    } catch (err) {
      console.error("Error fetching groups:", err);
      setError("Failed to load groups");
    } finally {
      setLoading(false);
    }
  };

  const handleGroupSelect = (group) => {
    setSelectedGroup(group);
  };

  const handleBackToList = () => {
    setSelectedGroup(null);
    fetchGroups();
  };

  if (selectedGroup) {
    return (
      <GroupManager 
        group={selectedGroup} 
        token={token} 
        onBack={handleBackToList}
        onGroupUpdate={fetchGroups}
      />
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">My Groups</h2>
      
      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
          {error}
        </div>
      )}
      
      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading groups...</p>
        </div>
      ) : groups.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 rounded-md">
          <p className="text-gray-600">You are not a member of any groups yet.</p>
          <p className="mt-2 text-sm text-gray-500">Create a group to get started!</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {groups.map((group) => (
            <div
              key={group.id}
              className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => handleGroupSelect(group)}
            >
              <div className="flex justify-between items-start">
                <h3 className="text-lg font-semibold text-gray-800">{group.name}</h3>
                <div className="flex gap-1">
                  {group.isAdmin && (
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                      Admin
                    </span>
                  )}
                  {group.isCoAdmin && (
                    <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                      Co-Admin
                    </span>
                  )}
                </div>
              </div>
              
              <div className="mt-2 text-sm text-gray-600">
                <p>{group.memberCount} member{group.memberCount !== 1 ? 's' : ''}</p>
              </div>
              
              <div className="mt-3">
                <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                  Manage Group →
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}