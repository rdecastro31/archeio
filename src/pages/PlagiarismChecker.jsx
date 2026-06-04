import React, { useRef, useState, useEffect } from "react";
import {
  FiUpload,
  FiFileText,
  FiCheckCircle,
  FiAlertTriangle,
  FiSearch,
  FiExternalLink,
  FiRefreshCw,
  FiClock,
  FiX,
} from "react-icons/fi";
import Swal from "sweetalert2";
import "../styles/aichecker.css";

const COPYLEAKS_URL = "https://archeio.layon.ph/api/copyleaks.php";

export default function PlagiarismChecker() {
  const fileInputRef = useRef(null);
  const pollingRef = useRef(null);

  const [selectedFile, setSelectedFile] = useState(null);
  const [checking, setChecking] = useState(false);
  const [progress, setProgress] = useState(0);
  const [scanStatus, setScanStatus] = useState("");
  const [result, setResult] = useState(null);

  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [previousScans, setPreviousScans] = useState([]);

  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const USER_ID = user?.id || user?.userid || "";

  const allowedTypes = [
    "application/pdf",
    "text/plain",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ];

  const allowedExtensions = [".pdf", ".txt", ".doc", ".docx"];

  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  const parseResultJson = (value) => {
    if (!value) return null;
    if (typeof value === "object") return value;

    try {
      return JSON.parse(value);
    } catch (error) {
      console.error("Invalid result_json:", error);
      return null;
    }
  };

  const getRating = (plagiarismScore) => {
    if (plagiarismScore <= 20) return "Low Similarity";
    if (plagiarismScore <= 50) return "Moderate Similarity";
    return "High Similarity";
  };

  const getInterpretation = (plagiarismScore) => {
    if (plagiarismScore <= 20) {
      return "The document appears mostly original with low similarity detected.";
    }

    if (plagiarismScore <= 50) {
      return "The document contains moderate similarity. Some sections may need review, citation, or rewriting.";
    }

    return "The document contains high similarity. Significant review is recommended before approval or submission.";
  };

  const getRecommendations = (plagiarismScore, internetSources = []) => {
    const recommendations = [];

    if (plagiarismScore > 50) {
      recommendations.push(
        "Review sections with high similarity and rewrite them using original wording."
      );
      recommendations.push(
        "Verify whether copied or closely matched sections are properly quoted and cited."
      );
    }

    if (plagiarismScore > 20 && plagiarismScore <= 50) {
      recommendations.push(
        "Review moderately similar sections and improve paraphrasing where necessary."
      );
      recommendations.push(
        "Add proper references for borrowed concepts, phrases, or source-based content."
      );
    }

    if (internetSources.length > 0) {
      recommendations.push(
        "Check the matched internet sources and validate whether attribution is required."
      );
    }

    recommendations.push(
      "Ensure all paraphrased content is sufficiently rewritten and supported by proper citations."
    );

    recommendations.push(
      "Re-run the plagiarism scan after revisions to confirm originality improvements."
    );

    if (plagiarismScore <= 20) {
      recommendations.push(
        "The document has low similarity. Maintain proper citation practices before final submission."
      );
    }

    return recommendations;
  };

  const getScanDisplayData = (scan) => {
    const json = parseResultJson(scan?.result_json);
    const scannedDocument = json?.scannedDocument || {};
    const score = json?.results?.score || {};
    const internetSources = json?.results?.internet || [];

    const fileName =
      scan?.file_name ||
      scannedDocument?.metadata?.filename ||
      "N/A";

    const fileType =
      scan?.file_type ||
      fileName?.split(".")?.pop()?.toUpperCase() ||
      "N/A";

    const plagiarismScore = Number(
      scan?.plagiarism_score || score?.aggregatedScore || 0
    );

    const originalityScore = Number(
      scan?.originality_score || 100 - plagiarismScore
    );

    const rating = scan?.rating || getRating(plagiarismScore);

    const interpretation =
      scan?.interpretation || getInterpretation(plagiarismScore);

    const recommendations = getRecommendations(
      plagiarismScore,
      internetSources
    );

    return {
      fileName,
      fileType,
      plagiarismScore: plagiarismScore.toFixed(2),
      originalityScore: originalityScore.toFixed(2),
      rating,
      interpretation,
      recommendations,
      dateCreated: scan?.date_created || scan?.created_at || "N/A",
    };
  };

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
        "Only PDF, TXT, DOC, and DOCX files are allowed.",
        "error"
      );

      e.target.value = null;
      return;
    }

    setSelectedFile(file);
    setResult(null);
    setProgress(0);
    setScanStatus("");
  };

  const pollScanStatus = (scanId) => {
    let estimatedProgress = 35;

    pollingRef.current = setInterval(async () => {
      try {
        const fd = new FormData();
        fd.append("tag", "getbyscanid");
        fd.append("scan_id", scanId);

        const response = await fetch(COPYLEAKS_URL, {
          method: "POST",
          body: fd,
        });

        const data = await response.json();

        if (data.success !== 1) return;

        const scanData = data.data || {};
        const status = scanData.status || "";

        setScanStatus(status);

        if (
          status === "Submitted" ||
          status === "Processing" ||
          status === "In Progress"
        ) {
          estimatedProgress = Math.min(estimatedProgress + 8, 90);
          setProgress(estimatedProgress);
        }

        if (status === "Completed") {
          clearInterval(pollingRef.current);
          pollingRef.current = null;

          setProgress(100);
          setChecking(false);
          setResult(scanData);

          Swal.fire({
            title: "Scan Completed",
            text: "Plagiarism check completed successfully.",
            icon: "success",
            timer: 1600,
            showConfirmButton: false,
          });
        }

        if (status === "Failed" || status === "Error") {
          clearInterval(pollingRef.current);
          pollingRef.current = null;

          setChecking(false);
          setProgress(0);

          Swal.fire(
            "Scan Failed",
            scanData?.message || "Plagiarism scan failed.",
            "error"
          );
        }
      } catch (error) {
        console.error("Polling Error:", error);
      }
    }, 4000);
  };

  const handleSubmit = async () => {
    if (!selectedFile) {
      Swal.fire(
        "No File Selected",
        "Please upload a PDF, TXT, DOC, or DOCX file first.",
        "warning"
      );
      return;
    }

    if (!isAllowedFile(selectedFile)) {
      Swal.fire(
        "Invalid File",
        "Only PDF, TXT, DOC, and DOCX files are allowed.",
        "error"
      );
      return;
    }

    const fd = new FormData();
    fd.append("tag", "plagiarismcheck");
    fd.append("checked_by", USER_ID);
    fd.append("file", selectedFile);

    try {
      if (pollingRef.current) clearInterval(pollingRef.current);

      setChecking(true);
      setProgress(15);
      setResult(null);
      setScanStatus("Uploading");

      const response = await fetch(COPYLEAKS_URL, {
        method: "POST",
        body: fd,
      });

      const data = await response.json();

      if (data.success === 1) {
        const scanId = data.data?.scan_id;

        if (!scanId) {
          setChecking(false);
          Swal.fire("Error", "Scan ID was not returned by the API.", "error");
          return;
        }

        setProgress(30);
        setScanStatus(data.data?.status || "Submitted");

        pollScanStatus(scanId);
      } else {
        setChecking(false);
        setProgress(0);

        Swal.fire(
          "Error",
          data.message || "Unable to submit document to Copyleaks.",
          "error"
        );
      }
    } catch (error) {
      console.error("Copyleaks Upload Error:", error);

      setChecking(false);
      setProgress(0);

      Swal.fire(
        "Server Error",
        "Unable to connect to the Copyleaks checker API.",
        "error"
      );
    }
  };

  const loadPreviousScans = async () => {
    setShowHistoryModal(true);
    setHistoryLoading(true);

    try {
      const fd = new FormData();
      fd.append("tag", "getallbyuser");
      fd.append("checked_by", USER_ID);

      if (USER_ID) {
        fd.append("checked_by", USER_ID);
      }

      const response = await fetch(COPYLEAKS_URL, {
        method: "POST",
        body: fd,
      });

      const data = await response.json();

      if (data.success === 1) {
        const rows = Array.isArray(data.data) ? data.data : [];

        const sortedRows = rows.sort((a, b) => {
          const dateA = new Date(a.date_created || a.created_at || 0);
          const dateB = new Date(b.date_created || b.created_at || 0);
          return dateB - dateA;
        });

        setPreviousScans(sortedRows);
      } else {
        setPreviousScans([]);
        Swal.fire(
          "Error",
          data.message || "Unable to load previous scans.",
          "error"
        );
      }
    } catch (error) {
      console.error("Previous Scan Error:", error);
      setPreviousScans([]);

      Swal.fire(
        "Server Error",
        "Unable to connect to the scan history API.",
        "error"
      );
    } finally {
      setHistoryLoading(false);
    }
  };

  const closeHistoryModal = () => {
    setShowHistoryModal(false);
  };

  const resetChecker = () => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }

    setSelectedFile(null);
    setResult(null);
    setProgress(0);
    setChecking(false);
    setScanStatus("");

    if (fileInputRef.current) {
      fileInputRef.current.value = null;
    }
  };

  const resultJson = parseResultJson(result?.result_json);
  const scannedDocument = resultJson?.scannedDocument || {};
  const score = resultJson?.results?.score || {};
  const internetSources = resultJson?.results?.internet || [];

  const fileName =
    result?.file_name ||
    scannedDocument?.metadata?.filename ||
    selectedFile?.name ||
    "N/A";

  const fileType =
    result?.file_type ||
    fileName?.split(".")?.pop()?.toUpperCase() ||
    "N/A";

  const totalDocumentWords = scannedDocument?.totalWords || 0;

  const plagiarismScore = Number(
    result?.plagiarism_score || score?.aggregatedScore || 0
  ).toFixed(2);

  const originalityScore = Number(
    result?.originality_score || 100 - Number(score?.aggregatedScore || 0)
  ).toFixed(2);

  const rating = result?.rating || getRating(Number(plagiarismScore));

  const interpretation =
    result?.interpretation || getInterpretation(Number(plagiarismScore));

  const recommendations = getRecommendations(
    Number(plagiarismScore),
    internetSources
  );

  return (
    <div className="ai-checker-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Plagiarism Checker</h1>
          <p className="page-subtitle">
            Upload a PDF, TXT, DOC, or DOCX document and check its originality
            using plagiarism detection.
          </p>
        </div>

        <div className="action-buttons">
          <button className="secondary-btn" onClick={loadPreviousScans}>
            <FiClock />
            <span>View Previous Scan</span>
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
            <h3>Check document originality</h3>
          </div>

          <div
            className={`ai-upload-box ${selectedFile ? "has-file" : ""}`}
            onClick={() => fileInputRef.current.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.txt,.doc,.docx"
              hidden
              onChange={handleFileSelect}
            />

            <div className="ai-upload-icon">
              <FiUpload />
            </div>

            <h4>{selectedFile ? selectedFile.name : "Click to upload file"}</h4>

            <p>
              Supported formats: PDF, TXT, DOC, and DOCX. Maximum file size
              depends on your backend limit.
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
                <span>
                  {scanStatus === "Uploading"
                    ? "Uploading document..."
                    : scanStatus === "Submitted"
                    ? "Submitted to Copyleaks..."
                    : scanStatus === "Processing" || scanStatus === "In Progress"
                    ? "Copyleaks is analyzing your document..."
                    : "Waiting for scan result..."}
                </span>
                <strong>{progress}%</strong>
              </div>

              <div className="ai-progress-bar">
                <div style={{ width: `${progress}%` }} />
              </div>

              <p>
                Please keep this page open while ArcheIO waits for the
                webhook result.
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
                <span>Check Plagiarism</span>
              </>
            )}
          </button>
        </div>

        <div className="ai-info-card">
          <span className="card-kicker">How it works</span>
          <h3>Similarity review process</h3>

          <div className="ai-step-list">
            <div>
              <strong>1</strong>
              <span>Upload your document</span>
            </div>

            <div>
              <strong>2</strong>
              <span>ArcheIO submits the file to Copyleaks</span>
            </div>

            <div>
              <strong>3</strong>
              <span>Copyleaks scans for similarities</span>
            </div>

            <div>
              <strong>4</strong>
              <span>Webhook updates the result and ArcheIO displays the report</span>
            </div>
          </div>
        </div>
      </div>

      {result && (
        <div className="ai-result-section">
          <div className="ai-result-card">
            <span className="card-kicker">Scan Summary</span>
            <h3>{fileName}</h3>

            <div className="summary-box">
              <p>
                <strong>File Type:</strong> {fileType}
              </p>
              <p>
                <strong>Total Words:</strong> {totalDocumentWords}
              </p>
              <p>
                <strong>Rating:</strong> {rating}
              </p>
            </div>
          </div>

          <div className="ai-score-grid">
            <div className="ai-score-card success">
              <div className="score-content">
                <span className="score-label">Originality Score</span>

                <div className="score-value-wrap">
                  <h2>{originalityScore}%</h2>
                  <FiCheckCircle />
                </div>

                <div className="score-meter">
                  <div
                    className="score-meter-fill originality-fill"
                    style={{ width: `${originalityScore}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="ai-score-card danger">
              <div className="score-content">
                <span className="score-label">Plagiarism Score</span>

                <div className="score-value-wrap">
                  <h2>{plagiarismScore}%</h2>
                  <FiAlertTriangle />
                </div>

                <div className="score-meter">
                  <div
                    className="score-meter-fill plagiarism-fill"
                    style={{ width: `${plagiarismScore}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="ai-result-grid">
            <div className="ai-result-card">
              <span className="card-kicker">Recommendations</span>
              <h3>Suggested Improvements</h3>

              <div className="recommendation-wrap">
                <ul className="recommendation-list">
                  {recommendations.map((item, index) => (
                    <li key={index}>
                      <span className="recommendation-bullet" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="ai-result-card">
              <span className="card-kicker">Interpretation</span>
              <h3>Document Review Result</h3>

              <div className="summary-box">
                <p>{interpretation}</p>
              </div>
            </div>
          </div>

          <div className="ai-result-card">
            <div className="matched-header">
              <div>
                <span className="card-kicker">Internet Matches</span>
                <h3>Matched Internet Sources</h3>
              </div>

              <div className="matched-count">
                {internetSources.length} Sources
              </div>
            </div>

            <div className="source-list">
              {internetSources.length > 0 ? (
                internetSources.map((source, index) => (
                  <div className="source-item" key={source.id || index}>
                    <div className="source-left">
                      <div className="source-icon">
                        <FiSearch />
                      </div>

                      <div className="source-details">
                        <h4>{source.title || "Untitled Source"}</h4>

                        <p>
                          <strong>Matched Words:</strong>{" "}
                          {source.matchedWords ?? 0} |{" "}
                          <strong>Identical Words:</strong>{" "}
                          {source.identicalWords ?? 0} |{" "}
                          <strong>Similar Words:</strong>{" "}
                          {source.similarWords ?? 0} |{" "}
                          <strong>Total Words:</strong>{" "}
                          {source.totalWords ?? 0}
                        </p>

                        {source.url && (
                          <p className="source-url-text">{source.url}</p>
                        )}
                      </div>
                    </div>

                    {source.url && (
                      <a href={source.url} target="_blank" rel="noreferrer">
                        <FiExternalLink />
                        View Source
                      </a>
                    )}
                  </div>
                ))
              ) : (
                <div className="empty-state-box">
                  <p>No internet matches found.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showHistoryModal && (
        <div className="scan-history-backdrop">
          <div className="scan-history-modal">
            <div className="scan-history-header">
              <div>
                <h3>Previous Document Scans</h3>
                <p>List of uploaded documents scanned through Copyleaks.</p>
              </div>

              <button
                type="button"
                className="scan-history-close"
                onClick={closeHistoryModal}
              >
                <FiX />
              </button>
            </div>

            <div className="scan-history-body">
              {historyLoading ? (
                <div className="empty-state-box">
                  <p>Loading previous scans...</p>
                </div>
              ) : previousScans.length > 0 ? (
                <div className="scan-history-table-wrap">
                  <table className="scan-history-table">
                    <thead>
                      <tr>
                        <th>File Name</th>
                        <th>File Type</th>
                        <th>Plagiarism</th>
                        <th>Originality</th>
                        <th>Rating</th>
                        <th>Interpretation</th>
                        <th>Recommendation</th>
                        <th>Date Created</th>
                      </tr>
                    </thead>

                    <tbody>
                      {previousScans.map((scan, index) => {
                        const display = getScanDisplayData(scan);

                        return (
                          <tr key={scan.id || scan.scan_id || index}>
                            <td>{display.fileName}</td>
                            <td>{display.fileType}</td>
                            <td>{display.plagiarismScore}%</td>
                            <td>{display.originalityScore}%</td>
                            <td>{display.rating}</td>
                            <td>{display.interpretation}</td>
                            <td>
                              <ul className="scan-history-recommendations">
                                {display.recommendations.map((item, recIndex) => (
                                  <li key={recIndex}>{item}</li>
                                ))}
                              </ul>
                            </td>
                            <td>{display.dateCreated}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="empty-state-box">
                  <p>No previous scans found.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}