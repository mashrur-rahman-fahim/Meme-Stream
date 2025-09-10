import { useState } from "react";
import axios from "axios";

const CreateGroupPage = () => {
  const [groupName, setGroupName] = useState("");
  const token = localStorage.getItem("token");

  const handleCreate = async () => {
    try {
      await axios.post("http://localhost:5216/api/chat/group", {
        name: groupName,
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert("Group created!");
      setGroupName("");
    } catch (err) {
      console.error(err);
      alert("Failed to create group");
    }
  };

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Create Group</h2>
      <input
        type="text"
        className="input input-bordered w-full mb-2"
        placeholder="Group name"
        value={groupName}
        onChange={(e) => setGroupName(e.target.value)}
      />
      <button className="btn btn-primary w-full" onClick={handleCreate}>
        Create
      </button>
    </div>
  );
};

export default CreateGroupPage;
