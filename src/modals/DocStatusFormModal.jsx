import { FiX } from 'react-icons/fi'

export default function DocStatusFormModal({ show, isEditing, formData, onChange, onSubmit, onClose }) {
    if (!show) return null

    return (
        <div className="modal-overlay">
            <div className="category-modal">
                <div className="modal-header">
                    <div>
                        <h2>{isEditing ? 'Update Status' : 'Add New Status'}</h2>
                        <p>{isEditing ? 'Modify status workflow details.' : 'Define a new document lifecycle status.'}</p>
                    </div>
                    <button className="modal-close-btn" onClick={onClose}><FiX /></button>
                </div>

                <form onSubmit={onSubmit} className="category-form">
                    <div className="form-group">
                        <label>Status Name</label>
                        <input
                            type="text"
                            name="status_name"
                            placeholder="e.g., Pending Approval"
                            value={formData.status_name || ""}
                            onChange={onChange}
                        />
                    </div>

                    <div className="form-group">
                        <label>Description</label>
                        <textarea
                            name="description"
                            placeholder="Describe when this status should be used..."
                            value={formData.description || ""}
                            onChange={onChange}
                            rows="3"
                        />
                    </div>

                    {isEditing && Number(formData.is_system) !== 1 && (
                        <div className="form-group">
                            <label>Status Visibility</label>
                            <select name="status" value={formData.status} onChange={onChange}>
                                <option value="Active">Active</option>
                                <option value="Inactive">Inactive</option>
                            </select>
                        </div>
                    )}

                    <div className="modal-actions">
                        <button type="button" className="secondary-btn" onClick={onClose}>Cancel</button>
                        <button type="submit" className="primary-btn">
                            {isEditing ? 'Save Changes' : 'Save Status'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}