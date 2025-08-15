import React from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import { LoginPage } from "./Pages/LoginPage";
import { RegisterPage } from "./Pages/RegisterPage";
import { PostPage } from "./Pages/PostPage";
import { HomePage } from "./Pages/HomePage";
import MemeDetector from "./components/MemeDetector";
function App() {
  return (
    <Router>
      <Routes>
        <Route path="/Login" element={<LoginPage />}></Route>
        <Route path="/Register" element={<RegisterPage />}></Route>
        <Route path="/Post" element={<PostPage />}></Route>
        <Route path="/" element={<HomePage />}></Route>
        <Route path="/meme-detector" element={<MemeDetector />}></Route>
      </Routes>
    </Router>
  );
}
export default App;
