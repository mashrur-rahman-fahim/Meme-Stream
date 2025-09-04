import React, { useState, useEffect, useCallback } from "react";
import api from "../utils/axios";

export const FriendRequest = () => {
  const [activeTab, setActiveTab] = useState("friends"); // 'friends', 'requests', 'search'
  const [friends, setFriends] = useState([]);
  const [friendRequests, setFriendRequests] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [message, setMessage] = useState("");

  // Debounced search function
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
        // Use the new optimized endpoint
        const response = await api.get(
          `/FriendRequest/search-users/${encodeURIComponent(query)}`
        );
        setSearchResults(response.data);
        setMessage("");
      } catch (error) {
        const errorMessage = error.response?.data || error.message;
        setMessage("Error searching users: " + errorMessage);
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    }, 500), // 500ms delay
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
    if (activeTab === "friends") {
      fetchFriends();
    } else if (activeTab === "requests") {
      fetchFriendRequests();
    }
  }, [activeTab]);

  const fetchFriends = async () => {
    setLoading(true);
    try {
      const response = await api.get("/FriendRequest/get/friends");
      setFriends(response.data);
    } catch (error) {
      setMessage(
        "Error fetching friends: " + (error.response?.data || error.message)
      );
    } finally {
      setLoading(false);
    }
  };

  const fetchFriendRequests = async () => {
    setLoading(true);
    try {
      const response = await api.get("/FriendRequest/get/friend-requests");
      setFriendRequests(response.data);
    } catch (error) {
      setMessage(
        "Error fetching friend requests: " +
          (error.response?.data || error.message)
      );
    } finally {
      setLoading(false);
    }
  };

  // Manual search trigger (for button click or enter key)
  const triggerSearch = async () => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setMessage("Please enter at least 2 characters to search");
      return;
    }

    setSearchLoading(true);
    try {
      const response = await api.get(
        `/FriendRequest/search-users/${encodeURIComponent(searchQuery)}`
      );
      setSearchResults(response.data);
      setMessage("");
    } catch (error) {
      const errorMessage = error.response?.data || error.message;
      setMessage("Error searching users: " + errorMessage);
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  const sendFriendRequest = async (receiverId) => {
    try {
      await api.post("/FriendRequest/send", { receiverId });
      setMessage("Friend request sent successfully!");

      // Update the user's status in search results instead of removing them
      setSearchResults((prevResults) =>
        prevResults.map((user) =>
          user.id === receiverId
            ? {
                ...user,
                friendshipStatus: "Request Sent",
                canSendRequest: false,
              }
            : user
        )
      );
    } catch (error) {
      setMessage(
        "Error sending friend request: " +
          (error.response?.data || error.message)
      );
    }
  };

  const acceptFriendRequest = async (requestId) => {
    try {
      await api.put(`/FriendRequest/accept/${requestId}`);
      setMessage("Friend request accepted!");
      fetchFriendRequests(); // Refresh the list
      fetchFriends(); // Update friends list
    } catch (error) {
      setMessage(
        "Error accepting friend request: " +
          (error.response?.data || error.message)
      );
    }
  };

  const declineFriendRequest = async (requestId) => {
    try {
      await api.delete(`/FriendRequest/delete/${requestId}`);
      setMessage("Friend request declined!");
      fetchFriendRequests(); // Refresh the list
    } catch (error) {
      setMessage(
        "Error declining friend request: " +
          (error.response?.data || error.message)
      );
    }
  };

  const unfriendUser = async (friendId, friendName) => {
    // Confirm before unfriending
    const confirmUnfriend = window.confirm(
      `Are you sure you want to remove ${friendName} from your friends?`
    );
    if (!confirmUnfriend) return;

    try {
      await api.delete(`/FriendRequest/unfriend/${friendId}`);
      setMessage(`${friendName} has been removed from your friends.`);
      fetchFriends(); // Refresh the friends list

      // If we're in search results, update the status there too
      if (searchResults.length > 0) {
        setSearchResults((prevResults) =>
          prevResults.map((user) =>
            user.id === friendId
              ? { ...user, friendshipStatus: "None", canSendRequest: true }
              : user
          )
        );
      }
    } catch (error) {
      setMessage(
        "Error removing friend: " + (error.response?.data || error.message)
      );
    }
  };

  return (
    <div>
      <h1>Friend Management</h1>

      {/* Navigation Tabs */}
      <div>
        <button onClick={() => setActiveTab("friends")}>My Friends</button>
        <button onClick={() => setActiveTab("requests")}>
          Friend Requests
        </button>
        <button onClick={() => setActiveTab("search")}>Find Friends</button>
      </div>

      {/* Message Display */}
      {message && (
        <div>
          <p>{message}</p>
          <button onClick={() => setMessage("")}>×</button>
        </div>
      )}

      {/* Loading Indicator */}
      {loading && <p>Loading...</p>}

      {/* My Friends Tab */}
      {activeTab === "friends" && (
        <div>
          <h2>My Friends ({friends.length})</h2>
          {friends.length === 0 ? (
            <p>
              You have no friends yet. Start by searching for people to add!
            </p>
          ) : (
            <div>
              {friends.map((friend) => (
                <div key={friend.id}>
                  <div>
                    {friend.friendImage && (
                      <img
                        src={friend.friendImage}
                        alt={friend.friendName}
                        width="50"
                        height="50"
                      />
                    )}
                  </div>
                  <div>
                    <h3>{friend.friendName}</h3>
                    <p>{friend.friendBio}</p>
                    <p>Email: {friend.friendEmail}</p>
                    <p>
                      Friends since:{" "}
                      {new Date(friend.createdAt).toLocaleDateString()}
                    </p>
                    <button
                      onClick={() =>
                        unfriendUser(friend.friendId, friend.friendName)
                      }
                      style={{
                        backgroundColor: "#ff6b6b",
                        color: "white",
                        border: "none",
                        padding: "5px 10px",
                        borderRadius: "4px",
                        cursor: "pointer",
                      }}
                    >
                      Remove Friend
                    </button>
                  </div>
                  <hr />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Friend Requests Tab */}
      {activeTab === "requests" && (
        <div>
          <h2>Pending Friend Requests ({friendRequests.length})</h2>
          {friendRequests.length === 0 ? (
            <p>No pending friend requests.</p>
          ) : (
            <div>
              {friendRequests.map((request) => (
                <div key={request.id}>
                  <div>
                    {request.senderImage && (
                      <img
                        src={request.senderImage}
                        alt={request.senderName}
                        width="50"
                        height="50"
                      />
                    )}
                  </div>
                  <div>
                    <h3>Request from: {request.senderName}</h3>
                    <p>{request.senderBio}</p>
                    <p>Email: {request.senderEmail}</p>
                    <p>
                      Received on:{" "}
                      {new Date(request.createdAt).toLocaleDateString()}
                    </p>
                    <p>Status: {request.status}</p>

                    {request.status === "Pending" && (
                      <div>
                        <button onClick={() => acceptFriendRequest(request.id)}>
                          Accept
                        </button>
                        <button
                          onClick={() => declineFriendRequest(request.id)}
                        >
                          Decline
                        </button>
                      </div>
                    )}
                  </div>
                  <hr />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Find Friends Tab */}
      {activeTab === "search" && (
        <div>
          <h2>Find Friends</h2>

          <div>
            <input
              type="text"
              placeholder="Search by name (at least 2 characters)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && triggerSearch()}
            />
            <button onClick={triggerSearch} disabled={searchLoading}>
              {searchLoading ? "Searching..." : "Search"}
            </button>
          </div>

          {searchLoading && <p>Searching users...</p>}

          {searchResults.length > 0 && (
            <div>
              <h3>Search Results ({searchResults.length}):</h3>
              {searchResults.map((user) => (
                <div key={user.id}>
                  <div>
                    {user.image && (
                      <img
                        src={user.image}
                        alt={user.name}
                        width="50"
                        height="50"
                      />
                    )}
                  </div>
                  <div>
                    <h4>
                      {user.name}
                      {user.friendshipStatus &&
                        user.friendshipStatus !== "None" && (
                          <span
                            style={{
                              marginLeft: "10px",
                              padding: "2px 8px",
                              backgroundColor: "#e0e0e0",
                              borderRadius: "4px",
                              fontSize: "12px",
                            }}
                          >
                            {user.friendshipStatus}
                          </span>
                        )}
                    </h4>
                    <p>{user.bio}</p>
                    <p>Email: {user.email}</p>

                    {user.friendshipStatus === "Friend" && (
                      <div>
                        <p>
                          <em>You are already friends</em>
                        </p>
                        <button
                          onClick={() => unfriendUser(user.id, user.name)}
                          style={{
                            backgroundColor: "#ff6b6b",
                            color: "white",
                            border: "none",
                            padding: "5px 10px",
                            borderRadius: "4px",
                            cursor: "pointer",
                          }}
                        >
                          Remove Friend
                        </button>
                      </div>
                    )}

                    {user.friendshipStatus === "Request Sent" && (
                      <p>
                        <em>Friend request already sent</em>
                      </p>
                    )}

                    {user.friendshipStatus === "Request Received" && (
                      <p>
                        <em>
                          This user sent you a friend request (check your Friend
                          Requests tab)
                        </em>
                      </p>
                    )}

                    {user.canSendRequest && (
                      <button onClick={() => sendFriendRequest(user.id)}>
                        Send Friend Request
                      </button>
                    )}

                    {user.friendshipStatus === "Request Declined" &&
                      user.canSendRequest && (
                        <button onClick={() => sendFriendRequest(user.id)}>
                          Send Friend Request Again
                        </button>
                      )}
                  </div>
                  <hr />
                </div>
              ))}
            </div>
          )}

          {searchQuery &&
            searchQuery.length >= 2 &&
            searchResults.length === 0 &&
            !searchLoading && (
              <div>
                <p>No users found with the name "{searchQuery}"</p>
                <p>Tips:</p>
                <ul>
                  <li>Make sure the name is spelled correctly</li>
                  <li>Try searching with fewer characters</li>
                  <li>
                    Users must have verified email addresses to appear in search
                  </li>
                </ul>
              </div>
            )}

          {searchQuery && searchQuery.length > 0 && searchQuery.length < 2 && (
            <p>Please enter at least 2 characters to search</p>
          )}
        </div>
      )}
    </div>
  );
};
