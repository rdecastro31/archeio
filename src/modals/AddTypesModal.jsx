export default function AddTypesModal({
  show,
  formData,
  onChange,
  onSubmit,
  onClose,
  classifications = [],
}) {
  if (!show) return null

   // 1. Intercept the form submission
  const handleSubmit = (e) => {
    e.preventDefault(); // 👈 This explicitly stops the browser hard reload
    onSubmit();         // 👈 Fires your handleCreateFolder function safely
  };

  return (
    <div className="modal-backdrop">
      <div className="category-modal wide-modal">
        <div className="modal-header">
          <h2>Add Document Type</h2>
          <button className="modal-close" onClick={onClose}>
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="category-form">
          <div className="form-grid">
            {/* TYPE NAME */}
            <div className="form-group">
              <label>Type Name *</label>
              <input
                type="text"
                name="type_name"
                value={formData.type_name || ""}
                onChange={onChange}
                placeholder="e.g. Purchase Request"
              />
            </div>

            {/* SHORT NAME */}
            <div className="form-group">
              <label>Short Name *</label>
              <input
                type="text"
                name="short_name"
                value={formData.short_name || ""}
                onChange={onChange}
                placeholder="e.g. PR"
              />
            </div>

            {/* CLASSIFICATION */}
            <div className="form-group">
              <label>Classification *</label>
              <select
                name="classification_id"
                value={formData.classification_id || ""}
                onChange={onChange}
              >
                <option value="">Select classification</option>
                {classifications.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.classification_name}
                  </option>
                ))}
              </select>
            </div>

            {/* RETENTION PERIOD */}
            <div className="form-group">
              <label>Retention Period *</label>
              <input
                type="number"
                name="retention_period"
                value={formData.retention_period || ""}
                onChange={onChange}
                placeholder="e.g. 3"
                min="1"
              />
            </div>

            {/* RETENTION UNIT */}
            <div className="form-group">
              <label>Retention Unit *</label>
              <select
                name="retention_unit"
                value={formData.retention_unit || ""}
                onChange={onChange}
              >
                <option value="">Select unit</option>
                <option value="Day">Day</option>
                <option value="Month">Month</option>
                <option value="Year">Year</option>
              </select>
            </div>
          </div>

          {/* DESCRIPTION */}
          <div className="form-group">
            <label>Description</label>
            <textarea
              name="description"
              value={formData.description || ""}
              onChange={onChange}
              placeholder="Enter description..."
              rows="3"
            />
          </div>

          {/* ACTIONS */}
          <div className="modal-actions">
            <button
              type="button"
              className="cancel-btn"
              onClick={onClose}
            >
              Cancel
            </button>

            <button type="submit" className="primary-btn">
              Save Document Type
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}