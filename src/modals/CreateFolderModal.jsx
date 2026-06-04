import { FiX, FiFolder } from 'react-icons/fi'

export default function CreateFolderModal({
    show,
    onClose,
    formData,
    setFormData,
    onSubmit
}) {
    if (!show) return null

    // 1. Intercept the form submission
    const handleSubmit = (e) => {
        e.preventDefault(); // 👈 This explicitly stops the browser hard reload
        onSubmit();         // 👈 Fires your handleCreateFolder function safely
    };

    return (
        <div className="modal-overlay">
            <div className="category-modal">
                <div className="modal-header">
                    <div>
                        <h2>Create New Folder</h2>
                        <p>Organize your files by creating a new directory.</p>
                    </div>

                    <button className="modal-close-btn" onClick={onClose}>
                        <FiX />
                    </button>
                </div>

                {/* 2. Update the form onSubmit prop to look at the interceptor */}
                <form onSubmit={handleSubmit} className="category-form">
                    <div className="form-group">
                        <label>Folder Name</label>
                        <div style={{ position: 'relative' }}>
                            <input
                                autoFocus
                                type="text"
                                placeholder="Enter folder name"
                                value={formData.name || ""}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                required
                            />
                        </div>
                    </div>

                    <div className="modal-actions">
                        <button type="button" className="secondary-btn" onClick={onClose}>
                            Cancel
                        </button>

                        <button type="submit" className="primary-btn">
                            Create Folder
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}