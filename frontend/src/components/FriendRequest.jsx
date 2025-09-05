import React, { useState, useEffect, useCallback } from "react";
import api from "../utils/axios";

export const FriendRequest = () => {
  const [activeTab, setActiveTab] = useState("friends");
  const [friends, setFriends] = useState([]);
  const [friendRequests, setFriendRequests] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [message, setMessage] = useState("");

  // Debounce
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
        setMessage("Error searching users: " + (error.response?.data || error.message));
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
      setMessage("Error fetching friends: " + (error.response?.data || error.message));
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
      setMessage("Error fetching requests: " + (error.response?.data || error.message));
    } finally {
      setLoading(false);
    }
  };

  const triggerSearch = async () => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setMessage("Please enter at least 2 characters to search");
      return;
    }
    setSearchLoading(true);
    try {
      const res = await api.get(
        `/FriendRequest/search-users/${encodeURIComponent(searchQuery)}`
      );
      setSearchResults(res.data);
      setMessage("");
    } catch (error) {
      setMessage("Error searching users: " + (error.response?.data || error.message));
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  const sendFriendRequest = async (receiverId) => {
    try {
      await api.post("/FriendRequest/send", { receiverId });
      setMessage("Friend request sent successfully!");
      setSearchResults((prev) =>
        prev.map((u) =>
          u.id === receiverId ? { ...u, friendshipStatus: "Request Sent", canSendRequest: false } : u
        )
      );
    } catch (error) {
      setMessage("Error sending request: " + (error.response?.data || error.message));
    }
  };

  const acceptFriendRequest = async (id) => {
    try {
      await api.put(`/FriendRequest/accept/${id}`);
      setMessage("Friend request accepted!");
      fetchFriendRequests();
      fetchFriends();
    } catch (error) {
      setMessage("Error accepting request: " + (error.response?.data || error.message));
    }
  };

  const declineFriendRequest = async (id) => {
    try {
      await api.delete(`/FriendRequest/delete/${id}`);
      setMessage("Friend request declined!");
      fetchFriendRequests();
    } catch (error) {
      setMessage("Error declining request: " + (error.response?.data || error.message));
    }
  };

  const unfriendUser = async (id, name) => {
    if (!window.confirm(`Are you sure you want to remove ${name}?`)) return;
    try {
      await api.delete(`/FriendRequest/unfriend/${id}`);
      setMessage(`${name} removed from friends.`);
      fetchFriends();
      setSearchResults((prev) =>
        prev.map((u) => (u.id === id ? { ...u, friendshipStatus: "None", canSendRequest: true } : u))
      );
    } catch (error) {
      setMessage("Error removing friend: " + (error.response?.data || error.message));
    }
  };

  return (
  <div className="max-w-3xl mx-auto p-4">
    <h1 className="text-xl font-bold mb-4 text-center">👥 Friend Management</h1>

    {/* Tabs */}
    <div className="flex justify-center gap-2 mb-4">
      {["friends", "requests", "search"].map((tab) => (
        <button
          key={tab}
          onClick={() => setActiveTab(tab)}
          className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${
            activeTab === tab
              ? "btn-primary text-primary-content shadow"
              : "btn-ghost hover:btn-outline"
          }`}
        >
          {tab === "friends" && "My Friends"}
          {tab === "requests" && "Requests"}
          {tab === "search" && "Find"}
        </button>
      ))}
    </div>

    {/* Global message */}
    {message && (
      <div className="mb-3 alert alert-warning">
        <span className="text-sm">{message}</span>
        <button onClick={() => setMessage("")} className="btn btn-sm btn-ghost">×</button>
      </div>
    )}

    {loading && <p className="text-center text-sm loading loading-spinner loading-sm">Loading...</p>}

    {/* Friends */}
    {activeTab === "friends" && (
      <div>
        <h2 className="text-lg font-semibold mb-3 text-base-content">My Friends ({friends.length})</h2>
        {friends.length === 0 ? (
          <p className="text-base-content/60 text-sm">You have no friends yet.</p>
        ) : (
          <div className="grid gap-3">
            {friends.map((f) => (
              <div key={f.id} className="card bg-base-100 shadow-md">
                <div className="card-body p-3">
                  <div className="flex items-center gap-3 text-sm">
                    {f.friendImage && (
                      <div className="avatar">
                        <div className="w-10 h-10 rounded-full">
                          <img src={f.friendImage} alt={f.friendName} />
                        </div>
                      </div>
                    )}
                    <div className="flex-1">
                      <h3 className="font-semibold text-sm text-base-content">{f.friendName}</h3>
                      <p className="text-xs text-base-content/70">{f.friendBio}</p>
                      <p className="text-xs text-base-content/50">Email: {f.friendEmail}</p>
                    </div>
                    <button
                      onClick={() => unfriendUser(f.friendId, f.friendName)}
                      className="btn btn-error btn-xs"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    )}

    {/* Requests */}
    {activeTab === "requests" && (
      <div>
        <h2 className="text-lg font-semibold mb-3 text-base-content">
          Friend Requests ({friendRequests.length})
        </h2>
        {friendRequests.length === 0 ? (
          <p className="text-base-content/60 text-sm">No pending requests.</p>
        ) : (
          <div className="grid gap-3">
            {friendRequests.map((r) => (
              <div key={r.id} className="card bg-base-100 shadow-md">
                <div className="card-body p-3 text-sm">
                  <div className="flex items-center gap-3">
                    {r.senderImage && (
                      <div className="avatar">
                        <div className="w-10 h-10 rounded-full">
                          <img src={r.senderImage} alt={r.senderName} />
                        </div>
                      </div>
                    )}
                    <div className="flex-1">
                      <h3 className="font-semibold text-base-content">{r.senderName}</h3>
                      <p className="text-xs text-base-content/50">Email: {r.senderEmail}</p>
                    </div>
                    {r.status === "Pending" && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => acceptFriendRequest(r.id)}
                          className="btn btn-success btn-xs"
                        >
                          Accept
                        </button>
                        <button
                          onClick={() => declineFriendRequest(r.id)}
                          className="btn btn-neutral btn-xs"
                        >
                          Decline
                        </button>
                      </div>
                    )}
                  </div>
                  {/* Status message always below */}
                  <div className="mt-1 text-xs text-base-content/60">Status: {r.status}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    )}

    {/* Search */}
    {activeTab === "search" && (
      <div>
        <h2 className="text-lg font-semibold mb-3 text-base-content">Find Friends</h2>
        <div className="mb-3 flex flex-col gap-2">
          <input
            type="text"
            placeholder="Search by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && triggerSearch()}
            className="input input-bordered input-sm w-full"
          />
          <button
            onClick={triggerSearch}
            disabled={searchLoading}
            className="btn btn-primary btn-sm w-full"
          >
            {searchLoading ? (
              <>
                <span className="loading loading-spinner loading-xs"></span>
                Searching...
              </>
            ) : (
              "Search"
            )}
          </button>
        </div>

        {searchResults.length > 0 ? (
          <div className="grid gap-3">
            {searchResults.map((u) => (
              <div key={u.id} className="card bg-base-100 shadow-md">
                <div className="card-body p-3 text-sm">
                  <div className="flex items-center gap-3">
                    {u.image && (
                      <div className="avatar">
                        <div className="w-10 h-10 rounded-full">
                          <img src={u.image} alt={u.name} />
                        </div>
                      </div>
                    )}
                    <div className="flex-1">
                      <h4 className="font-semibold text-base-content">{u.name}</h4>
                      <p className="text-xs text-base-content/70">{u.bio}</p>
                    </div>
                  </div>

                  {/* Always show message below */}
                  <div className="mt-2 text-xs">
                    {u.friendshipStatus === "Friend" && (
                      <button
                        onClick={() => unfriendUser(u.id, u.name)}
                        className="btn btn-error btn-xs"
                      >
                        Remove Friend
                      </button>
                    )}

                    {u.friendshipStatus === "Request Sent" && (
                      <p className="text-info">Request already sent</p>
                    )}

                    {u.friendshipStatus === "Request Received" && (
                      <p className="text-success">This user sent you a request</p>
                    )}

                    {u.canSendRequest && (
                      <button
                        onClick={() => sendFriendRequest(u.id)}
                        className="btn btn-primary btn-xs"
                      >
                        Send Friend Request
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          searchQuery &&
          !searchLoading && (
            <p className="text-base-content/60 text-xs">No users found for "{searchQuery}"</p>
          )
        )}
      </div>
    )}
  </div>
);

};
