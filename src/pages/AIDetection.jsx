import React, { useRef, useState } from "react";
import {
  FiUpload,
  FiFileText,
  FiCheckCircle,
  FiAlertTriangle,
  FiSearch,
  FiRefreshCw,
  FiClock,
  FiX,
} from "react-icons/fi";
import Swal from "sweetalert2";
import "../styles/aichecker.css";
import { API_URL } from "../shared/constants";

const AI_DETECTION_URL = `${API_URL}/copyleaks_ai_detector.php`;

export default function AIDetection() {
  const fileInputRef = useRef(null);

  const [selectedFile, setSelectedFile] = useState(null);
  const [checking, setChecking] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null);

  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [previousScans, setPreviousScans] = useState([]);

  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const USER_ID = user?.id || user?.userid || "";

  const allowedTypes = [
    "application/pdf",
    "text/plain",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ];

  const allowedExtensions = [".pdf", ".txt", ".docx"];

  const isAllowedFile = (file) => {
    if (!file) return false;

    const fileName = file.name.toLowerCase();

    return (
      allowedTypes.includes(file.type) ||
      allowedExtensions.some((ext) => fileName.endsWith(ext))
    );
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];

    if (!file) return;

    if (!isAllowedFile(file)) {
      Swal.fire(
        "Invalid File",
        "Only PDF, TXT, and DOCX files are allowed.",
        "error"
      );

      e.target.value = null;
      return;
    }

    setSelectedFile(file);
    setResult(null);
    setProgress(0);
  };

  const handleSubmit = async () => {
    if (!selectedFile) {
      Swal.fire(
        "No File Selected",
        "Please upload a PDF, TXT, or DOCX file first.",
        "warning"
      );
      return;
    }

    if (!isAllowedFile(selectedFile)) {
      Swal.fire(
        "Invalid File",
        "Only PDF, TXT, and DOCX files are allowed.",
        "error"
      );
      return;
    }

    const fd = new FormData();
    fd.append("tag", "checkfile");
    fd.append("checked_by", USER_ID);
    fd.append("file", selectedFile);

    let progressTimer = null;

    try {
      setChecking(true);
      setProgress(15);
      setResult(null);

      progressTimer = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 90) return prev;
          return prev + 10;
        });
      }, 700);

      const response = await fetch(AI_DETECTION_URL, {
        method: "POST",
        body: fd,
      });

      const data = await response.json();

      if (progressTimer) clearInterval(progressTimer);

      if (data.success === 1) {
        setProgress(100);
        setResult(data.data);

        Swal.fire({
          title: "AI Detection Completed",
          text: "Document AI detection completed successfully.",
          icon: "success",
          timer: 1600,
          showConfirmButton: false,
        });
      } else {
        setProgress(0);

        Swal.fire(
          "Error",
          data.message || "Unable to complete AI detection.",
          "error"
        );
      }
    } catch (error) {
      console.error("AI Detection Error:", error);

      if (progressTimer) clearInterval(progressTimer);

      setProgress(0);

      Swal.fire(
        "Server Error",
        "Unable to connect to the AI detection API.",
        "error"
      );
    } finally {
      setTimeout(() => {
        setChecking(false);
        setProgress(0);
      }, 700);
    }
  };

  const loadPreviousScans = async () => {
    setShowHistoryModal(true);
    setHistoryLoading(true);

    try {
      const fd = new FormData();
      fd.append("tag", "getall");

      if (USER_ID) {
        fd.append("checked_by", USER_ID);
      }

      const response = await fetch(AI_DETECTION_URL, {
        method: "POST",
        body: fd,
      });

      const data = await response.json();

      if (data.success === 1) {
        const rows = Array.isArray(data.data) ? data.data : [];

        const sortedRows = rows.sort((a, b) => {
          const dateA = new Date(a.date_created || 0);
          const dateB = new Date(b.date_created || 0);
          return dateB - dateA;
        });

        setPreviousScans(sortedRows);
      } else {
        setPreviousScans([]);
        Swal.fire(
          "Error",
          data.message || "Unable to load previous AI detection records.",
          "error"
        );
      }
    } catch (error) {
      console.error("Previous AI Detection Error:", error);
      setPreviousScans([]);

      Swal.fire(
        "Server Error",
        "Unable to connect to the AI detection history API.",
        "error"
      );
    } finally {
      setHistoryLoading(false);
    }
  };

  const resetChecker = () => {
    setSelectedFile(null);
    setResult(null);
    setProgress(0);
    setChecking(false);

    if (fileInputRef.current) {
      fileInputRef.current.value = null;
    }
  };

  const humanScore = Number(result?.human_score || 0).toFixed(2);
  const aiScore = Number(result?.ai_score || 0).toFixed(2);

  return (
    <div className="ai-checker-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">AI Content Detector</h1>
          <p className="page-subtitle">
            Upload a PDF, TXT, or DOCX document and detect whether the content
            is human-written or AI-generated using Copyleaks AI Detector.
          </p>
        </div>

        <div className="action-buttons">
          <button className="secondary-btn" onClick={loadPreviousScans}>
            <FiClock />
            <span>View Previous Checked Document</span>
          </button>

          <button className="secondary-btn" onClick={resetChecker}>
            <FiRefreshCw />
            <span>Reset</span>
          </button>
        </div>
      </div>

      <div className="ai-checker-grid">
        <div className="ai-upload-card">
          <div className="ai-card-header">
            <span className="card-kicker">Upload Document</span>
            <h3>Detect AI-generated writing</h3>
          </div>

          <div
            className={`ai-upload-box ${selectedFile ? "has-file" : ""}`}
            onClick={() => fileInputRef.current.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.txt,.docx"
              hidden
              onChange={handleFileSelect}
            />

            <div className="ai-upload-icon">
              <FiUpload />
            </div>

            <h4>{selectedFile ? selectedFile.name : "Click to upload file"}</h4>

            <p>
              Supported formats: PDF, TXT, and DOCX. The extracted text must
              contain at least 255 characters.
            </p>
          </div>

          {selectedFile && (
            <div className="selected-file-box">
              <FiFileText />
              <div>
                <strong>{selectedFile.name}</strong>
                <span>{(selectedFile.size / 1024).toFixed(2)} KB</span>
              </div>
            </div>
          )}

          {checking && (
            <div className="ai-progress-wrap">
              <div className="ai-progress-info">
                <span>Analyzing document for AI-generated content...</span>
                <strong>{progress}%</strong>
              </div>

              <div className="ai-progress-bar">
                <div style={{ width: `${progress}%` }} />
              </div>

              <p>
                Extracting document text and sending it to Copyleaks AI Detector.
              </p>
            </div>
          )}

          <button
            className="primary-btn ai-submit-btn"
            onClick={handleSubmit}
            disabled={checking}
          >
            {checking ? (
              <>
                <FiSearch className="spin-icon" />
                <span>Checking...</span>
              </>
            ) : (
              <>
                <FiSearch />
                <span>Detect AI Content</span>
              </>
            )}
          </button>
        </div>

        <div className="ai-info-card">
          <span className="card-kicker">How it works</span>
          <h3>Copyleaks AI writing review</h3>

          <div className="ai-step-list">
            <div>
              <strong>1</strong>
              <span>Upload your document</span>
            </div>

            <div>
              <strong>2</strong>
              <span>ArcheIO extracts readable text</span>
            </div>

            <div>
              <strong>3</strong>
              <span>Copyleaks evaluates AI-generated probability</span>
            </div>

            <div>
              <strong>4</strong>
              <span>Review human score, AI score, and recommendation</span>
            </div>
          </div>
        </div>
      </div>

      {result && (
        <div className="ai-result-section">
          <div className="ai-result-card">
            <span className="card-kicker">Detection Summary</span>
            <h3>{result.file_name || "Checked Document"}</h3>

            <div className="summary-box">
              <p>
                <strong>File Type:</strong> {result.file_type || "N/A"}
              </p>
              <p>
                <strong>Total Words:</strong> {result.total_words || 0}
              </p>
              <p>
                <strong>Classification:</strong>{" "}
                {result.classification || "N/A"}
              </p>
            </div>
          </div>

          <div className="ai-score-grid">
            <div className="ai-score-card success">
              <div className="score-content">
                <span className="score-label">Human Score</span>

                <div className="score-value-wrap">
                  <h2>{humanScore}%</h2>
                  <FiCheckCircle />
                </div>

                <div className="score-meter">
                  <div
                    className="score-meter-fill originality-fill"
                    style={{ width: `${humanScore}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="ai-score-card danger">
              <div className="score-content">
                <span className="score-label">AI Score</span>

                <div className="score-value-wrap">
                  <h2>{aiScore}%</h2>
                  <FiAlertTriangle />
                </div>

                <div className="score-meter">
                  <div
                    className="score-meter-fill plagiarism-fill"
                    style={{ width: `${aiScore}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="ai-result-grid">
            <div className="ai-result-card">
              <span className="card-kicker">Interpretation</span>
              <h3>AI Detection Result</h3>

              <div className="summary-box">
                <p>
                  {result.interpretation ||
                    "No interpretation available for this check."}
                </p>
              </div>
            </div>

            <div className="ai-result-card">
              <span className="card-kicker">Recommendation</span>
              <h3>Suggested Action</h3>

              <div className="summary-box">
                <p>
                  {result.recommendation ||
                    "No recommendation available for this check."}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {showHistoryModal && (
        <div className="scan-history-backdrop">
          <div className="scan-history-modal">
            <div className="scan-history-header">
              <div>
                <h3>Previous AI Detection Records</h3>
                <p>List of documents checked through Copyleaks AI Detector.</p>
              </div>

              <button
                type="button"
                className="scan-history-close"
                onClick={() => setShowHistoryModal(false)}
              >
                <FiX />
              </button>
            </div>

            <div className="scan-history-body">
              {historyLoading ? (
                <div className="empty-state-box">
                  <p>Loading previous checked documents...</p>
                </div>
              ) : previousScans.length > 0 ? (
                <div className="scan-history-table-wrap">
                  <table className="scan-history-table">
                    <thead>
                      <tr>
                        <th>File Name</th>
                        <th>File Type</th>
                        <th>Human Score</th>
                        <th>AI Score</th>
                        <th>Classification</th>
                        <th>Interpretation</th>
                        <th>Recommendation</th>
                        <th>Date Created</th>
                      </tr>
                    </thead>

                    <tbody>
                      {previousScans.map((scan, index) => (
                        <tr key={scan.id || scan.scan_id || index}>
                          <td>{scan.file_name || "N/A"}</td>
                          <td>{scan.file_type || "N/A"}</td>
                          <td>{Number(scan.human_score || 0).toFixed(2)}%</td>
                          <td>{Number(scan.ai_score || 0).toFixed(2)}%</td>
                          <td>{scan.classification || "N/A"}</td>
                          <td>{scan.interpretation || "N/A"}</td>
                          <td>{scan.recommendation || "N/A"}</td>
                          <td>{scan.date_created || "N/A"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="empty-state-box">
                  <p>No previous AI detection records found.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}