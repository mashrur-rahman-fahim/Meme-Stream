import React, { useState, useEffect, useCallback, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { VerifyContext } from "../../context/create_verify_context";
import { Navbar } from "../components/Navbar";
import api from "../utils/axios";
import { FaUserPlus, FaSearch, FaUserFriends, FaBell } from "react-icons/fa";

export const FriendsPage = () => {
  const { isVerified, verifyUser, loading: verifyLoading } = useContext(VerifyContext);
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState("friends");
  const [friends, setFriends] = useState([]);
  const [friendRequests, setFriendRequests] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    verifyUser();
  }, []);

  useEffect(() => {
    if (!isVerified && !verifyLoading) {
      navigate("/auth");
    }
  }, [isVerified, navigate, verifyLoading]);

  // Debounce for search
  const debounce = useCallback((func, delay) => {
    let timeoutId;
    return (...args) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func.apply(null, args), delay);
    };
  }, []);

  const searchUsersDebounced = useCallback(
    debounce(async (query) => {
      if (!query.trim() || query.length < 2) {
        setSearchResults([]);
        return;
      }
      setSearchLoading(true);
      try {
        const response = await api.get(
          `/FriendRequest/search-users/${encodeURIComponent(query)}`
        );
        setSearchResults(response.data);
        setMessage("");
      } catch (error) {
        setMessage("Error searching users");
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    }, 500),
    []
  );

  useEffect(() => {
    if (searchQuery && activeTab === "search") {
      searchUsersDebounced(searchQuery);
    } else {
      setSearchResults([]);
    }
  }, [searchQuery, activeTab, searchUsersDebounced]);

  useEffect(() => {
    if (activeTab === "friends") fetchFriends();
    if (activeTab === "requests") fetchFriendRequests();
  }, [activeTab]);

  const fetchFriends = async () => {
    setLoading(true);
    try {
      const res = await api.get("/FriendRequest/get/friends");
      setFriends(res.data);
    } catch (error) {
      setMessage("Error fetching friends");
    } finally {
      setLoading(false);
    }
  };

  const fetchFriendRequests = async () => {
    setLoading(true);
    try {
      const res = await api.get("/FriendRequest/get/friend-requests");
      setFriendRequests(res.data);
    } catch (error) {
      setMessage("Error fetching requests");
    } finally {
      setLoading(false);
    }
  };

  const sendFriendRequest = async (receiverId) => {
    try {
      await api.post("/FriendRequest/send", { receiverId });
      setMessage("Friend request sent!");
      setSearchResults((prev) =>
        prev.map((u) =>
          u.id === receiverId ? { ...u, friendshipStatus: "Request Sent", canSendRequest: false } : u
        )
      );
      setTimeout(() => setMessage(""), 3000);
    } catch (error) {
      setMessage("Error sending request");
      setTimeout(() => setMessage(""), 3000);
    }
  };

  const acceptFriendRequest = async (id) => {
    try {
      await api.put(`/FriendRequest/accept/${id}`);
      setMessage("Friend request accepted!");
      fetchFriendRequests();
      fetchFriends();
      setTimeout(() => setMessage(""), 3000);
    } catch (error) {
      setMessage("Error accepting request");
      setTimeout(() => setMessage(""), 3000);
    }
  };

  const declineFriendRequest = async (id) => {
    try {
      await api.delete(`/FriendRequest/delete/${id}`);
      setMessage("Friend request declined");
      fetchFriendRequests();
      setTimeout(() => setMessage(""), 3000);
    } catch (error) {
      setMessage("Error declining request");
      setTimeout(() => setMessage(""), 3000);
    }
  };

  const unfriendUser = async (id, name) => {
    if (!window.confirm(`Remove ${name} from friends?`)) return;
    try {
      await api.delete(`/FriendRequest/unfriend/${id}`);
      setMessage(`${name} removed from friends`);
      fetchFriends();
      setSearchResults((prev) =>
        prev.map((u) => (u.id === id ? { ...u, friendshipStatus: "None", canSendRequest: true } : u))
      );
      setTimeout(() => setMessage(""), 3000);
    } catch (error) {
      setMessage("Error removing friend");
      setTimeout(() => setMessage(""), 3000);
    }
  };

  const getTabCount = (tab) => {
    if (tab === "friends") return friends.length;
    if (tab === "requests") return friendRequests.length;
    return 0;
  };

  if (verifyLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-base-200">
        <div className="loading loading-bars loading-lg text-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base-200">
      <Navbar />
      
      <div className="pt-24 pb-8">
        <div className="max-w-4xl mx-auto px-4">
          
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-base-content mb-2">Friends</h1>
            <p className="text-base-content/70">Connect with people and build your network</p>
          </div>

          {/* Message Alert */}
          {message && (
            <div className="alert alert-info mb-6">
              <span>{message}</span>
              <button onClick={() => setMessage("")} className="btn btn-sm btn-ghost">✕</button>
            </div>
          )}

          {/* Tabs */}
          <div className="tabs tabs-boxed bg-base-300 mb-8 justify-start">
            <button 
              className={`tab tab-lg gap-2 ${activeTab === "friends" ? "tab-active" : ""}`}
              onClick={() => setActiveTab("friends")}
            >
              <FaUserFriends className="text-lg" />
              <span className="hidden sm:inline">My Friends</span>
              <div className="badge badge-primary badge-sm">{getTabCount("friends")}</div>
            </button>
            <button 
              className={`tab tab-lg gap-2 ${activeTab === "requests" ? "tab-active" : ""}`}
              onClick={() => setActiveTab("requests")}
            >
              <FaBell className="text-lg" />
              <span className="hidden sm:inline">Requests</span>
              {getTabCount("requests") > 0 && (
                <div className="badge badge-error badge-sm">{getTabCount("requests")}</div>
              )}
            </button>
            <button 
              className={`tab tab-lg gap-2 ${activeTab === "search" ? "tab-active" : ""}`}
              onClick={() => setActiveTab("search")}
            >
              <FaSearch className="text-lg" />
              <span className="hidden sm:inline">Find Friends</span>
            </button>
          </div>

          {/* Content Area */}
          <div className="bg-base-100 rounded-lg shadow-lg p-6">
            
            {/* Friends Tab */}
            {activeTab === "friends" && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-base-content">
                    Your Friends
                  </h2>
                  <div className="text-sm text-base-content/70">
                    {friends.length} {friends.length === 1 ? 'friend' : 'friends'}
                  </div>
                </div>

                {loading ? (
                  <div className="flex justify-center py-12">
                    <div className="loading loading-spinner loading-lg text-primary"></div>
                  </div>
                ) : friends.length === 0 ? (
                  <div className="text-center py-16">
                    <FaUserFriends className="text-6xl text-base-content/20 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-base-content mb-2">No friends yet</h3>
                    <p className="text-base-content/70 mb-6">Start connecting with people to build your network</p>
                    <button 
                      onClick={() => setActiveTab("search")}
                      className="btn btn-primary gap-2"
                    >
                      <FaSearch /> Find Friends
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {friends.map((friend) => (
                      <div key={friend.id} className="card bg-base-200 border border-base-300 hover:shadow-md transition-shadow">
                        <div className="card-body p-4">
                          <div className="flex items-start gap-3">
                            <div className="avatar">
                              <div className="w-12 h-12 rounded-full bg-primary">
                                {friend.friendImage ? (
                                  <img src={friend.friendImage} alt={friend.friendName} />
                                ) : (
                                  <span className="text-xl text-primary-content flex items-center justify-center w-full h-full">
                                    {friend.friendName.charAt(0).toUpperCase()}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-base-content truncate">
                                {friend.friendName}
                              </h3>
                              {friend.friendBio && (
                                <p className="text-sm text-base-content/70 line-clamp-2 mt-1">
                                  {friend.friendBio}
                                </p>
                              )}
                              <p className="text-xs text-base-content/50 mt-1">
                                {friend.friendEmail}
                              </p>
                            </div>
                          </div>
                          <div className="card-actions justify-end mt-4">
                            <button
                              onClick={() => unfriendUser(friend.friendId, friend.friendName)}
                              className="btn btn-sm btn-ghost text-error hover:btn-error hover:text-error-content"
                            >
                              Unfriend
                            </button>
                            <button className="btn btn-sm btn-primary">
                              Message
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Friend Requests Tab */}
            {activeTab === "requests" && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-base-content">
                    Friend Requests
                  </h2>
                  <div className="text-sm text-base-content/70">
                    {friendRequests.length} pending
                  </div>
                </div>

                {loading ? (
                  <div className="flex justify-center py-12">
                    <div className="loading loading-spinner loading-lg text-primary"></div>
                  </div>
                ) : friendRequests.length === 0 ? (
                  <div className="text-center py-16">
                    <FaBell className="text-6xl text-base-content/20 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-base-content mb-2">No pending requests</h3>
                    <p className="text-base-content/70">You'll see friend requests here when people want to connect</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {friendRequests.map((request) => (
                      <div key={request.id} className="card bg-base-200 border border-base-300">
                        <div className="card-body p-4">
                          <div className="flex items-center gap-4">
                            <div className="avatar">
                              <div className="w-12 h-12 rounded-full bg-primary">
                                {request.senderImage ? (
                                  <img src={request.senderImage} alt={request.senderName} />
                                ) : (
                                  <span className="text-xl text-primary-content flex items-center justify-center w-full h-full">
                                    {request.senderName.charAt(0).toUpperCase()}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex-1">
                              <h3 className="font-semibold text-base-content">
                                {request.senderName}
                              </h3>
                              <p className="text-sm text-base-content/70">
                                {request.senderEmail}
                              </p>
                              <p className="text-xs text-base-content/50 mt-1">
                                Sent {new Date(request.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                            <div className="card-actions">
                              <button
                                onClick={() => declineFriendRequest(request.id)}
                                className="btn btn-sm btn-ghost"
                              >
                                Decline
                              </button>
                              <button
                                onClick={() => acceptFriendRequest(request.id)}
                                className="btn btn-sm btn-primary"
                              >
                                Accept
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Search Tab */}
            {activeTab === "search" && (
              <div>
                <div className="mb-6">
                  <h2 className="text-xl font-semibold text-base-content mb-4">
                    Find Friends
                  </h2>
                  <div className="flex gap-3">
                    <div className="form-control flex-1">
                      <input
                        type="text"
                        placeholder="Search by name..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="input input-bordered w-full"
                      />
                    </div>
                  </div>
                </div>

                {searchLoading ? (
                  <div className="flex justify-center py-12">
                    <div className="loading loading-spinner loading-lg text-primary"></div>
                  </div>
                ) : searchResults.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {searchResults.map((user) => (
                      <div key={user.id} className="card bg-base-200 border border-base-300 hover:shadow-md transition-shadow">
                        <div className="card-body p-4">
                          <div className="flex items-start gap-3 mb-4">
                            <div className="avatar">
                              <div className="w-12 h-12 rounded-full bg-primary">
                                {user.image ? (
                                  <img src={user.image} alt={user.name} />
                                ) : (
                                  <span className="text-xl text-primary-content flex items-center justify-center w-full h-full">
                                    {user.name.charAt(0).toUpperCase()}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-base-content truncate">
                                {user.name}
                              </h3>
                              {user.bio && (
                                <p className="text-sm text-base-content/70 line-clamp-2 mt-1">
                                  {user.bio}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex flex-col gap-2">
                            {user.friendshipStatus === "Friend" && (
                              <div className="flex gap-2">
                                <button className="btn btn-sm btn-primary flex-1">
                                  Message
                                </button>
                                <button
                                  onClick={() => unfriendUser(user.id, user.name)}
                                  className="btn btn-sm btn-ghost text-error"
                                >
                                  Unfriend
                                </button>
                              </div>
                            )}
                            {user.friendshipStatus === "Request Sent" && (
                              <div className="text-center text-info text-sm py-2">
                                ✓ Request sent
                              </div>
                            )}
                            {user.friendshipStatus === "Request Received" && (
                              <div className="text-center text-warning text-sm py-2">
                                This user sent you a request
                              </div>
                            )}
                            {user.canSendRequest && (
                              <button
                                onClick={() => sendFriendRequest(user.id)}
                                className="btn btn-sm btn-primary gap-2 w-full"
                              >
                                <FaUserPlus /> Add Friend
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : searchQuery && !searchLoading ? (
                  <div className="text-center py-16">
                    <FaSearch className="text-6xl text-base-content/20 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-base-content mb-2">No users found</h3>
                    <p className="text-base-content/70">Try searching with a different name</p>
                  </div>
                ) : (
                  <div className="text-center py-16">
                    <FaSearch className="text-6xl text-base-content/20 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-base-content mb-2">Search for friends</h3>
                    <p className="text-base-content/70">Enter a name to find people to connect with</p>
                  </div>
                )}
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
};