import React, { useState, useEffect } from "react";
import axios from "axios";
import { getApiBaseUrl } from "../../utils/api-config"; 

const GroupManagementSidebar = ({ group, token, onClose, onGroupUpdate }) => {
  const [groupDetails, setGroupDetails] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [groupDescription, setGroupDescription] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [allFriends, setAllFriends] = useState([]);

  // Get API base URL
  const API_BASE_URL = getApiBaseUrl();

  useEffect(() => {
    if (group) {
      fetchGroupDetails();
      fetchAllFriends();
    }
  }, [group]);

  const fetchGroupDetails = async () => {
    try {
      setLoading(true);
      const response = await axios.get(
        `${API_BASE_URL}/Group/${group.id}/details`,
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

  const fetchAllFriends = async () => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/friendrequest/get/friends`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      
      const friends = response.data.map(friend => ({
        Id: friend.friendId || friend.FriendId,
        Name: friend.friendName || friend.FriendName,
        Email: friend.friendEmail || friend.FriendEmail,
        Image: friend.friendImage || friend.FriendImage,
        FriendshipStatus: "Friend"
      }));
      
      setAllFriends(friends);
    } catch (err) {
      console.error("Error fetching friends:", err);
    }
  };

  const addUserToGroup = async (userId) => {
    try {
      setActionLoading(true);
      setError("");
      setSuccess("");
      
      const response = await axios.post(
        `${API_BASE_URL}/GroupMembership/group/${group.id}/add`,
        userId,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
          }
        }
      );
      
      setSuccess("User added successfully");
      fetchGroupDetails();
      fetchAllFriends();
      
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      console.error("Error adding user:", err);
      setError(err.response?.data || "Failed to add user");
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddClick = (user, e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    addUserToGroup(user.Id);
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
        `${API_BASE_URL}/GroupMembership/group/${group.id}/remove/${userId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setSuccess("User removed successfully");
      fetchGroupDetails();
      
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
        `${API_BASE_URL}/GroupMembership/group/${group.id}/remove/${userId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setSuccess("You have left the group");
      setTimeout(() => {
        onClose();
        if (onGroupUpdate) onGroupUpdate();
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
        `${API_BASE_URL}/Group/${group.id}`,
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
      if (onGroupUpdate) onGroupUpdate();
      
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
        `${API_BASE_URL}/GroupMembership/group/${group.id}/promote/${userId}`,
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
        `${API_BASE_URL}/GroupMembership/group/${group.id}/demote/${userId}`,
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
        `${API_BASE_URL}/GroupMembership/group/${group.id}/transfer-admin/${userId}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setSuccess("Admin rights transferred successfully");
      setTimeout(() => {
        onClose();
        if (onGroupUpdate) onGroupUpdate();
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
        `${API_BASE_URL}/Group/${group.id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setSuccess("Group deleted successfully");
      setTimeout(() => {
        onClose();
        if (onGroupUpdate) onGroupUpdate();
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
      <div className="w-80 bg-base-100 p-4 border-l border-base-300 h-screen overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold">Group Management</h2>
          <button onClick={onClose} className="btn btn-ghost btn-sm">✕</button>
        </div>
        <div className="text-center py-8">
          <span className="loading loading-spinner loading-md"></span>
          <p className="mt-2 text-gray-600">Loading group details...</p>
        </div>
      </div>
    );
  }

  if (!groupDetails) {
    return (
      <div className="w-80 bg-base-100 p-4 border-l border-base-300 h-screen overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold">Group Management</h2>
          <button onClick={onClose} className="btn btn-ghost btn-sm">✕</button>
        </div>
        <div className="text-center py-8">
          <p className="text-error">Failed to load group details</p>
        </div>
      </div>
    );
  }

  // Filter out friends who are already in the group
  const currentMemberIds = groupDetails?.members.map(m => m.id) || [];
  const availableFriends = allFriends.filter(user => 
    !currentMemberIds.includes(user.Id)
  );

  return (
    <div className="w-80 bg-base-100 p-4 border-l border-base-300 h-screen overflow-y-auto">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-bold">Group Management</h2>
        <button onClick={onClose} className="btn btn-ghost btn-sm">✕</button>
      </div>
      
      {error && (
        <div className="alert alert-error mb-4">
          {error}
        </div>
      )}
      
      {success && (
        <div className="alert alert-success mb-4">
          {success}
        </div>
      )}
      
      {/* Group Info Section */}
      <div className="mb-6 p-4 bg-base-200 rounded-md">
        {editMode ? (
          <div className="space-y-4">
            <div>
              <label className="label">Group Name</label>
              <input
                type="text"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                className="input input-bordered w-full"
              />
            </div>
            <div>
              <label className="label">Description</label>
              <textarea
                value={groupDescription}
                onChange={(e) => setGroupDescription(e.target.value)}
                className="textarea textarea-bordered w-full"
                rows="3"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={updateGroup}
                disabled={actionLoading}
                className="btn btn-primary btn-sm"
              >
                Save Changes
              </button>
              <button
                onClick={() => setEditMode(false)}
                className="btn btn-ghost btn-sm"
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
              {(groupDetails.isAdmin || groupDetails.isCoAdmin) && (
                <button
                  onClick={() => setEditMode(true)}
                  className="btn btn-ghost btn-sm"
                >
                  Edit
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Current Members */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-4">Current Members ({groupDetails.members.length})</h3>
        <div className="border border-base-300 rounded-md divide-y max-h-96 overflow-y-auto">
          {groupDetails.members.map((member) => (
            <div key={member.id} className="p-3 flex justify-between items-center">
              <div>
                <span className="font-medium">{member.name}</span>
                <div className="flex gap-1 mt-1">
                  {member.isAdmin && (
                    <span className="badge badge-primary badge-sm">
                      Admin
                    </span>
                  )}
                  {member.isCoAdmin && (
                    <span className="badge badge-secondary badge-sm">
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
                        className="btn btn-warning btn-xs"
                        title="Demote from Co-Admin"
                      >
                        Demote
                      </button>
                    ) : (
                      <button
                        onClick={() => promoteToCoAdmin(member.id)}
                        disabled={actionLoading}
                        className="btn btn-success btn-xs"
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
                    className="btn btn-info btn-xs"
                    title="Transfer Admin Rights"
                  >
                    Transfer Admin
                  </button>
                )}
                {(groupDetails.isAdmin || groupDetails.isCoAdmin) && !member.isAdmin && (
                  <button
                    onClick={() => removeUserFromGroup(member.id)}
                    disabled={actionLoading}
                    className="btn btn-error btn-xs"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Add Members */}
      {(groupDetails.isAdmin || groupDetails.isCoAdmin) && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-4">Add Friends to Group</h3>
          
          {availableFriends.length === 0 ? (
            <div className="text-gray-500 text-sm p-3 bg-base-200 rounded-md">
              <p>No friends available to add right now.</p>
            </div>
          ) : (
            <div className="mb-4 border border-base-300 rounded-md max-h-48 overflow-y-auto">
              <div className="p-2 bg-base-200 border-b">
                <p className="text-sm font-medium">
                  Available Friends ({availableFriends.length})
                </p>
              </div>
              {availableFriends.map((user) => (
                <div key={user.Id} className="p-3 border-b last:border-b-0 flex justify-between items-center">
                  <div className="flex items-center">
                    {user.Image && (
                      <div className="avatar mr-3">
                        <div className="w-8 h-8 rounded-full">
                          <img src={user.Image} alt={user.Name} />
                        </div>
                      </div>
                    )}
                    <div>
                      <p className="font-medium">{user.Name}</p>
                      <p className="text-sm text-gray-500">{user.Email}</p>
                    </div>
                  </div>
                  <button
                    onClick={(e) => handleAddClick(user, e)}
                    disabled={actionLoading}
                    className="btn btn-primary btn-xs"
                  >
                    Add
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Group Actions */}
      <div className="p-4 bg-base-200 rounded-md">
        <h3 className="text-lg font-semibold mb-3">Group Actions</h3>
        
        <button
          onClick={leaveGroup}
          disabled={actionLoading}
          className="btn btn-warning w-full mb-3"
        >
          Leave Group
        </button>
        
        {groupDetails.isAdmin && (
          <button
            onClick={deleteGroup}
            disabled={actionLoading}
            className="btn btn-error w-full"
          >
            Delete Group
          </button>
        )}
      </div>
    </div>
  );
};

export default GroupManagementSidebar;