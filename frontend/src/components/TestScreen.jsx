import { useState, useEffect } from 'react';
import './TestScreen.css';

function TestScreen({ backendUrl, onTestsPass, onTestsFail }) {
  const [tests, setTests] = useState({
    backendUrl: { status: 'pending', message: '', details: '', startTime: null, elapsedTime: 0 },
    health: { status: 'pending', message: '', details: '', startTime: null, elapsedTime: 0 },
    socket: { status: 'pending', message: '', details: '', startTime: null, elapsedTime: 0 }
  });
  const [allTestsPassed, setAllTestsPassed] = useState(false);
  const [errorReport, setErrorReport] = useState('');
  const [showRetry, setShowRetry] = useState(false);

  useEffect(() => {
    runTests();
  }, []);

  // Update elapsed time for running tests
  useEffect(() => {
    const interval = setInterval(() => {
      setTests(prev => {
        const updated = { ...prev };
        Object.keys(updated).forEach(key => {
          if (updated[key].status === 'running' && updated[key].startTime) {
            updated[key].elapsedTime = Math.floor((Date.now() - updated[key].startTime) / 1000);
          }
        });
        return updated;
      });
    }, 500);

    return () => clearInterval(interval);
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
    updateTest('health', 'running', 'Checking backend...');

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 90000);

      const response = await fetch(`${backendUrl}/`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.status === 'ok' || data.service) {
        updateTest('health', 'passed', `Backend online (${data.service || 'Funkhaus'})`);
      } else {
        throw new Error(`Unexpected response: ${JSON.stringify(data)}`);
      }
    } catch (error) {
      const isTimeout = error.name === 'AbortError';
      updateTest('health', 'failed',
        isTimeout ? 'Backend timeout (90s)!' : 'Backend not reachable!',
        `URL: ${backendUrl}/\nError: ${error.message}\n\nPossible causes:\n1. Backend not deployed on Render\n2. Backend crashed (check Render logs)\n3. Wrong URL in VITE_BACKEND_URL${isTimeout ? '\n4. Server cold start taking too long' : ''}`
      );
      generateErrorReport();
      setShowRetry(true);
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
          `URL: ${wsUrl}\nTimeout after 90 seconds\n\nPossible causes:\n1. Backend not running\n2. WebSocket blocked by firewall\n3. Wrong backend URL`
        );
        generateErrorReport();
        setShowRetry(true);
      }, 90000);

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
      [testName]: {
        ...prev[testName],
        status,
        message,
        details,
        startTime: status === 'running' ? Date.now() : prev[testName].startTime,
        elapsedTime: status !== 'running' ? 0 : prev[testName].elapsedTime
      }
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

  const getDynamicMessage = (testName, test) => {
    if (test.status !== 'running') return test.message;

    const elapsed = test.elapsedTime;

    if (testName === 'health' || testName === 'socket') {
      if (elapsed < 5) {
        return test.message;
      } else if (elapsed < 20) {
        return '⏰ Server waking up (Render cold start)...';
      } else {
        return `⏰ Cold start in progress (${elapsed}s elapsed)`;
      }
    }

    return test.message;
  };

  const getProgressBar = (test, maxTime = 90) => {
    if (test.status !== 'running') return null;

    const percentage = Math.min((test.elapsedTime / maxTime) * 100, 100);

    return (
      <div className="progress-bar-container">
        <div className="progress-bar" style={{ width: `${percentage}%` }}></div>
        <span className="progress-time">{test.elapsedTime}s / {maxTime}s</span>
      </div>
    );
  };

  const getColdStartInfo = (test) => {
    if (test.status !== 'running' || test.elapsedTime < 5) return null;

    return (
      <div className="cold-start-info">
        Render cold start can take up to 60 seconds
      </div>
    );
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
            <div className="test-message">{getDynamicMessage('health', tests.health)}</div>
            {getProgressBar(tests.health)}
            {getColdStartInfo(tests.health)}
            {tests.health.details && (
              <div className="test-details">{tests.health.details}</div>
            )}
          </div>

          <div className={`test-item ${getStatusClass(tests.socket.status)}`}>
            <div className="test-header">
              <span className="test-icon">{getStatusIcon(tests.socket.status)}</span>
              <span className="test-title">WebSocket Connection</span>
            </div>
            <div className="test-message">{getDynamicMessage('socket', tests.socket)}</div>
            {getProgressBar(tests.socket)}
            {getColdStartInfo(tests.socket)}
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
            <div style={{ display: 'flex', gap: '12px' }}>
              <button className="btn btn-primary" onClick={copyErrorReport}>
                📋 Copy Error Report
              </button>
              {showRetry && (
                <button className="btn btn-secondary" onClick={() => {
                  setShowRetry(false);
                  setErrorReport('');
                  runTests();
                }}>
                  🔄 Retry Tests
                </button>
              )}
            </div>
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
