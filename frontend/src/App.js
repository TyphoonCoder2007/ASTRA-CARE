import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, RadialBarChart, RadialBar, Legend
} from 'recharts';
import {
  Activity, Heart, Brain, AlertTriangle, MessageCircle, Camera,
  Clock, User, Shield, TrendingUp, Zap, Eye, Wind, Droplets,
  Sun, Moon, Rocket, Settings, Bell, CheckCircle, XCircle,
  ChevronRight, RefreshCw, Play, Pause, Send, Menu, X, Home,
  BarChart2, Users, HelpCircle, Thermometer, Smile
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

// ===================== API SERVICE =====================
const api = {
  async fetch(endpoint, options = {}) {
    const response = await fetch(`${BACKEND_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
    if (!response.ok) throw new Error(`API Error: ${response.status}`);
    return response.json();
  },

  getHealth: () => api.fetch('/api/health'),
  getAstronauts: () => api.fetch('/api/astronauts'),
  getLatestHealth: (id) => api.fetch(`/api/health/latest/${id}`),
  getTimeline: (id, days = 7) => api.fetch(`/api/health/timeline/${id}?days=${days}`),
  getBaseline: (id) => api.fetch(`/api/baseline/${id}`),
  getAlerts: (id) => api.fetch(`/api/alerts/${id}`),
  getContext: (id) => api.fetch(`/api/context/${id}`),
  getChatHistory: (id) => api.fetch(`/api/chat/history/${id}`),
  getFacialHistory: (id) => api.fetch(`/api/facial/history/${id}`),

  ingestHealth: (data) => api.fetch('/api/health/ingest', { method: 'POST', body: JSON.stringify(data) }),
  sendChat: (data) => api.fetch('/api/chat/send', { method: 'POST', body: JSON.stringify(data) }),
  storeFacialAnalysis: (data) => api.fetch('/api/facial/analyze', { method: 'POST', body: JSON.stringify(data) }),
  updateContext: (data) => api.fetch('/api/context/update', { method: 'POST', body: JSON.stringify(data) }),
  acknowledgeAlert: (data) => api.fetch('/api/alerts/acknowledge', { method: 'POST', body: JSON.stringify(data) }),
  generateSimulation: (id, days) => api.fetch(`/api/simulate/generate?astronaut_id=${id}&days=${days}`, { method: 'POST' }),
  recalibrateBaseline: (data) => api.fetch('/api/baseline/recalibrate', { method: 'POST', body: JSON.stringify(data) }),
};

// ===================== MAIN APP =====================
function App() {
  const [currentView, setCurrentView] = useState('dashboard');
  const [astronautId, setAstronautId] = useState('AST-001');
  const [userRole, setUserRole] = useState('astronaut'); // astronaut | supervisor
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [systemStatus, setSystemStatus] = useState('healthy');

  // Data states
  const [healthData, setHealthData] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [baseline, setBaseline] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [context, setContext] = useState(null);
  const [chatHistory, setChatHistory] = useState([]);
  const [astronauts, setAstronauts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch initial data
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [astList, health] = await Promise.all([
          api.getAstronauts(),
          api.getHealth()
        ]);
        setAstronauts(astList.astronauts || ['AST-001', 'AST-002', 'AST-003']);
        setSystemStatus(health.status);
      } catch (err) {
        console.error('Failed to load initial data:', err);
      }
      setLoading(false);
    };
    loadData();
  }, []);

  // Fetch astronaut-specific data
  useEffect(() => {
    const loadAstronautData = async () => {
      try {
        const [latestHealth, timelineData, baselineData, alertsData, contextData, chatData] = await Promise.all([
          api.getLatestHealth(astronautId).catch(() => null),
          api.getTimeline(astronautId).catch(() => ({ records: [], daily_averages: [] })),
          api.getBaseline(astronautId).catch(() => null),
          api.getAlerts(astronautId).catch(() => ({ alerts: [] })),
          api.getContext(astronautId).catch(() => null),
          api.getChatHistory(astronautId).catch(() => ({ history: [] }))
        ]);

        setHealthData(latestHealth);
        setTimeline(timelineData.daily_averages || []);
        setBaseline(baselineData);
        setAlerts(alertsData.alerts || []);
        setContext(contextData);
        setChatHistory(chatData.history || []);
      } catch (err) {
        console.error('Failed to load astronaut data:', err);
      }
    };
    loadAstronautData();
    const interval = setInterval(loadAstronautData, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, [astronautId]);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home },
    { id: 'health', label: 'Health Monitor', icon: Heart },
    { id: 'facial', label: 'Facial Scan', icon: Camera },
    { id: 'timeline', label: 'Timeline', icon: BarChart2 },
    { id: 'chat', label: 'Support Chat', icon: MessageCircle },
    { id: 'alerts', label: 'Alerts', icon: Bell },
    { id: 'context', label: 'Mission Context', icon: Rocket },
  ];

  if (userRole === 'supervisor') {
    navItems.push({ id: 'crew', label: 'Crew Overview', icon: Users });
  }

  return (
    <div className="min-h-screen flex grid-pattern" data-testid="astra-care-app">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-space-dark/80 backdrop-blur-xl border-r border-space-accent/20 transition-all duration-300 flex flex-col`} data-testid="sidebar">
        {/* Logo */}
        <div className="p-4 border-b border-space-accent/20 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-space-accent to-space-purple flex items-center justify-center animate-pulse-glow">
            <Rocket className="w-6 h-6 text-white" />
          </div>
          {sidebarOpen && (
            <div>
              <h1 className="text-lg font-bold text-space-accent">ASTRA-CARE</h1>
              <p className="text-xs text-gray-400">Health Intelligence</p>
            </div>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="ml-auto p-2 hover:bg-space-blue/50 rounded-lg transition-colors"
            data-testid="toggle-sidebar"
          >
            {sidebarOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-2 space-y-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setCurrentView(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-all ${
                currentView === item.id
                  ? 'bg-gradient-to-r from-space-accent/20 to-space-purple/20 text-space-accent border border-space-accent/30'
                  : 'text-gray-400 hover:bg-space-blue/50 hover:text-white'
              }`}
              data-testid={`nav-${item.id}`}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {sidebarOpen && <span className="text-sm font-medium">{item.label}</span>}
            </button>
          ))}
        </nav>

        {/* System Status */}
        <div className="p-4 border-t border-space-accent/20">
          <div className="flex items-center gap-2 text-sm">
            <div className={`w-2 h-2 rounded-full ${systemStatus === 'healthy' ? 'bg-space-green' : 'bg-space-red'} animate-pulse`} />
            {sidebarOpen && (
              <span className="text-gray-400">
                System: <span className={systemStatus === 'healthy' ? 'text-space-green' : 'text-space-red'}>{systemStatus}</span>
              </span>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-space-dark/60 backdrop-blur-xl border-b border-space-accent/20 p-4 flex items-center justify-between" data-testid="header">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-semibold text-white">
              {navItems.find(n => n.id === currentView)?.label || 'Dashboard'}
            </h2>
            <span className="text-sm text-gray-400">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </span>
          </div>
          <div className="flex items-center gap-4">
            {/* Astronaut Selector */}
            <select
              value={astronautId}
              onChange={(e) => setAstronautId(e.target.value)}
              className="input-field w-40"
              data-testid="astronaut-selector"
            >
              {astronauts.map(id => (
                <option key={id} value={id}>{id}</option>
              ))}
            </select>

            {/* Role Toggle */}
            <div className="flex items-center gap-2">
              <span className={`text-sm ${userRole === 'astronaut' ? 'text-space-accent' : 'text-gray-400'}`}>Astronaut</span>
              <div
                className={`toggle-switch ${userRole === 'supervisor' ? 'active' : ''}`}
                onClick={() => setUserRole(userRole === 'astronaut' ? 'supervisor' : 'astronaut')}
                data-testid="role-toggle"
              />
              <span className={`text-sm ${userRole === 'supervisor' ? 'text-space-accent' : 'text-gray-400'}`}>Supervisor</span>
            </div>

            {/* Alert Bell */}
            <div className="relative">
              <Bell className={`w-5 h-5 ${alerts.length > 0 ? 'text-space-yellow animate-pulse' : 'text-gray-400'}`} />
              {alerts.length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-space-red rounded-full text-xs flex items-center justify-center">
                  {alerts.length}
                </span>
              )}
            </div>

            {/* User Avatar */}
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-space-accent to-space-purple flex items-center justify-center">
              <User className="w-5 h-5 text-white" />
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <RefreshCw className="w-12 h-12 text-space-accent animate-spin mx-auto mb-4" />
                <p className="text-gray-400">Loading ASTRA-CARE systems...</p>
              </div>
            </div>
          ) : (
            <>
              {currentView === 'dashboard' && (
                <Dashboard
                  healthData={healthData}
                  timeline={timeline}
                  baseline={baseline}
                  alerts={alerts}
                  context={context}
                  astronautId={astronautId}
                />
              )}
              {currentView === 'health' && (
                <HealthMonitor
                  healthData={healthData}
                  baseline={baseline}
                  astronautId={astronautId}
                  onDataUpdate={setHealthData}
                />
              )}
              {currentView === 'facial' && (
                <FacialScan astronautId={astronautId} />
              )}
              {currentView === 'timeline' && (
                <HealthTimeline timeline={timeline} astronautId={astronautId} />
              )}
              {currentView === 'chat' && (
                <SupportChat
                  chatHistory={chatHistory}
                  setChatHistory={setChatHistory}
                  astronautId={astronautId}
                />
              )}
              {currentView === 'alerts' && (
                <AlertsPanel
                  alerts={alerts}
                  setAlerts={setAlerts}
                  astronautId={astronautId}
                />
              )}
              {currentView === 'context' && (
                <MissionContext
                  context={context}
                  setContext={setContext}
                  astronautId={astronautId}
                />
              )}
              {currentView === 'crew' && userRole === 'supervisor' && (
                <CrewOverview astronauts={astronauts} />
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}

// ===================== DASHBOARD COMPONENT =====================
function Dashboard({ healthData, timeline, baseline, alerts, context, astronautId }) {
  const [generating, setGenerating] = useState(false);

  const generateDemoData = async () => {
    setGenerating(true);
    try {
      await api.generateSimulation(astronautId, 7);
      window.location.reload();
    } catch (err) {
      console.error('Failed to generate data:', err);
    }
    setGenerating(false);
  };

  // Calculate risk level
  const riskLevel = healthData?.validation?.adjusted_confidence
    ? healthData.stress_level > 70 || healthData.fatigue_level > 70 ? 2 : healthData.stress_level > 50 ? 1 : 0
    : 0;

  const riskColors = ['text-space-green', 'text-space-yellow', 'text-space-red'];
  const riskLabels = ['Optimal', 'Elevated', 'High'];

  return (
    <div className="space-y-6" data-testid="dashboard">
      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          icon={Heart}
          label="Heart Rate"
          value={healthData?.heart_rate?.toFixed(0) || '--'}
          unit="BPM"
          baseline={baseline?.hr_baseline}
          color="#ff6b6b"
        />
        <MetricCard
          icon={Activity}
          label="HRV"
          value={healthData?.hrv?.toFixed(0) || '--'}
          unit="ms"
          baseline={baseline?.hrv_baseline}
          color="#4ecdc4"
        />
        <MetricCard
          icon={Brain}
          label="Stress Level"
          value={healthData?.stress_level?.toFixed(0) || '--'}
          unit="%"
          threshold={70}
          color="#ffd93d"
        />
        <MetricCard
          icon={Zap}
          label="Fatigue"
          value={healthData?.fatigue_level?.toFixed(0) || '--'}
          unit="%"
          threshold={65}
          color="#a855f7"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Health Trend Chart */}
        <div className="lg:col-span-2 glass-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-space-accent" />
              Health Trends (7 Days)
            </h3>
            <button
              onClick={generateDemoData}
              disabled={generating}
              className="btn-secondary text-xs flex items-center gap-2"
              data-testid="generate-demo-data"
            >
              {generating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              Generate Demo Data
            </button>
          </div>
          {timeline.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={timeline}>
                <defs>
                  <linearGradient id="stressGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ffd93d" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#ffd93d" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="fatigueGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,212,255,0.1)" />
                <XAxis dataKey="date" tick={{ fill: '#9ca3af', fontSize: 12 }} />
                <YAxis tick={{ fill: '#9ca3af', fontSize: 12 }} domain={[0, 100]} />
                <Tooltip
                  contentStyle={{
                    background: 'rgba(26, 39, 68, 0.95)',
                    border: '1px solid rgba(0, 212, 255, 0.3)',
                    borderRadius: '8px'
                  }}
                />
                <Area type="monotone" dataKey="avg_stress" name="Stress" stroke="#ffd93d" fill="url(#stressGradient)" />
                <Area type="monotone" dataKey="avg_fatigue" name="Fatigue" stroke="#a855f7" fill="url(#fatigueGradient)" />
                <Line type="monotone" dataKey="avg_hr" name="HR" stroke="#ff6b6b" strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-gray-400">
              <div className="text-center">
                <BarChart2 className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No health data available</p>
                <p className="text-sm">Click "Generate Demo Data" to create sample data</p>
              </div>
            </div>
          )}
        </div>

        {/* Risk & Status Panel */}
        <div className="space-y-4">
          {/* Overall Risk */}
          <div className="glass-card p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5 text-space-accent" />
              Risk Assessment
            </h3>
            <div className="text-center py-4">
              <div className={`text-5xl font-bold ${riskColors[riskLevel]} mb-2`}>
                {riskLabels[riskLevel]}
              </div>
              <p className="text-sm text-gray-400">Current Health Status</p>
            </div>
            <div className="mt-4 pt-4 border-t border-space-accent/20">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">Confidence</span>
                <span className="text-space-accent">{((healthData?.confidence || 0.85) * 100).toFixed(0)}%</span>
              </div>
              <div className="flex items-center justify-between text-sm mt-2">
                <span className="text-gray-400">Data Source</span>
                <span className="text-space-accent capitalize">{healthData?.source || 'N/A'}</span>
              </div>
            </div>
          </div>

          {/* Mission Context */}
          <div className="glass-card p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Rocket className="w-5 h-5 text-space-accent" />
              Mission Context
            </h3>
            <div className="space-y-3">
              <ContextItem label="Phase" value={context?.mission_phase || 'Transit'} />
              <ContextItem label="Time" value={context?.time_of_day || 'Morning'} />
              <ContextItem label="Work Cycle" value={context?.work_cycle || 'Active'} />
              <ContextItem label="Day" value={`Day ${context?.days_since_launch || 1}`} />
              <ContextItem label="Workload" value={context?.current_workload || 'Moderate'} />
            </div>
          </div>

          {/* Active Alerts Summary */}
          {alerts.length > 0 && (
            <div className={`glass-card p-6 alert-level-${Math.max(...alerts.map(a => a.level))}`}>
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-space-yellow" />
                Active Alerts ({alerts.length})
              </h3>
              <div className="space-y-2">
                {alerts.slice(0, 3).map((alert, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-sm">
                    <div className={`w-2 h-2 rounded-full ${
                      alert.level === 3 ? 'bg-space-red' : alert.level === 2 ? 'bg-orange-500' : 'bg-space-yellow'
                    }`} />
                    <span className="text-gray-300 truncate">{alert.message}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ===================== METRIC CARD COMPONENT =====================
function MetricCard({ icon: Icon, label, value, unit, baseline, threshold, color }) {
  const numValue = parseFloat(value);
  const isValidValue = !isNaN(numValue) && value !== '--';
  const isAboveThreshold = threshold && isValidValue && numValue > threshold;
  
  // Only calculate deviation if we have valid numbers
  let deviation = null;
  if (isValidValue && baseline && !isNaN(baseline) && baseline !== 0) {
    deviation = ((numValue - baseline) / baseline * 100).toFixed(1);
  }

  return (
    <div className="glass-card p-5 metric-card" style={{ '--metric-color': color }} data-testid={`metric-${label.toLowerCase().replace(' ', '-')}`}>
      <div className="flex items-start justify-between mb-3">
        <div className="p-2 rounded-lg" style={{ background: `${color}20` }}>
          <Icon className="w-5 h-5" style={{ color }} />
        </div>
        {deviation && !isNaN(parseFloat(deviation)) && (
          <span className={`text-xs px-2 py-1 rounded-full ${
            parseFloat(deviation) > 10 ? 'bg-red-500/20 text-red-400' :
            parseFloat(deviation) < -10 ? 'bg-blue-500/20 text-blue-400' :
            'bg-green-500/20 text-green-400'
          }`}>
            {parseFloat(deviation) > 0 ? '+' : ''}{deviation}%
          </span>
        )}
      </div>
      <div className="space-y-1">
        <p className="text-sm text-gray-400">{label}</p>
        <div className="flex items-baseline gap-1">
          <span className={`text-3xl font-bold ${isAboveThreshold ? 'text-space-red' : 'text-white'}`}>
            {value}
          </span>
          <span className="text-sm text-gray-400">{unit}</span>
        </div>
        {baseline && !isNaN(baseline) && (
          <p className="text-xs text-gray-500">Baseline: {baseline.toFixed(1)} {unit}</p>
        )}
      </div>
    </div>
  );
}

// ===================== CONTEXT ITEM COMPONENT =====================
function ContextItem({ label, value }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-gray-400">{label}</span>
      <span className="text-sm text-space-accent capitalize">{value}</span>
    </div>
  );
}

// ===================== HEALTH MONITOR COMPONENT =====================
function HealthMonitor({ healthData, baseline, astronautId, onDataUpdate }) {
  const [manualEntry, setManualEntry] = useState({
    heart_rate: '',
    hrv: '',
    stress_level: '',
    fatigue_level: ''
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const result = await api.ingestHealth({
        astronaut_id: astronautId,
        heart_rate: parseFloat(manualEntry.heart_rate),
        hrv: parseFloat(manualEntry.hrv),
        stress_level: parseFloat(manualEntry.stress_level),
        fatigue_level: parseFloat(manualEntry.fatigue_level),
        source: 'manual'
      });
      onDataUpdate(result);
      setManualEntry({ heart_rate: '', hrv: '', stress_level: '', fatigue_level: '' });
    } catch (err) {
      console.error('Failed to submit health data:', err);
    }
    setSubmitting(false);
  };

  const recalibrate = async () => {
    try {
      await api.recalibrateBaseline({ astronaut_id: astronautId, recalibrate: true });
      window.location.reload();
    } catch (err) {
      console.error('Failed to recalibrate:', err);
    }
  };

  return (
    <div className="space-y-6" data-testid="health-monitor">
      {/* Current Readings */}
      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
          <Activity className="w-5 h-5 text-space-accent" />
          Current Health Readings
        </h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          <HealthGauge
            label="Heart Rate"
            value={healthData?.heart_rate || 0}
            max={200}
            baseline={baseline?.hr_baseline}
            unit="BPM"
            color="#ff6b6b"
          />
          <HealthGauge
            label="HRV"
            value={healthData?.hrv || 0}
            max={100}
            baseline={baseline?.hrv_baseline}
            unit="ms"
            color="#4ecdc4"
          />
          <HealthGauge
            label="Stress"
            value={healthData?.stress_level || 0}
            max={100}
            threshold={70}
            unit="%"
            color="#ffd93d"
          />
          <HealthGauge
            label="Fatigue"
            value={healthData?.fatigue_level || 0}
            max={100}
            threshold={65}
            unit="%"
            color="#a855f7"
          />
        </div>
      </div>

      {/* Manual Entry */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <Settings className="w-5 h-5 text-space-accent" />
            Manual Data Entry
          </h3>
          <button onClick={recalibrate} className="btn-secondary text-xs flex items-center gap-2">
            <RefreshCw className="w-4 h-4" />
            Recalibrate Baseline
          </button>
        </div>
        <form onSubmit={handleSubmit} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm text-gray-400 mb-2">Heart Rate (BPM)</label>
            <input
              type="number"
              value={manualEntry.heart_rate}
              onChange={(e) => setManualEntry({ ...manualEntry, heart_rate: e.target.value })}
              className="input-field"
              placeholder="60-100"
              min="40"
              max="200"
              required
              data-testid="input-heart-rate"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-2">HRV (ms)</label>
            <input
              type="number"
              value={manualEntry.hrv}
              onChange={(e) => setManualEntry({ ...manualEntry, hrv: e.target.value })}
              className="input-field"
              placeholder="20-100"
              min="0"
              max="200"
              required
              data-testid="input-hrv"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-2">Stress Level (%)</label>
            <input
              type="number"
              value={manualEntry.stress_level}
              onChange={(e) => setManualEntry({ ...manualEntry, stress_level: e.target.value })}
              className="input-field"
              placeholder="0-100"
              min="0"
              max="100"
              required
              data-testid="input-stress"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-2">Fatigue Level (%)</label>
            <input
              type="number"
              value={manualEntry.fatigue_level}
              onChange={(e) => setManualEntry({ ...manualEntry, fatigue_level: e.target.value })}
              className="input-field"
              placeholder="0-100"
              min="0"
              max="100"
              required
              data-testid="input-fatigue"
            />
          </div>
          <div className="col-span-2 lg:col-span-4">
            <button type="submit" className="btn-primary w-full" disabled={submitting} data-testid="submit-health-data">
              {submitting ? 'Submitting...' : 'Submit Health Data'}
            </button>
          </div>
        </form>
      </div>

      {/* Baseline Info */}
      {baseline && (
        <div className="glass-card p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-space-accent" />
            Personal Baseline
          </h3>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <BaselineItem label="HR Baseline" value={baseline.hr_baseline?.toFixed(1)} unit="BPM" std={baseline.hr_std} />
            <BaselineItem label="HRV Baseline" value={baseline.hrv_baseline?.toFixed(1)} unit="ms" std={baseline.hrv_std} />
            <BaselineItem label="Stress Baseline" value={baseline.stress_baseline?.toFixed(1)} unit="%" />
            <BaselineItem label="Fatigue Baseline" value={baseline.fatigue_baseline?.toFixed(1)} unit="%" />
          </div>
          <p className="text-xs text-gray-500 mt-4">
            Based on {baseline.data_points || 0} data points • {baseline.is_default ? 'Default values' : 'Personalized baseline'}
          </p>
        </div>
      )}
    </div>
  );
}

// ===================== HEALTH GAUGE COMPONENT =====================
function HealthGauge({ label, value, max, baseline, threshold, unit, color }) {
  const percentage = (value / max) * 100;
  const isWarning = threshold && value > threshold;

  return (
    <div className="text-center">
      <div className="relative w-32 h-32 mx-auto">
        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="rgba(0,212,255,0.1)"
            strokeWidth="8"
          />
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke={isWarning ? '#ff4757' : color}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={`${percentage * 2.83} 283`}
            className="transition-all duration-1000"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-2xl font-bold ${isWarning ? 'text-space-red' : 'text-white'}`}>
            {value.toFixed(0)}
          </span>
          <span className="text-xs text-gray-400">{unit}</span>
        </div>
      </div>
      <p className="mt-2 text-sm text-gray-400">{label}</p>
      {baseline && (
        <p className="text-xs text-gray-500">Baseline: {baseline.toFixed(1)}</p>
      )}
    </div>
  );
}

// ===================== BASELINE ITEM COMPONENT =====================
function BaselineItem({ label, value, unit, std }) {
  return (
    <div className="bg-space-dark/50 p-4 rounded-lg">
      <p className="text-sm text-gray-400 mb-1">{label}</p>
      <p className="text-xl font-semibold text-white">{value} <span className="text-sm text-gray-400">{unit}</span></p>
      {std && <p className="text-xs text-gray-500">σ: ±{std.toFixed(1)}</p>}
    </div>
  );
}

// ===================== FACIAL SCAN COMPONENT =====================
function FacialScan({ astronautId }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [scanning, setScanning] = useState(false);
  const [consent, setConsent] = useState(false);
  const [results, setResults] = useState(null);
  const [cameraError, setCameraError] = useState(null);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 640, height: 480 }
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCameraError(null);
    } catch (err) {
      setCameraError('Unable to access camera. Please grant permission.');
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (videoRef.current?.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(track => track.stop());
    }
  }, []);

  useEffect(() => {
    if (consent) {
      startCamera();
    }
    return () => stopCamera();
  }, [consent, startCamera, stopCamera]);

  const performScan = async () => {
    setScanning(true);
    
    // Simulate facial analysis (in real app, this would use face-api.js or TensorFlow.js)
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Generate simulated results
    const simulatedResults = {
      vital_estimates: {
        heart_rate: 65 + Math.random() * 20,
        respiration_rate: 14 + Math.random() * 6,
        hrv_trend: 45 + Math.random() * 30,
        oxygen_saturation_trend: 95 + Math.random() * 4,
        blood_pressure_trend: Math.random() > 0.5 ? 'normal' : 'slightly_elevated'
      },
      mental_indicators: {
        mood_state: ['calm', 'neutral', 'focused', 'slightly_stressed'][Math.floor(Math.random() * 4)],
        mental_stress_index: 20 + Math.random() * 40,
        fatigue_probability: 15 + Math.random() * 35,
        alertness_level: 60 + Math.random() * 30,
        facial_tension: 10 + Math.random() * 30,
        pain_likelihood: Math.random() * 15
      },
      physical_indicators: {
        blink_rate: 15 + Math.random() * 10,
        eye_openness: 70 + Math.random() * 25,
        skin_hydration: Math.random() > 0.3 ? 'adequate' : 'low',
        dehydration_risk: Math.random() * 30
      },
      confidence_scores: {
        overall: 0.75 + Math.random() * 0.2,
        vital: 0.6 + Math.random() * 0.3,
        mental: 0.7 + Math.random() * 0.25
      }
    };
    
    setResults(simulatedResults);
    
    // Store results
    try {
      await api.storeFacialAnalysis({
        astronaut_id: astronautId,
        estimated_hr: simulatedResults.vital_estimates.heart_rate,
        respiration_rate: simulatedResults.vital_estimates.respiration_rate,
        hrv_trend: simulatedResults.vital_estimates.hrv_trend,
        oxygen_saturation_trend: simulatedResults.vital_estimates.oxygen_saturation_trend,
        blood_pressure_trend: simulatedResults.vital_estimates.blood_pressure_trend,
        mood_state: simulatedResults.mental_indicators.mood_state,
        mental_stress_index: simulatedResults.mental_indicators.mental_stress_index,
        fatigue_probability: simulatedResults.mental_indicators.fatigue_probability,
        alertness_level: simulatedResults.mental_indicators.alertness_level,
        facial_tension: simulatedResults.mental_indicators.facial_tension,
        pain_likelihood: simulatedResults.mental_indicators.pain_likelihood,
        blink_rate: simulatedResults.physical_indicators.blink_rate,
        eye_openness: simulatedResults.physical_indicators.eye_openness,
        skin_hydration_indicator: simulatedResults.physical_indicators.skin_hydration,
        dehydration_risk: simulatedResults.physical_indicators.dehydration_risk,
        confidence_scores: simulatedResults.confidence_scores
      });
    } catch (err) {
      console.error('Failed to store facial analysis:', err);
    }
    
    setScanning(false);
  };

  return (
    <div className="space-y-6" data-testid="facial-scan">
      {!consent ? (
        <div className="glass-card p-8 max-w-2xl mx-auto text-center">
          <Camera className="w-16 h-16 text-space-accent mx-auto mb-6" />
          <h3 className="text-2xl font-bold text-white mb-4">Facial Analysis Consent</h3>
          <p className="text-gray-400 mb-6">
            This feature uses your webcam to perform non-clinical facial analysis for wellness indicators.
            All processing is done locally on your device. No images are stored or transmitted.
          </p>
          <div className="bg-space-blue/30 p-4 rounded-lg mb-6 text-left">
            <h4 className="text-space-accent font-semibold mb-2">What we analyze:</h4>
            <ul className="text-sm text-gray-400 space-y-1">
              <li>• Vital estimates (HR, respiration trends)</li>
              <li>• Mood and stress indicators</li>
              <li>• Fatigue and alertness levels</li>
              <li>• Physical wellness cues</li>
            </ul>
            <p className="text-xs text-space-yellow mt-3">
              ⚠️ All outputs are estimations only, not medical diagnoses.
            </p>
          </div>
          <button
            onClick={() => setConsent(true)}
            className="btn-primary"
            data-testid="consent-button"
          >
            I Consent - Start Camera
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Camera View */}
          <div className="glass-card p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Camera className="w-5 h-5 text-space-accent" />
              Live Camera Feed
            </h3>
            {cameraError ? (
              <div className="aspect-video bg-space-dark rounded-lg flex items-center justify-center">
                <p className="text-space-red">{cameraError}</p>
              </div>
            ) : (
              <div className="webcam-container aspect-video bg-space-dark rounded-lg overflow-hidden">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
                <canvas ref={canvasRef} className="hidden" />
              </div>
            )}
            <div className="mt-4 flex gap-4">
              <button
                onClick={performScan}
                disabled={scanning || cameraError}
                className="btn-primary flex-1 flex items-center justify-center gap-2"
                data-testid="scan-button"
              >
                {scanning ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    Scanning...
                  </>
                ) : (
                  <>
                    <Eye className="w-5 h-5" />
                    Perform Scan
                  </>
                )}
              </button>
              <button
                onClick={() => { setConsent(false); stopCamera(); setResults(null); }}
                className="btn-secondary"
              >
                Stop Camera
              </button>
            </div>
          </div>

          {/* Results */}
          <div className="space-y-4">
            {results ? (
              <>
                {/* Vital Estimates */}
                <div className="glass-card p-6">
                  <h4 className="text-sm font-semibold text-space-accent mb-4 flex items-center gap-2">
                    <Heart className="w-4 h-4" />
                    Vital Estimates (Indicative Only)
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <ResultItem label="Heart Rate" value={results.vital_estimates.heart_rate.toFixed(0)} unit="BPM" />
                    <ResultItem label="Respiration" value={results.vital_estimates.respiration_rate.toFixed(0)} unit="/min" />
                    <ResultItem label="HRV Trend" value={results.vital_estimates.hrv_trend.toFixed(0)} unit="ms" />
                    <ResultItem label="SpO2 Trend" value={results.vital_estimates.oxygen_saturation_trend.toFixed(0)} unit="%" />
                  </div>
                </div>

                {/* Mental Indicators */}
                <div className="glass-card p-6">
                  <h4 className="text-sm font-semibold text-space-purple mb-4 flex items-center gap-2">
                    <Brain className="w-4 h-4" />
                    Mental & Emotional Indicators
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <ResultItem label="Mood" value={results.mental_indicators.mood_state} />
                    <ResultItem label="Stress Index" value={results.mental_indicators.mental_stress_index.toFixed(0)} unit="%" />
                    <ResultItem label="Fatigue Prob." value={results.mental_indicators.fatigue_probability.toFixed(0)} unit="%" />
                    <ResultItem label="Alertness" value={results.mental_indicators.alertness_level.toFixed(0)} unit="%" />
                  </div>
                </div>

                {/* Physical Indicators */}
                <div className="glass-card p-6">
                  <h4 className="text-sm font-semibold text-space-green mb-4 flex items-center gap-2">
                    <Droplets className="w-4 h-4" />
                    Physical Wellness Indicators
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <ResultItem label="Blink Rate" value={results.physical_indicators.blink_rate.toFixed(0)} unit="/min" />
                    <ResultItem label="Eye Openness" value={results.physical_indicators.eye_openness.toFixed(0)} unit="%" />
                    <ResultItem label="Skin Hydration" value={results.physical_indicators.skin_hydration} />
                    <ResultItem label="Dehydration Risk" value={results.physical_indicators.dehydration_risk.toFixed(0)} unit="%" />
                  </div>
                </div>

                {/* Confidence */}
                <div className="bg-space-dark/50 p-4 rounded-lg">
                  <p className="text-xs text-gray-500 text-center">
                    Overall Confidence: {(results.confidence_scores.overall * 100).toFixed(0)}% • 
                    These are estimations only, not medical diagnoses
                  </p>
                </div>
              </>
            ) : (
              <div className="glass-card p-8 text-center">
                <Eye className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                <p className="text-gray-400">Click "Perform Scan" to analyze facial indicators</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ===================== RESULT ITEM COMPONENT =====================
function ResultItem({ label, value, unit }) {
  return (
    <div className="bg-space-dark/50 p-3 rounded-lg">
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      <p className="text-lg font-semibold text-white capitalize">
        {value} {unit && <span className="text-sm text-gray-400">{unit}</span>}
      </p>
    </div>
  );
}

// ===================== HEALTH TIMELINE COMPONENT =====================
function HealthTimeline({ timeline, astronautId }) {
  const [days, setDays] = useState(7);
  const [data, setData] = useState(timeline);

  useEffect(() => {
    const loadTimeline = async () => {
      try {
        const result = await api.getTimeline(astronautId, days);
        setData(result.daily_averages || []);
      } catch (err) {
        console.error('Failed to load timeline:', err);
      }
    };
    loadTimeline();
  }, [astronautId, days]);

  return (
    <div className="space-y-6" data-testid="health-timeline">
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <Clock className="w-5 h-5 text-space-accent" />
            Health Timeline
          </h3>
          <div className="flex gap-2">
            {[7, 14, 30].map(d => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                  days === d
                    ? 'bg-space-accent text-space-dark'
                    : 'bg-space-dark/50 text-gray-400 hover:text-white'
                }`}
              >
                {d} Days
              </button>
            ))}
          </div>
        </div>

        {data.length > 0 ? (
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,212,255,0.1)" />
              <XAxis dataKey="date" tick={{ fill: '#9ca3af', fontSize: 12 }} />
              <YAxis tick={{ fill: '#9ca3af', fontSize: 12 }} />
              <Tooltip
                contentStyle={{
                  background: 'rgba(26, 39, 68, 0.95)',
                  border: '1px solid rgba(0, 212, 255, 0.3)',
                  borderRadius: '8px'
                }}
              />
              <Legend />
              <Line type="monotone" dataKey="avg_hr" name="Heart Rate" stroke="#ff6b6b" strokeWidth={2} dot={{ fill: '#ff6b6b' }} />
              <Line type="monotone" dataKey="avg_hrv" name="HRV" stroke="#4ecdc4" strokeWidth={2} dot={{ fill: '#4ecdc4' }} />
              <Line type="monotone" dataKey="avg_stress" name="Stress" stroke="#ffd93d" strokeWidth={2} dot={{ fill: '#ffd93d' }} />
              <Line type="monotone" dataKey="avg_fatigue" name="Fatigue" stroke="#a855f7" strokeWidth={2} dot={{ fill: '#a855f7' }} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[400px] flex items-center justify-center text-gray-400">
            <div className="text-center">
              <BarChart2 className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No timeline data available</p>
              <p className="text-sm">Generate demo data from the Dashboard</p>
            </div>
          </div>
        )}
      </div>

      {/* Explanation Panel */}
      <div className="glass-card p-6">
        <h4 className="text-sm font-semibold text-space-accent mb-4 flex items-center gap-2">
          <HelpCircle className="w-4 h-4" />
          Understanding Your Trends
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <TrendExplanation
            color="#ff6b6b"
            label="Heart Rate"
            description="Your average resting heart rate over time. Sudden changes may indicate stress or fitness changes."
          />
          <TrendExplanation
            color="#4ecdc4"
            label="HRV"
            description="Heart rate variability indicates recovery and stress resilience. Higher is generally better."
          />
          <TrendExplanation
            color="#ffd93d"
            label="Stress"
            description="Composite stress indicator based on physiological signals. Elevated levels trigger support recommendations."
          />
          <TrendExplanation
            color="#a855f7"
            label="Fatigue"
            description="Cumulative fatigue indicator. Monitor for trends to prevent exhaustion."
          />
        </div>
      </div>
    </div>
  );
}

// ===================== TREND EXPLANATION COMPONENT =====================
function TrendExplanation({ color, label, description }) {
  return (
    <div className="bg-space-dark/50 p-4 rounded-lg">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
        <span className="font-semibold text-white">{label}</span>
      </div>
      <p className="text-xs text-gray-400">{description}</p>
    </div>
  );
}

// ===================== SUPPORT CHAT COMPONENT =====================
function SupportChat({ chatHistory, setChatHistory, astronautId }) {
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const chatEndRef = useRef(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatHistory]);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!message.trim() || sending) return;

    const userMessage = message.trim();
    setMessage('');
    setSending(true);

    // Optimistically add user message
    const tempHistory = [...chatHistory, {
      id: Date.now().toString(),
      user_message: userMessage,
      assistant_response: null,
      timestamp: new Date().toISOString()
    }];
    setChatHistory(tempHistory);

    try {
      const result = await api.sendChat({
        astronaut_id: astronautId,
        message: userMessage
      });

      // Update with actual response
      setChatHistory([...chatHistory, {
        id: result.message_id,
        user_message: userMessage,
        assistant_response: result.response,
        timestamp: new Date().toISOString()
      }]);
    } catch (err) {
      console.error('Failed to send message:', err);
      // Revert optimistic update
      setChatHistory(chatHistory);
    }

    setSending(false);
  };

  const quickPrompts = [
    "I'm feeling stressed",
    "Help me focus",
    "I need motivation",
    "Breathing exercise",
    "Grounding technique"
  ];

  return (
    <div className="h-[calc(100vh-200px)] flex flex-col" data-testid="support-chat">
      <div className="glass-card flex-1 flex flex-col overflow-hidden">
        {/* Chat Header */}
        <div className="p-4 border-b border-space-accent/20 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-space-green to-space-accent flex items-center justify-center">
            <MessageCircle className="w-5 h-5 text-space-dark" />
          </div>
          <div>
            <h3 className="font-semibold text-white">ASTRA Support Companion</h3>
            <p className="text-xs text-gray-400">Psychological support & wellness guidance</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <span className="w-2 h-2 bg-space-green rounded-full animate-pulse" />
            <span className="text-xs text-space-green">Online</span>
          </div>
        </div>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {chatHistory.length === 0 ? (
            <div className="text-center py-8">
              <Smile className="w-12 h-12 text-space-accent mx-auto mb-4" />
              <h4 className="text-lg font-semibold text-white mb-2">Welcome, Astronaut</h4>
              <p className="text-gray-400 mb-6">
                I'm ASTRA, your psychological support companion. I'm here to help you with
                stress management, focus, motivation, and general well-being during your mission.
              </p>
              <p className="text-sm text-gray-500">Try one of the quick prompts below to get started.</p>
            </div>
          ) : (
            chatHistory.map((chat, idx) => (
              <div key={chat.id || idx} className="space-y-3">
                {/* User Message */}
                <div className="flex justify-end">
                  <div className="chat-user max-w-[80%] p-4 rounded-lg">
                    <p className="text-white">{chat.user_message}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(chat.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
                {/* Assistant Response */}
                {chat.assistant_response ? (
                  <div className="flex justify-start">
                    <div className="chat-assistant max-w-[80%] p-4 rounded-lg">
                      <p className="text-white">{chat.assistant_response}</p>
                      <p className="text-xs text-gray-400 mt-1">ASTRA</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-start">
                    <div className="chat-assistant p-4 rounded-lg">
                      <RefreshCw className="w-4 h-4 animate-spin text-space-accent" />
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Quick Prompts */}
        <div className="px-4 py-2 border-t border-space-accent/10 flex gap-2 overflow-x-auto">
          {quickPrompts.map((prompt, idx) => (
            <button
              key={idx}
              onClick={() => setMessage(prompt)}
              className="px-3 py-1 bg-space-dark/50 rounded-full text-xs text-gray-400 hover:text-space-accent hover:bg-space-accent/10 transition-colors whitespace-nowrap"
            >
              {prompt}
            </button>
          ))}
        </div>

        {/* Chat Input */}
        <form onSubmit={sendMessage} className="p-4 border-t border-space-accent/20 flex gap-3">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type your message..."
            className="input-field flex-1"
            disabled={sending}
            data-testid="chat-input"
          />
          <button
            type="submit"
            disabled={!message.trim() || sending}
            className="btn-primary px-6"
            data-testid="send-message"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
      </div>

      {/* Disclaimer */}
      <p className="text-xs text-gray-500 text-center mt-4">
        ASTRA provides non-clinical psychological support only. For medical concerns, please consult mission medical protocols.
      </p>
    </div>
  );
}

// ===================== ALERTS PANEL COMPONENT =====================
function AlertsPanel({ alerts, setAlerts, astronautId }) {
  const handleAcknowledge = async (alertId, action) => {
    try {
      await api.acknowledgeAlert({
        alert_id: alertId,
        astronaut_id: astronautId,
        action
      });
      setAlerts(alerts.map(a => a.id === alertId ? { ...a, status: action } : a));
    } catch (err) {
      console.error('Failed to acknowledge alert:', err);
    }
  };

  const activeAlerts = alerts.filter(a => a.status === 'active');
  const acknowledgedAlerts = alerts.filter(a => a.status !== 'active');

  return (
    <div className="space-y-6" data-testid="alerts-panel">
      {/* Active Alerts */}
      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-space-yellow" />
          Active Alerts ({activeAlerts.length})
        </h3>
        {activeAlerts.length > 0 ? (
          <div className="space-y-4">
            {activeAlerts.map((alert) => (
              <AlertCard
                key={alert.id}
                alert={alert}
                onAcknowledge={handleAcknowledge}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <CheckCircle className="w-12 h-12 text-space-green mx-auto mb-4" />
            <p className="text-gray-400">No active alerts. All systems nominal.</p>
          </div>
        )}
      </div>

      {/* Alert History */}
      {acknowledgedAlerts.length > 0 && (
        <div className="glass-card p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-space-accent" />
            Alert History
          </h3>
          <div className="space-y-3">
            {acknowledgedAlerts.slice(0, 10).map((alert) => (
              <div key={alert.id} className="flex items-center justify-between p-3 bg-space-dark/50 rounded-lg opacity-60">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${
                    alert.level === 3 ? 'bg-space-red' : alert.level === 2 ? 'bg-orange-500' : 'bg-space-yellow'
                  }`} />
                  <span className="text-sm text-gray-400">{alert.message}</span>
                </div>
                <span className="text-xs text-gray-500 capitalize">{alert.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Alert Explanation */}
      <div className="glass-card p-6">
        <h4 className="text-sm font-semibold text-space-accent mb-4 flex items-center gap-2">
          <HelpCircle className="w-4 h-4" />
          Alert Levels Explained
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-lg alert-level-1">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-3 h-3 rounded-full bg-space-yellow" />
              <span className="font-semibold text-space-yellow">Level 1 - Preventive</span>
            </div>
            <p className="text-xs text-gray-400">Breathing exercises, grounding prompts, stress acknowledgment</p>
          </div>
          <div className="p-4 rounded-lg alert-level-2">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-3 h-3 rounded-full bg-orange-500" />
              <span className="font-semibold text-orange-400">Level 2 - Adaptive</span>
            </div>
            <p className="text-xs text-gray-400">Rest cycles, workload moderation, recovery optimization</p>
          </div>
          <div className="p-4 rounded-lg alert-level-3">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-3 h-3 rounded-full bg-space-red" />
              <span className="font-semibold text-space-red">Level 3 - Medical Review</span>
            </div>
            <p className="text-xs text-gray-400">Secure logging for authorized medical review</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ===================== ALERT CARD COMPONENT =====================
function AlertCard({ alert, onAcknowledge }) {
  const levelColors = {
    1: { bg: 'alert-level-1', text: 'text-space-yellow', icon: AlertTriangle },
    2: { bg: 'alert-level-2', text: 'text-orange-400', icon: AlertTriangle },
    3: { bg: 'alert-level-3', text: 'text-space-red', icon: XCircle }
  };

  const config = levelColors[alert.level] || levelColors[1];
  const Icon = config.icon;

  return (
    <div className={`p-4 rounded-lg ${config.bg} border`}>
      <div className="flex items-start gap-4">
        <Icon className={`w-6 h-6 ${config.text} flex-shrink-0`} />
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-sm font-semibold ${config.text}`}>
              Level {alert.level} Alert
            </span>
            <span className="text-xs text-gray-400">
              {new Date(alert.created_at).toLocaleString()}
            </span>
          </div>
          <p className="text-white mb-3">{alert.message}</p>
          {alert.factors && alert.factors.length > 0 && (
            <div className="mb-3">
              <p className="text-xs text-gray-400 mb-1">Contributing factors:</p>
              <ul className="text-xs text-gray-300 list-disc list-inside">
                {alert.factors.map((f, i) => (
                  <li key={i}>{f.message}</li>
                ))}
              </ul>
            </div>
          )}
          <div className="flex gap-2">
            <button
              onClick={() => onAcknowledge(alert.id, 'acknowledged')}
              className="px-3 py-1 bg-space-green/20 text-space-green rounded text-sm hover:bg-space-green/30 transition-colors"
              data-testid={`acknowledge-${alert.id}`}
            >
              Acknowledge
            </button>
            <button
              onClick={() => onAcknowledge(alert.id, 'dismissed')}
              className="px-3 py-1 bg-gray-500/20 text-gray-400 rounded text-sm hover:bg-gray-500/30 transition-colors"
            >
              Dismiss
            </button>
            {alert.level >= 2 && (
              <button
                onClick={() => onAcknowledge(alert.id, 'escalated')}
                className="px-3 py-1 bg-space-red/20 text-space-red rounded text-sm hover:bg-space-red/30 transition-colors"
              >
                Escalate
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ===================== MISSION CONTEXT COMPONENT =====================
function MissionContext({ context, setContext, astronautId }) {
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    mission_phase: context?.mission_phase || 'transit',
    time_of_day: context?.time_of_day || 'morning',
    work_cycle: context?.work_cycle || 'active',
    days_since_launch: context?.days_since_launch || 1,
    current_workload: context?.current_workload || 'moderate'
  });

  const handleSave = async () => {
    try {
      const result = await api.updateContext({
        astronaut_id: astronautId,
        ...formData
      });
      setContext(result.context);
      setEditing(false);
    } catch (err) {
      console.error('Failed to update context:', err);
    }
  };

  return (
    <div className="space-y-6" data-testid="mission-context">
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <Rocket className="w-5 h-5 text-space-accent" />
            Mission Context
          </h3>
          <button
            onClick={() => setEditing(!editing)}
            className="btn-secondary text-sm"
          >
            {editing ? 'Cancel' : 'Edit Context'}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Mission Phase */}
          <div className="space-y-2">
            <label className="block text-sm text-gray-400">Mission Phase</label>
            {editing ? (
              <select
                value={formData.mission_phase}
                onChange={(e) => setFormData({ ...formData, mission_phase: e.target.value })}
                className="input-field"
              >
                <option value="transit">Transit</option>
                <option value="eva">EVA (Spacewalk)</option>
                <option value="recovery">Recovery</option>
                <option value="high-load">High-Load Operations</option>
                <option value="rest">Rest Period</option>
              </select>
            ) : (
              <div className="p-3 bg-space-dark/50 rounded-lg flex items-center gap-2">
                <Rocket className="w-5 h-5 text-space-accent" />
                <span className="text-white capitalize">{context?.mission_phase || 'Transit'}</span>
              </div>
            )}
          </div>

          {/* Time of Day */}
          <div className="space-y-2">
            <label className="block text-sm text-gray-400">Time of Day</label>
            {editing ? (
              <select
                value={formData.time_of_day}
                onChange={(e) => setFormData({ ...formData, time_of_day: e.target.value })}
                className="input-field"
              >
                <option value="morning">Morning</option>
                <option value="afternoon">Afternoon</option>
                <option value="evening">Evening</option>
                <option value="night">Night</option>
              </select>
            ) : (
              <div className="p-3 bg-space-dark/50 rounded-lg flex items-center gap-2">
                {context?.time_of_day === 'night' ? (
                  <Moon className="w-5 h-5 text-space-purple" />
                ) : (
                  <Sun className="w-5 h-5 text-space-yellow" />
                )}
                <span className="text-white capitalize">{context?.time_of_day || 'Morning'}</span>
              </div>
            )}
          </div>

          {/* Work Cycle */}
          <div className="space-y-2">
            <label className="block text-sm text-gray-400">Work Cycle</label>
            {editing ? (
              <select
                value={formData.work_cycle}
                onChange={(e) => setFormData({ ...formData, work_cycle: e.target.value })}
                className="input-field"
              >
                <option value="active">Active</option>
                <option value="rest">Rest</option>
                <option value="sleep">Sleep</option>
              </select>
            ) : (
              <div className="p-3 bg-space-dark/50 rounded-lg flex items-center gap-2">
                <Activity className="w-5 h-5 text-space-green" />
                <span className="text-white capitalize">{context?.work_cycle || 'Active'}</span>
              </div>
            )}
          </div>

          {/* Days Since Launch */}
          <div className="space-y-2">
            <label className="block text-sm text-gray-400">Days Since Launch</label>
            {editing ? (
              <input
                type="number"
                value={formData.days_since_launch}
                onChange={(e) => setFormData({ ...formData, days_since_launch: parseInt(e.target.value) })}
                className="input-field"
                min="1"
              />
            ) : (
              <div className="p-3 bg-space-dark/50 rounded-lg flex items-center gap-2">
                <Clock className="w-5 h-5 text-space-accent" />
                <span className="text-white">Day {context?.days_since_launch || 1}</span>
              </div>
            )}
          </div>

          {/* Current Workload */}
          <div className="space-y-2">
            <label className="block text-sm text-gray-400">Current Workload</label>
            {editing ? (
              <select
                value={formData.current_workload}
                onChange={(e) => setFormData({ ...formData, current_workload: e.target.value })}
                className="input-field"
              >
                <option value="low">Low</option>
                <option value="moderate">Moderate</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            ) : (
              <div className="p-3 bg-space-dark/50 rounded-lg flex items-center gap-2">
                <Thermometer className={`w-5 h-5 ${
                  context?.current_workload === 'critical' ? 'text-space-red' :
                  context?.current_workload === 'high' ? 'text-orange-400' :
                  context?.current_workload === 'moderate' ? 'text-space-yellow' :
                  'text-space-green'
                }`} />
                <span className="text-white capitalize">{context?.current_workload || 'Moderate'}</span>
              </div>
            )}
          </div>
        </div>

        {editing && (
          <div className="mt-6">
            <button onClick={handleSave} className="btn-primary" data-testid="save-context">
              Save Context
            </button>
          </div>
        )}
      </div>

      {/* Context Impact Explanation */}
      <div className="glass-card p-6">
        <h4 className="text-sm font-semibold text-space-accent mb-4 flex items-center gap-2">
          <HelpCircle className="w-4 h-4" />
          Why Context Matters
        </h4>
        <p className="text-sm text-gray-400 mb-4">
          Mission context helps ASTRA-CARE provide context-aware health assessments. During EVA or high-load operations,
          elevated stress metrics are expected and won't trigger unnecessary alerts. This prevents alert fatigue
          and ensures you receive meaningful notifications only when truly needed.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-space-dark/50 rounded-lg">
            <h5 className="text-sm font-semibold text-white mb-2">During EVA / High-Load</h5>
            <ul className="text-xs text-gray-400 space-y-1">
              <li>• Alert thresholds increased by 20%</li>
              <li>• Expected elevated heart rate not flagged</li>
              <li>• Focus on critical indicators only</li>
            </ul>
          </div>
          <div className="p-4 bg-space-dark/50 rounded-lg">
            <h5 className="text-sm font-semibold text-white mb-2">During Rest / Sleep</h5>
            <ul className="text-xs text-gray-400 space-y-1">
              <li>• Tighter thresholds for anomaly detection</li>
              <li>• Recovery metrics prioritized</li>
              <li>• Non-urgent alerts delayed</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

// ===================== CREW OVERVIEW COMPONENT (SUPERVISOR) =====================
function CrewOverview({ astronauts }) {
  const [crewData, setCrewData] = useState({});

  useEffect(() => {
    const loadCrewData = async () => {
      const data = {};
      for (const id of astronauts) {
        try {
          const [health, alerts] = await Promise.all([
            api.getLatestHealth(id).catch(() => null),
            api.getAlerts(id).catch(() => ({ alerts: [] }))
          ]);
          data[id] = { health, alerts: alerts.alerts };
        } catch (err) {
          data[id] = { health: null, alerts: [] };
        }
      }
      setCrewData(data);
    };
    loadCrewData();
  }, [astronauts]);

  const getStatus = (data) => {
    if (!data.health) return { label: 'No Data', color: 'text-gray-400' };
    const hasAlerts = data.alerts.some(a => a.status === 'active' && a.level >= 2);
    if (hasAlerts) return { label: 'Attention Needed', color: 'text-space-red' };
    if (data.health.stress_level > 70 || data.health.fatigue_level > 70) {
      return { label: 'Elevated', color: 'text-space-yellow' };
    }
    return { label: 'Optimal', color: 'text-space-green' };
  };

  return (
    <div className="space-y-6" data-testid="crew-overview">
      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
          <Users className="w-5 h-5 text-space-accent" />
          Crew Health Overview
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {astronauts.map((id) => {
            const data = crewData[id] || { health: null, alerts: [] };
            const status = getStatus(data);
            return (
              <div key={id} className="glass-card p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-space-accent to-space-purple flex items-center justify-center">
                      <User className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-white">{id}</h4>
                      <p className={`text-xs ${status.color}`}>{status.label}</p>
                    </div>
                  </div>
                  {data.alerts.filter(a => a.status === 'active').length > 0 && (
                    <div className="flex items-center gap-1">
                      <Bell className="w-4 h-4 text-space-yellow" />
                      <span className="text-xs text-space-yellow">
                        {data.alerts.filter(a => a.status === 'active').length}
                      </span>
                    </div>
                  )}
                </div>
                {data.health ? (
                  <div className="grid grid-cols-2 gap-2">
                    <MiniMetric label="HR" value={data.health.heart_rate?.toFixed(0)} unit="BPM" />
                    <MiniMetric label="HRV" value={data.health.hrv?.toFixed(0)} unit="ms" />
                    <MiniMetric label="Stress" value={data.health.stress_level?.toFixed(0)} unit="%" warn={data.health.stress_level > 70} />
                    <MiniMetric label="Fatigue" value={data.health.fatigue_level?.toFixed(0)} unit="%" warn={data.health.fatigue_level > 65} />
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 text-center py-4">No recent data</p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ===================== MINI METRIC COMPONENT =====================
function MiniMetric({ label, value, unit, warn }) {
  return (
    <div className="bg-space-dark/50 p-2 rounded text-center">
      <p className="text-xs text-gray-400">{label}</p>
      <p className={`text-lg font-semibold ${warn ? 'text-space-red' : 'text-white'}`}>
        {value || '--'} <span className="text-xs text-gray-400">{unit}</span>
      </p>
    </div>
  );
}

export default App;
