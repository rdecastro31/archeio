import React, { useEffect, useState } from 'react'
import axios from 'axios'
import {
  FiClock,
  FiAlertTriangle,
  FiSend,
  FiInbox,
  FiCheckCircle,
  FiFileText,
} from 'react-icons/fi'
import '../styles/dashboard.css'
import { API_URL } from '../shared/constants'

const DASHBOARD_URL = `${API_URL}/dashboard.php`

export default function Dashboard() {
  const [summary, setSummary] = useState({
    pending_my_action: 0,
    incoming_documents: 0,
    forwarded_documents: 0,
    overdue_documents: 0,
  })

  const [pendingActions, setPendingActions] = useState([])
  const [dueSoonOverdue, setDueSoonOverdue] = useState([])
  const [recentActivity, setRecentActivity] = useState([])
  const [activeDocuments, setActiveDocuments] = useState([])
  const [loading, setLoading] = useState(true)

  const storedUser = JSON.parse(localStorage.getItem('user') || '{}')
  const userId = storedUser.id || storedUser.userid

  const postDashboard = async (tag) => {
    const formData = new FormData()
    formData.append('tag', tag)
    formData.append('user_id', userId)

    const response = await axios.post(DASHBOARD_URL, formData)
    return response.data
  }

  useEffect(() => {
    if (!userId) {
      setLoading(false)
      return
    }

    const loadDashboard = async () => {
      try {
        const [summaryRes, pendingRes, dueRes, activityRes, activeDocsRes] =
          await Promise.all([
            postDashboard('get_user_summary'),
            postDashboard('get_pending_actions'),
            postDashboard('get_due_soon_overdue'),
            postDashboard('get_recent_activity'),
            postDashboard('get_my_active_documents'),
          ])

        if (summaryRes.success === 1) setSummary(summaryRes.data || {})
        if (pendingRes.success === 1) setPendingActions(pendingRes.data || [])
        if (dueRes.success === 1) setDueSoonOverdue(dueRes.data || [])
        if (activityRes.success === 1) setRecentActivity(activityRes.data || [])
        if (activeDocsRes.success === 1) setActiveDocuments(activeDocsRes.data || [])
      } catch (error) {
        console.error('Dashboard loading error:', error)
      } finally {
        setLoading(false)
      }
    }

    loadDashboard()
  }, [userId])

  const stats = [
    {
      title: 'Pending My Action',
      value: summary.pending_my_action || 0,
      meta: 'Needs your attention',
      icon: <FiClock />,
    },
    {
      title: 'Incoming Documents',
      value: summary.incoming_documents || 0,
      meta: 'Sent to you',
      icon: <FiInbox />,
    },
    {
      title: 'Forwarded Documents',
      value: summary.forwarded_documents || 0,
      meta: 'Sent by you',
      icon: <FiSend />,
    },
    {
      title: 'Overdue Documents',
      value: summary.overdue_documents || 0,
      meta: 'Past due date',
      icon: <FiAlertTriangle />,
    },
  ]

  const formatDate = (dateValue) => {
    if (!dateValue) return '-'

    return new Date(dateValue).toLocaleDateString('en-PH', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
    })
  }

  if (loading) {
    return (
      <div className="dashboard-page">
        <p>Loading dashboard...</p>
      </div>
    )
  }

  return (
    <div className="dashboard-page">
      <section className="dashboard-stats-grid">
        {stats.map((item, index) => (
          <div className="dashboard-stat-card" key={index}>
            <div className="dashboard-stat-top">
              <div className="dashboard-stat-icon">{item.icon}</div>
              <span>{item.meta}</span>
            </div>

            <h3>{item.value}</h3>
            <p>{item.title}</p>
          </div>
        ))}
      </section>

      <section className="dashboard-content-grid">
        <div className="dashboard-main-column">
          <div className="dashboard-card">
            <div className="dashboard-card-header">
              <div>
                <span className="card-kicker">Work Queue</span>
                <h3>My Pending Actions</h3>
              </div>
            </div>

            <div className="dashboard-table-wrap">
              <table className="dashboard-table">
                <thead>
                  <tr>
                    <th>Document No.</th>
                    <th>Title</th>
                    <th>From</th>
                    <th>Instruction</th>
                    <th>Status</th>
                    <th>Due Date</th>
                  </tr>
                </thead>

                <tbody>
                  {pendingActions.length > 0 ? (
                    pendingActions.map((item) => (
                      <tr key={item.transaction_id}>
                        <td>{item.document_no || '-'}</td>
                        <td>{item.title || '-'}</td>
                        <td>{item.from_user || item.from_department || '-'}</td>
                        <td>{item.instruction_name || '-'}</td>
                        <td>
                          <span className="status-pill">
                            {item.document_status_name || '-'}
                          </span>
                        </td>
                        <td>{formatDate(item.due_date)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="6">No pending actions found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="dashboard-card">
            <div className="dashboard-card-header">
              <div>
                <span className="card-kicker">Current Responsibility</span>
                <h3>My Active Documents</h3>
              </div>
            </div>

            <div className="document-group-list">
              {activeDocuments.length > 0 ? (
                activeDocuments.map((doc) => (
                  <div className="document-group-item" key={doc.id}>
                    <div className="document-group-icon">
                      <FiFileText />
                    </div>

                    <div className="document-group-content">
                      <h4>{doc.document_no || '-'}</h4>
                      <p>{doc.title || '-'}</p>
                    </div>

                    <div className="document-group-total">
                      <strong>{doc.document_status_name || '-'}</strong>
                      <span>{formatDate(doc.due_date)}</span>
                    </div>
                  </div>
                ))
              ) : (
                <p>No active documents found.</p>
              )}
            </div>
          </div>
        </div>

        <aside className="dashboard-side-column">
          <div className="dashboard-card">
            <div className="dashboard-card-header">
              <div>
                <span className="card-kicker">Deadline Watch</span>
                <h3>Due Soon / Overdue</h3>
              </div>
            </div>

            <div className="summary-list">
              {dueSoonOverdue.length > 0 ? (
                dueSoonOverdue.map((item) => (
                  <div className="summary-row" key={item.id}>
                    <span>
                      {item.document_no} - {item.title}
                    </span>

                    <strong>
                      {item.days_remaining < 0
                        ? `${Math.abs(item.days_remaining)} days overdue`
                        : `${item.days_remaining} days left`}
                    </strong>
                  </div>
                ))
              ) : (
                <p>No due or overdue documents.</p>
              )}
            </div>
          </div>

          <div className="dashboard-card">
            <div className="dashboard-card-header">
              <div>
                <span className="card-kicker">Recent Activity</span>
                <h3>Latest Updates</h3>
              </div>
            </div>

            <div className="activity-feed">
              {recentActivity.length > 0 ? (
                recentActivity.map((item) => (
                  <div className="activity-feed-item" key={item.transaction_id}>
                    <div className="activity-feed-icon">
                      <FiCheckCircle />
                    </div>

                    <p>
                      <strong>{item.document_no || '-'}</strong> —{' '}
                      {item.action_name || item.instruction_name || 'Updated'}{' '}
                      {item.to_user ? `to ${item.to_user}` : ''}
                    </p>
                  </div>
                ))
              ) : (
                <p>No recent activity found.</p>
              )}
            </div>
          </div>
        </aside>
      </section>
    </div>
  )
}