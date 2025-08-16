import React from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import { AuthPage } from "./Pages/AuthPage";
import { HomePage } from "./Pages/HomePage";
import MemeDetector from "./components/MemeDetector";
import { ProfilePage } from "./Pages/ProfilePage";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/auth" element={<AuthPage />}></Route>
        <Route path="/" element={<HomePage />}></Route>
        <Route path="/meme-detector" element={<MemeDetector />}></Route>
        <Route path="/Profile" element={<ProfilePage />}></Route>
      </Routes>
    </Router>
  );
}
export default App;
