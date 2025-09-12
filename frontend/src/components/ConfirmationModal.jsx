export const ConfirmationModal = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = 'Confirm',
    confirmButtonClass = 'btn-primary',
    isLoading = false
}) => {
    if (!isOpen) {
        return null;
    }

    return (
        <div className="modal modal-open">
            <div className="modal-box bg-base-200">
                <h3 className="font-bold text-xl text-base-content">{title}</h3>
                <p className="py-4 text-base-content/80">{message}</p>
                <div className="modal-action">
                    <button onClick={onClose} className="btn btn-ghost" disabled={isLoading}>
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        className={`btn ${confirmButtonClass}`}
                        disabled={isLoading}
                    >
                        {isLoading ? <span className="loading loading-bars"></span> : confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};