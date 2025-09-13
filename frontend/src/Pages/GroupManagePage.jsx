import { useEffect, useState } from "react";
import api from "../utils/axios";
import { useParams } from "react-router-dom";

const GroupManagePage = () => {
  const { groupId } = useParams();
  const token = localStorage.getItem("token");
  const [members, setMembers] = useState([]);
  const [friends, setFriends] = useState([]);
  const [selectedFriend, setSelectedFriend] = useState("");

  useEffect(() => {
    const fetchMembers = async () => {
      const res = await api.get(`/chat/group/${groupId}/members`, {
      });
      setMembers(res.data);
    };

    const fetchFriends = async () => {
      const res = await api.get("/ChatSidebar/friends", {
      });
      setFriends(res.data);
    };

    fetchMembers();
    fetchFriends();
  }, [groupId]);

  const handleAdd = async () => {
    if (!selectedFriend) return;
    await api.post(`/chat/group/${groupId}/add`, selectedFriend, {
    });
    setSelectedFriend("");
    window.location.reload();
  };

  const handleRemove = async (userId) => {
    await api.delete(`/chat/group/${groupId}/remove/${userId}`, {
    });
    window.location.reload();
  };

  return (
    <div className="p-4 max-w-xl mx-auto">
      <h2 className="text-xl font-bold mb-4">Manage Group</h2>

      <div className="mb-6">
        <h3 className="font-semibold mb-2">Members</h3>
        {members.map((member) => (
          <div key={member.id} className="flex justify-between items-center mb-2">
            <span>{member.name}</span>
            <button className="btn btn-sm btn-error" onClick={() => handleRemove(member.id)}>
              Remove
            </button>
          </div>
        ))}
      </div>

      <div>
        <h3 className="font-semibold mb-2">Add Friend to Group</h3>
        <select
          className="select select-bordered w-full mb-2"
          value={selectedFriend}
          onChange={(e) => setSelectedFriend(e.target.value)}
        >
          <option value="">Select friend</option>
          {friends.map((f) => (
            <option key={f.id} value={f.id}>{f.name}</option>
          ))}
        </select>
        <button className="btn btn-primary w-full" onClick={handleAdd}>
          Add to Group
        </button>
      </div>
    </div>
  );
};

export default GroupManagePage;
