import { useState, useEffect } from "react";
import axios from "axios";

export default function GroupManager({ group, token, onBack, onGroupUpdate }) {
  const [groupDetails, setGroupDetails] = useState(null);
  const [nonMembers, setNonMembers] = useState([]);
  const [selectedUser, setSelectedUser] = useState("");
  const [editMode, setEditMode] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [groupDescription, setGroupDescription] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    fetchGroupDetails();
    if (groupDetails?.isAdmin || groupDetails?.isCoAdmin) {
      fetchNonMembers();
    }
  }, [group.id]);

  const fetchGroupDetails = async () => {
    try {
      setLoading(true);
      const response = await axios.get(
        `http://localhost:5216/api/chat/group/${group.id}/details`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setGroupDetails(response.data);
      setGroupName(response.data.name);
      setGroupDescription(response.data.description || "");
      setError("");
    } catch (err) {
      console.error("Error fetching group details:", err);
      setError("Failed to load group details");
    } finally {
      setLoading(false);
    }
  };

  const fetchNonMembers = async () => {
    try {
      const response = await axios.get(
        `http://localhost:5216/api/chat/group/${group.id}/non-members`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setNonMembers(response.data);
    } catch (err) {
      console.error("Error fetching non-members:", err);
    }
  };

  const addUserToGroup = async (userId) => {
    try {
      setActionLoading(true);
      setError("");
      setSuccess("");
      
      const response = await axios.post(
        `http://localhost:5216/api/chat/group/${group.id}/add`,
        userId,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
          }
        }
      );
      
      setSuccess("User added successfully");
      setSelectedUser("");
      fetchGroupDetails();
      fetchNonMembers();
      
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      console.error("Error adding user:", err);
      setError(err.response?.data || "Failed to add user");
    } finally {
      setActionLoading(false);
    }
  };

  const removeUserFromGroup = async (userId) => {
    if (!window.confirm("Are you sure you want to remove this user from the group?")) {
      return;
    }

    try {
      setActionLoading(true);
      setError("");
      setSuccess("");
      
      const response = await axios.delete(
        `http://localhost:5216/api/chat/group/${group.id}/remove/${userId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setSuccess("User removed successfully");
      fetchGroupDetails();
      fetchNonMembers();
      
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      console.error("Error removing user:", err);
      setError(err.response?.data || "Failed to remove user");
    } finally {
      setActionLoading(false);
    }
  };

  const leaveGroup = async () => {
    if (!window.confirm("Are you sure you want to leave this group?")) {
      return;
    }

    try {
      setActionLoading(true);
      setError("");
      setSuccess("");
      
      const userId = JSON.parse(atob(token.split('.')[1]))["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier"];
      
      const response = await axios.delete(
        `http://localhost:5216/api/chat/group/${group.id}/remove/${userId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setSuccess("You have left the group");
      setTimeout(() => {
        onBack();
        onGroupUpdate();
      }, 2000);
    } catch (err) {
      console.error("Error leaving group:", err);
      setError(err.response?.data || "Failed to leave group");
    } finally {
      setActionLoading(false);
    }
  };

  const updateGroup = async () => {
    try {
      setActionLoading(true);
      setError("");
      setSuccess("");
      
      const response = await axios.put(
        `http://localhost:5216/api/chat/group/${group.id}`,
        {
          name: groupName,
          description: groupDescription
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
          }
        }
      );
      
      setSuccess("Group updated successfully");
      setEditMode(false);
      fetchGroupDetails();
      onGroupUpdate();
      
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      console.error("Error updating group:", err);
      setError(err.response?.data || "Failed to update group");
    } finally {
      setActionLoading(false);
    }
  };

  const promoteToCoAdmin = async (userId) => {
    try {
      setActionLoading(true);
      setError("");
      setSuccess("");
      
      const response = await axios.post(
        `http://localhost:5216/api/chat/group/${group.id}/promote/${userId}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setSuccess("User promoted to co-admin");
      fetchGroupDetails();
      
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      console.error("Error promoting user:", err);
      setError(err.response?.data || "Failed to promote user");
    } finally {
      setActionLoading(false);
    }
  };

  const demoteFromCoAdmin = async (userId) => {
    try {
      setActionLoading(true);
      setError("");
      setSuccess("");
      
      const response = await axios.post(
        `http://localhost:5216/api/chat/group/${group.id}/demote/${userId}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setSuccess("User demoted from co-admin");
      fetchGroupDetails();
      
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      console.error("Error demoting user:", err);
      setError(err.response?.data || "Failed to demote user");
    } finally {
      setActionLoading(false);
    }
  };

  const transferAdmin = async (userId) => {
    if (!window.confirm("Are you sure you want to transfer admin rights to this user? This action cannot be undone.")) {
      return;
    }

    try {
      setActionLoading(true);
      setError("");
      setSuccess("");
      
      const response = await axios.post(
        `http://localhost:5216/api/chat/group/${group.id}/transfer-admin/${userId}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setSuccess("Admin rights transferred successfully");
      setTimeout(() => {
        onBack();
        onGroupUpdate();
      }, 2000);
    } catch (err) {
      console.error("Error transferring admin:", err);
      setError(err.response?.data || "Failed to transfer admin rights");
    } finally {
      setActionLoading(false);
    }
  };

  const deleteGroup = async () => {
    if (!window.confirm("Are you sure you want to delete this group? This action cannot be undone.")) {
      return;
    }

    try {
      setActionLoading(true);
      setError("");
      setSuccess("");
      
      const response = await axios.delete(
        `http://localhost:5216/api/chat/group/${group.id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setSuccess("Group deleted successfully");
      setTimeout(() => {
        onBack();
        onGroupUpdate();
      }, 2000);
    } catch (err) {
      console.error("Error deleting group:", err);
      setError(err.response?.data || "Failed to delete group");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 max-w-4xl mx-auto bg-white rounded-lg shadow-md">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading group details...</p>
        </div>
      </div>
    );
  }

  if (!groupDetails) {
    return (
      <div className="p-6 max-w-4xl mx-auto bg-white rounded-lg shadow-md">
        <div className="text-center py-8">
          <p className="text-red-600">Failed to load group details</p>
          <button
            onClick={onBack}
            className="mt-4 px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
          >
            Back to Groups
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto bg-white rounded-lg shadow-md">
      <div className="flex items-center mb-6">
        <button
          onClick={onBack}
          className="mr-4 p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md"
        >
          ← Back
        </button>
        <h2 className="text-2xl font-bold text-gray-800">Manage Group: {groupDetails.name}</h2>
      </div>
      
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
      
      {/* Group Info Section */}
      <div className="mb-6 p-4 bg-gray-50 rounded-md">
        {editMode ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Group Name</label>
              <input
                type="text"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={groupDescription}
                onChange={(e) => setGroupDescription(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md"
                rows="3"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={updateGroup}
                disabled={actionLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                Save Changes
              </button>
              <button
                onClick={() => setEditMode(false)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div>
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-semibold">{groupDetails.name}</h3>
                {groupDetails.description && (
                  <p className="text-gray-600 mt-1">{groupDetails.description}</p>
                )}
                <p className="text-sm text-gray-500 mt-2">
                  Created by {groupDetails.createdBy.name}
                </p>
              </div>
              <button
                onClick={() => setEditMode(true)}
                className="px-3 py-1 bg-gray-200 text-gray-700 text-sm rounded-md hover:bg-gray-300"
              >
                Edit
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Current Members */}
        <div>
          <h3 className="text-lg font-semibold mb-4 text-gray-800">Current Members</h3>
          <div className="border border-gray-200 rounded-md divide-y">
            {groupDetails.members.map((member) => (
              <div key={member.id} className="p-3 flex justify-between items-center">
                <div>
                  <span className="font-medium">{member.name}</span>
                  <div className="flex gap-1 mt-1">
                    {member.isAdmin && (
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                        Admin
                      </span>
                    )}
                    {member.isCoAdmin && (
                      <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                        Co-Admin
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  {groupDetails.isAdmin && !member.isAdmin && (
                    <>
                      {member.isCoAdmin ? (
                        <button
                          onClick={() => demoteFromCoAdmin(member.id)}
                          disabled={actionLoading}
                          className="px-2 py-1 bg-yellow-100 text-yellow-800 text-sm rounded-md hover:bg-yellow-200 disabled:opacity-50"
                          title="Demote from Co-Admin"
                        >
                          Demote
                        </button>
                      ) : (
                        <button
                          onClick={() => promoteToCoAdmin(member.id)}
                          disabled={actionLoading}
                          className="px-2 py-1 bg-green-100 text-green-800 text-sm rounded-md hover:bg-green-200 disabled:opacity-50"
                          title="Promote to Co-Admin"
                        >
                          Promote
                        </button>
                      )}
                    </>
                  )}
                  {groupDetails.isAdmin && member.isAdmin && (
                    <button
                      onClick={() => transferAdmin(member.id)}
                      disabled={actionLoading}
                      className="px-2 py-1 bg-purple-100 text-purple-800 text-sm rounded-md hover:bg-purple-200 disabled:opacity-50"
                      title="Transfer Admin Rights"
                    >
                      Transfer Admin
                    </button>
                  )}
                  {(groupDetails.isAdmin || groupDetails.isCoAdmin) && !member.isAdmin && (
                    <button
                      onClick={() => removeUserFromGroup(member.id)}
                      disabled={actionLoading}
                      className="px-2 py-1 bg-red-100 text-red-700 text-sm rounded-md hover:bg-red-200 disabled:opacity-50"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* Admin Actions */}
        <div className="space-y-6">
          {/* Add Members */}
          {(groupDetails.isAdmin || groupDetails.isCoAdmin) && (
            <div>
              <h3 className="text-lg font-semibold mb-4 text-gray-800">Add New Members</h3>
              <div className="mb-4">
                <select
                  value={selectedUser}
                  onChange={(e) => setSelectedUser(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md"
                  disabled={nonMembers.length === 0 || actionLoading}
                >
                  <option value="">Select a user to add</option>
                  {nonMembers.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name} (ID: {user.id})
                    </option>
                  ))}
                </select>
                {nonMembers.length === 0 && (
                  <p className="mt-2 text-sm text-gray-500">No users available to add</p>
                )}
              </div>
              
              <button
                onClick={() => addUserToGroup(parseInt(selectedUser))}
                disabled={!selectedUser || actionLoading}
                className="w-full py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {actionLoading ? "Adding..." : "Add to Group"}
              </button>
            </div>
          )}

          {/* Leave/Delete Group */}
          <div className="p-4 bg-gray-50 rounded-md">
            <h3 className="text-lg font-semibold mb-3 text-gray-800">Group Actions</h3>
            
            <button
              onClick={leaveGroup}
              disabled={actionLoading}
              className="w-full mb-3 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 disabled:opacity-50"
            >
              Leave Group
            </button>
            
            {groupDetails.isAdmin && (
              <button
                onClick={deleteGroup}
                disabled={actionLoading}
                className="w-full py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
              >
                Delete Group
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}