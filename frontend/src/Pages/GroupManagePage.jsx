import { useEffect, useState } from "react";
import axios from "axios";
import { useParams } from "react-router-dom";

const GroupManagePage = () => {
  const { groupId } = useParams();
  const token = localStorage.getItem("token");
  const [members, setMembers] = useState([]);
  const [friends, setFriends] = useState([]);
  const [selectedFriend, setSelectedFriend] = useState("");

  useEffect(() => {
    const fetchMembers = async () => {
      const res = await axios.get(`http://localhost:5216/api/chat/group/${groupId}/members`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setMembers(res.data);
    };

    const fetchFriends = async () => {
      const res = await axios.get("http://localhost:5216/api/ChatSidebar/friends", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setFriends(res.data);
    };

    fetchMembers();
    fetchFriends();
  }, [groupId]);

  const handleAdd = async () => {
    if (!selectedFriend) return;
    await axios.post(`http://localhost:5216/api/chat/group/${groupId}/add`, selectedFriend, {
      headers: { Authorization: `Bearer ${token}` },
    });
    setSelectedFriend("");
    window.location.reload();
  };

  const handleRemove = async (userId) => {
    await axios.delete(`http://localhost:5216/api/chat/group/${groupId}/remove/${userId}`, {
      headers: { Authorization: `Bearer ${token}` },
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
