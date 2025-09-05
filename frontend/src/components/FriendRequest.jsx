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
              ? "bg-blue-600 text-white shadow"
              : "bg-gray-200 hover:bg-gray-300"
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
      <div className="mb-3 p-2 bg-yellow-100 border border-yellow-300 rounded text-xs text-yellow-800 flex justify-between items-center">
        <span>{message}</span>
        <button onClick={() => setMessage("")} className="font-bold">×</button>
      </div>
    )}

    {loading && <p className="text-center text-sm">Loading...</p>}

    {/* Friends */}
    {activeTab === "friends" && (
      <div>
        <h2 className="text-lg font-semibold mb-3">My Friends ({friends.length})</h2>
        {friends.length === 0 ? (
          <p className="text-gray-600 text-sm">You have no friends yet.</p>
        ) : (
          <div className="grid gap-3">
            {friends.map((f) => (
              <div key={f.id} className="p-3 bg-white shadow rounded-md flex items-center gap-3 text-sm">
                {f.friendImage && (
                  <img src={f.friendImage} alt={f.friendName} className="w-10 h-10 rounded-full" />
                )}
                <div className="flex-1">
                  <h3 className="font-semibold text-sm">{f.friendName}</h3>
                  <p className="text-xs text-gray-600">{f.friendBio}</p>
                  <p className="text-xs text-gray-500">Email: {f.friendEmail}</p>
                </div>
                <button
                  onClick={() => unfriendUser(f.friendId, f.friendName)}
                  className="px-2.5 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    )}

    {/* Requests */}
    {activeTab === "requests" && (
      <div>
        <h2 className="text-lg font-semibold mb-3">
          Friend Requests ({friendRequests.length})
        </h2>
        {friendRequests.length === 0 ? (
          <p className="text-gray-600 text-sm">No pending requests.</p>
        ) : (
          <div className="grid gap-3">
            {friendRequests.map((r) => (
              <div key={r.id} className="p-3 bg-white shadow rounded-md text-sm">
                <div className="flex items-center gap-3">
                  {r.senderImage && (
                    <img src={r.senderImage} alt={r.senderName} className="w-10 h-10 rounded-full" />
                  )}
                  <div className="flex-1">
                    <h3 className="font-semibold">{r.senderName}</h3>
                    <p className="text-xs text-gray-500">Email: {r.senderEmail}</p>
                  </div>
                  {r.status === "Pending" && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => acceptFriendRequest(r.id)}
                        className="px-2.5 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600"
                      >
                        Accept
                      </button>
                      <button
                        onClick={() => declineFriendRequest(r.id)}
                        className="px-2.5 py-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600"
                      >
                        Decline
                      </button>
                    </div>
                  )}
                </div>
                {/* Status message always below */}
                <div className="mt-1 text-xs text-gray-600">Status: {r.status}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    )}

    {/* Search */}
    {activeTab === "search" && (
      <div>
        <h2 className="text-lg font-semibold mb-3">Find Friends</h2>
        <div className="mb-3 flex flex-col gap-2">
          <input
            type="text"
            placeholder="Search by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && triggerSearch()}
            className="px-3 py-1.5 border rounded-md text-sm w-full"
          />
          <button
            onClick={triggerSearch}
            disabled={searchLoading}
            className="w-full px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {searchLoading ? "Searching..." : "Search"}
          </button>
        </div>

        {searchResults.length > 0 ? (
          <div className="grid gap-3">
            {searchResults.map((u) => (
              <div key={u.id} className="p-3 bg-white shadow rounded-md text-sm">
                <div className="flex items-center gap-3">
                  {u.image && <img src={u.image} alt={u.name} className="w-10 h-10 rounded-full" />}
                  <div className="flex-1">
                    <h4 className="font-semibold">{u.name}</h4>
                    <p className="text-xs text-gray-600">{u.bio}</p>
                  </div>
                </div>

                {/* Always show message below */}
                <div className="mt-2 text-xs">
                  {u.friendshipStatus === "Friend" && (
                    <button
                      onClick={() => unfriendUser(u.id, u.name)}
                      className="px-2.5 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600"
                    >
                      Remove Friend
                    </button>
                  )}

                  {u.friendshipStatus === "Request Sent" && (
                    <p className="text-blue-500">Request already sent</p>
                  )}

                  {u.friendshipStatus === "Request Received" && (
                    <p className="text-green-600">This user sent you a request</p>
                  )}

                  {u.canSendRequest && (
                    <button
                      onClick={() => sendFriendRequest(u.id)}
                      className="px-2.5 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      Send Friend Request
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          searchQuery &&
          !searchLoading && (
            <p className="text-gray-600 text-xs">No users found for "{searchQuery}"</p>
          )
        )}
      </div>
    )}
  </div>
);

};
