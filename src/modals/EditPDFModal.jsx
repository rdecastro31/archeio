import React, { useState, useRef, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import {
    FiBold, FiItalic, FiUnderline, FiType,
    FiTrash2, FiDroplet, FiMinus, FiPlus, FiX, FiSave
} from 'react-icons/fi';
import '../styles/editpdfmodal.css';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';
import { API_URL } from '../shared/constants';

pdfjs.GlobalWorkerOptions.workerSrc = pdfWorker;

export default function EditPDFModal({ show, onClose, file, onSave }) {
    const [annotations, setAnnotations] = useState([]);
    const [activeId, setActiveId] = useState(null);
    const [draggingIdx, setDraggingIdx] = useState(null);
    const [isSaving, setIsSaving] = useState(false);

    const containerRef = useRef(null);
    const editFieldRef = useRef(null);

    // Auto-focus and Auto-select text when an annotation becomes active[cite: 4]
    useEffect(() => {
        if (activeId && editFieldRef.current) {
            const el = editFieldRef.current;
            el.focus();

            // Highlight all text for immediate typing[cite: 4]
            const range = document.createRange();
            range.selectNodeContents(el);
            const sel = window.getSelection();
            sel.removeAllRanges();
            sel.addRange(range);
        }
    }, [activeId]);

    useEffect(() => {
        if (show) {
            setAnnotations([]); // Clear edits when modal opens
            setActiveId(null);  // Ensure no text is active
        }
    }, [show]);

    if (!show || !file) return null;

    const baseUrl = `${API_URL}/storage`;
    const userFolder = `user_${file.user || '1'}`;

    // Correctly normalize the subPath[cite: 7]
    let subPath = "";
    if (file.path && file.path !== "/" && file.path !== "undefined") {
        // Append a slash if it's missing to ensure correct URL structure[cite: 7]
        subPath = file.path.endsWith("/") ? file.path : `${file.path}/`;
    }

    const fileUrl = `${baseUrl}/${userFolder}/${subPath}${file.name}`;

    // Handles smarter creation vs. deselection[cite: 4]
    const handleContainerMouseDown = (e) => {
        // Check if we are clicking the PDF surface (Canvas)
        if (e.target.tagName === 'CANVAS') {

            // GATEKEEPER: If something is already being edited, 
            // just save/deselect it and stop here.
            if (activeId !== null) {
                setActiveId(null);
                return;
            }

            // Otherwise, if nothing is active, create the new text box
            const rect = e.target.getBoundingClientRect();
            const newAnn = {
                id: Date.now(),
                x: e.clientX - rect.left,
                y: e.clientY - rect.top,
                text: "Edit text...",
                fontSize: 20,
                color: '#000000',
                bold: false,
                italic: false,
                underline: false,
                strikethrough: false,
            };
            setAnnotations([...annotations, newAnn]);
            setActiveId(newAnn.id);
        }
        else {
            // If they click the dark background void, just deselect
            setActiveId(null);
        }
    };

    const handleMouseMove = (e) => {
        if (draggingIdx === null) return;

        const rect = containerRef.current.querySelector('.pdf-page-wrapper').getBoundingClientRect();

        const newAnns = [...annotations];
        newAnns[draggingIdx] = {
            ...newAnns[draggingIdx],
            // Applied small offset fixes to prevent jumping[cite: 4]
            x: e.clientX - rect.left - 10,
            y: e.clientY - rect.top - 10
        };
        setAnnotations(newAnns);
    };

    const updateActiveAnn = (updates) => {
        setAnnotations(annotations.map(ann =>
            ann.id === activeId ? { ...ann, ...updates } : ann
        ));
    };

    const handleSave = async () => {
        setIsSaving(true);

        // 1. FORCE SYNC: Grab the latest text from the DOM elements
        // This ensures that even if onBlur hasn't fired, we get what you typed.
        const currentAnnotations = annotations.map(ann => {
            const element = document.querySelector(`[data-id="${ann.id}"]`);
            if (element) {
                return { ...ann, text: element.innerText };
            }
            return ann;
        });

        try {
            const existingBytes = await fetch(fileUrl).then(res => res.arrayBuffer());
            const pdfDoc = await PDFDocument.load(existingBytes);
            const page = pdfDoc.getPages()[0];
            const { width, height } = page.getSize();

            const wrapper = containerRef.current.querySelector('.pdf-page-wrapper');
            const displayWidth = wrapper.offsetWidth;
            const displayHeight = wrapper.offsetHeight;

            const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
            const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
            const fontItalic = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);
            const fontBoldItalic = await pdfDoc.embedFont(StandardFonts.HelveticaBoldOblique);

            // 2. Use the SYNCED annotations instead of the state
            for (const ann of currentAnnotations) {
                const pdfX = (ann.x / displayWidth) * width;
                const pdfY = height - (ann.y / displayHeight) * height;
                const scaledSize = (ann.fontSize / displayWidth) * width;

                const hex = ann.color.replace('#', '');
                const r = parseInt(hex.substring(0, 2), 16) / 255;
                const g = parseInt(hex.substring(2, 4), 16) / 255;
                const b = parseInt(hex.substring(4, 6), 16) / 255;

                let chosenFont = fontRegular;
                if (ann.bold && ann.italic) chosenFont = fontBoldItalic;
                else if (ann.bold) chosenFont = fontBold;
                else if (ann.italic) chosenFont = fontItalic;

                page.drawText(ann.text, {
                    x: pdfX,
                    y: pdfY - (scaledSize * 0.8),
                    size: scaledSize,
                    font: chosenFont,
                    color: rgb(r, g, b),
                });

                const textWidth = chosenFont.widthOfTextAtSize(ann.text, scaledSize);

                if (ann.underline) {
                    page.drawLine({
                        start: { x: pdfX, y: pdfY - (scaledSize * 0.9) },
                        end: { x: pdfX + textWidth, y: pdfY - (scaledSize * 0.9) },
                        thickness: 1.5,
                        color: rgb(r, g, b),
                    });
                }

                if (ann.strikethrough) {
                    page.drawLine({
                        start: { x: pdfX, y: pdfY - (scaledSize / 2.5) },
                        end: { x: pdfX + textWidth, y: pdfY - (scaledSize / 2.5) },
                        thickness: 1.5,
                        color: rgb(r, g, b),
                    });
                }
            }

            const pdfBytes = await pdfDoc.save();
            const editedFile = new File([pdfBytes], file.name, { type: "application/pdf" });
            await onSave(editedFile);
            onClose();
        } catch (err) {
            console.error("Export Error:", err);
        } finally {
            setIsSaving(false);
        }
    };

    const ToolbarButton = ({ icon: Icon, onClick, isActive, color, label }) => (
        <button
            onClick={(e) => { e.stopPropagation(); onClick(); }}
            title={label}
            className={`tool-btn ${isActive ? 'active' : ''}`}
            style={color ? { color } : {}}
        >
            <Icon size={16} />
        </button>
    );

    return (
        <div className="modal-overlay">
            <div className="pdf-edit-modal">
                <div className="modal-header">
                    <div>
                        <h2>Editing <strong>{file.name}</strong></h2>
                    </div>
                    <div className="header-actions">
                        <button className="primary-btn" onClick={handleSave} disabled={isSaving}>
                            <FiSave size={16} /> {isSaving ? "Saving..." : "Save New Version"}
                        </button>
                        <button className="modal-close-btn" onClick={onClose}><FiX /></button>
                    </div>
                </div>

                <div
                    ref={containerRef}
                    className="pdf-editor-container"
                    onMouseDown={handleContainerMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={() => setDraggingIdx(null)}
                >
                    <div className="pdf-page-wrapper">
                        <Document file={fileUrl}>
                            <Page pageNumber={1} renderTextLayer={false} renderAnnotationLayer={false} />
                        </Document>

                        {annotations.map((ann, i) => (
                            <div
                                key={ann.id}
                                className={`pdf-annotation ${activeId === ann.id ? 'active' : ''}`}
                                style={{
                                    left: ann.x,
                                    top: ann.y,
                                    fontSize: `${ann.fontSize}px`,
                                    color: ann.color,
                                    fontWeight: ann.bold ? 'bold' : 'normal',
                                    fontStyle: ann.italic ? 'italic' : 'normal',
                                    textDecoration: `${ann.underline ? 'underline' : ''} ${ann.strikethrough ? 'line-through' : ''}`.trim(),
                                    cursor: 'move'
                                }}
                                onMouseDown={(e) => {
                                    e.stopPropagation(); // Prevents background click logic[cite: 4]
                                    setActiveId(ann.id);
                                    setDraggingIdx(i);
                                }}
                            >
                                <div
                                    ref={activeId === ann.id ? editFieldRef : null}
                                    data-id={ann.id} // ADD THIS LINE
                                    contentEditable={activeId === ann.id}
                                    suppressContentEditableWarning
                                    onBlur={(e) => updateActiveAnn({ text: e.target.innerText })}
                                    style={{
                                        outline: 'none',
                                        padding: '2px 5px',
                                        textDecoration: 'inherit',
                                        lineHeight: '1.2'
                                    }}
                                >
                                    {ann.text}
                                </div>

                                {activeId === ann.id && (
                                    <div className="annotation-toolbar" onMouseDown={e => e.stopPropagation()}>
                                        <ToolbarButton icon={FiPlus} onClick={() => updateActiveAnn({ fontSize: ann.fontSize + 2 })} />
                                        <ToolbarButton icon={FiMinus} onClick={() => updateActiveAnn({ fontSize: ann.fontSize - 2 })} />
                                        <div className="divider" />
                                        <ToolbarButton icon={FiBold} isActive={ann.bold} onClick={() => updateActiveAnn({ bold: !ann.bold })} />
                                        <ToolbarButton icon={FiItalic} isActive={ann.italic} onClick={() => updateActiveAnn({ italic: !ann.italic })} />
                                        <ToolbarButton icon={FiUnderline} isActive={ann.underline} onClick={() => updateActiveAnn({ underline: !ann.underline })} />
                                        <ToolbarButton icon={FiType} isActive={ann.strikethrough} onClick={() => updateActiveAnn({ strikethrough: !ann.strikethrough })} />
                                        <div className="divider" />
                                        <label className="color-btn" title="Text Color">
                                            <FiDroplet size={16} />
                                            <input
                                                type="color"
                                                value={ann.color}
                                                onChange={(e) => updateActiveAnn({ color: e.target.value })}
                                            />
                                        </label>
                                        <ToolbarButton icon={FiTrash2} color="#ef4444" onClick={() => setAnnotations(annotations.filter(a => a.id !== ann.id))} />
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}