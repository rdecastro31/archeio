import React, { useState, useMemo, useEffect, useCallback, useRef } from "react";
import {
    FiFolder, FiFile, FiChevronRight, FiFolderPlus,
    FiGrid, FiList, FiSearch, FiMoreVertical,
    FiEdit2, FiTrash2, FiDownload, FiClock,
    FiUpload,
    FiUser,
    FiArrowLeft,
    FiArchive,
    FiRefreshCw
} from "react-icons/fi";
import Swal from "sweetalert2";
import { API_URL } from "../shared/constants";

import "../styles/storage.css";
import CreateFolderModal from "../modals/CreateFolderModal";
import ContextMenu from './../components/ContextMenu';
import FileViewerModal from "../modals/ViewFileModal";
import EditPDFModal from "../modals/EditPDFModal";
import { FileEdit } from "lucide-react";
import { useOutletContext } from "react-router-dom";
import VersionHistoryModal from "../modals/VersionHistoryModal";

// --- Confidence Config Helper ---
const getConfidenceConfig = (confidence) => {
    if (confidence === null || confidence === undefined) {
        return {
            label: "Unavailable",
            bg: "#f1f5f9",
            color: "#475569",
            border: "#cbd5e1",
            dot: "#94a3b8"
        };
    }

    const score = Number(confidence);

    if (score >= 95) {
        return {
            label: `${score.toFixed(0)}% Very Reliable`,
            bg: "#ecfdf5",
            color: "#047857",
            border: "#a7f3d0",
            dot: "#059669"
        };
    }
    if (score >= 84) {
        return {
            label: `${score.toFixed(0)}% Good`,
            bg: "#f0fdf4",
            color: "#15803d",
            border: "#bbf7d0",
            dot: "#16a34a"
        };
    }
    if (score >= 60) {
        return {
            label: `${score.toFixed(0)}% Review Needed`,
            bg: "#fffbeb",
            color: "#b45309",
            border: "#fde68a",
            dot: "#d97706"
        };
    }
    return {
        label: `${score.toFixed(0)}% Low Confidence`,
        bg: "#fef2f2",
        color: "#b91c1c",
        border: "#fecaca",
        dot: "#dc2626"
    };
};

// Component for rendering badge
const ConfidenceBadge = ({ confidence }) => {
    const config = getConfidenceConfig(confidence);

    return (
        <span
            className="ocr-confidence-badge"
            title={`OCR Confidence: ${confidence !== null ? confidence + '%' : 'Unavailable'}`}
            style={{
                backgroundColor: config.bg,
                color: config.color,
                borderColor: config.border
            }}
        >
            <span className="ocr-badge-dot" style={{ backgroundColor: config.dot }} />
            {config.label}
        </span>
    );
};

