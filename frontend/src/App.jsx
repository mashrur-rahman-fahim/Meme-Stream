import React from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import { AuthPage } from "./Pages/AuthPage";
import { HomePage } from "./Pages/HomePage";
import MemeDetector from "./components/MemeDetector";
import { ProfilePage } from "./Pages/ProfilePage";
import { EmailVerificationPage } from "./Pages/EmailVerificationPage";
import { SendEmailVerificationPage } from "./Pages/SendEmailVerificationPage";
import { ForgotPassPage } from "./Pages/ForgotPassPage";
import { ForgotPassValidationPage } from "./Pages/ForgotPassValidationPage";
import { LoginPage } from "./Pages/LoginPage";
import { RegisterPage } from "./Pages/RegisterPage";
import PrivateChatPage from "./Pages/PrivateChatPage";
import GroupChatPage from "./Pages/GroupChatPage";
import CreateGroupPage from "./Pages/CreateGroupPage";
import GroupManagePage from "./Pages/GroupManagePage";
import { FriendsPage } from "./Pages/FriendsPage";
import { PublicProfile } from "./components/PublicProfile";
import { SettingsPage } from "./Pages/Settings";
import NotificationsPage from "./Pages/NotificationsPage";
import { SinglePostPage } from "./Pages/SinglePostPage";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/auth" element={<AuthPage />}></Route>
        <Route path="/forgot-password/" element={<ForgotPassPage />}></Route>
        {/* <Route path="/Login" element={<LoginPage />}></Route> */}
        <Route path="/Register" element={<RegisterPage />}></Route>
        <Route path="/" element={<HomePage />}></Route>
        <Route path="/meme-detector" element={<MemeDetector />}></Route>
        <Route path="/Profile" element={<ProfilePage />}></Route>
        <Route path="/verify-email" element={<EmailVerificationPage />}></Route>
        <Route
          path="/reset-password"
          element={<ForgotPassValidationPage />}
        ></Route>
        <Route path="/chat/private/:userId" element={<PrivateChatPage />} />
        <Route path="/chat/group/:groupId" element={<GroupChatPage />} />
        <Route path="/chat/group/create" element={<CreateGroupPage />} />
        <Route path="/chat/group/manage/:groupId" element={<GroupManagePage />} />
        <Route path="/friends" element={<FriendsPage />} />
        <Route path="/profile/:userId" element={<PublicProfile />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/notifications" element={<NotificationsPage />} />
        <Route path="/posts/:postId" element={<SinglePostPage />} />
        
      </Routes>
    </Router>
  );
}
export default App;
