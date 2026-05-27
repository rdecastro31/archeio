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

export default function Storage({ hideHeader = false, isEmbedded = false, onFetchSuggested = (() => { }) }) {
    const { user } = useOutletContext();
    const USER_ID = user?.id;
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentPath, setCurrentPath] = useState("");
    const [showFolderModal, setShowFolderModal] = useState(false);
    const [folderFormData, setFolderFormData] = useState({ name: "" });
    const [searchTerm, setSearchTerm] = useState("");
    const [viewMode, setViewMode] = useState("grid");
    const fileInputRef = useRef(null);

    // Viewer State[cite: 3]
    const [viewFile, setViewFile] = useState(null);
    const [showViewer, setShowViewer] = useState(false);

    // PDF Editor State[cite: 5]
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

    // --- API Helper ---
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

    // --- Fetch Items ---
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

    // --- PDF Edit Save Handler ---
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

        const data = await callApi(fd);
        if (data.success) {
            fetchStorage();
            Swal.fire("Success", "New version saved and archived successfully!", "success");
        } else {
            Swal.fire("Error", data.msg || "Failed to save version", "error");
        }
    };

    // --- Search Logic ---
    useEffect(() => {
        if (!searchTerm.trim()) {
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

        const data = await callApi(fd);
        if (data.success) {
            const searchResults = data.results.map((res, index) => ({
                id: `search-${index}`,
                name: res.filename,
                type: 'file',
                path: res.file_path,
                page: res.page_number,
                line: res.line_number,
                contentSnippet: res.line_text,
                isSearchResult: true
            }));
            setItems(searchResults);
        }
        setLoading(false);
    };

    const handleCreateFolder = async () => {
        // 1. Validation
        if (!folderFormData.name.trim()) {
            Swal.fire("Error", "Please enter a folder name", "error");
            return;
        }

        // 2. Show Loading
        Swal.fire({
            title: 'Creating folder...',
            allowOutsideClick: false,
            didOpen: () => Swal.showLoading()
        });

        // 3. Prepare FormData with the correct tag from your PHP file
        const fd = new FormData();
        fd.append("tag", "createFolder"); // Matches filestorage.php:30
        fd.append("userid", USER_ID);
        fd.append("foldername", folderFormData.name); // Matches filestorage.php:31[cite: 5]
        fd.append("path", currentPath);

        // 4. API Call
        const data = await callApi(fd);

        // 5. Response Handling
        if (data.success) {
            setFolderFormData({ name: "" });
            setShowFolderModal(false);
            fetchStorage(); // Refresh the list to see the new folder
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

    // --- Item Handlers ---
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

    const handleViewHistory = async (item) => {
        const fd = new FormData();
        fd.append("tag", "getFileHistory");
        fd.append("userid", USER_ID);
        fd.append("filename", item.name);
        fd.append("path", currentPath);

        const data = await callApi(fd);
        if (data.success && data.history.length > 0) {
            const historyList = data.history.map(h =>
                `<div style="display:flex; justify-content:space-between; margin-bottom:8px; border-bottom:1px solid #eee; padding-bottom:4px;">
                    <span>${h.name}</span>
                    <small style="color:#666">${h.date}</small>
                </div>`
            ).join('');

            Swal.fire({
                title: `History: ${item.name}`,
                html: `<div style="text-align:left; max-height:300px; overflow-y:auto;">${historyList}</div>`,
                icon: 'info'
            });
        } else {
            Swal.fire("No History", "No previous versions found.", "info");
        }
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // 1. Show the Loading SweetAlert immediately
        Swal.fire({
            title: 'Uploading file...',
            text: 'Please wait while your document is being processed.',
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });

        const fd = new FormData();
        fd.append("tag", "addFile");
        fd.append("userid", USER_ID);
        fd.append("path", currentPath);
        fd.append("file", file);

        // 2. Call the API
        const data = await callApi(fd);

        // 3. Handle the result
        if (data.success) {
            fetchStorage();
            Swal.fire({
                title: "Success",
                text: data.msg || "File uploaded successfully!",
                icon: "success",
                timer: 2000
            });
        } else {
            Swal.fire("Error", data.msg || "Upload failed", "error");
        }

        e.target.value = null;
    };

    const handleArchive = async (item) => {
        // 1. Show confirmation dialog
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
            // 2. Prepare the FormData
            const fd = new FormData();
            fd.append("tag", "archiveItem"); // Ensure your backend handles this tag
            fd.append("userid", USER_ID);
            fd.append("path", currentPath);
            fd.append("itemname", item.name);
            fd.append("itemtype", item.type); // Useful if backend needs to distinguish file vs folder

            // 3. Call the API and refresh
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
            fd.append("targetPath", "/"); // Or item.previousPath if you stored it

            const data = await callApi(fd);
            if (data.success) {
                fetchStorage(); // Refresh the list
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

    // --- Context Menu ---
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

        // --- Reusable Menu Actions ---
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
            onClick: () => { /* Handle download */ }
        });


        // --- Context-Based Menu Construction ---

        // 1. Archive Path
        if (currentPath === "Archive") {
            const archiveOptions = [
                { label: "Restore", icon: <FiRefreshCw />, onClick: () => handleRestore(item) }
            ];

            // Add View option in between if it's a file
            if (isFile) {
                archiveOptions.push(getViewOption());
            }

            archiveOptions.push(
                { divider: true },
                { label: "Delete Permanently", icon: <FiTrash2 className="text-danger" />, className: "text-danger", onClick: () => handleDelete(item) }
            );

            return archiveOptions;
        }

        // 2. Documents Path
        if (currentPath === "Documents") {
            if (!isFile) return []; // Documents only shows options if it's a file
            return [
                getViewOption(),
                getHistoryOption(),
                getDownloadOption()
            ];
        }

        // 3. Fallback / Default Path (Else)
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
                                    <span onClick={() => navigateTo(null)} className="breadcrumb-link">My Drive</span>
                                    {currentPath.split("/").filter(Boolean).map((name, i, arr) => (
                                        <React.Fragment key={i}>
                                            <FiChevronRight className="breadcrumb-sep" />
                                            <span onClick={() => setCurrentPath(arr.slice(0, i + 1).join("/"))} className="breadcrumb-link">{name}</span>
                                        </React.Fragment>
                                    ))}
                                </>
                            )}
                            {currentPath === "Archive" && (
                                <>
                                    <span className="breadcrumb-link">Archive</span>
                                </>
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

                        {/* The Archive Button */}
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
                                <span onClick={() => navigateTo(null)} className="breadcrumb-link">My Drive</span>
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
                    <div className="search-box">
                        <FiSearch className="search-icon-main" />
                        <input type="text" placeholder="Search document content..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
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

                                                        {/* Metadata - will wrap underneath the name, but to the right of the icon */}
                                                        {item.isSearchResult && (
                                                            <div className="search-metadata text-muted mt-1">
                                                                <small className="d-block">Page {item.page}:</small>
                                                                <p className="mb-0 small">{highlightText(item.contentSnippet, searchTerm)}</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
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
                        /* GRID / THUMBNAIL VIEW */
                        <div className="file-grid">
                            {filteredItems.map((item) => (
                                <div
                                    key={item.id}
                                    className={`drive-preview-card ${item.isSearchResult ? 'search-result-card' : ''}`}
                                    onDoubleClick={() => item.type === 'folder' && navigateTo(item.name)}
                                    onContextMenu={(e) => (item.type !== 'folder' || item.name !== "Documents") && handleContextMenu(e, item)}
                                >
                                    {/* 1. HEADER: Small icon and Name side-by-side */}
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

                                    {/* 2. BODY: Large preview area or Search Metadata */}
                                    <div className="preview-card-body">
                                        {item.isSearchResult ? (
                                            <div className="grid-search-metadata p-2 w-100">
                                                <small className="badge-page d-block mb-1 text-primary">Page {item.page}</small>
                                                <p className="grid-snippet small text-muted">
                                                    {highlightText(item.contentSnippet, searchTerm)}
                                                </p>
                                            </div>
                                        ) : (
                                            <div className="preview-placeholder">
                                                {/* Show a large version of the icon as a placeholder if no thumbnail */}
                                                {item.type === 'folder' ? <FiFolder size={40} /> : <FiFile size={40} />}
                                            </div>
                                        )}
                                    </div>

                                    {/* 3. FOOTER: Optional activity or owner info */}
                                    <div className="preview-card-footer">
                                        <div className="user-avatar-small">
                                            {/* <img src={item.ownerAvatar || "/default-avatar.png"} alt="owner" /> */}
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

            {/* Modal Components */}
            <FileViewerModal show={showViewer} onClose={() => setShowViewer(false)} file={viewFile} />
            <EditPDFModal show={showEditModal} onClose={() => setShowEditModal(false)} file={selectedEditFile} onSave={handleSaveEditedPDF} />

            <VersionHistoryModal show={showHistoryModal} onClose={() => setShowHistoryModal(false)} file={selectedHistoryFile} />
        </div>
    );
}