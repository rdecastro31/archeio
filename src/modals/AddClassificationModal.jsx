export default function AddClassificationModal({
  show,
  formData,
  setFormData,
  categories,
  onClose,
  onSubmit,
}) {
  if (!show) return null

   // 1. Intercept the form submission
  const handleSubmit = (e) => {
    e.preventDefault(); // 👈 This explicitly stops the browser hard reload
    onSubmit();         // 👈 Fires your handleCreateFolder function safely
  };

  return (
    <div className="modal-backdrop">
      <div className="category-modal">
        <div className="modal-header">
          <h2>Add Classification</h2>
          <button className="modal-close" onClick={onClose}>
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Category</label>
            <select
              value={formData.category_id}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  category_id: e.target.value,
                }))
              }
              required
            >
              <option value="">Select category</option>

              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.category_name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Classification Name</label>
            <input
              type="text"
              value={formData.classification_name}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  classification_name: e.target.value,
                }))
              }
              placeholder="Enter classification name"
              required
            />
          </div>

          <div className="form-group">
            <label>Short Name</label>
            <input
              type="text"
              value={formData.short_name}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  short_name: e.target.value.toUpperCase(),
                }))
              }
              placeholder="e.g. ADMIN"
              required
            />
          </div>

          <div className="form-group">
            <label>Description</label>
            <textarea
              value={formData.description}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  description: e.target.value,
                }))
              }
              placeholder="Enter description"
            />
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>

            <button type="submit" className="btn-primary">
              Save Classification
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}