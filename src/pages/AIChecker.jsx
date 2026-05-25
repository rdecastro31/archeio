import React, { useRef, useState } from "react";
import {
  FiUpload,
  FiFileText,
  FiCheckCircle,
  FiAlertTriangle,
  FiSearch,
  FiExternalLink,
  FiRefreshCw,
} from "react-icons/fi";
import Swal from "sweetalert2";
import "../styles/aichecker.css";
import { API_URL } from "../shared/constants";

const AI_CHECKER_URL = `${API_URL}/plagiarismcheck.php`;

export default function AIChecker() {
  const fileInputRef = useRef(null);

  const [selectedFile, setSelectedFile] = useState(null);
  const [checking, setChecking] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null);

  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const USER_ID = user?.id || user?.userid || "";

  const getOriginalityInterpretation = (score) => {
    if (score >= 80) {
      return {
        title: "Excellent Originality",
        description:
          "The document appears highly original with minimal similarity detected from online sources.",
        level: "excellent",
      };
    }

    if (score >= 50) {
      return {
        title: "Moderate Originality",
        description:
          "Some portions may contain paraphrased, reused, or commonly available content that should be reviewed.",
        level: "moderate",
      };
    }

    return {
      title: "Low Originality",
      description:
        "Significant similarities were detected against online or existing published materials.",
      level: "low",
    };
  };

  const getPlagiarismInterpretation = (score) => {
    if (score <= 20) {
      return {
        title: "Low Similarity",
        description:
          "The document appears mostly unique and acceptable under standard originality guidelines.",
        level: "excellent",
      };
    }

    if (score <= 50) {
      return {
        title: "Moderate Similarity",
        description:
          "Some sections may require rewriting, paraphrasing, or proper citation of referenced materials.",
        level: "moderate",
      };
    }

    return {
      title: "High Similarity",
      description:
        "Large portions of the document strongly match existing online content or publicly available sources.",
      level: "high",
    };
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const allowedTypes = ["application/pdf", "text/plain"];
    const allowedExtensions = [".pdf", ".txt"];
    const fileName = file.name.toLowerCase();

    const isValid =
      allowedTypes.includes(file.type) ||
      allowedExtensions.some((ext) => fileName.endsWith(ext));

    if (!isValid) {
      Swal.fire("Invalid File", "Only PDF and TXT files are allowed.", "error");
      e.target.value = null;
      return;
    }

    setSelectedFile(file);
    setResult(null);
  };

  const handleSubmit = async () => {
    if (!selectedFile) {
      Swal.fire(
        "No File Selected",
        "Please upload a PDF or TXT file first.",
        "warning"
      );
      return;
    }

    const fd = new FormData();
    fd.append("tag", "insert");
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

      const response = await fetch(AI_CHECKER_URL, {
        method: "POST",
        body: fd,
      });

      const data = await response.json();

      if (progressTimer) {
        clearInterval(progressTimer);
      }

      setProgress(100);

      if (data.success === 1) {
        setResult(data.data);

        Swal.fire({
          title: "Check Completed",
          text: "AI plagiarism check completed successfully.",
          icon: "success",
          timer: 1600,
          showConfirmButton: false,
        });
      } else {
        Swal.fire(
          "Error",
          data.message || "Unable to check plagiarism.",
          "error"
        );
      }
    } catch (error) {
      console.error("AI Checker API Error:", error);

      Swal.fire(
        "Server Error",
        "Unable to connect to the AI checker API.",
        "error"
      );
    } finally {
      if (progressTimer) {
        clearInterval(progressTimer);
      }

      setTimeout(() => {
        setChecking(false);
        setProgress(0);
      }, 700);
    }
  };

  const resetChecker = () => {
    setSelectedFile(null);
    setResult(null);
    setProgress(0);

    if (fileInputRef.current) {
      fileInputRef.current.value = null;
    }
  };

  const plagiarismScore = Number(result?.plagiarism_score || 0);
  const originalityScore = Number(result?.originality_score || 0);

  const originalityInterpretation =
    getOriginalityInterpretation(originalityScore);

  const plagiarismInterpretation =
    getPlagiarismInterpretation(plagiarismScore);

  return (
    <div className="ai-checker-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Document Checker</h1>
          <p className="page-subtitle">
            Upload a PDF or TXT document and check online similarity using AI
            and Google Search grounding.
          </p>
        </div>

        <div className="action-buttons">
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
              accept=".pdf,.txt"
              hidden
              onChange={handleFileSelect}
            />

            <div className="ai-upload-icon">
              <FiUpload />
            </div>

            <h4>
              {selectedFile ? selectedFile.name : "Click to upload file"}
            </h4>

            <p>
              Supported formats: PDF and TXT. Maximum file size depends on your
              backend limit.
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
                <span>Analyzing document...</span>
                <strong>{progress}%</strong>
              </div>

              <div className="ai-progress-bar">
                <div style={{ width: `${progress}%` }} />
              </div>

              <p>
                Extracting text, searching possible online matches, and
                generating AI results.
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
          <h3>AI-assisted similarity review</h3>

          <div className="ai-step-list">
            <div>
              <strong>1</strong>
              <span>Upload your document</span>
            </div>

            <div>
              <strong>2</strong>
              <span>System extracts readable text</span>
            </div>

            <div>
              <strong>3</strong>
              <span>AI checks similarity using Google Search grounding</span>
            </div>

            <div>
              <strong>4</strong>
              <span>
                Review originality score, matched sources, and recommendations
              </span>
            </div>
          </div>
        </div>
      </div>

      {result && (
        <div className="ai-result-section">
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

                <div
                  className={`score-legend ${originalityInterpretation.level}`}
                >
                  <strong>{originalityInterpretation.title}</strong>
                  <p>{originalityInterpretation.description}</p>
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

                <div
                  className={`score-legend ${plagiarismInterpretation.level}`}
                >
                  <strong>{plagiarismInterpretation.title}</strong>
                  <p>{plagiarismInterpretation.description}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="ai-result-grid">
            <div className="ai-result-card">
              <span className="card-kicker">AI Summary</span>
              <h3>Document Review Result</h3>

              <div className="summary-box">
                <p>{result.ai_summary || "No summary available."}</p>
              </div>
            </div>

            <div className="ai-result-card">
              <span className="card-kicker">Recommendations</span>
              <h3>Suggested Improvements</h3>

              {result.recommendations?.length > 0 ? (
                <div className="recommendation-wrap">
                  <ul className="recommendation-list">
                    {result.recommendations.map((item, index) => (
                      <li key={index}>
                        <span className="recommendation-bullet" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div className="empty-state-box">
                  <p>No recommendations available.</p>
                </div>
              )}
            </div>
          </div>

          <div className="ai-result-card">
            <div className="matched-header">
              <div>
                <span className="card-kicker">Matched Sources</span>
                <h3>Possible Online Similarities</h3>
              </div>

              <div className="matched-count">
                {result.matched_sources?.length || 0} Sources
              </div>
            </div>

            <div className="source-list">
              {result.matched_sources?.length > 0 ? (
                result.matched_sources.map((source, index) => (
                  <div className="source-item" key={index}>
                    <div className="source-left">
                      <div className="source-icon">
                        <FiSearch />
                      </div>

                      <div className="source-details">
                        <h4>{source.source_title || "Untitled Source"}</h4>
                        <p>
                          {source.similarity_reason ||
                            "Similarity detected."}
                        </p>
                      </div>
                    </div>

                    {source.source_url && (
                      <a
                        href={source.source_url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <FiExternalLink />
                        View Source
                      </a>
                    )}
                  </div>
                ))
              ) : (
                <div className="empty-state-box">
                  <p>No matched sources found.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}