import React from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import { LoginPage } from "./Pages/LoginPage";
import { RegisterPage } from "./Pages/RegisterPage";
import { HomePage } from "./Pages/HomePage";
import MemeDetector from "./components/MemeDetector";
import { ProfilePage } from "./Pages/ProfilePage";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/Login" element={<LoginPage />}></Route>
        <Route path="/Register" element={<RegisterPage />}></Route>
        <Route path="/" element={<HomePage />}></Route>
        <Route path="/meme-detector" element={<MemeDetector />}></Route>
        <Route path="/Profile" element={<ProfilePage />}></Route>
      </Routes>
    </Router>
  );
}
export default App;
