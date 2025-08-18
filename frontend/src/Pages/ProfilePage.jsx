import React, { useContext, useEffect } from "react";
import { VerifyContext } from "../../context/create_verify_context";
import { useNavigate } from "react-router-dom";
import api from "../utils/axios";

export const ProfilePage = () => {
  const [user, setUser] = React.useState({
    name: "",
    email: "",
    bio: "",
    image: "",
  });
  const { isVerified, verifyUser, loading } = useContext(VerifyContext);
  const navigate = useNavigate();
  useEffect(() => {
    verifyUser();
  }, [verifyUser]);
  useEffect(() => {
    if (!isVerified && !loading) {
      navigate("/Login");
    }
  }, [isVerified, navigate, loading]);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await api.get("/User/profile");
        setUser(res.data);
        console.log(res.data);
      } catch (error) {
        console.log(error);
      }
    };
    fetchUser();
  }, []);
  const handleDelete = async () => {
    await api.delete("/User/delete");
    localStorage.removeItem("token");
    navigate("/auth");
  };
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.put("/User/profile", user);
      console.log("Profile updated successfully");
    } catch (error) {
      console.log(error);
    }
  };
  return (
    <div>
      <h1>Profile</h1>
      {user && (
        <>
          <img src={user.image} alt="Profile" />
          <p>Name: {user.name}</p>
          <p>Email: {user.email}</p>
          <p>Bio: {user.bio}</p>
        </>
      )}
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Name"
          value={user.name}
          onChange={(e) => setUser({ ...user, name: e.target.value })}
        />
        <input
          type="text"
          placeholder="Email"
          value={user.email}
          onChange={(e) => setUser({ ...user, email: e.target.value })}
        />
        <input
          type="text"
          placeholder="Bio"
          value={user.bio}
          onChange={(e) => setUser({ ...user, bio: e.target.value })}
        />
        <input
          type="text"
          placeholder="Image"
          value={user.image}
          onChange={(e) => setUser({ ...user, image: e.target.value })}
        />
        <button type="submit">Update Profile</button>
      </form>
      <button onClick={handleDelete}>Delete Account</button>
    </div>
  );
};
