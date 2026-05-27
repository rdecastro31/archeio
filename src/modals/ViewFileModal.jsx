import { useState, useEffect } from 'react';
import { FiX, FiDownload } from 'react-icons/fi';
import { DocxEditor } from '@eigenpal/docx-editor-react';
import '@eigenpal/docx-editor-react/styles.css';
import '../styles/viewfilemodal.css';
import { API_URL } from '../shared/constants';

export default function FileViewerModal({ show, onClose, file }) {
    // 1. Define ALL Hooks first (Unconditional execution)
    const [docxBuffer, setDocxBuffer] = useState(null);
    const [loadingDocx, setLoadingDocx] = useState(false);
    const [docxError, setDocxError] = useState(null);

    const fileNameLower = file?.name?.toLowerCase() || '';
    const baseUrl = `${API_URL}/storage`;
    const userFolder = `user_${file?.user || '1'}`;

    let subPath = "";
    if (file?.path && file.path !== "/" && file.path !== "undefined") {
        subPath = file.path.endsWith("/") ? file.path : `${file.path}/`;
    }
    const fileUrl = `${baseUrl}/${userFolder}/${subPath}${file?.name || ''}`;

    useEffect(() => {
        // Guard inside the effect instead of guarding the whole hook
        if (show && fileNameLower.endsWith('.docx')) {
            setLoadingDocx(true);
            setDocxError(null);
            setDocxBuffer(null);

            fetch(fileUrl)
                .then((response) => {
                    if (!response.ok) throw new Error('Failed to fetch document content.');
                    return response.arrayBuffer();
                })
                .then((buffer) => {
                    setDocxBuffer(buffer);
                })
                .catch((err) => {
                    console.error(err);
                    setDocxError(err.message || 'Error loading document.');
                })
                .finally(() => {
                    setLoadingDocx(false);
                });
        }
    }, [show, fileUrl, fileNameLower]);

    // 2. Put your early return safely BELOW all the hooks
    if (!show || !file) return null;

    // 3. Helper function to render the correct file preview
    const renderViewer = () => {
        // PDF Files
        if (fileNameLower.endsWith('.pdf')) {
            return (
                <iframe
                    src={`${fileUrl}#toolbar=0`}
                    width="100%"
                    height="100%"
                    title="PDF Viewer"
                    style={{ border: 'none', borderRadius: '8px' }}
                />
            );
        }

        // Image Files
        if (/\.(jpg|jpeg|png|gif|webp|svg)$/i.test(fileNameLower)) {
            return (
                <div className="image-viewer-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', overflow: 'auto' }}>
                    <img
                        src={fileUrl}
                        alt={file.name}
                        style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: '8px' }}
                    />
                </div>
            );
        }

        // DOCX Files
        if (fileNameLower.endsWith('.docx')) {
            if (loadingDocx) {
                return (
                    <div className="docx-loading" style={{ textAlign: 'center', padding: '20px' }}>
                        <p>Loading document preview...</p>
                    </div>
                );
            }
            if (docxError) {
                return (
                    <div className="docx-error" style={{ textAlign: 'center', padding: '20px', color: 'red' }}>
                        <p>{docxError}</p>
                    </div>
                );
            }
            if (docxBuffer) {
                return (
                    <div className="docx-viewer-wrapper" style={{ height: '100%', overflow: 'auto' }}>
                        <DocxEditor
                            documentBuffer={docxBuffer}
                            mode="viewing"
                            showToolbar={false}       // 👈 Hides the primary formatting toolbar
                            showRuler={false}         // 👈 Hides the document measurement rulers (if visible)
                            showSidebar={false}
                        />
                    </div>
                );
            }
        }

        // Fallback for unsupported types
        return (
            <div className="unsupported-viewer">
                <p>Preview not available for this file type.</p>
                <p style={{ fontSize: '0.9rem', color: '#666' }}>You can still download it using the button above.</p>
            </div>
        );
    };

    return (
        <div className="modal-overlay">
            <div className="viewer-modal">
                <div className="modal-header">
                    <div>
                        <h2>{file.name}</h2>
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

                <div className="viewer-body" style={{ height: 'calc(100% - 70px)', padding: '10px' }}>
                    {renderViewer()}
                </div>
            </div>
        </div>
    );
}