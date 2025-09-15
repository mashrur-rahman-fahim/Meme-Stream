import React, { useState, useEffect } from "react";
import axios from "axios";
import { getApiBaseUrl } from "../../utils/api-config";
import { Users, Settings, Crown, Shield, UserPlus, UserMinus, Edit3, Save, X, Trash2, LogOut, ChevronDown, ChevronUp, ArrowRightLeft } from "lucide-react";

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
  const [expandedSections, setExpandedSections] = useState({
    members: true,
    addFriends: true,
    actions: false
  });

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

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
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
      <div className="w-96 bg-gray-900 border-l border-gray-700 h-screen overflow-y-auto">
        <div className="sticky top-0 bg-gray-800/95 backdrop-blur-sm p-6 border-b border-gray-700">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-700 rounded-lg">
                <Settings className="w-5 h-5 text-gray-300" />
              </div>
              <h2 className="text-xl font-semibold text-white">Group Management</h2>
            </div>
            <button 
              onClick={onClose} 
              className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>
        </div>
        
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-12 h-12 border-4 border-gray-700 border-t-blue-500 rounded-full animate-spin mb-4"></div>
          <p className="text-gray-400 font-medium">Loading group details...</p>
        </div>
      </div>
    );
  }

  if (!groupDetails) {
    return (
      <div className="w-96 bg-gray-900 border-l border-gray-700 h-screen overflow-y-auto">
        <div className="sticky top-0 bg-gray-800/95 backdrop-blur-sm p-6 border-b border-gray-700">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-900/30 rounded-lg">
                <Settings className="w-5 h-5 text-red-400" />
              </div>
              <h2 className="text-xl font-semibold text-white">Group Management</h2>
            </div>
            <button 
              onClick={onClose} 
              className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>
        </div>
        
        <div className="flex flex-col items-center justify-center py-20">
          <div className="p-4 bg-red-900/30 rounded-full mb-4">
            <X className="w-8 h-8 text-red-400" />
          </div>
          <p className="text-red-400 font-medium">Failed to load group details</p>
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
    <div className="w-96 bg-gray-900 border-l border-gray-700 h-screen overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 bg-gray-800/95 backdrop-blur-sm p-6 border-b border-gray-700">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gray-700 rounded-lg">
              <Settings className="w-5 h-5 text-gray-300" />
            </div>
            <h2 className="text-xl font-semibold text-white">Group Management</h2>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>
      </div>
      
      {/* Notifications */}
      {error && (
        <div className="mx-6 mt-4 p-4 bg-red-900/30 border border-red-700 rounded-lg">
          <div className="flex items-center gap-2">
            <X className="w-4 h-4 text-red-400 flex-shrink-0" />
            <span className="text-red-300 text-sm font-medium">{error}</span>
          </div>
        </div>
      )}
      
      {success && (
        <div className="mx-6 mt-4 p-4 bg-green-900/30 border border-green-700 rounded-lg">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-500 rounded-full flex-shrink-0"></div>
            <span className="text-green-300 text-sm font-medium">{success}</span>
          </div>
        </div>
      )}
      
      <div className="p-6 space-y-6">
        {/* Group Info Section */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
          <div className="bg-blue-900 p-6 text-white">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                {editMode ? (
                  <div className="space-y-4">
                    <input
                      type="text"
                      value={groupName}
                      onChange={(e) => setGroupName(e.target.value)}
                      className="w-full bg-white/10 border border-white/30 rounded-lg px-4 py-2 text-white placeholder-white/70 focus:outline-none focus:border-white"
                      placeholder="Group name"
                    />
                    <textarea
                      value={groupDescription}
                      onChange={(e) => setGroupDescription(e.target.value)}
                      className="w-full bg-white/10 border border-white/30 rounded-lg px-4 py-2 text-white placeholder-white/70 focus:outline-none focus:border-white resize-none"
                      rows="2"
                      placeholder="Group description"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={updateGroup}
                        disabled={actionLoading}
                        className="flex items-center gap-2 px-4 py-2 bg-white text-gray-900 rounded-lg font-medium hover:bg-gray-100 transition-colors disabled:opacity-50"
                      >
                        <Save className="w-4 h-4" />
                        Save
                      </button>
                      <button
                        onClick={() => setEditMode(false)}
                        className="flex items-center gap-2 px-4 py-2 bg-white/20 text-white rounded-lg font-medium hover:bg-white/30 transition-colors"
                      >
                        <X className="w-4 h-4" />
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <h3 className="text-2xl font-bold mb-2">{groupDetails.name}</h3>
                    {groupDetails.description && (
                      <p className="text-white/90 mb-3">{groupDetails.description}</p>
                    )}
                    <p className="text-white/80 text-sm">
                      Created by {groupDetails.createdBy.name}
                    </p>
                  </div>
                )}
              </div>
              {(groupDetails.isAdmin || groupDetails.isCoAdmin) && !editMode && (
                <button
                  onClick={() => setEditMode(true)}
                  className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
                >
                  <Edit3 className="w-5 h-5 text-white" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Current Members Section */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
          <button
            onClick={() => toggleSection('members')}
            className="w-full p-4 flex items-center justify-between hover:bg-gray-700 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-700 rounded-lg">
                <Users className="w-5 h-5 text-gray-300" />
              </div>
              <h3 className="text-lg font-semibold text-white">
                Current Members ({groupDetails.members.length})
              </h3>
            </div>
            {expandedSections.members ? (
              <ChevronUp className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-400" />
            )}
          </button>
          
          {expandedSections.members && (
            <div className="border-t border-gray-700">
              <div className="max-h-80 overflow-y-auto">
                {groupDetails.members.map((member, index) => (
                  <div key={member.id} className={`p-4 flex items-center justify-between ${index !== groupDetails.members.length - 1 ? 'border-b border-gray-700' : ''}`}>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-medium">
                        {member.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium text-white">{member.name}</p>
                        <div className="flex gap-2 mt-1">
                          {member.isAdmin && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-900/30 text-yellow-300 text-xs font-medium rounded-full">
                              <Crown className="w-3 h-3" />
                              Admin
                            </span>
                          )}
                          {member.isCoAdmin && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-700 text-gray-300 text-xs font-medium rounded-full">
                              <Shield className="w-3 h-3" />
                              Co-Admin
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex gap-1">
                      {groupDetails.isAdmin && !member.isAdmin && (
                        <>
                          {member.isCoAdmin ? (
                            <button
                              onClick={() => demoteFromCoAdmin(member.id)}
                              disabled={actionLoading}
                              className="p-2 text-orange-400 hover:bg-orange-900/30 rounded-lg transition-colors disabled:opacity-50"
                              title="Demote from Co-Admin"
                            >
                              <Shield className="w-4 h-4" />
                            </button>
                          ) : (
                            <button
                              onClick={() => promoteToCoAdmin(member.id)}
                              disabled={actionLoading}
                              className="p-2 text-green-400 hover:bg-green-900/30 rounded-lg transition-colors disabled:opacity-50"
                              title="Promote to Co-Admin"
                            >
                              <Crown className="w-4 h-4" />
                            </button>
                          )}
                        </>
                      )}
                      {groupDetails.isAdmin && !member.isAdmin && (
                        <button
                          onClick={() => transferAdmin(member.id)}
                          disabled={actionLoading}
                          className="p-2 text-blue-400 hover:bg-blue-900/30 rounded-lg transition-colors disabled:opacity-50"
                          title="Transfer Admin Rights"
                        >
                          <ArrowRightLeft className="w-4 h-4" />
                        </button>
                      )}
                      {(groupDetails.isAdmin || groupDetails.isCoAdmin) && !member.isAdmin && (
                        <button
                          onClick={() => removeUserFromGroup(member.id)}
                          disabled={actionLoading}
                          className="p-2 text-red-400 hover:bg-red-900/30 rounded-lg transition-colors disabled:opacity-50"
                          title="Remove from group"
                        >
                          <UserMinus className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        
        {/* Add Members Section */}
        {(groupDetails.isAdmin || groupDetails.isCoAdmin) && (
          <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
            <button
              onClick={() => toggleSection('addFriends')}
              className="w-full p-4 flex items-center justify-between hover:bg-gray-700 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gray-700 rounded-lg">
                  <UserPlus className="w-5 h-5 text-gray-300" />
                </div>
                <h3 className="text-lg font-semibold text-white">Add Friends to Group</h3>
              </div>
              {expandedSections.addFriends ? (
                <ChevronUp className="w-5 h-5 text-gray-400" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-400" />
              )}
            </button>
            
            {expandedSections.addFriends && (
              <div className="border-t border-gray-700">
                {availableFriends.length === 0 ? (
                  <div className="p-6 text-center">
                    <div className="p-3 bg-gray-700 rounded-full inline-block mb-3">
                      <Users className="w-6 h-6 text-gray-400" />
                    </div>
                    <p className="text-gray-400">No friends available to add right now.</p>
                  </div>
                ) : (
                  <div className="max-h-64 overflow-y-auto">
                    {availableFriends.map((user, index) => (
                      <div key={user.Id} className={`p-4 flex items-center justify-between ${index !== availableFriends.length - 1 ? 'border-b border-gray-700' : ''}`}>
                        <div className="flex items-center gap-3">
                          {user.Image ? (
                            <div className="w-10 h-10 rounded-full overflow-hidden">
                              <img src={user.Image} alt={user.Name} className="w-full h-full object-cover" />
                            </div>
                          ) : (
                            <div className="w-10 h-10 bg-gray-600 rounded-full flex items-center justify-center text-white font-medium">
                              {user.Name.charAt(0)}
                            </div>
                          )}
                          <div>
                            <p className="font-medium text-white">{user.Name}</p>
                            <p className="text-sm text-gray-400">{user.Email}</p>
                          </div>
                        </div>
                        <button
                          onClick={(e) => handleAddClick(user, e)}
                          disabled={actionLoading}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-500 transition-colors disabled:opacity-50"
                        >
                          Add
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Group Actions Section */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
          <button
            onClick={() => toggleSection('actions')}
            className="w-full p-4 flex items-center justify-between hover:bg-gray-700 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-700 rounded-lg">
                <Settings className="w-5 h-5 text-gray-300" />
              </div>
              <h3 className="text-lg font-semibold text-white">Group Actions</h3>
            </div>
            {expandedSections.actions ? (
              <ChevronUp className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-400" />
            )}
          </button>
          
          {expandedSections.actions && (
            <div className="p-4 border-t border-gray-700 space-y-3">
              <button
                onClick={leaveGroup}
                disabled={actionLoading}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-500 transition-colors disabled:opacity-50"
              >
                <LogOut className="w-4 h-4" />
                Leave Group
              </button>
              
              {groupDetails.isAdmin && (
                <button
                  onClick={deleteGroup}
                  disabled={actionLoading}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-500 transition-colors disabled:opacity-50"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete Group
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GroupManagementSidebar;