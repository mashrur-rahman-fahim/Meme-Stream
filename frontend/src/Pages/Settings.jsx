import React, { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { VerifyContext } from "../../context/create_verify_context";
import userService from '../services/userService';
import { 
  FaArrowLeft, 
  FaUser, 
  FaBell, 
  FaLock, 
  FaPalette, 
  FaTrashAlt, 
  FaExclamationTriangle,
  FaSave,
  FaSpinner,
  FaEdit,
  FaKey,
  FaDownload,
  FaCog,
  FaToggleOn,
  FaToggleOff
} from 'react-icons/fa';
import ProfileEditModal from '../components/ProfileEditModal';
import ThemeSwitcher from '../components/ThemeSwitcher';

export const SettingsPage = () => {
  const { isVerified, verifyUser, loading, logout, user, updateUser } = useContext(VerifyContext);
  const navigate = useNavigate();

  // Modal states
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  
  // Form states
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');
  
  // Settings states
  const [notificationSettings, setNotificationSettings] = useState({
    likes: true,
    comments: true,
    shares: true,
    friendRequests: true,
    mentions: true,
    emailNotifications: false,
    pushNotifications: true
  });
  

  const [passwordForm, setPasswordForm] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [isLoading, setIsLoading] = useState({
    notifications: false,
    password: false
  });

  const requiredConfirmText = 'DELETE MY ACCOUNT';

  useEffect(() => {
    verifyUser();
  }, []);

  useEffect(() => {
    if (!isVerified && !loading) {
      navigate("/auth");
    }
  }, [isVerified, loading, navigate]);

  useEffect(() => {
    if (isVerified) {
      loadUserSettings();
    }
  }, [isVerified]);

  const loadUserSettings = async () => {
    try {
      // Load notification preferences
      const notifResult = await userService.getNotificationPreferences();
      if (notifResult.success) {
        setNotificationSettings(prev => ({ ...prev, ...notifResult.data }));
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const handleNotificationChange = async (setting, value) => {
    setNotificationSettings(prev => ({ ...prev, [setting]: value }));
    
    setIsLoading(prev => ({ ...prev, notifications: true }));
    const result = await userService.updateNotificationPreferences({
      ...notificationSettings,
      [setting]: value
    });
    
    if (result.success) {
      toast.success('Notification settings updated');
    } else {
      toast.error(result.error);
      // Revert on error
      setNotificationSettings(prev => ({ ...prev, [setting]: !value }));
    }
    setIsLoading(prev => ({ ...prev, notifications: false }));
  };


  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setIsLoading(prev => ({ ...prev, password: true }));
    const result = await userService.changePassword(
      passwordForm.oldPassword, 
      passwordForm.newPassword
    );
    
    if (result.success) {
      toast.success('Password changed successfully');
      setPasswordForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
      setIsPasswordModalOpen(false);
    } else {
      toast.error(result.error);
    }
    setIsLoading(prev => ({ ...prev, password: false }));
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== requiredConfirmText) {
      toast.error("The confirmation text does not match.");
      return;
    }

    setIsDeleting(true);
    const toastId = toast.loading("Deleting your account...");

    const result = await userService.deleteAccount();
    
    if (result.success) {
      toast.success("Account deleted successfully.", { id: toastId });
      logout();
      navigate("/auth");
    } else {
      toast.error(result.error, { id: toastId });
      setIsDeleting(false);
    }
  };

  const handleExportData = async () => {
    const toastId = toast.loading("Preparing your data export...");
    
    const result = await userService.exportUserData();
    
    if (result.success) {
      // Create download link
      const url = window.URL.createObjectURL(new Blob([result.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `memestream-data-${new Date().toISOString().split('T')[0]}.json`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success("Data export downloaded successfully", { id: toastId });
    } else {
      toast.error(result.error, { id: toastId });
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-base-200">
        <div className="loading loading-bars loading-lg text-primary"></div>
      </div>
    );
  }

  const tabs = [
    { id: 'profile', label: 'Profile', icon: FaUser },
    { id: 'notifications', label: 'Notifications', icon: FaBell },
    { id: 'security', label: 'Security', icon: FaLock },
    { id: 'appearance', label: 'Appearance', icon: FaPalette },
    { id: 'account', label: 'Account', icon: FaCog },
  ];

  return (
    <>
      <div className="bg-base-200 min-h-screen">
        {/* Header */}
        <div className="bg-base-100 shadow-sm border-b border-base-300">
          <div className="max-w-6xl mx-auto px-4 py-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate(-1)}
                className="btn btn-ghost btn-circle"
              >
                <FaArrowLeft className="text-xl" />
              </button>
              <h1 className="text-2xl font-bold text-base-content">Settings</h1>
            </div>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Sidebar Navigation */}
            <div className="w-full lg:w-64 flex-shrink-0">
              <div className="bg-base-100 rounded-lg shadow-sm border border-base-300 p-2">
                <nav className="space-y-1">
                  {tabs.map((tab) => {
                    const Icon = tab.icon;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                          activeTab === tab.id
                            ? 'bg-primary text-primary-content'
                            : 'text-base-content hover:bg-base-200'
                        }`}
                      >
                        <Icon className="text-lg" />
                        {tab.label}
                      </button>
                    );
                  })}
                </nav>
              </div>
            </div>

            {/* Main Content */}
            <div className="flex-1">
              <div className="bg-base-100 rounded-lg shadow-sm border border-base-300">
                
                {/* Profile Settings */}
                {activeTab === 'profile' && (
                  <div className="p-6">
                    <div className="flex items-center gap-3 mb-6">
                      <FaUser className="text-2xl text-primary" />
                      <h2 className="text-xl font-semibold">Profile Settings</h2>
                    </div>

                    <div className="space-y-6">
                      {/* Current Profile Info */}
                      <div className="flex items-center gap-4 p-4 bg-base-200 rounded-lg">
                        <div className="avatar">
                          <div className="w-16 h-16 rounded-full">
                            {user?.image ? (
                              <img src={user.image} alt={user.name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full bg-primary text-primary-content flex items-center justify-center rounded-full">
                                <FaUser className="text-2xl" />
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold">{user?.name}</h3>
                          <p className="text-base-content/70">{user?.email}</p>
                          <p className="text-sm text-base-content/60 mt-1">{user?.bio || 'No bio set'}</p>
                        </div>
                        <button
                          onClick={() => setIsProfileModalOpen(true)}
                          className="btn btn-primary"
                        >
                          <FaEdit className="mr-2" />
                          Edit Profile
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Notification Settings */}
                {activeTab === 'notifications' && (
                  <div className="p-6">
                    <div className="flex items-center gap-3 mb-6">
                      <FaBell className="text-2xl text-primary" />
                      <h2 className="text-xl font-semibold">Notification Settings</h2>
                    </div>

                    <div className="space-y-4">
                      {Object.entries({
                        likes: 'Reactions on your posts',
                        comments: 'Comments on your posts',
                        shares: 'Shares of your posts',
                        friendRequests: 'Friend requests',
                        mentions: 'When someone mentions you',
                        emailNotifications: 'Email notifications',
                        pushNotifications: 'Push notifications'
                      }).map(([key, label]) => (
                        <div key={key} className="flex items-center justify-between p-4 bg-base-200 rounded-lg">
                          <div>
                            <h3 className="font-medium">{label}</h3>
                          </div>
                          <button
                            onClick={() => handleNotificationChange(key, !notificationSettings[key])}
                            disabled={isLoading.notifications}
                            className="btn btn-ghost btn-sm"
                          >
                            {notificationSettings[key] ? (
                              <FaToggleOn className="text-2xl text-primary" />
                            ) : (
                              <FaToggleOff className="text-2xl text-base-content/50" />
                            )}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Security Settings */}
                {activeTab === 'security' && (
                  <div className="p-6">
                    <div className="flex items-center gap-3 mb-6">
                      <FaLock className="text-2xl text-primary" />
                      <h2 className="text-xl font-semibold">Security Settings</h2>
                    </div>

                    <div className="space-y-4">
                      <div className="p-4 bg-base-200 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-medium">Change Password</h3>
                            <p className="text-sm text-base-content/70">Update your account password</p>
                          </div>
                          <button
                            onClick={() => setIsPasswordModalOpen(true)}
                            className="btn btn-outline"
                          >
                            <FaKey className="mr-2" />
                            Change Password
                          </button>
                        </div>
                      </div>

                      <div className="p-4 bg-base-200 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-medium">Download Your Data</h3>
                            <p className="text-sm text-base-content/70">Export all your account data</p>
                          </div>
                          <button
                            onClick={handleExportData}
                            className="btn btn-outline"
                          >
                            <FaDownload className="mr-2" />
                            Export Data
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Appearance Settings */}
                {activeTab === 'appearance' && (
                  <div className="p-6">
                    <div className="flex items-center gap-3 mb-6">
                      <FaPalette className="text-2xl text-primary" />
                      <h2 className="text-xl font-semibold">Appearance Settings</h2>
                    </div>

                    <div className="space-y-6">
                      <div>
                        <h3 className="font-medium mb-4">Theme</h3>
                        <ThemeSwitcher />
                      </div>
                    </div>
                  </div>
                )}

                {/* Account Settings */}
                {activeTab === 'account' && (
                  <div className="p-6">
                    <div className="flex items-center gap-3 mb-6">
                      <FaCog className="text-2xl text-primary" />
                      <h2 className="text-xl font-semibold">Account Settings</h2>
                    </div>

                    {/* Danger Zone */}
                    <div className="border border-error rounded-lg p-6 bg-error/5">
                      <h3 className="text-xl font-semibold text-error mb-2 flex items-center gap-2">
                        <FaExclamationTriangle />
                        Danger Zone
                      </h3>
                      <p className="text-base-content/80 mb-4">
                        These actions are permanent and cannot be undone. Please proceed with caution.
                      </p>

                      <div className="space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 bg-base-200 rounded-lg">
                          <div>
                            <h4 className="font-bold text-base-content">Delete your account</h4>
                            <p className="text-sm text-base-content/70">
                              Once you delete your account, all of your posts, comments, and data will be permanently removed.
                            </p>
                          </div>
                          <button
                            onClick={() => setIsDeleteModalOpen(true)}
                            className="btn btn-error w-full sm:w-auto flex-shrink-0"
                          >
                            <FaTrashAlt />
                            Delete Account
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Profile Edit Modal */}
      <ProfileEditModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        currentUser={user}
        onUpdate={updateUser}
      />

      {/* Password Change Modal */}
      {isPasswordModalOpen && (
        <div className="modal modal-open">
          <div className="modal-box">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-xl">Change Password</h3>
              <button onClick={() => setIsPasswordModalOpen(false)} className="btn btn-ghost btn-circle btn-sm">
                ×
              </button>
            </div>

            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Current Password</span>
                </label>
                <input
                  type="password"
                  value={passwordForm.oldPassword}
                  onChange={(e) => setPasswordForm(prev => ({ ...prev, oldPassword: e.target.value }))}
                  className="input input-bordered"
                  required
                />
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text">New Password</span>
                </label>
                <input
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                  className="input input-bordered"
                  required
                  minLength={6}
                />
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text">Confirm New Password</span>
                </label>
                <input
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  className="input input-bordered"
                  required
                  minLength={6}
                />
              </div>

              <div className="modal-action">
                <button 
                  type="button" 
                  onClick={() => setIsPasswordModalOpen(false)} 
                  className="btn btn-ghost"
                  disabled={isLoading.password}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary"
                  disabled={isLoading.password}
                >
                  {isLoading.password ? <FaSpinner className="animate-spin mr-2" /> : <FaSave className="mr-2" />}
                  Change Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-xl text-error flex items-center gap-2">
              <FaExclamationTriangle />
              Are you absolutely sure?
            </h3>
            <p className="py-4 text-base-content/80">
              This action is irreversible. All your data will be permanently lost. To confirm, please type <strong className="text-error">{requiredConfirmText}</strong> below.
            </p>

            <div className="form-control">
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                className="input input-bordered input-error w-full"
                placeholder="Type the confirmation text"
              />
            </div>

            <div className="modal-action">
              <button 
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setDeleteConfirmText('');
                }} 
                className="btn btn-ghost" 
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                className="btn btn-error"
                disabled={deleteConfirmText !== requiredConfirmText || isDeleting}
              >
                {isDeleting ? <FaSpinner className="animate-spin" /> : "Confirm Deletion"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};