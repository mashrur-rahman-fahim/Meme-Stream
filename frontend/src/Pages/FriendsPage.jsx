import React, { useState, useEffect, useCallback, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { VerifyContext } from "../../context/create_verify_context";
import { Navbar } from "../components/Navbar";
import api from "../utils/axios";
import { FaSearch, FaUserFriends, FaBell, FaTimes } from "react-icons/fa";

export const FriendsPage = () => {
  const { isVerified, loading: verifyLoading } = useContext(VerifyContext);
  const navigate = useNavigate();
  
  const [friends, setFriends] = useState([]);
  const [friendRequests, setFriendRequests] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [message, setMessage] = useState("");
  
  // Pagination states
  const [friendsPage, setFriendsPage] = useState(1);
  const [requestsPage, setRequestsPage] = useState(1);
  const [friendsHasMore, setFriendsHasMore] = useState(true);
  const [requestsHasMore, setRequestsHasMore] = useState(true);
  const [friendsLoading, setFriendsLoading] = useState(false);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [showMoreFriends, setShowMoreFriends] = useState(false);
  const [showMoreRequests, setShowMoreRequests] = useState(false);
  
  const PAGE_SIZE = 10;

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
          `/FriendRequest/search-friends/${encodeURIComponent(query)}`
        );
        setSearchResults(response.data);
        setMessage("");
      } catch (error) {
        setMessage("Error searching friends");
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    }, 500),
    []
  );


  useEffect(() => {
    if (searchQuery) {
      searchUsersDebounced(searchQuery);
    } else {
      setSearchResults([]);
    }
  }, [searchQuery, searchUsersDebounced]);


  useEffect(() => {
    fetchFriends(1, false);
    fetchFriendRequests(1, false);
  }, []);

  const fetchFriends = async (page = 1, loadMore = false) => {
    if (loadMore) {
      setFriendsLoading(true);
    } else {
      setLoading(true);
    }
    
    try {
      const res = await api.get(`/FriendRequest/get/friends?page=${page}&limit=${PAGE_SIZE}`);
      const newFriends = res.data;
      
      if (loadMore) {
        setFriends(prev => [...prev, ...newFriends]);
      } else {
        setFriends(newFriends);
      }
      
      setFriendsHasMore(newFriends.length === PAGE_SIZE);
    } catch (error) {
      setMessage("Error fetching friends");
      console.error("Error fetching friends:", error);
    } finally {
      setLoading(false);
      setFriendsLoading(false);
    }
  };

  const fetchFriendRequests = async (page = 1, loadMore = false) => {
    if (loadMore) {
      setRequestsLoading(true);
    } else {
      setLoading(true);
    }
    
    try {
      const res = await api.get(`/FriendRequest/get/friend-requests?page=${page}&limit=${PAGE_SIZE}`);
      const newRequests = res.data;
      
      if (loadMore) {
        setFriendRequests(prev => [...prev, ...newRequests]);
      } else {
        setFriendRequests(newRequests);
      }
      
      setRequestsHasMore(newRequests.length === PAGE_SIZE);
    } catch (error) {
      setMessage("Error fetching requests");
      console.error("Error fetching requests:", error);
    } finally {
      setLoading(false);
      setRequestsLoading(false);
    }
  };

  const loadMoreFriends = () => {
    const nextPage = friendsPage + 1;
    setFriendsPage(nextPage);
    fetchFriends(nextPage, true);
  };

  const loadMoreRequests = () => {
    const nextPage = requestsPage + 1;
    setRequestsPage(nextPage);
    fetchFriendRequests(nextPage, true);
  };

  const sendFriendRequest = async (receiverId) => {
    try {
      await api.post("/FriendRequest/send", { receiverId });
      setMessage("Friend request sent! Now wait for them to accept your awesomeness 🎉");
      
      // Update search results state
      setSearchResults((prev) =>
        prev.map((u) =>
          u.id === receiverId ? { ...u, friendshipStatus: "Request Sent", canSendRequest: false } : u
        )
      );
      
      setTimeout(() => setMessage(""), 3000);
    } catch (error) {
      console.error("Error sending friend request:", error);
      if (error.response?.data) {
        setMessage(error.response.data || "Error sending request");
      } else {
        setMessage("Error sending request - Try again later! 😅");
      }
      setTimeout(() => setMessage(""), 3000);
    }
  };

  const acceptFriendRequest = async (id) => {
    try {
      await api.put(`/FriendRequest/accept/${id}`);
      setMessage("Friend request accepted!");
      // Reset pagination and refetch
      setFriendsPage(1);
      setRequestsPage(1);
      fetchFriends(1, false);
      fetchFriendRequests(1, false);
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
      // Reset pagination and refetch
      setRequestsPage(1);
      fetchFriendRequests(1, false);
      setTimeout(() => setMessage(""), 3000);
    } catch (error) {
      setMessage("Error declining request");
      setTimeout(() => setMessage(""), 3000);
    }
  };

  const unfriendUser = async (id, name) => {
    if (!window.confirm(`Remove ${name} from friends? This will end your beautiful friendship 💔`)) return;
    try {
      await api.delete(`/FriendRequest/unfriend/${id}`);
      setMessage(`${name} removed from friends. Friendship status: It's complicated 😢`);
      
      // Reset pagination and refetch
      setFriendsPage(1);
      fetchFriends(1, false);
      
      // Update search results state
      setSearchResults((prev) =>
        prev.map((u) => (u.id === id ? { ...u, friendshipStatus: "None", canSendRequest: true } : u))
      );
      
      setTimeout(() => setMessage(""), 3000);
    } catch (error) {
      setMessage("Error removing friend - Maybe they don't want to let you go! 😅");
      setTimeout(() => setMessage(""), 3000);
    }
  };

  useEffect(() => {
    if (isVerified === false && !verifyLoading) {
      navigate("/auth");
    }
  }, [isVerified, navigate, verifyLoading]);

  if (verifyLoading || isVerified === null) {
    return (
      <div className="min-h-screen bg-base-200 flex items-center justify-center transition-opacity duration-300">
        <div className="text-center">
          <span className="loading loading-spinner loading-lg text-primary"></span>
          <p className="mt-4 text-base-content animate-pulse">Loading...</p>
        </div>
      </div>
    );
  }

  if (isVerified === false) {
    return null;
  }

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
      
      <div className="pt-20 pb-8">
        <div className="max-w-[1400px] mx-auto px-4">
          
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-base-content mb-2">Friends</h1>
            <p className="text-base-content/70">Connect with people and build your network</p>
          </div>

          {/* Message Alert */}
          {message && (
            <div className="alert alert-info mb-6">
              <span>{message}</span>
              <button onClick={() => setMessage("")} className="btn btn-sm btn-ghost">
                <FaTimes />
              </button>
            </div>
          )}

          <div className="flex flex-col lg:flex-row gap-6">
            
            {/* Left Sidebar */}
            <div className="lg:w-80 flex-shrink-0">
              <div className="space-y-6">
                
                {/* Friend Requests Section */}
                <div className="card bg-base-100 shadow-lg border border-base-300">
                  <div className="card-body p-4">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-lg font-bold text-base-content flex items-center gap-2">
                        <FaBell className="text-primary" />
                        Friend Requests
                      </h2>
                      {friendRequests.length > 0 && (
                        <div className="badge badge-error badge-sm">{friendRequests.length}</div>
                      )}
                    </div>
                    
                    {friendRequests.length === 0 ? (
                      <p className="text-base-content/60 text-sm text-center py-4">
                        No pending requests
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {/* Show limited requests initially */}
                        <div className={`space-y-3 ${showMoreRequests ? 'max-h-96 overflow-y-auto' : ''}`}>
                          {(showMoreRequests ? friendRequests : friendRequests.slice(0, 3)).map((request) => (
                          <div key={request.id} className="p-3 bg-base-200 rounded-lg">
                            <div className="flex items-center gap-3 mb-3">
                              <div 
                                className="avatar cursor-pointer hover:scale-105 transition-transform"
                                onClick={() => navigate(`/profile/${request.senderId}`)}
                              >
                                <div className="w-10 h-10 rounded-full bg-primary">
                                  {request.senderImage ? (
                                    <img src={request.senderImage} alt={request.senderName} />
                                  ) : (
                                    <span className="text-sm text-primary-content flex items-center justify-center w-full h-full">
                                      {request.senderName.charAt(0).toUpperCase()}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="flex-1 min-w-0">
                                <p 
                                  className="font-medium text-sm text-base-content truncate cursor-pointer hover:text-primary transition-colors"
                                  onClick={() => navigate(`/profile/${request.senderId}`)}
                                >
                                  {request.senderName}
                                </p>
                                <p className="text-xs text-base-content/50">
                                  {new Date(request.createdAt).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => acceptFriendRequest(request.id)}
                                className="btn btn-primary btn-xs flex-1"
                              >
                                Accept
                              </button>
                              <button
                                onClick={() => declineFriendRequest(request.id)}
                                className="btn btn-ghost btn-xs flex-1"
                              >
                                Decline
                              </button>
                            </div>
                          </div>
                          ))}
                          
                          {/* Loading indicator for infinite scroll */}
                          {showMoreRequests && requestsLoading && (
                            <div className="flex justify-center py-2">
                              <div className="loading loading-spinner loading-sm text-primary"></div>
                            </div>
                          )}
                          
                          {/* Load more button for infinite scroll */}
                          {showMoreRequests && requestsHasMore && !requestsLoading && (
                            <div className="text-center pt-2">
                              <button
                                onClick={loadMoreRequests}
                                className="btn btn-ghost btn-xs text-primary"
                              >
                                Load More Requests
                              </button>
                            </div>
                          )}
                        </div>
                        
                        {/* See More/Less toggle */}
                        {!showMoreRequests && friendRequests.length > 3 && (
                          <div className="text-center pt-2">
                            <button
                              onClick={() => setShowMoreRequests(true)}
                              className="btn btn-ghost btn-xs text-primary"
                            >
                              See More ({friendRequests.length - 3} more)
                            </button>
                          </div>
                        )}
                        
                        {showMoreRequests && (
                          <div className="text-center pt-2">
                            <button
                              onClick={() => setShowMoreRequests(false)}
                              className="btn btn-ghost btn-xs text-base-content/70"
                            >
                              See Less
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Search Friends Section */}
                <div className="card bg-base-100 shadow-lg border border-base-300">
                  <div className="card-body p-4">
                    <h2 className="text-lg font-bold text-base-content flex items-center gap-2 mb-4">
                      <FaSearch className="text-primary" />
                      Search Your Friends
                    </h2>
                    
                    <div className="form-control mb-4">
                      <input
                        type="text"
                        placeholder="Search among your friends..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="input input-bordered input-sm w-full"
                      />
                    </div>
                    
                    {searchLoading ? (
                      <div className="flex justify-center py-4">
                        <div className="loading loading-spinner loading-sm text-primary"></div>
                      </div>
                    ) : searchResults.length > 0 ? (
                      <div className="space-y-3 max-h-96 overflow-y-auto">
                        {searchResults.slice(0, 3).map((user) => (
                          <div key={user.id} className="p-3 bg-base-200 rounded-lg">
                            <div className="flex items-center gap-3 mb-3">
                              <div 
                                className="avatar cursor-pointer hover:scale-105 transition-transform"
                                onClick={() => navigate(`/profile/${user.id}`)}
                              >
                                <div className="w-10 h-10 rounded-full bg-primary">
                                  {user.image ? (
                                    <img src={user.image} alt={user.name} />
                                  ) : (
                                    <span className="text-sm text-primary-content flex items-center justify-center w-full h-full">
                                      {user.name.charAt(0).toUpperCase()}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="flex-1 min-w-0">
                                <p 
                                  className="font-medium text-sm text-base-content truncate cursor-pointer hover:text-primary transition-colors"
                                  onClick={() => navigate(`/profile/${user.id}`)}
                                >
                                  {user.name}
                                </p>
                                {user.bio && (
                                  <p className="text-xs text-base-content/60 truncate">
                                    {user.bio}
                                  </p>
                                )}
                              </div>
                            </div>
                            
                            {/* Since we're searching only friends, show friend actions */}
                            <div className="flex gap-2">
                              <button className="btn btn-primary btn-xs flex-1">
                                Message
                              </button>
                              <button
                                onClick={() => unfriendUser(user.id, user.name)}
                                className="btn btn-ghost btn-xs text-error"
                              >
                                Unfriend
                              </button>
                            </div>
                          </div>
                        ))}
                        {searchResults.length > 3 && (
                          <p className="text-xs text-base-content/60 text-center pt-2">
                            +{searchResults.length - 3} more results
                          </p>
                        )}
                      </div>
                    ) : searchQuery && !searchLoading ? (
                      <p className="text-base-content/60 text-sm text-center py-4">
                        No friends found matching "{searchQuery}"
                      </p>
                    ) : (
                      <p className="text-base-content/60 text-sm text-center py-4">
                        Search among your existing friends 👥
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Main Content - Friends List */}
            <div className="flex-1 min-w-0">
              <div className="card bg-base-100 shadow-lg border border-base-300">
                <div className="card-body p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-base-content flex items-center gap-2">
                      <FaUserFriends className="text-primary" />
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
                      <h3 className="text-xl font-semibold text-base-content mb-2">Your friend list is as empty as your dating life 💔</h3>
                      <p className="text-base-content/70 mb-6">Time to find your meme squad and build that social empire! 👑</p>
                      <div className="text-sm text-base-content/50">
                        Use the search box on the left to find people to connect with
                      </div>
                    </div>
                  ) : (
                    <div>
                      {/* Friends Grid */}
                      <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 ${showMoreFriends ? 'max-h-96 overflow-y-auto' : ''}`}>
                        {(showMoreFriends ? friends : friends.slice(0, 8)).map((friend) => (
                        <div key={friend.id} className="card bg-base-200 border border-base-300 hover:shadow-md transition-shadow">
                          <div className="card-body p-4">
                            <div className="flex flex-col items-center text-center">
                              <div 
                                className="avatar mb-3 cursor-pointer hover:scale-105 transition-transform"
                                onClick={() => navigate(`/profile/${friend.friendId}`)}
                              >
                                <div className="w-16 h-16 rounded-full bg-primary">
                                  {friend.friendImage ? (
                                    <img src={friend.friendImage} alt={friend.friendName} className="rounded-full" />
                                  ) : (
                                    <span className="text-2xl text-primary-content flex items-center justify-center w-full h-full">
                                      {friend.friendName.charAt(0).toUpperCase()}
                                    </span>
                                  )}
                                </div>
                              </div>
                              
                              <h3 
                                className="font-semibold text-base-content mb-1 cursor-pointer hover:text-primary transition-colors"
                                onClick={() => navigate(`/profile/${friend.friendId}`)}
                              >
                                {friend.friendName}
                              </h3>
                              
                              {friend.friendBio && (
                                <p className="text-sm text-base-content/70 line-clamp-2 mb-2">
                                  {friend.friendBio}
                                </p>
                              )}
                              
                              <p className="text-xs text-base-content/50 mb-4">
                                {friend.friendEmail}
                              </p>
                              
                              <div className="flex gap-2 w-full">
                                <button className="btn btn-primary btn-sm flex-1">
                                  Message
                                </button>
                                <button
                                  onClick={() => unfriendUser(friend.friendId, friend.friendName)}
                                  className="btn btn-ghost btn-sm text-error hover:btn-error hover:text-error-content"
                                >
                                  Unfriend
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                        ))}
                      </div>
                      
                      {/* Loading indicator for infinite scroll */}
                      {showMoreFriends && friendsLoading && (
                        <div className="flex justify-center py-4">
                          <div className="loading loading-spinner loading-md text-primary"></div>
                        </div>
                      )}
                      
                      {/* Load more button for infinite scroll */}
                      {showMoreFriends && friendsHasMore && !friendsLoading && (
                        <div className="text-center pt-4">
                          <button
                            onClick={loadMoreFriends}
                            className="btn btn-outline btn-primary btn-sm"
                          >
                            Load More Friends
                          </button>
                        </div>
                      )}
                      
                      {/* See More/Less toggle */}
                      {!showMoreFriends && friends.length > 8 && (
                        <div className="text-center pt-4">
                          <button
                            onClick={() => setShowMoreFriends(true)}
                            className="btn btn-outline btn-primary btn-sm"
                          >
                            See All Friends ({friends.length} total)
                          </button>
                        </div>
                      )}
                      
                      {showMoreFriends && (
                        <div className="text-center pt-4">
                          <button
                            onClick={() => setShowMoreFriends(false)}
                            className="btn btn-ghost btn-sm"
                          >
                            Show Less
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};