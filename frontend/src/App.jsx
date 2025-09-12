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

// ✅ Keep all valid imports from both branches
import CreateGroup from "./components/CreateGroup";
import GroupList from "./components/GroupList";
import GroupManager from "./components/GroupManager";
import ChatSidebar from "./components/ChatSidebar";
import { FriendsPage } from "./Pages/FriendsPage";
import { PublicProfile } from "./components/PublicProfile";
import { SettingsPage } from "./Pages/Settings";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/forgot-password/" element={<ForgotPassPage />} />
        {/* <Route path="/Login" element={<LoginPage />} /> */}
        <Route path="/Register" element={<RegisterPage />} />
        <Route path="/" element={<HomePage />} />
        <Route path="/meme-detector" element={<MemeDetector />} />
        <Route path="/Profile" element={<ProfilePage />} />
        <Route path="/verify-email" element={<EmailVerificationPage />} />
        <Route path="/reset-password" element={<ForgotPassValidationPage />} />
        <Route path="/chat/private/:userId" element={<PrivateChatPage />} />
        <Route path="/chat/group/:groupId" element={<GroupChatPage />} />
        <Route path="/chat/group/create" element={<CreateGroupPage />} />
        <Route path="/chat/group/manage/:groupId" element={<GroupManagePage />} />

        {/* ✅ Additional routes from both branches */}
        <Route path="/groups/create" element={<CreateGroup />} />
        <Route path="/groups/list" element={<GroupList />} />
        <Route path="/groups/manage" element={<GroupManager />} />
        <Route path="/chat/side" element={<ChatSidebar />} />
        <Route path="/friends" element={<FriendsPage />} />
        <Route path="/profile/:userId" element={<PublicProfile />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Routes>
    </Router>
  );
}

export default App;
