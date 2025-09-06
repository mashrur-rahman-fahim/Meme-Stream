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
import CreateGroup from "./components/CreateGroup";
import GroupList from "./components/GroupList";
import GroupManager from "./components/GroupManager";
import ChatSidebar from "./components/ChatSidebar";

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
        <Route path="/groups/create" element={<CreateGroup />} />
        <Route path="/groups/list" element={<GroupList />} />
        <Route path="/groups/manage" element={<GroupManager />} />
        <Route path="/chat/side" element={<ChatSidebar />} />

        
      </Routes>
    </Router>
  );
}
export default App;
