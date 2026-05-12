import React from 'react';
import { FiX } from 'react-icons/fi';

export default function CreateActionModal({ show, onClose, formData, setFormData, onSubmit }) {
    if (!show) return null;

    return (
        <div className="modal-overlay">
            <div className="category-modal">
                <div className="modal-header">
                    <div>
                        <h2>Create Action</h2>
                        <p>Define the behavior and result of this action.</p>
                    </div>
                    <button className="modal-close-btn" onClick={onClose}><FiX /></button>
                </div>

                <form onSubmit={onSubmit} className="category-form">
                    <div className="form-group">
                        <label>Action Name</label>
                        <input
                            type="text"
                            placeholder="e.g., Approve Document"
                            value={formData.action_name}
                            onChange={(e) => setFormData({ ...formData, action_name: e.target.value })}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label>Action Behavior (Logic)</label>
                        <select
                            value={formData.action_result}
                            onChange={(e) => setFormData({ ...formData, action_result: e.target.value })}
                            required
                        >
                            <option value="Proceed">Proceed (Continue Workflow)</option>
                            <option value="Terminate">Terminate (End Process)</option>
                            <option value="Hold">Hold (Pause Workflow)</option>
                            <option value="Return">Return (Send Back)</option>
                            <option value="Complete">Complete (Finalize)</option>
                        </select>
                    </div>

                    <div className="form-group">
                        <label>Description</label>
                        <textarea
                            placeholder="Describe what this action specifically does..."
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        />
                    </div>

                    <div className="modal-actions">
                        <button type="button" className="secondary-btn" onClick={onClose}>Cancel</button>
                        <button type="submit" className="primary-btn">Save Action</button>
                    </div>
                </form>
            </div>
        </div>
    );
}