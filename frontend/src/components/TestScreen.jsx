import { useState, useEffect } from 'react';
import './TestScreen.css';

function TestScreen({ backendUrl, onTestsPass, onTestsFail }) {
  const [tests, setTests] = useState({
    backendUrl: { status: 'pending', message: '', details: '' },
    health: { status: 'pending', message: '', details: '' },
    socket: { status: 'pending', message: '', details: '' }
  });
  const [allTestsPassed, setAllTestsPassed] = useState(false);
  const [errorReport, setErrorReport] = useState('');

  useEffect(() => {
    runTests();
  }, []);

  const runTests = async () => {
    // Test 1: Check Backend URL
    updateTest('backendUrl', 'running', 'Checking backend URL...');

    if (!backendUrl || backendUrl === 'http://localhost:3000') {
      updateTest('backendUrl', 'failed',
        'Backend URL not configured!',
        `Expected: https://your-backend.onrender.com\nGot: ${backendUrl || 'undefined'}\n\nFix: Set VITE_BACKEND_URL in Vercel Environment Variables`
      );
      generateErrorReport();
      return;
    }

    updateTest('backendUrl', 'passed', `Using: ${backendUrl}`);

    // Test 2: Health Check
    updateTest('health', 'running', 'Testing /health endpoint...');

    try {
      const response = await fetch(`${backendUrl}/health`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.status === 'ok') {
        updateTest('health', 'passed', `Backend online (${data.timestamp})`);
      } else {
        throw new Error(`Unexpected response: ${JSON.stringify(data)}`);
      }
    } catch (error) {
      updateTest('health', 'failed',
        'Backend not reachable!',
        `URL: ${backendUrl}/health\nError: ${error.message}\n\nPossible causes:\n1. Backend not deployed on Render\n2. Backend crashed (check Render logs)\n3. Wrong URL in VITE_BACKEND_URL`
      );
      generateErrorReport();
      return;
    }

    // Test 3: WebSocket Connection
    updateTest('socket', 'running', 'Testing WebSocket connection...');

    const wsUrl = backendUrl.replace('https://', 'wss://').replace('http://', 'ws://');
    let ws = null;

    try {
      ws = new WebSocket(wsUrl);

      const socketTimeout = setTimeout(() => {
        if (ws) ws.close();
        updateTest('socket', 'failed',
          'WebSocket connection timeout!',
          `URL: ${wsUrl}\nTimeout after 10 seconds\n\nPossible causes:\n1. Backend not running\n2. WebSocket blocked by firewall\n3. Wrong backend URL`
        );
        generateErrorReport();
      }, 10000);

      ws.onopen = () => {
        clearTimeout(socketTimeout);
        updateTest('socket', 'passed', `WebSocket connected successfully`);
        ws.close();

        setAllTestsPassed(true);
        setTimeout(() => {
          onTestsPass();
        }, 1500);
      };

      ws.onerror = (error) => {
        clearTimeout(socketTimeout);
        if (ws) ws.close();
        updateTest('socket', 'failed',
          'WebSocket connection failed!',
          `URL: ${wsUrl}\nError: Connection refused\n\nCheck:\n1. Is Funkhaus backend running?\n2. Check Render logs for errors\n3. CORS might be blocking connection`
        );
        generateErrorReport();
      };
    } catch (error) {
      updateTest('socket', 'failed',
        'WebSocket error!',
        `URL: ${wsUrl}\nError: ${error.message}`
      );
      generateErrorReport();
    }
  };

  const updateTest = (testName, status, message, details = '') => {
    setTests(prev => ({
      ...prev,
      [testName]: { status, message, details }
    }));
  };

  const generateErrorReport = () => {
    const report = `
SHOUTBOX DEBUG REPORT
=====================

Frontend URL: ${window.location.origin}
Backend URL: ${backendUrl || 'NOT SET'}
Timestamp: ${new Date().toISOString()}

TEST RESULTS:
-------------

1. Backend URL Check: ${tests.backendUrl.status.toUpperCase()}
   ${tests.backendUrl.message}
   ${tests.backendUrl.details}

2. Health Endpoint: ${tests.health.status.toUpperCase()}
   ${tests.health.message}
   ${tests.health.details}

3. Socket.io Connection: ${tests.socket.status.toUpperCase()}
   ${tests.socket.message}
   ${tests.socket.details}

NEXT STEPS:
-----------
1. Check Vercel Environment Variables:
   - Go to: https://vercel.com → frontend → Settings → Environment Variables
   - Ensure VITE_BACKEND_URL is set to your Render backend URL

2. Check Render Backend:
   - Go to: https://render.com → shoutbox-backend
   - Status should be "Live" (green)
   - Check Logs for errors

3. Check Render Environment Variables:
   - FRONTEND_URL must be: ${window.location.origin}
   - REDIS_URL should be auto-set

4. Redeploy after changes:
   - Vercel: Deployments → Redeploy
   - Render: Auto-deploys on git push
    `.trim();

    setErrorReport(report);
    onTestsFail(report);
  };

  const copyErrorReport = () => {
    navigator.clipboard.writeText(errorReport);
    alert('Error report copied to clipboard!');
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'passed': return '✅';
      case 'failed': return '❌';
      case 'running': return '⏳';
      default: return '⚪';
    }
  };

  const getStatusClass = (status) => {
    switch (status) {
      case 'passed': return 'test-passed';
      case 'failed': return 'test-failed';
      case 'running': return 'test-running';
      default: return 'test-pending';
    }
  };

  return (
    <div className="test-screen">
      <div className="test-card">
        <h1>🔧 System Check</h1>
        <p>Testing connection to backend...</p>

        <div className="tests-container">
          <div className={`test-item ${getStatusClass(tests.backendUrl.status)}`}>
            <div className="test-header">
              <span className="test-icon">{getStatusIcon(tests.backendUrl.status)}</span>
              <span className="test-title">Backend URL</span>
            </div>
            <div className="test-message">{tests.backendUrl.message}</div>
            {tests.backendUrl.details && (
              <div className="test-details">{tests.backendUrl.details}</div>
            )}
          </div>

          <div className={`test-item ${getStatusClass(tests.health.status)}`}>
            <div className="test-header">
              <span className="test-icon">{getStatusIcon(tests.health.status)}</span>
              <span className="test-title">Health Check</span>
            </div>
            <div className="test-message">{tests.health.message}</div>
            {tests.health.details && (
              <div className="test-details">{tests.health.details}</div>
            )}
          </div>

          <div className={`test-item ${getStatusClass(tests.socket.status)}`}>
            <div className="test-header">
              <span className="test-icon">{getStatusIcon(tests.socket.status)}</span>
              <span className="test-title">WebSocket Connection</span>
            </div>
            <div className="test-message">{tests.socket.message}</div>
            {tests.socket.details && (
              <div className="test-details">{tests.socket.details}</div>
            )}
          </div>
        </div>

        {allTestsPassed && (
          <div className="success-message">
            🎉 All tests passed! Starting app...
          </div>
        )}

        {errorReport && (
          <div className="error-report">
            <h3>⚠️ Connection Failed</h3>
            <p>Copy this report and check the deployment guide:</p>
            <button className="btn btn-primary" onClick={copyErrorReport}>
              📋 Copy Error Report
            </button>
            <pre className="error-details">{errorReport}</pre>
          </div>
        )}

        <div className="test-footer">
          <small>Backend: {backendUrl || 'Not configured'}</small>
        </div>
      </div>
    </div>
  );
}

export default TestScreen;
