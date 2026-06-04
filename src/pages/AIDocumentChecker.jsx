import React, { useEffect, useRef, useState } from "react";
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
import { API_URL } from "../shared/constants";

const AI_DETECTION_URL = `${API_URL}/copyleaks_ai_detector.php`;
const COPYLEAKS_URL = `${API_URL}/copyleaks.php`;

export default function AIDocumentChecker() {
  const fileInputRef = useRef(null);
  const pollingRef = useRef(null);

  const [selectedFile, setSelectedFile] = useState(null);
  const [checking, setChecking] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState("");

  const [aiResult, setAiResult] = useState(null);
  const [plagiarismResult, setPlagiarismResult] = useState(null);

  const [showAIHistoryModal, setShowAIHistoryModal] = useState(false);
  const [aiHistoryLoading, setAIHistoryLoading] = useState(false);
  const [previousAIScans, setPreviousAIScans] = useState([]);

  const [showPlagiarismHistoryModal, setShowPlagiarismHistoryModal] =
    useState(false);
  const [plagiarismHistoryLoading, setPlagiarismHistoryLoading] =
    useState(false);
  const [previousPlagiarismScans, setPreviousPlagiarismScans] = useState([]);

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

  const parseJson = (value) => {
    if (!value) return null;
    if (typeof value === "object") return value;

    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  };

  const isAllowedFile = (file) => {
    if (!file) return false;

    const fileName = file.name.toLowerCase();

    return (
      allowedTypes.includes(file.type) ||
      allowedExtensions.some((ext) => fileName.endsWith(ext))
    );
  };

  const getRating = (plagiarismScore) => {
    if (plagiarismScore <= 20) return "Low Similarity";
    if (plagiarismScore <= 50) return "Moderate Similarity";
    return "High Similarity";
  };

  const getPlagiarismInterpretation = (plagiarismScore) => {
    if (plagiarismScore <= 20) {
      return "The document appears mostly original with low similarity detected.";
    }

    if (plagiarismScore <= 50) {
      return "The document contains moderate similarity. Some sections may need review, citation, or rewriting.";
    }

    return "The document contains high similarity. Significant review is recommended before approval or submission.";
  };

  const getPlagiarismRecommendations = (
    plagiarismScore,
    internetSources = []
  ) => {
    const recommendations = [];

    if (plagiarismScore > 50) {
      recommendations.push(
        "Review sections with high similarity and rewrite them using original wording."
      );
      recommendations.push(
        "Verify whether copied or closely matched sections are properly quoted and cited."
      );
    } else if (plagiarismScore > 20) {
      recommendations.push(
        "Review moderately similar sections and improve paraphrasing where necessary."
      );
      recommendations.push(
        "Add proper references for borrowed concepts, phrases, or source-based content."
      );
    } else {
      recommendations.push(
        "The document has low similarity. Maintain proper citation practices before final submission."
      );
    }

    if (internetSources.length > 0) {
      recommendations.push(
        "Check the matched internet sources and validate whether attribution is required."
      );
    }

    recommendations.push(
      "Re-run the scan after revisions to confirm originality improvements."
    );

    return recommendations;
  };

  const getPlagiarismHistoryDisplay = (scan) => {
    const json = parseJson(scan?.result_json);
    const scannedDocument = json?.scannedDocument || {};
    const score = json?.results?.score || {};

    const fileName =
      scan?.file_name || scannedDocument?.metadata?.filename || "N/A";

    const fileType =
      scan?.file_type || fileName?.split(".")?.pop()?.toUpperCase() || "N/A";

    const plagiarismScore = Number(
      scan?.plagiarism_score || score?.aggregatedScore || 0
    );

    const originalityScore = Number(
      scan?.originality_score || 100 - plagiarismScore
    );

    return {
      fileName,
      fileType,
      plagiarismScore: plagiarismScore.toFixed(2),
      originalityScore: originalityScore.toFixed(2),
      rating: scan?.rating || getRating(plagiarismScore),
      interpretation:
        scan?.interpretation || getPlagiarismInterpretation(plagiarismScore),
      dateCreated: scan?.date_created || scan?.created_at || "N/A",
    };
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
    setAiResult(null);
    setPlagiarismResult(null);
    setProgress(0);
    setStatusText("");
  };

  const runAiDetection = async () => {
    const fd = new FormData();
    fd.append("tag", "checkfile");
    fd.append("checked_by", USER_ID);
    fd.append("file", selectedFile);

    const response = await fetch(AI_DETECTION_URL, {
      method: "POST",
      body: fd,
    });

    const data = await response.json();

    if (data.success !== 1) {
      throw new Error(data.message || "Unable to complete AI detection.");
    }

    return data.data;
  };

  const submitPlagiarismCheck = async () => {
    const fd = new FormData();
    fd.append("tag", "plagiarismcheck");
    fd.append("checked_by", USER_ID);
    fd.append("file", selectedFile);

    const response = await fetch(COPYLEAKS_URL, {
      method: "POST",
      body: fd,
    });

    const data = await response.json();

    if (data.success !== 1) {
      throw new Error(
        data.message || "Unable to submit document to Copyleaks."
      );
    }

    const scanId = data.data?.scan_id;

    if (!scanId) {
      throw new Error("Scan ID was not returned by the plagiarism API.");
    }

    return scanId;
  };

  const pollPlagiarismResult = (scanId) => {
    return new Promise((resolve, reject) => {
      let estimatedProgress = 45;

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

          setStatusText(`Plagiarism status: ${status}`);

          if (
            status === "Submitted" ||
            status === "Processing" ||
            status === "In Progress"
          ) {
            estimatedProgress = Math.min(estimatedProgress + 8, 95);
            setProgress(estimatedProgress);
          }

          if (status === "Completed") {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
            resolve(scanData);
          }

          if (status === "Failed" || status === "Error") {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
            reject(new Error(scanData?.message || "Plagiarism scan failed."));
          }
        } catch (error) {
          clearInterval(pollingRef.current);
          pollingRef.current = null;
          reject(error);
        }
      }, 4000);
    });
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

    try {
      if (pollingRef.current) clearInterval(pollingRef.current);

      setChecking(true);
      setProgress(15);
      setStatusText("Uploading and processing document...");
      setAiResult(null);
      setPlagiarismResult(null);

      const aiPromise = runAiDetection();
      const plagiarismScanId = await submitPlagiarismCheck();

      setProgress(40);
      setStatusText("Waiting for AI and plagiarism results...");

      const [aiData, plagiarismData] = await Promise.all([
        aiPromise,
        pollPlagiarismResult(plagiarismScanId),
      ]);

      setAiResult(aiData);
      setPlagiarismResult(plagiarismData);
      setProgress(100);
      setStatusText("Document analysis completed.");

      Swal.fire({
        title: "Document Check Completed",
        text: "AI detection and plagiarism check completed successfully.",
        icon: "success",
        timer: 1600,
        showConfirmButton: false,
      });
    } catch (error) {
      console.error("Document Check Error:", error);

      Swal.fire(
        "Error",
        error.message || "Unable to complete document checking.",
        "error"
      );
    } finally {
      setTimeout(() => {
        setChecking(false);
        setProgress(0);
      }, 800);
    }
  };

  const loadPreviousAIScans = async () => {
    if (!USER_ID) {
      Swal.fire("User Error", "Unable to identify the logged-in user.", "error");
      return;
    }

    setAIHistoryLoading(true);
    setPreviousAIScans([]);
    setShowAIHistoryModal(true);

    try {
      const fd = new FormData();
      fd.append("tag", "getallbyuser");
      fd.append("checked_by", USER_ID);

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

        setPreviousAIScans(sortedRows);
      } else {
        setPreviousAIScans([]);
        Swal.fire(
          "Error",
          data.message || "Unable to load AI detection history.",
          "error"
        );
      }
    } catch (error) {
      console.error("AI History Error:", error);
      setPreviousAIScans([]);

      Swal.fire(
        "Server Error",
        "Unable to connect to AI Detection API.",
        "error"
      );
    } finally {
      setAIHistoryLoading(false);
    }
  };

  const loadPreviousPlagiarismScans = async () => {
    if (!USER_ID) {
      Swal.fire("User Error", "Unable to identify the logged-in user.", "error");
      return;
    }

    setPlagiarismHistoryLoading(true);
    setPreviousPlagiarismScans([]);
    setShowPlagiarismHistoryModal(true);

    try {
      const fd = new FormData();
      fd.append("tag", "getallbyuser");
      fd.append("checked_by", USER_ID);

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

        setPreviousPlagiarismScans(sortedRows);
      } else {
        setPreviousPlagiarismScans([]);
        Swal.fire(
          "Error",
          data.message || "Unable to load plagiarism history.",
          "error"
        );
      }
    } catch (error) {
      console.error("Plagiarism History Error:", error);
      setPreviousPlagiarismScans([]);

      Swal.fire(
        "Server Error",
        "Unable to connect to Copyleaks API.",
        "error"
      );
    } finally {
      setPlagiarismHistoryLoading(false);
    }
  };

  const resetChecker = () => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }

    setSelectedFile(null);
    setChecking(false);
    setProgress(0);
    setStatusText("");
    setAiResult(null);
    setPlagiarismResult(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = null;
    }
  };

  const plagiarismJson = parseJson(plagiarismResult?.result_json);
  const scannedDocument = plagiarismJson?.scannedDocument || {};
  const score = plagiarismJson?.results?.score || {};
  const internetSources = plagiarismJson?.results?.internet || [];

  const humanScore = Number(aiResult?.human_score || 0).toFixed(2);
  const aiScore = Number(aiResult?.ai_score || 0).toFixed(2);

  const plagiarismScore = Number(
    plagiarismResult?.plagiarism_score || score?.aggregatedScore || 0
  ).toFixed(2);

  const originalityScore = Number(
    plagiarismResult?.originality_score ||
    100 - Number(score?.aggregatedScore || 0)
  ).toFixed(2);

  const fileName =
    aiResult?.file_name ||
    plagiarismResult?.file_name ||
    scannedDocument?.metadata?.filename ||
    selectedFile?.name ||
    "Checked Document";

  const fileType =
    aiResult?.file_type ||
    plagiarismResult?.file_type ||
    fileName?.split(".")?.pop()?.toUpperCase() ||
    "N/A";

  const totalWords = aiResult?.total_words || scannedDocument?.totalWords || 0;

  const plagiarismRating =
    plagiarismResult?.rating || getRating(Number(plagiarismScore));

  const plagiarismInterpretation =
    plagiarismResult?.interpretation ||
    getPlagiarismInterpretation(Number(plagiarismScore));

  const plagiarismRecommendations = getPlagiarismRecommendations(
    Number(plagiarismScore),
    internetSources
  );

  return (
    <div className="ai-checker-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">AI & Plagiarism Checker</h1>
          <p className="page-subtitle">
            Upload one document and ArcheIO will run both AI detection and
            plagiarism checking.
          </p>
        </div>

        <div className="action-buttons">
          <button className="secondary-btn" onClick={loadPreviousAIScans}>
            <FiClock />
            <span>AI Detection History</span>
          </button>

          <button
            className="secondary-btn"
            onClick={loadPreviousPlagiarismScans}
          >
            <FiClock />
            <span>Plagiarism History</span>
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
            <h3>Run complete document analysis</h3>
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

            <p>Supported formats: PDF, TXT, DOC, and DOCX.</p>
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
                <span>{statusText || "Processing document..."}</span>
                <strong>{progress}%</strong>
              </div>

              <div className="ai-progress-bar">
                <div style={{ width: `${progress}%` }} />
              </div>

              <p>
                Please keep this page open while both checks are being
                processed.
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
                <span>Run AI & Plagiarism Check</span>
              </>
            )}
          </button>
        </div>

        <div className="ai-info-card">
          <span className="card-kicker">How it works</span>
          <h3>One upload, two checks</h3>

          <div className="ai-step-list">
            <div>
              <strong>1</strong>
              <span>Upload your document</span>
            </div>

            <div>
              <strong>2</strong>
              <span>ArcheIO sends the file to AI Detection</span>
            </div>

            <div>
              <strong>3</strong>
              <span>ArcheIO also submits it to Plagiarism Checker</span>
            </div>

            <div>
              <strong>4</strong>
              <span>Results are displayed in one combined report</span>
            </div>
          </div>
        </div>
      </div>

      {(aiResult || plagiarismResult) && (
        <div className="ai-result-section">
          <div className="ai-result-card">
            <span className="card-kicker">Document Summary</span>
            <h3>{fileName}</h3>

            <div className="summary-box">
              <p>
                <strong>File Type:</strong> {fileType}
              </p>
              <p>
                <strong>Total Words:</strong> {totalWords}
              </p>
              <p>
                <strong>AI Classification:</strong>{" "}
                {aiResult?.classification || "N/A"}
              </p>
              <p>
                <strong>Plagiarism Rating:</strong> {plagiarismRating}
              </p>
            </div>
          </div>

          <div className="ai-score-grid four-column-kpi">
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
              <span className="card-kicker">AI Detection Insight</span>
              <h3>AI Writing Result</h3>
              <div className="summary-box">
                <p>
                  {aiResult?.interpretation ||
                    "No AI detection interpretation available."}
                </p>
              </div>
            </div>

            <div className="ai-result-card">
              <span className="card-kicker">AI Recommendation</span>
              <h3>Suggested Action</h3>
              <div className="summary-box">
                <p>
                  {aiResult?.recommendation ||
                    "No AI detection recommendation available."}
                </p>
              </div>
            </div>

            <div className="ai-result-card">
              <span className="card-kicker">Plagiarism Insight</span>
              <h3>Similarity Review Result</h3>
              <div className="summary-box">
                <p>{plagiarismInterpretation}</p>
              </div>
            </div>

            <div className="ai-result-card">
              <span className="card-kicker">Plagiarism Recommendations</span>
              <h3>Suggested Improvements</h3>
              <div className="recommendation-wrap">
                <ul className="recommendation-list">
                  {plagiarismRecommendations.map((item, index) => (
                    <li key={index}>
                      <span className="recommendation-bullet" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
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

      {showAIHistoryModal && (
        <div className="scan-history-backdrop">
          <div className="scan-history-modal">
            <div className="scan-history-header">
              <div>
                <h3>Previous AI Detection Records</h3>
                <p>List of documents checked through AI Detection.</p>
              </div>

              <button
                type="button"
                className="scan-history-close"
                onClick={() => setShowAIHistoryModal(false)}
              >
                <FiX />
              </button>
            </div>

            <div className="scan-history-body">
              {aiHistoryLoading ? (
                <div className="empty-state-box">
                  <p>Loading previous AI detection records...</p>
                </div>
              ) : previousAIScans.length > 0 ? (
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
                      {previousAIScans.map((scan, index) => (
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

      {showPlagiarismHistoryModal && (
        <div className="scan-history-backdrop">
          <div className="scan-history-modal">
            <div className="scan-history-header">
              <div>
                <h3>Previous Plagiarism Scans</h3>
                <p>List of documents scanned through Plagiarism Checker.</p>
              </div>

              <button
                type="button"
                className="scan-history-close"
                onClick={() => setShowPlagiarismHistoryModal(false)}
              >
                <FiX />
              </button>
            </div>

            <div className="scan-history-body">
              {plagiarismHistoryLoading ? (
                <div className="empty-state-box">
                  <p>Loading previous plagiarism scans...</p>
                </div>
              ) : previousPlagiarismScans.length > 0 ? (
                <div className="scan-history-table-wrap">
                  <table className="scan-history-table">
                    <thead>
                      <tr>
                        <th>File Name</th>
                        <th>File Type</th>
                        <th>Originality</th>
                        <th>Plagiarism</th>
                        <th>Rating</th>
                        <th>Interpretation</th>
                        <th>Date Created</th>
                      </tr>
                    </thead>

                    <tbody>
                      {previousPlagiarismScans.map((scan, index) => {
                        const display = getPlagiarismHistoryDisplay(scan);

                        return (
                          <tr key={scan.id || scan.scan_id || index}>
                            <td>{display.fileName}</td>
                            <td>{display.fileType}</td>
                            <td>{display.originalityScore}%</td>
                            <td>{display.plagiarismScore}%</td>
                            <td>{display.rating}</td>
                            <td>{display.interpretation}</td>
                            <td>{display.dateCreated}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="empty-state-box">
                  <p>No previous plagiarism scans found.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}