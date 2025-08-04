import React from 'react'
import api from '../utils/axios';

export const RegisterPage = () => {
    const [formData, setFormData] = React.useState({
        email: "",
        password: "",
        name: "",
        bio: "",
        image: ""
    });
    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const res = await api.post("/User/register", formData, {
                headers: {
                    "Content-Type": "application/json",
                },
            });
            console.log("Registration successful:", res.data);
            localStorage.setItem("token", res.data.token); // Store the token in localStorage
        } catch (error) {
            console.error("Registration failed:", error);
        }
    }
  return (
    <div>
      <form>
        <input
          type="text"
          placeholder="Name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        />
        <input
          type="text"
          placeholder="Bio"
          value={formData.bio}
          onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
        />
        <input
          type="text"
          placeholder="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
        />
        <input
          type="text"
          placeholder="Password"
          value={formData.password}
          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
        />
        <input
          type="text"
          placeholder="Image URL"
          value={formData.image}
          onChange={(e) => setFormData({ ...formData, image: e.target.value })}
        />
        <button onClick={handleSubmit} type="submit">Register</button>
      </form>
    </div>
  )
}
