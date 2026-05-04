import { FiX, FiDownload, FiExternalLink } from 'react-icons/fi';
import '../styles/viewfilemodal.css';
import { API_URL } from '../shared/constants';
export default function FileViewerModal({ show, onClose, file }) {
    if (!show || !file) return null;

    const baseUrl = `${API_URL}/storage`;

    // 1. Determine the user folder
    const userFolder = `user_${file.user || '1'}`;

    // 2. Normalize the path
    let subPath = "";
    if (file.path && file.path !== "/" && file.path !== "undefined") {
        // Ensure the path ends with a single slash if it doesn't have one[cite: 7]
        subPath = file.path.endsWith("/") ? file.path : `${file.path}/`;
    }

    // 3. Construct the final URL
    const fileUrl = `${baseUrl}/${userFolder}/${subPath}${file.name}`;

    return (
        <div className="modal-overlay">
            <div className="viewer-modal">
                <div className="modal-header">
                    <div>
                        <h2>{file.name}</h2>
                        {/* Improved breadcrumb display[cite: 3] */}
                        <p>Location: {(!file.path || file.path === "/") ? "Root" : file.path}</p>
                    </div>
                    <div className="header-actions">
                        <a href={fileUrl} download className="icon-btn" title="Download">
                            <FiDownload />
                        </a>
                        <button className="modal-close-btn" onClick={onClose}>
                            <FiX />
                        </button>
                    </div>
                </div>

                <div className="viewer-body">
                    {file.name?.toLowerCase().endsWith('.pdf') ? (
                        <iframe
                            src={`${fileUrl}#toolbar=0`}
                            width="100%"
                            height="100%"
                            title="PDF Viewer"
                            style={{ border: 'none', borderRadius: '8px' }}
                        />
                    ) : (
                        <div className="unsupported-viewer">
                            <p>Preview not available for this file type.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}