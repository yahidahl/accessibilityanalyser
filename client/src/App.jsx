// ==== 📁 client/src/App.jsx ====
import React, { useState, useEffect } from 'react';
import './App.css';
import {
  auth,
  signOut as firebaseSignOut,
} from './firebase';
import { useNavigate } from 'react-router-dom';

import { onAuthStateChanged } from 'firebase/auth';



function App() {
  const [url, setUrl] = useState('');
  const [report, setReport] = useState(null);
  const [log, setLog] = useState('');
  const [history, setHistory] = useState([]);
  const [user, setUser] = useState(null);
  const [ws, setWs] = useState(null);
  const navigate = useNavigate();

  // Auto-check user auth
  useEffect(() => {
  const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
    if (currentUser) {
      setUser(currentUser);
    } else {
      navigate('/'); // redirect to login if not authenticated
    }
  });

  return () => unsubscribe();
}, []);

  // Setup WebSocket
  useEffect(() => {
    const socket = new WebSocket('ws://localhost:8080');
    socket.onerror = () => setLog("⚠️ WebSocket connection failed.");
    setWs(socket);
    return () => socket.close();
  }, []);

  // Voice Feedback
  const speak = (text) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      utterance.rate = 1;
      utterance.pitch = 1;
      window.speechSynthesis.speak(utterance);
    }
  };

  // Handle WebSocket response
  useEffect(() => {
    if (!ws) return;
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.score !== undefined) {
          setReport(data);
          speak(`Audit complete. Score: ${data.score}/100 with ${data.issues.length} issues.`);
        } else {
          setLog(event.data);
        }
      } catch {
        setLog(event.data);
      }
    };
  }, [ws]);

  // Run Accessibility Audit
  const handleAnalyze = () => {
    if (!url || !ws || ws.readyState !== 1 || !user) {
      speak('Audit failed. Please check the URL or login status.');
      return;
    }

    setLog('⏳ Running audit...');
    setReport(null);

    ws.send(JSON.stringify({ url, userId: user.uid }));
  };

  // Fetch user-specific audit history
  const fetchHistory = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/user-reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.uid }),
      });
      const data = await res.json();
      setHistory(data);
    } catch (err) {
      console.error('Failed to fetch history:', err);
    }
  };

  // Download Report
  const downloadReport = () => {
    if (!report) return;
    const content = `Accessibility Report\n\nURL: ${url}\nScore: ${report.score}/100\n\nIssues:\n${
      report.issues.length === 0
        ? '✅ No issues found!'
        : report.issues.map((issue, i) => `${i + 1}. ${issue}`).join('\n')
    }`;
    const blob = new Blob([content], { type: 'text/plain' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'accessibility-report.txt';
    link.click();
  };

  // Logout
  const logout = async () => {
    await firebaseSignOut(auth);
    setUser(null);
    setReport(null);
    setUrl('');
    setHistory([]);
    speak('You have been logged out');
    navigate('/');
  };

  return (
    <div className="app">
      <h1>♿ Accessibility Analyzer</h1>

      {user && (
        <>
          <p>Welcome, {user.email}</p>
          <button onClick={logout}>Logout</button>

          <div className="input-section">
            <input
              type="text"
              placeholder="Enter website URL..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
            <button onClick={handleAnalyze}>Analyze</button>
          </div>

          {log && <div className="log">{log}</div>}

          {report && (
            <div className="report">
              <h2>Score: {report.score}/100</h2>
              {report.issues.length === 0 ? (
                <p>✅ No issues found!</p>
              ) : (
                <ul>
                  {report.issues.map((issue, i) => (
                    <li key={i}>⚠️ {issue}</li>
                  ))}
                </ul>
              )}
              <button onClick={downloadReport}>📥 Download Report</button>
            </div>
          )}

          <button onClick={fetchHistory}>📜 View History</button>

          {history.length > 0 && (
            <div className="history">
              <h3>Past Audits:</h3>
              {history.map((item, index) => (
                <div key={index} className="history-card">
                  <p><strong>URL:</strong> {item.url}</p>
                  <p><strong>Score:</strong> {item.score}</p>
                  <ul>
                    {item.issues.map((issue, i) => (
                      <li key={i}>• {issue}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default App;
