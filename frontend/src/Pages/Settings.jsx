import React, { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/axios';
import toast from 'react-hot-toast';
import { FaTrashAlt, FaExclamationTriangle, FaArrowLeft } from 'react-icons/fa';
import { VerifyContext } from "../../context/create_verify_context";

export const SettingsPage = () => {
  const { isVerified, verifyUser, loading, logout } = useContext(VerifyContext);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const navigate = useNavigate();

  // The exact phrase the user must type to enable the delete button
  const requiredConfirmText = 'DELETE MY ACCOUNT';

  useEffect(() => {
    verifyUser();
  }, []);

  useEffect(() => {
    if (!isVerified && !loading) {
      navigate("/auth");
    }
  }, [isVerified, loading, navigate]);

  const handleOpenModal = () => setIsModalOpen(true);

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setConfirmText('');
    setIsDeleting(false);
  };

  const handleDeleteAccount = async () => {
    if (confirmText !== requiredConfirmText) {
      toast.error("The confirmation text does not match.");
      return;
    }

    setIsDeleting(true);
    const toastId = toast.loading("Deleting your account...");

    try {
      await api.delete('/User/delete');
      toast.success("Account deleted successfully.", { id: toastId });
      logout();
      navigate("/auth");

    } catch (error) {
      toast.error("Failed to delete account. Please try again.", { id: toastId });
      console.error("Error deleting account:", error);
      setIsDeleting(false);
    }
  };


  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-base-300">
        <div className="loading loading-bars loading-lg text-primary"></div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-base-300 min-h-screen p-4 sm:p-8">
        <div className="max-w-2xl mx-auto space-y-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(-1)}
              className="btn btn-ghost btn-circle"
            >
              <FaArrowLeft className="text-xl" />
            </button>
            <h1 className="text-4xl font-bold text-base-content">Settings</h1>
          </div>

          {/* Danger Zone Section */}
          <div className="card bg-base-100 shadow-xl border border-error">
            <div className="card-body">
              <h2 className="card-title text-error flex items-center gap-2">
                <FaExclamationTriangle />
                <span>Danger Zone</span>
              </h2>
              <p className="text-base-content/80">
                These actions are permanent and cannot be undone. Please proceed with caution.
              </p>

              <div className="divider"></div>

              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h3 className="font-bold text-base-content">Delete your account</h3>
                  <p className="text-sm text-base-content/70">
                    Once you delete your account, all of your posts, comments, and data will be permanently removed.
                  </p>
                </div>
                <button
                  onClick={handleOpenModal}
                  className="btn btn-error w-full sm:w-auto flex-shrink-0"
                >
                  <FaTrashAlt />
                  Delete Account
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {isModalOpen && (
        <div className="modal modal-open">
          <div className="modal-box bg-base-200">
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
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                className="input input-bordered input-error w-full"
                placeholder="Type the confirmation text"
              />
            </div>

            <div className="modal-action">
              <button onClick={handleCloseModal} className="btn btn-ghost" disabled={isDeleting}>
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                className="btn btn-error"
                // Disable button until the user types the exact phrase
                disabled={confirmText !== requiredConfirmText || isDeleting}
              >
                {isDeleting ? <span className="loading loading-spinner"></span> : "Confirm Deletion"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};