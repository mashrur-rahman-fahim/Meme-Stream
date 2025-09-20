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
      const res = await api.get(`/FriendRequest/get/friends`);
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
      const res = await api.get(`/FriendRequest/get/friend-requests`);
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

  const declineFriendRequest = async (senderId) => {
    try {
      await api.post("/FriendRequest/decline", { senderId });
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
      
      <div className="pt-16 sm:pt-18 md:pt-20 pb-4 sm:pb-6 md:pb-8">
        <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-6 xl:px-8">

          {/* Header */}
          <div className="mb-4 sm:mb-5 md:mb-6">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-base-content mb-1 sm:mb-2">Friends</h1>
            <p className="text-sm sm:text-base text-base-content/70">Connect with people and build your network</p>
          </div>

          {/* Message Alert */}
          {message && (
            <div className="alert alert-info mb-4 sm:mb-5 md:mb-6 text-xs sm:text-sm">
              <span>{message}</span>
              <button onClick={() => setMessage("")} className="btn btn-xs sm:btn-sm btn-ghost">
                <FaTimes />
              </button>
            </div>
          )}

          <div className="flex flex-col lg:flex-row gap-4 sm:gap-5 md:gap-6 lg:gap-8 items-start w-full overflow-hidden">

            {/* Left Sidebar */}
            <div className="w-full lg:w-72 xl:w-80 2xl:w-96 flex-shrink-0">
              <div className="space-y-4 sm:space-y-5 md:space-y-6">
                
                {/* Friend Requests Section */}
                <div className="card bg-base-100 shadow-lg border border-base-300 overflow-hidden">
                  <div className="card-body p-3 sm:p-4 lg:p-5">
                    <div className="flex items-center justify-between mb-3 sm:mb-4">
                      <h2 className="text-base sm:text-lg font-bold text-base-content flex items-center gap-2">
                        <FaBell className="text-primary text-sm sm:text-base" />
                        <span className="hidden sm:inline">Friend Requests</span>
                        <span className="sm:hidden">Requests</span>
                      </h2>
                      {friendRequests.length > 0 && (
                        <div className="badge badge-error badge-xs sm:badge-sm">{friendRequests.length}</div>
                      )}
                    </div>
                    
                    {friendRequests.length === 0 ? (
                      <p className="text-base-content/60 text-xs sm:text-sm text-center py-3 sm:py-4">
                        No pending requests
                      </p>
                    ) : (
                      <div className="space-y-2 sm:space-y-3 w-full">
                        {/* Show limited requests initially */}
                        <div className={`space-y-2 sm:space-y-3 w-full ${showMoreRequests ? 'max-h-80 sm:max-h-96 overflow-y-auto overflow-x-hidden pr-2' : ''}`}>
                          {(showMoreRequests ? friendRequests : friendRequests.slice(0, 3)).map((request) => (
                          <div key={request.id} className="p-2 sm:p-3 bg-base-200 rounded-lg">
                            <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                              <div
                                className="avatar cursor-pointer hover:scale-105 transition-transform"
                                onClick={() => navigate(`/profile/${request.senderId}`)}
                              >
                                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-primary">
                                  {request.senderImage ? (
                                    <img src={request.senderImage} alt={request.senderName} className="rounded-full" />
                                  ) : (
                                    <span className="text-xs sm:text-sm text-primary-content flex items-center justify-center w-full h-full">
                                      {request.senderName.charAt(0).toUpperCase()}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="flex-1 min-w-0">
                                <p
                                  className="font-medium text-xs sm:text-sm text-base-content truncate cursor-pointer hover:text-primary transition-colors"
                                  onClick={() => navigate(`/profile/${request.senderId}`)}
                                >
                                  {request.senderName}
                                </p>
                                <p className="text-xs text-base-content/50">
                                  {new Date(request.createdAt).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                            <div className="flex gap-1 sm:gap-2">
                              <button
                                onClick={() => acceptFriendRequest(request.id)}
                                className="btn btn-primary btn-xs text-xs flex-1"
                              >
                                Accept
                              </button>
                              <button
                                onClick={() => declineFriendRequest(request.senderId)}
                                className="btn btn-ghost btn-xs text-xs flex-1"
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
                <div className="card bg-base-100 shadow-lg border border-base-300 overflow-hidden">
                  <div className="card-body p-3 sm:p-4 lg:p-5">
                    <h2 className="text-base sm:text-lg font-bold text-base-content flex items-center gap-2 mb-3 sm:mb-4">
                      <FaSearch className="text-primary text-sm sm:text-base" />
                      <span className="hidden sm:inline">Search Your Friends</span>
                      <span className="sm:hidden">Search</span>
                    </h2>
                    
                    <div className="form-control mb-3 sm:mb-4">
                      <input
                        type="text"
                        placeholder="Search among your friends..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="input input-bordered input-xs sm:input-sm w-full text-xs sm:text-sm"
                      />
                    </div>
                    
                    {searchLoading ? (
                      <div className="flex justify-center py-4">
                        <div className="loading loading-spinner loading-sm text-primary"></div>
                      </div>
                    ) : searchResults.length > 0 ? (
                      <div className="space-y-2 sm:space-y-3 max-h-80 sm:max-h-96 overflow-y-auto overflow-x-hidden pr-2 w-full">
                        {searchResults.slice(0, 3).map((user) => (
                          <div key={user.id} className="p-2 sm:p-3 bg-base-200 rounded-lg">
                            <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                              <div
                                className="avatar cursor-pointer hover:scale-105 transition-transform"
                                onClick={() => navigate(`/profile/${user.id}`)}
                              >
                                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-primary">
                                  {user.image ? (
                                    <img src={user.image} alt={user.name} className="rounded-full" />
                                  ) : (
                                    <span className="text-xs sm:text-sm text-primary-content flex items-center justify-center w-full h-full">
                                      {user.name.charAt(0).toUpperCase()}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="flex-1 min-w-0">
                                <p
                                  className="font-medium text-xs sm:text-sm text-base-content truncate cursor-pointer hover:text-primary transition-colors"
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
                            <div className="flex gap-1 sm:gap-2">
                              <button
                                onClick={() => unfriendUser(user.id, user.name)}
                                className="btn btn-error btn-xs text-xs w-full"
                              >
                                Remove Friend
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
            <div className="flex-1 min-w-0 w-full lg:w-auto">
              <div className="card bg-base-100 shadow-lg border border-base-300 overflow-hidden h-fit">
                <div className="card-body p-3 sm:p-4 md:p-6 lg:p-6 xl:p-8 overflow-hidden">
                  <div className="flex items-center justify-between mb-4 sm:mb-5 md:mb-6">
                    <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-base-content flex items-center gap-2">
                      <FaUserFriends className="text-primary text-base sm:text-lg md:text-xl" />
                      <span className="hidden sm:inline">Your Friends</span>
                      <span className="sm:hidden">Friends</span>
                    </h2>
                    <div className="text-xs sm:text-sm text-base-content/70">
                      {friends.length} {friends.length === 1 ? 'friend' : 'friends'}
                    </div>
                  </div>

                  {loading ? (
                    <div className="flex justify-center py-8 sm:py-10 md:py-12">
                      <div className="loading loading-spinner loading-md sm:loading-lg text-primary"></div>
                    </div>
                  ) : friends.length === 0 ? (
                    <div className="text-center py-8 sm:py-12 md:py-16">
                      <FaUserFriends className="text-4xl sm:text-5xl md:text-6xl text-base-content/20 mx-auto mb-3 sm:mb-4" />
                      <h3 className="text-lg sm:text-xl font-semibold text-base-content mb-2">Your friend list is as empty as your dating life 💔</h3>
                      <p className="text-sm sm:text-base text-base-content/70 mb-4 sm:mb-6">Time to find your meme squad and build that social empire! 👑</p>
                      <div className="text-xs sm:text-sm text-base-content/50">
                        Use the search box on the left to find people to connect with
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4 w-full">
                      {/* Friends Grid Container */}
                      <div className={`w-full ${showMoreFriends ? 'max-h-[32rem] lg:max-h-[36rem] xl:max-h-[40rem] overflow-y-auto overflow-x-hidden pr-2' : ''}`}>
                        <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3 sm:gap-4 lg:gap-4 w-full">
                          {(showMoreFriends ? friends : friends.slice(0, 8)).map((friend) => (
                          <div key={friend.id} className="card bg-base-200 border border-base-300 hover:shadow-lg hover:scale-[1.02] transition-all duration-200 w-full max-w-full overflow-hidden">
                            <div className="card-body p-3 sm:p-4 lg:p-4 xl:p-5 w-full">
                              <div className="flex flex-col items-center text-center space-y-2 sm:space-y-3 w-full">
                                <div
                                  className="avatar cursor-pointer hover:scale-105 transition-transform duration-200"
                                  onClick={() => navigate(`/profile/${friend.friendId}`)}
                                >
                                  <div className="w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 xl:w-18 xl:h-18 rounded-full bg-primary">
                                    {friend.friendImage ? (
                                      <img src={friend.friendImage} alt={friend.friendName} className="rounded-full object-cover w-full h-full" />
                                    ) : (
                                      <span className="text-lg sm:text-xl lg:text-2xl xl:text-3xl text-primary-content flex items-center justify-center w-full h-full font-semibold">
                                        {friend.friendName.charAt(0).toUpperCase()}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                
                                <div className="w-full space-y-1 overflow-hidden">
                                  <h3
                                    className="font-semibold text-sm sm:text-base lg:text-base xl:text-lg text-base-content cursor-pointer hover:text-primary transition-colors truncate w-full px-1"
                                    onClick={() => navigate(`/profile/${friend.friendId}`)}
                                    title={friend.friendName}
                                  >
                                    {friend.friendName}
                                  </h3>
                                  
                                  {friend.friendBio && (
                                    <p className="text-xs sm:text-sm lg:text-sm text-base-content/70 line-clamp-2 min-h-[2rem] sm:min-h-[2.5rem] px-1 break-words">
                                      {friend.friendBio}
                                    </p>
                                  )}

                                  <p className="text-xs lg:text-xs text-base-content/50 truncate w-full px-1" title={friend.friendEmail}>
                                    {friend.friendEmail}
                                  </p>
                                </div>
                                
                                <div className="flex gap-1 sm:gap-2 w-full pt-2">
                                  <button
                                    onClick={() => unfriendUser(friend.friendId, friend.friendName)}
                                    className="btn btn-error btn-xs sm:btn-sm lg:btn-sm text-xs sm:text-sm w-full min-h-[2rem] sm:min-h-[2.5rem]"
                                  >
                                    Remove Friend
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                          ))}
                        </div>
                      </div>
                      
                      {/* Action buttons container */}
                      <div className="space-y-3 pt-2">
                        {/* Loading indicator for infinite scroll */}
                        {showMoreFriends && friendsLoading && (
                          <div className="flex justify-center py-4">
                            <div className="loading loading-spinner loading-md text-primary"></div>
                          </div>
                        )}
                        
                        {/* Load more button for infinite scroll */}
                        {showMoreFriends && friendsHasMore && !friendsLoading && (
                          <div className="text-center">
                            <button
                              onClick={loadMoreFriends}
                              className="btn btn-outline btn-primary btn-sm lg:btn-md"
                            >
                              Load More Friends
                            </button>
                          </div>
                        )}
                        
                        {/* See More/Less toggle */}
                        {!showMoreFriends && friends.length > 8 && (
                          <div className="text-center">
                            <button
                              onClick={() => setShowMoreFriends(true)}
                              className="btn btn-outline btn-primary btn-sm lg:btn-md"
                            >
                              See All Friends ({friends.length} total)
                            </button>
                          </div>
                        )}
                        
                        {showMoreFriends && (
                          <div className="text-center">
                            <button
                              onClick={() => setShowMoreFriends(false)}
                              className="btn btn-ghost btn-sm lg:btn-md"
                            >
                              Show Less
                            </button>
                          </div>
                        )}
                      </div>
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