export default function Storage({ hideHeader = false, isEmbedded = false, onFetchSuggested = (() => { }) }) {
    const { user } = useOutletContext();
    const USER_ID = user?.id;
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentPath, setCurrentPath] = useState("");
    const [showFolderModal, setShowFolderModal] = useState(false);
    const [folderFormData, setFolderFormData] = useState({ name: "" });
    const [searchTerm, setSearchTerm] = useState("");
    const [searchDuration, setSearchDuration] = useState(null);
    const [viewMode, setViewMode] = useState("grid");
    const fileInputRef = useRef(null);

    // Viewer State
    const [viewFile, setViewFile] = useState(null);
    const [showViewer, setShowViewer] = useState(false);

    // PDF Editor State
    const [showEditModal, setShowEditModal] = useState(false);
    const [selectedEditFile, setSelectedEditFile] = useState(null);

    // History Viewer State Setup
    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [selectedHistoryFile, setSelectedHistoryFile] = useState(null);

    const [contextMenu, setContextMenu] = useState({
        show: false,
        x: 0,
        y: 0,
        targetItem: null
    });

    const formatDuration = (ms, decimals = 2) => {
        const seconds = ms / 1000;
        const minutes = seconds / 60;
        const hours = minutes / 60;
        const days = hours / 24;

        if (days >= 1) {
            return `${days.toFixed(decimals)} day(s)`;
        }
        if (hours >= 1) {
            return `${hours.toFixed(decimals)} hr(s)`;
        }
        if (minutes >= 1) {
            return `${minutes.toFixed(decimals)} min(s)`;
        }
        if (seconds >= 1) {
            return `${seconds.toFixed(decimals)} sec(s)`;
        }

        return `${ms.toFixed(decimals)} ms`;
    };

    const callApi = async (formData) => {
        try {
            const response = await fetch(`${API_URL}/filestorage.php`, {
                method: "POST",
                body: formData,
            });
            return await response.json();
        } catch (error) {
            console.error("API Error:", error);
            return { success: 0, msg: "Connection failed" };
        }
    };

    const fetchStorage = useCallback(async () => {
        setLoading(true);
        const fd = new FormData();
        fd.append("tag", "listItems");
        fd.append("userid", USER_ID);
        fd.append("path", currentPath);

        const data = await callApi(fd);
        if (data.success) {
            setItems(data.items);
        }
        setLoading(false);
    }, [currentPath]);

    useEffect(() => {
        fetchStorage();
    }, [fetchStorage]);

    const handleSaveEditedPDF = async (editedFile) => {
        const fd = new FormData();
        fd.append("tag", "addFile");
        fd.append("userid", USER_ID);
        fd.append("path", currentPath);
        fd.append("file", editedFile);

        Swal.fire({
            title: 'Saving new version...',
            allowOutsideClick: false,
            didOpen: () => Swal.showLoading()
        });

        const startTime = performance.now();
        const data = await callApi(fd);
        const endTime = performance.now();
        const durationFormatted = formatDuration(endTime - startTime);

        if (data.success) {
            fetchStorage();
            await Swal.fire({
                title: "Success",
                text: `New version saved in ${durationFormatted}!`,
                icon: "success",
                showConfirmButton: true,
                confirmButtonText: "OK"
            });
        } else {
            Swal.fire("Error", data.msg || "Failed to save version", "error");
        }
    };

    useEffect(() => {
        if (!searchTerm.trim()) {
            setSearchDuration(null);
            if (items.length > 0 && items[0].isSearchResult) {
                fetchStorage();
            }
            return;
        }

        const delayDebounceFn = setTimeout(() => {
            handleSearchContent();
        }, 600);

        return () => clearTimeout(delayDebounceFn);
    }, [searchTerm]);

    const handleSearchContent = async () => {
        setLoading(true);
        const fd = new FormData();
        fd.append("tag", "searchContent");
        fd.append("userid", USER_ID);
        fd.append("query", searchTerm);

        const startTime = performance.now();
        const data = await callApi(fd);
        const endTime = performance.now();
        const durationFormatted = formatDuration(endTime - startTime);

        if (data.success) {
            const searchResults = data.results.map((res, index) => ({
                id: `search-${index}`,
                name: res.filename,
                type: 'file',
                path: res.file_path,
                page: res.page_number,
                line: res.line_number,
                contentSnippet: res.line_text,
                confidence: res.confidence ?? null,
                isSearchResult: true
            }));
            setItems(searchResults);
            setSearchDuration(durationFormatted);
        }
        setLoading(false);
    };

    const handleCreateFolder = async () => {
        if (!folderFormData.name.trim()) {
            Swal.fire("Error", "Please enter a folder name", "error");
            return;
        }

        Swal.fire({
            title: 'Creating folder...',
            allowOutsideClick: false,
            didOpen: () => Swal.showLoading()
        });

        const fd = new FormData();
        fd.append("tag", "createFolder");
        fd.append("userid", USER_ID);
        fd.append("foldername", folderFormData.name);
        fd.append("path", currentPath);

        const data = await callApi(fd);

        if (data.success) {
            setFolderFormData({ name: "" });
            setShowFolderModal(false);
            fetchStorage();
            Swal.fire({
                title: "Success",
                text: "Folder created successfully!",
                icon: "success",
                timer: 1500
            });
        } else {
            Swal.fire("Error", data.msg || "Failed to create folder", "error");
        }
    };

    const trackAccess = async (item) => {
        const fd = new FormData();
        fd.append("tag", "trackAccess");
        fd.append("userid", USER_ID);
        fd.append("itemname", item.name);
        fd.append("path", currentPath);
        await callApi(fd);
        if (isEmbedded) {
            onFetchSuggested();
        }
    };

    const handleRename = async (item) => {
        const { value: newName } = await Swal.fire({
            title: 'Rename Item',
            input: 'text',
            inputValue: item.name,
            showCancelButton: true
        });

        if (newName && newName !== item.name) {
            const fd = new FormData();
            fd.append("tag", "moveOrRenameItem");
            fd.append("userid", USER_ID);
            fd.append("oldname", item.name);
            fd.append("newname", newName);
            fd.append("oldpath", currentPath);
            fd.append("newpath", currentPath);

            const data = await callApi(fd);
            if (data.success) fetchStorage();
            else Swal.fire("Error", data.msg, "error");
        }
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        Swal.fire({
            title: 'Uploading file...',
            text: 'Please wait while your document is being processed.',
            allowOutsideClick: false,
            didOpen: () => Swal.showLoading()
        });

        const fd = new FormData();
        fd.append("tag", "addFile");
        fd.append("userid", USER_ID);
        fd.append("path", currentPath);
        fd.append("file", file);

        const startTime = performance.now();
        const data = await callApi(fd);
        const endTime = performance.now();
        const durationFormatted = formatDuration(endTime - startTime);

        if (data.success) {
            fetchStorage();
            await Swal.fire({
                title: "Success",
                text: `File uploaded in ${durationFormatted}.`,
                icon: "success",
                showConfirmButton: true,
                confirmButtonText: "OK"
            });
        } else {
            Swal.fire("Error", data.msg || "Upload failed", "error");
        }

        e.target.value = null;
    };

    const handleArchive = async (item) => {
        const res = await Swal.fire({
            title: `Archive ${item.name}?`,
            text: "This item will be moved to the archive folder.",
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#aaa',
            confirmButtonText: 'Yes, archive it!'
        });

        if (res.isConfirmed) {
            const fd = new FormData();
            fd.append("tag", "archiveItem");
            fd.append("userid", USER_ID);
            fd.append("path", currentPath);
            fd.append("itemname", item.name);
            fd.append("itemtype", item.type);

            const data = await callApi(fd);
            if (data.success) {
                fetchStorage();
                Swal.fire('Archived!', `${item.name} has been moved.`, 'success');
            } else {
                Swal.fire('Error', data.message || 'Failed to archive item', 'error');
            }
        }
    };

    const handleRestore = async (item) => {
        const res = await Swal.fire({
            title: `Restore ${item.name}?`,
            text: "This will move the item back to your main storage.",
            icon: 'info',
            showCancelButton: true,
            confirmButtonText: 'Yes, restore it'
        });

        if (res.isConfirmed) {
            const fd = new FormData();
            fd.append("tag", "restoreItem");
            fd.append("userid", USER_ID);
            fd.append("itemname", item.name);
            fd.append("targetPath", "/");

            const data = await callApi(fd);
            if (data.success) {
                fetchStorage();
                Swal.fire('Restored!', 'Item is back in your main files.', 'success');
            }
        }
    };

    const handleDelete = async (item) => {
        const res = await Swal.fire({
            title: `Delete ${item.name}?`,
            icon: 'warning',
            showCancelButton: true
        });

        if (res.isConfirmed) {
            const fd = new FormData();
            fd.append("tag", "deleteItem");
            fd.append("userid", USER_ID);
            fd.append("path", currentPath);
            fd.append("itemname", item.name);

            const data = await callApi(fd);
            if (data.success) fetchStorage();
        }
    };

    const navigateTo = (folderName) => {
        if (folderName === null) {
            setCurrentPath("");
        } else {
            const newPath = currentPath ? `${currentPath}/${folderName}` : folderName;
            setCurrentPath(newPath);
            trackAccess({ name: folderName, type: 'folder' });
        }
    };

    const handleContextMenu = (e, item, isButtonClick = false) => {
        e.preventDefault();
        e.stopPropagation();
        let x, y;
        if (isButtonClick) {
            const rect = e.currentTarget.getBoundingClientRect();
            x = rect.right - 185;
            y = rect.bottom + 8;
        } else {
            x = e.clientX;
            y = e.clientY;
        }
        setContextMenu({ show: true, x, y, targetItem: item });
    };

    const closeContextMenu = useCallback(() => {
        if (contextMenu.show) setContextMenu(prev => ({ ...prev, show: false }));
    }, [contextMenu.show]);

    useEffect(() => {
        window.addEventListener("click", closeContextMenu);
        return () => window.removeEventListener("click", closeContextMenu);
    }, [closeContextMenu]);

    const menuOptions = useMemo(() => {
        const item = contextMenu.targetItem;
        if (!item) return [];

        const isFile = item.type === 'file';
        const filePath = item.path || currentPath;

        const getViewOption = () => ({
            label: "View",
            icon: <FiSearch />,
            onClick: () => {
                trackAccess(item);
                setViewFile({ ...item, user: USER_ID, path: filePath });
                setShowViewer(true);
            }
        });

        const getHistoryOption = () => ({
            label: "Version History",
            icon: <FiClock />,
            onClick: () => {
                setSelectedHistoryFile({ ...item, user: USER_ID, path: filePath });
                setShowHistoryModal(true);
            }
        });

        const getDownloadOption = () => ({
            label: "Download",
            icon: <FiDownload />,
            onClick: () => { }
        });

        if (currentPath === "Archive") {
            const archiveOptions = [
                { label: "Restore", icon: <FiRefreshCw />, onClick: () => handleRestore(item) }
            ];

            if (isFile) {
                archiveOptions.push(getViewOption());
            }

            archiveOptions.push(
                { divider: true },
                { label: "Delete Permanently", icon: <FiTrash2 className="text-danger" />, className: "text-danger", onClick: () => handleDelete(item) }
            );

            return archiveOptions;
        }

        if (currentPath === "Documents") {
            if (!isFile) return [];
            return [
                getViewOption(),
                getHistoryOption(),
                getDownloadOption()
            ];
        }

        const options = [];

        if (isFile) {
            options.push(getViewOption());
        }

        options.push({ label: "Rename", icon: <FiEdit2 />, onClick: () => handleRename(item) });

        if (isFile) {
            if (item.name?.toLowerCase().endsWith('.pdf')) {
                options.push({
                    label: "Edit PDF",
                    icon: <FileEdit />,
                    onClick: () => {
                        setSelectedEditFile({ ...item, user: USER_ID, path: filePath });
                        setShowEditModal(true);
                    }
                });
            }
            options.push(getHistoryOption(), getDownloadOption());
        }

        options.push(
            { divider: true },
            { label: "Archive", icon: <FiArchive className="text-danger" />, className: "text-danger", onClick: () => handleArchive(item) }
        );

        return options;

    }, [
        contextMenu.targetItem,
        currentPath,
        handleRestore,
        handleDelete,
        handleRename,
        handleArchive,
        setViewFile,
        setShowViewer,
        setSelectedHistoryFile,
        setShowHistoryModal,
        setSelectedEditFile,
        setShowEditModal
    ]);

    const highlightText = (text, highlight) => {
        if (!highlight.trim()) return text;
        const parts = text.split(new RegExp(`(${highlight})`, 'gi'));
        return (
            <span>
                {parts.map((part, i) =>
                    part.toLowerCase() === highlight.toLowerCase() ? (
                        <mark key={i} className="search-highlight">{part}</mark>
                    ) : part
                )}
            </span>
        );
    };

    return (
        <div className={isEmbedded ? "storage-embedded" : "storage-page"}>
            {!hideHeader && (
                <div className="page-header">
                    <div>
                        <h1 className="page-title">Drive</h1>
                        <div className="breadcrumb-trail">
                            {currentPath !== "Archive" && (
                                <>
                                    <span onClick={() => navigateTo(null)} className="breadcrumb-link">My Folders</span>
                                    {currentPath.split("/").filter(Boolean).map((name, i, arr) => (
                                        <React.Fragment key={i}>
                                            <FiChevronRight className="breadcrumb-sep" />
                                            <span onClick={() => setCurrentPath(arr.slice(0, i + 1).join("/"))} className="breadcrumb-link">{name}</span>
                                        </React.Fragment>
                                    ))}
                                </>
                            )}
                            {currentPath === "Archive" && (
                                <span className="breadcrumb-link">Archive</span>
                            )}
                        </div>
                    </div>
                    <div className="action-buttons">
                        {currentPath !== "Archive" && currentPath !== "Documents" && (
                            <>
                                <input type="file" ref={fileInputRef} style={{ display: 'none' }} onChange={handleFileUpload} />
                                <button className="secondary-btn" onClick={() => fileInputRef.current.click()}>
                                    <FiUpload /><span>Upload</span>
                                </button>
                                <button className="primary-btn" onClick={() => setShowFolderModal(true)}>
                                    <FiFolderPlus /><span>New Folder</span>
                                </button>
                            </>
                        )}

                        {currentPath === "Archive" ? (
                            <button className="secondary-btn" onClick={() => navigateTo(null)}>
                                <FiArrowLeft /><span>Back to Root</span>
                            </button>
                        ) : (
                            <button className="archive-btn" onClick={() => navigateTo("Archive")}>
                                <FiTrash2 /><span>Archive</span>
                            </button>
                        )}
                    </div>
                </div>
            )}

            <div className="table-card">
                {hideHeader && (
                    <div className="table-card-header">
                        <div>
                            <h1 className="page-title">Drive</h1>
                            <div className="breadcrumb-trail">
                                <span onClick={() => navigateTo(null)} className="breadcrumb-link">Files and Folders</span>
                                {currentPath.split("/").filter(Boolean).map((name, i, arr) => (
                                    <React.Fragment key={i}>
                                        <FiChevronRight className="breadcrumb-sep" />
                                        <span onClick={() => setCurrentPath(arr.slice(0, i + 1).join("/"))} className="breadcrumb-link">{name}</span>
                                    </React.Fragment>
                                ))}
                            </div>
                        </div>
                        {currentPath !== "Documents" && (
                            <div className="action-buttons">
                                <input type="file" ref={fileInputRef} style={{ display: 'none' }} onChange={handleFileUpload} />
                                <button className="secondary-btn" onClick={() => fileInputRef.current.click()}><FiUpload /><span>Upload</span></button>
                                <button className="primary-btn" onClick={() => setShowFolderModal(true)}><FiFolderPlus /><span>New Folder</span></button>
                            </div>
                        )}
                    </div>
                )}
                <div className="table-toolbar">
                    <div className="d-flex align-items-center gap-3">
                        <div className="search-box">
                            <FiSearch className="search-icon-main" />
                            <input type="text" placeholder="Search document content..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                        </div>
                        {searchTerm.trim() && searchDuration && !loading && (
                            <div className="search-duration-info">
                                <FiClock size={14} />
                                <span>Result loaded in <strong>{searchDuration}</strong></span>
                            </div>
                        )}
                    </div>

                    <div className="view-switcher">
                        <button
                            className={`view-btn ${viewMode === 'list' ? 'active' : ''}`}
                            onClick={() => setViewMode('list')}
                            title="List View"
                        >
                            <FiList />
                        </button>
                        <button
                            className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`}
                            onClick={() => setViewMode('grid')}
                            title="Grid View"
                        >
                            <FiGrid />
                        </button>
                    </div>
                </div>

                {(() => {
                    const filteredItems = items.filter(i =>
                        i.name.toLowerCase().includes(searchTerm.toLowerCase()) || i.isSearchResult
                    );

                    if (filteredItems.length === 0) {
                        return (
                            <div className="empty-state-container">
                                <div className="empty-state-content">
                                    <div className="empty-icon-circle">
                                        <FiUpload size={32} />
                                    </div>
                                    <h3>No documents found</h3>
                                    <p>Upload your documents here to get started.</p>
                                    <button
                                        className="primary-btn"
                                        onClick={() => fileInputRef.current.click()}
                                    >
                                        <FiUpload /> Upload Now
                                    </button>
                                </div>
                            </div>
                        );
                    }

                    return viewMode === 'list' ? (
                        <div className="table-responsive">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Name</th>
                                        <th>Confidence</th>
                                        <th>Type</th>
                                        <th className="text-end">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredItems.map(item => (
                                        <tr
                                            key={item.id}
                                            onDoubleClick={() => item.type === 'folder' && navigateTo(item.name)}
                                            onContextMenu={(e) => (item.type !== 'folder' || item.name !== "Documents") && handleContextMenu(e, item)}
                                        >
                                            <td className="fw-semibold">
                                                <div className="d-flex align-items-center gap-2">
                                                    {item.type === 'folder' ? <FiFolder className="primary-text" /> : <FiFile />}
                                                    <div>
                                                        <div className="lh-base">{item.name}</div>
                                                        {item.isSearchResult && (
                                                            <div className="search-metadata text-muted mt-1">
                                                                <small className="d-block">Page {item.page}:</small>
                                                                <p className="mb-0 small">{highlightText(item.contentSnippet, searchTerm)}</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td>
                                                {item.type === 'file' ? (
                                                    <ConfidenceBadge confidence={item.confidence} />
                                                ) : (
                                                    <span className="text-muted small">--</span>
                                                )}
                                            </td>
                                            <td>{item.type}</td>
                                            <td className="d-flex justify-content-end">
                                                {(item.type !== 'folder' || item.name !== "Documents") && (
                                                    <button className="icon-btn" onClick={(e) => handleContextMenu(e, item, true)}><FiMoreVertical /></button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="file-grid">
                            {filteredItems.map((item) => (
                                <div
                                    key={item.id}
                                    className={`drive-preview-card ${item.isSearchResult ? 'search-result-card' : ''}`}
                                    onDoubleClick={() => item.type === 'folder' && navigateTo(item.name)}
                                    onContextMenu={(e) => (item.type !== 'folder' || item.name !== "Documents") && handleContextMenu(e, item)}
                                >
                                    <div className="preview-card-header">
                                        <div className="header-left">
                                            {item.type === 'folder' ? (
                                                <FiFolder className="primary-text" size={18} />
                                            ) : (
                                                <FiFile size={18} />
                                            )}
                                            <span className="file-name-text">{item.name}</span>
                                        </div>

                                        {(item.type !== 'folder' || item.name !== "Documents") && (
                                            <button
                                                className="icon-btn-tiny"
                                                onClick={(e) => { e.stopPropagation(); handleContextMenu(e, item, true); }}
                                            >
                                                <FiMoreVertical />
                                            </button>
                                        )}
                                    </div>

                                    <div className="preview-card-body position-relative">
                                        {item.isSearchResult ? (
                                            <div className="grid-search-metadata p-2 w-100">
                                                <small className="badge-page d-block mb-1 text-primary">Page {item.page}</small>
                                                <p className="grid-snippet small text-muted">
                                                    {highlightText(item.contentSnippet, searchTerm)}
                                                </p>
                                            </div>
                                        ) : (
                                            <div className="preview-placeholder">
                                                {item.type === 'folder' ? <FiFolder size={40} /> : <FiFile size={40} />}
                                            </div>
                                        )}

                                        {/* Bottom-left confidence badge for file items */}
                                        {item.type === 'file' && (
                                            <div className="badge-bottom-left-container">
                                                <ConfidenceBadge confidence={item.confidence} />
                                            </div>
                                        )}
                                    </div>

                                    <div className="preview-card-footer">
                                        <div className="user-avatar-small">
                                            <FiUser />
                                        </div>
                                        <span className="activity-text">
                                            {item.type === 'folder' ? 'Folder' : 'You opened yesterday'}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    );
                })()}
            </div>

            <ContextMenu x={contextMenu.x} y={contextMenu.y} show={contextMenu.show} options={menuOptions} onClose={closeContextMenu} />

            <CreateFolderModal show={showFolderModal} onClose={() => setShowFolderModal(false)} formData={folderFormData} setFormData={setFolderFormData} onSubmit={handleCreateFolder} />

            <FileViewerModal show={showViewer} onClose={() => setShowViewer(false)} file={viewFile} />
            <EditPDFModal show={showEditModal} onClose={() => setShowEditModal(false)} file={selectedEditFile} onSave={handleSaveEditedPDF} />

            <VersionHistoryModal show={showHistoryModal} onClose={() => setShowHistoryModal(false)} file={selectedHistoryFile} />
        </div>
    );
}