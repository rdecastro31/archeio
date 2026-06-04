import { FiX } from 'react-icons/fi'

export default function AddDepartmentModal({
  show,
  isEditing,
  formData,
  onChange,
  onSubmit,
  onClose
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
          <h2>{isEditing ? 'Update Department' : 'Add Department'}</h2>

          <button className="modal-close-btn" onClick={onClose}>
            <FiX />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="category-form">

          <div className="form-group">
            <label>Department Name</label>
            <input
              type="text"
              name="department_name"
              value={formData.department_name || ""}
              onChange={onChange}
              placeholder="Enter department name"
            />
          </div>

          <div className="form-group">
            <label>Description</label>
            <textarea
              name="description"
              value={formData.description || ""}
              onChange={onChange}
              placeholder="Enter description"
              rows="3"
            />
          </div>

          <div className="form-group">
            <label>Status</label>
            <select
              name="status"
              value={formData.status || "Active"}
              onChange={onChange}
            >
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>

          <div className="modal-actions">
            <button
              type="button"
              className="secondary-btn"
              onClick={onClose}
            >
              Cancel
            </button>

            <button type="submit" className="primary-btn">
              {isEditing ? 'Save Changes' : 'Save Department'}
            </button>
          </div>

        </form>
      </div>
    </div>
  )
}