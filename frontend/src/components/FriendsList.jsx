import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../utils/axios";

export const FriendsList = () => {
  const navigate = useNavigate();
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchFriends = async () => {
    setLoading(true);
    try {
      const res = await api.get("/FriendRequest/get/friends");
      setFriends(res.data);
    } catch (error) {
      console.error("Error fetching friends:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFriends();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-4">
        <span className="loading loading-spinner loading-sm text-primary"></span>
      </div>
    );
  }

  if (friends.length === 0) {
    return (
      <p className="text-base-content/60 text-sm text-center py-4">
        No friends yet
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {friends.map((friend) => (
        <div 
          key={friend.id} 
          className="flex items-center gap-3 p-2 hover:bg-base-200 rounded-lg transition-colors cursor-pointer"
          onClick={() => navigate(`/profile/${friend.friendId}`)}
        >
          <div className="avatar">
            <div className="w-10 h-10 rounded-full bg-primary">
              {friend.friendImage ? (
                <img 
                  src={friend.friendImage} 
                  alt={friend.friendName}
                  className="rounded-full"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-primary-content font-bold">
                  {friend.friendName?.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm text-base-content truncate">
              {friend.friendName}
            </p>
            {friend.friendBio && (
              <p className="text-xs text-base-content/60 truncate">
                {friend.friendBio}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};