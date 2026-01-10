import React, { useState, useEffect, useRef, useCallback, createContext, useContext } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from 'recharts';
import {
  Activity, Heart, Brain, AlertTriangle, MessageCircle, Camera, Clock, User,
  Shield, TrendingUp, Zap, Eye, Droplets, Sun, Moon, Rocket, Settings, Bell,
  CheckCircle, XCircle, RefreshCw, Play, Send, Menu, X, Home, BarChart2, Users,
  HelpCircle, LogOut, ChevronRight, Sparkles, Scan, Waves, Lock, Mail, UserPlus,
  Monitor, Cpu, Fingerprint, Globe, Radio, Target, Compass
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

// ===================== AUTH CONTEXT =====================
const AuthContext = createContext(null);

const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

// ===================== API SERVICE =====================
const api = {
  token: localStorage.getItem('astra_token'),
  
  setToken(token) {
    this.token = token;
    if (token) {
      localStorage.setItem('astra_token', token);
    } else {
      localStorage.removeItem('astra_token');
    }
  },

  async fetch(endpoint, options = {}) {
    const headers = { 'Content-Type': 'application/json', ...options.headers };
    if (this.token) headers['Authorization'] = `Bearer ${this.token}`;
    
    const response = await fetch(`${BACKEND_URL}${endpoint}`, { ...options, headers });
    if (response.status === 401) {
      this.setToken(null);
      window.location.reload();
    }
    if (!response.ok) throw new Error(`API Error: ${response.status}`);
    return response.json();
  },

  // Auth
  login: (data) => api.fetch('/api/auth/login', { method: 'POST', body: JSON.stringify(data) }),
  register: (data) => api.fetch('/api/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  getMe: () => api.fetch('/api/auth/me'),
  
  // Health
  getHealth: () => api.fetch('/api/health'),
  getDashboardSummary: (id) => api.fetch(`/api/dashboard/summary/${id}`),
  getLatestHealth: (id) => api.fetch(`/api/health/latest/${id}`),
  getTimeline: (id, days = 7) => api.fetch(`/api/health/timeline/${id}?days=${days}`),
  getBaseline: (id) => api.fetch(`/api/baseline/${id}`),
  ingestHealth: (data) => api.fetch('/api/health/ingest', { method: 'POST', body: JSON.stringify(data) }),
  
  // Facial
  storeFacialAnalysis: (data) => api.fetch('/api/facial/analyze', { method: 'POST', body: JSON.stringify(data) }),
  getLatestFacial: (id) => api.fetch(`/api/facial/latest/${id}`),
  
  // Context & Alerts
  getAlerts: (id) => api.fetch(`/api/alerts/${id}`),
  getContext: (id) => api.fetch(`/api/context/${id}`),
  updateContext: (data) => api.fetch('/api/context/update', { method: 'POST', body: JSON.stringify(data) }),
  acknowledgeAlert: (data) => api.fetch('/api/alerts/acknowledge', { method: 'POST', body: JSON.stringify(data) }),
  
  // Chat
  sendChat: (data) => api.fetch('/api/chat/send', { method: 'POST', body: JSON.stringify(data) }),
  getChatHistory: (id) => api.fetch(`/api/chat/history/${id}`),
  
  // Simulation
  generateSimulation: (id, days) => api.fetch(`/api/simulate/generate?astronaut_id=${id}&days=${days}`, { method: 'POST' }),
  getAstronauts: () => api.fetch('/api/astronauts'),
};

// ===================== MAIN APP =====================
function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      if (api.token) {
        try {
          const userData = await api.getMe();
          setUser(userData);
        } catch {
          api.setToken(null);
        }
      }
      setLoading(false);
    };
    checkAuth();
  }, []);

  const login = async (email, password) => {
    const result = await api.login({ email, password });
    api.setToken(result.access_token);
    setUser(result.user);
    return result;
  };

  const register = async (data) => {
    const result = await api.register(data);
    api.setToken(result.access_token);
    setUser(result.user);
    return result;
  };

  const logout = () => {
    api.setToken(null);
    setUser(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animated-bg" />
        <div className="grid-overlay" />
        <div className="text-center">
          <div className="spinner mx-auto mb-4" />
          <p className="text-gray-400">Initializing ASTRA-CARE...</p>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, login, register, logout }}>
      <div className="animated-bg" />
      <div className="grid-overlay" />
      {user ? <Dashboard /> : <LoginPage />}
    </AuthContext.Provider>
  );
}

// ===================== LOGIN PAGE =====================
function LoginPage() {
  const { login, register } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    full_name: '',
    role: 'astronaut'
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      if (isLogin) {
        await login(formData.email, formData.password);
      } else {
        await register(formData);
      }
    } catch (err) {
      setError(err.message || 'Authentication failed');
    }
    setLoading(false);
  };

  return (
    <>
      {/* Space Background */}
      <div className="login-bg" />
      <div className="grid-overlay" />
      
      <div className="login-container">
        <div className="login-card fade-in" data-testid="login-card">
          {/* Logo */}
          <div className="login-logo pulse-glow">
            <Rocket className="w-9 h-9 text-white" />
          </div>
          
          <h1 className="text-2xl font-bold text-center gradient-text mb-1">ASTRA-CARE</h1>
          <p className="text-center text-gray-500 text-sm mb-6">Astronaut Health Intelligence Platform</p>

          {/* Tab Switcher */}
          <div className="tab-switcher">
            <button
              onClick={() => setIsLogin(true)}
              className={`tab-btn ${isLogin ? 'active' : ''}`}
              data-testid="login-tab"
            >
              Sign In
            </button>
            <button
              onClick={() => setIsLogin(false)}
              className={`tab-btn ${!isLogin ? 'active' : ''}`}
              data-testid="register-tab"
            >
              Register
            </button>
          </div>

          {error && (
            <div className="mb-5 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {!isLogin && (
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <div className="input-wrapper">
                  <User className="input-icon" />
                  <input
                    type="text"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    className="input-modern"
                    placeholder="Commander John Doe"
                    required={!isLogin}
                    data-testid="input-name"
                  />
                </div>
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Email Address</label>
              <div className="input-wrapper">
                <Mail className="input-icon" />
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="input-modern"
                  placeholder="astronaut@nasa.gov"
                  required
                  data-testid="input-email"
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <div className="input-wrapper">
                <Lock className="input-icon" />
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="input-modern pl-12"
                placeholder="••••••••••"
                required
                data-testid="input-password"
              />
            </div>
          </div>

          {!isLogin && (
            <div>
              <label className="block text-sm text-gray-400 mb-2">Role</label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                className="input-modern"
                data-testid="input-role"
              >
                <option value="astronaut">Astronaut</option>
                <option value="supervisor">Mission Supervisor</option>
                <option value="medical">Medical Officer</option>
              </select>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full flex items-center justify-center gap-2"
            data-testid="submit-auth"
          >
            {loading ? (
              <div className="spinner w-5 h-5" />
            ) : (
              <>
                {isLogin ? <Fingerprint className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
                {isLogin ? 'Access System' : 'Create Account'}
              </>
            )}
          </button>
        </form>

        {/* Demo Credentials */}
        <div className="mt-8 pt-6 border-t border-white/10">
          <p className="text-xs text-gray-500 text-center">
            Demo: Create a new account or use any credentials to explore
          </p>
        </div>
      </div>
    </div>
  );
}

// ===================== DASHBOARD =====================
function Dashboard() {
  const { user, logout } = useAuth();
  const [currentView, setCurrentView] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [facialData, setFacialData] = useState(null);

  const astronautId = user?.astronaut_id || 'AST-001';

  const loadDashboardData = useCallback(async () => {
    try {
      const data = await api.getDashboardSummary(astronautId);
      setDashboardData(data);
      if (data.facial_analysis) {
        setFacialData(data.facial_analysis);
      }
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    }
    setLoading(false);
  }, [astronautId]);

  useEffect(() => {
    loadDashboardData();
    const interval = setInterval(loadDashboardData, 30000);
    return () => clearInterval(interval);
  }, [loadDashboardData]);

  const navItems = [
    { id: 'dashboard', label: 'Command Center', icon: Monitor },
    { id: 'health', label: 'Vitals Monitor', icon: Activity },
    { id: 'facial', label: 'Biometric Scan', icon: Scan },
    { id: 'timeline', label: 'Health Timeline', icon: BarChart2 },
    { id: 'chat', label: 'ASTRA Support', icon: MessageCircle },
    { id: 'alerts', label: 'Alert System', icon: Bell },
    { id: 'context', label: 'Mission Status', icon: Compass },
  ];

  if (user?.role === 'supervisor') {
    navItems.push({ id: 'crew', label: 'Crew Overview', icon: Users });
  }

  return (
    <div className="min-h-screen flex" data-testid="dashboard-container">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'w-72' : 'w-20'} fixed left-0 top-0 bottom-0 glass-strong transition-all duration-300 z-50 flex flex-col`}>
        {/* Logo Section */}
        <div className="p-6 border-b border-white/5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-400 to-purple-500 flex items-center justify-center pulse-glow">
              <Rocket className="w-7 h-7 text-white" />
            </div>
            {sidebarOpen && (
              <div className="slide-in-left">
                <h1 className="text-xl font-bold gradient-text">ASTRA-CARE</h1>
                <p className="text-xs text-gray-500">v2.0 • Mission Ready</p>
              </div>
            )}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="ml-auto p-2 hover:bg-white/5 rounded-lg transition-colors"
              data-testid="toggle-sidebar"
            >
              {sidebarOpen ? <X className="w-5 h-5 text-gray-400" /> : <Menu className="w-5 h-5 text-gray-400" />}
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {navItems.map((item, idx) => (
            <button
              key={item.id}
              onClick={() => setCurrentView(item.id)}
              className={`nav-item w-full ${currentView === item.id ? 'active' : ''}`}
              style={{ animationDelay: `${idx * 50}ms` }}
              data-testid={`nav-${item.id}`}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {sidebarOpen && <span className="font-medium">{item.label}</span>}
            </button>
          ))}
        </nav>

        {/* User Section */}
        <div className="p-4 border-t border-white/5">
          <div className={`flex items-center ${sidebarOpen ? 'gap-3' : 'justify-center'}`}>
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-400 to-purple-500 flex items-center justify-center">
              <User className="w-5 h-5 text-white" />
            </div>
            {sidebarOpen && (
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{user?.full_name || 'Astronaut'}</p>
                <p className="text-xs text-gray-500 truncate">{user?.astronaut_id}</p>
              </div>
            )}
            <button onClick={logout} className="p-2 hover:bg-red-500/10 rounded-lg transition-colors" data-testid="logout-btn">
              <LogOut className="w-5 h-5 text-gray-400 hover:text-red-400" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className={`flex-1 ${sidebarOpen ? 'ml-72' : 'ml-20'} transition-all duration-300`}>
        {/* Top Bar */}
        <header className="sticky top-0 z-40 glass px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">{navItems.find(n => n.id === currentView)?.label}</h2>
            <p className="text-sm text-gray-500">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
          <div className="flex items-center gap-4">
            {/* System Status */}
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-green-500/10 border border-green-500/30">
              <div className="status-dot status-healthy" />
              <span className="text-sm text-green-400 font-medium">All Systems Nominal</span>
            </div>
            
            {/* Refresh Button */}
            <button onClick={loadDashboardData} className="p-3 hover:bg-white/5 rounded-xl transition-colors">
              <RefreshCw className="w-5 h-5 text-gray-400" />
            </button>
          </div>
        </header>

        {/* Content */}
        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center h-96">
              <div className="text-center">
                <div className="spinner mx-auto mb-4" />
                <p className="text-gray-400">Loading telemetry...</p>
              </div>
            </div>
          ) : (
            <>
              {currentView === 'dashboard' && (
                <CommandCenter data={dashboardData} astronautId={astronautId} facialData={facialData} onRefresh={loadDashboardData} />
              )}
              {currentView === 'health' && (
                <VitalsMonitor data={dashboardData} astronautId={astronautId} onRefresh={loadDashboardData} />
              )}
              {currentView === 'facial' && (
                <BiometricScan astronautId={astronautId} onScanComplete={(data) => { setFacialData(data); loadDashboardData(); }} />
              )}
              {currentView === 'timeline' && (
                <HealthTimeline data={dashboardData} astronautId={astronautId} />
              )}
              {currentView === 'chat' && (
                <AstraSupport astronautId={astronautId} />
              )}
              {currentView === 'alerts' && (
                <AlertSystem data={dashboardData} astronautId={astronautId} onRefresh={loadDashboardData} />
              )}
              {currentView === 'context' && (
                <MissionStatus data={dashboardData} astronautId={astronautId} onRefresh={loadDashboardData} />
              )}
              {currentView === 'crew' && user?.role === 'supervisor' && (
                <CrewOverview />
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}

// ===================== COMMAND CENTER (DASHBOARD) =====================
function CommandCenter({ data, astronautId, facialData, onRefresh }) {
  const [generating, setGenerating] = useState(false);

  const generateDemoData = async () => {
    setGenerating(true);
    try {
      await api.generateSimulation(astronautId, 7);
      onRefresh();
    } catch (err) {
      console.error('Failed to generate data:', err);
    }
    setGenerating(false);
  };

  const health = data?.health;
  const baseline = data?.baseline;
  const timeline = data?.timeline || [];
  const context = data?.context;

  // Calculate overall wellness score
  const wellnessScore = health ? Math.round(100 - (health.stress_level * 0.4 + health.fatigue_level * 0.3 + Math.abs(health.heart_rate - 70) * 0.3)) : 85;

  return (
    <div className="space-y-6 fade-in" data-testid="command-center">
      {/* Hero Stats Row */}
      <div className="bento-grid">
        {/* Wellness Score - Large Card */}
        <div className="bento-item bento-span-2 bento-row-2 flex flex-col">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="w-5 h-5 text-cyan-400" />
            <span className="text-sm text-gray-400 uppercase tracking-wider">Wellness Index</span>
          </div>
          <div className="flex-1 flex items-center justify-center">
            <div className="relative">
              <svg className="w-48 h-48" viewBox="0 0 200 200">
                <circle cx="100" cy="100" r="90" fill="none" stroke="rgba(0,240,255,0.1)" strokeWidth="12" />
                <circle
                  cx="100" cy="100" r="90" fill="none"
                  stroke="url(#wellnessGradient)"
                  strokeWidth="12"
                  strokeLinecap="round"
                  strokeDasharray={`${wellnessScore * 5.65} 565`}
                  transform="rotate(-90 100 100)"
                  className="transition-all duration-1000"
                />
                <defs>
                  <linearGradient id="wellnessGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#00f0ff" />
                    <stop offset="100%" stopColor="#a855f7" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-5xl font-bold gradient-text">{wellnessScore}</span>
                <span className="text-sm text-gray-400">of 100</span>
              </div>
            </div>
          </div>
          <div className="text-center">
            <span className={`text-lg font-semibold ${wellnessScore >= 80 ? 'text-green-400' : wellnessScore >= 60 ? 'text-yellow-400' : 'text-red-400'}`}>
              {wellnessScore >= 80 ? 'Excellent Condition' : wellnessScore >= 60 ? 'Good Condition' : 'Needs Attention'}
            </span>
          </div>
        </div>

        {/* Heart Rate */}
        <div className="bento-item">
          <MetricDisplay
            icon={Heart}
            label="Heart Rate"
            value={health?.heart_rate?.toFixed(0) || '--'}
            unit="BPM"
            baseline={baseline?.hr_baseline}
            color="#ff6b6b"
            trend={health?.heart_rate > (baseline?.hr_baseline || 70) ? 'up' : 'down'}
          />
        </div>

        {/* HRV */}
        <div className="bento-item">
          <MetricDisplay
            icon={Waves}
            label="HRV"
            value={health?.hrv?.toFixed(0) || '--'}
            unit="ms"
            baseline={baseline?.hrv_baseline}
            color="#4ecdc4"
            trend={health?.hrv > (baseline?.hrv_baseline || 50) ? 'up' : 'down'}
          />
        </div>

        {/* Stress Level */}
        <div className="bento-item">
          <MetricDisplay
            icon={Brain}
            label="Stress Level"
            value={health?.stress_level?.toFixed(0) || '--'}
            unit="%"
            threshold={70}
            color="#ffd93d"
            showBar
          />
        </div>

        {/* Fatigue */}
        <div className="bento-item">
          <MetricDisplay
            icon={Zap}
            label="Fatigue Index"
            value={health?.fatigue_level?.toFixed(0) || '--'}
            unit="%"
            threshold={65}
            color="#a855f7"
            showBar
          />
        </div>
      </div>

      {/* Charts and Context Row */}
      <div className="grid grid-cols-3 gap-6">
        {/* Trend Chart */}
        <div className="col-span-2 glass-card p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-cyan-400" />
              </div>
              <div>
                <h3 className="font-semibold">Health Trends</h3>
                <p className="text-xs text-gray-500">Last 7 days performance</p>
              </div>
            </div>
            <button
              onClick={generateDemoData}
              disabled={generating}
              className="btn-secondary text-sm flex items-center gap-2"
              data-testid="generate-demo-data"
            >
              {generating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              Demo Data
            </button>
          </div>
          
          {timeline.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={timeline}>
                <defs>
                  <linearGradient id="stressGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ffd93d" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#ffd93d" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="fatigueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} />
                <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} domain={[0, 100]} />
                <Tooltip
                  contentStyle={{ background: 'rgba(15, 23, 42, 0.95)', border: '1px solid rgba(0, 240, 255, 0.2)', borderRadius: '12px' }}
                  labelStyle={{ color: '#94a3b8' }}
                />
                <Area type="monotone" dataKey="avg_stress" name="Stress" stroke="#ffd93d" fill="url(#stressGrad)" strokeWidth={2} />
                <Area type="monotone" dataKey="avg_fatigue" name="Fatigue" stroke="#a855f7" fill="url(#fatigueGrad)" strokeWidth={2} />
                <Line type="monotone" dataKey="avg_hr" name="Heart Rate" stroke="#ff6b6b" strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[280px] flex items-center justify-center">
              <div className="text-center">
                <BarChart2 className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-500">No data available</p>
                <p className="text-sm text-gray-600">Generate demo data to see trends</p>
              </div>
            </div>
          )}
        </div>

        {/* Mission Context */}
        <div className="glass-card p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
              <Rocket className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h3 className="font-semibold">Mission Status</h3>
              <p className="text-xs text-gray-500">Current parameters</p>
            </div>
          </div>
          
          <div className="space-y-4">
            <ContextRow icon={Globe} label="Phase" value={context?.mission_phase || 'Transit'} />
            <ContextRow icon={Sun} label="Time" value={context?.time_of_day || 'Morning'} />
            <ContextRow icon={Activity} label="Cycle" value={context?.work_cycle || 'Active'} />
            <ContextRow icon={Clock} label="Mission Day" value={`Day ${context?.days_since_launch || 1}`} />
            <ContextRow icon={Target} label="Workload" value={context?.current_workload || 'Moderate'} />
          </div>
        </div>
      </div>

      {/* Facial Analysis Integration */}
      {facialData && (
        <div className="glass-card p-6 border-l-4 border-cyan-500">
          <div className="flex items-center gap-3 mb-4">
            <Scan className="w-6 h-6 text-cyan-400" />
            <div>
              <h3 className="font-semibold">Latest Biometric Scan</h3>
              <p className="text-xs text-gray-500">
                {new Date(facialData.timestamp).toLocaleString()}
              </p>
            </div>
            <span className="ml-auto px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-400 text-xs font-medium">
              Integrated
            </span>
          </div>
          <div className="grid grid-cols-5 gap-4">
            <MiniMetric label="Est. HR" value={facialData.vital_estimates?.heart_rate?.toFixed(0)} unit="BPM" />
            <MiniMetric label="Mood" value={facialData.mental_indicators?.mood_state} />
            <MiniMetric label="Stress" value={facialData.mental_indicators?.mental_stress_index?.toFixed(0)} unit="%" />
            <MiniMetric label="Fatigue" value={facialData.mental_indicators?.fatigue_probability?.toFixed(0)} unit="%" />
            <MiniMetric label="Alertness" value={facialData.mental_indicators?.alertness_level?.toFixed(0)} unit="%" />
          </div>
        </div>
      )}
    </div>
  );
}

// ===================== METRIC DISPLAY COMPONENT =====================
function MetricDisplay({ icon: Icon, label, value, unit, baseline, threshold, color, trend, showBar }) {
  const numValue = parseFloat(value);
  const isValid = !isNaN(numValue);
  const isAboveThreshold = threshold && isValid && numValue > threshold;
  const percentage = showBar && isValid ? Math.min(numValue, 100) : 0;

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${color}20` }}>
          <Icon className="w-4 h-4" style={{ color }} />
        </div>
        <span className="text-xs text-gray-400 uppercase tracking-wider">{label}</span>
      </div>
      
      <div className="flex-1 flex items-center">
        <div className="flex items-baseline gap-1">
          <span className={`text-4xl font-bold ${isAboveThreshold ? 'text-red-400' : 'text-white'}`}>
            {value}
          </span>
          <span className="text-sm text-gray-500">{unit}</span>
        </div>
      </div>

      {showBar && (
        <div className="mt-3">
          <div className="h-2 bg-white/5 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${percentage}%`,
                background: isAboveThreshold 
                  ? 'linear-gradient(90deg, #ef4444, #f97316)' 
                  : `linear-gradient(90deg, ${color}, ${color}88)`
              }}
            />
          </div>
        </div>
      )}

      {baseline && isValid && (
        <p className="text-xs text-gray-500 mt-2">
          Baseline: {baseline.toFixed(1)} {unit}
        </p>
      )}
    </div>
  );
}

// ===================== CONTEXT ROW COMPONENT =====================
function ContextRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
      <div className="flex items-center gap-2">
        <Icon className="w-4 h-4 text-gray-500" />
        <span className="text-sm text-gray-400">{label}</span>
      </div>
      <span className="text-sm font-medium text-cyan-400 capitalize">{value}</span>
    </div>
  );
}

// ===================== MINI METRIC COMPONENT =====================
function MiniMetric({ label, value, unit }) {
  return (
    <div className="text-center p-3 bg-white/5 rounded-xl">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className="font-semibold text-white capitalize">
        {value || '--'} {unit && <span className="text-xs text-gray-400">{unit}</span>}
      </p>
    </div>
  );
}

// ===================== VITALS MONITOR =====================
function VitalsMonitor({ data, astronautId, onRefresh }) {
  const [formData, setFormData] = useState({ heart_rate: '', hrv: '', stress_level: '', fatigue_level: '' });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.ingestHealth({
        astronaut_id: astronautId,
        heart_rate: parseFloat(formData.heart_rate),
        hrv: parseFloat(formData.hrv),
        stress_level: parseFloat(formData.stress_level),
        fatigue_level: parseFloat(formData.fatigue_level),
        source: 'manual'
      });
      setFormData({ heart_rate: '', hrv: '', stress_level: '', fatigue_level: '' });
      onRefresh();
    } catch (err) {
      console.error('Failed to submit:', err);
    }
    setSubmitting(false);
  };

  const health = data?.health;
  const baseline = data?.baseline;

  return (
    <div className="space-y-6 fade-in" data-testid="vitals-monitor">
      {/* Current Readings */}
      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
          <Activity className="w-5 h-5 text-cyan-400" />
          Current Vital Signs
        </h3>
        <div className="grid grid-cols-4 gap-6">
          <GaugeCard label="Heart Rate" value={health?.heart_rate || 0} max={180} unit="BPM" color="#ff6b6b" baseline={baseline?.hr_baseline} />
          <GaugeCard label="HRV" value={health?.hrv || 0} max={100} unit="ms" color="#4ecdc4" baseline={baseline?.hrv_baseline} />
          <GaugeCard label="Stress" value={health?.stress_level || 0} max={100} unit="%" color="#ffd93d" threshold={70} />
          <GaugeCard label="Fatigue" value={health?.fatigue_level || 0} max={100} unit="%" color="#a855f7" threshold={65} />
        </div>
      </div>

      {/* Manual Entry */}
      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
          <Settings className="w-5 h-5 text-cyan-400" />
          Manual Data Entry
        </h3>
        <form onSubmit={handleSubmit} className="grid grid-cols-4 gap-4">
          <div>
            <label className="block text-sm text-gray-400 mb-2">Heart Rate (BPM)</label>
            <input type="number" value={formData.heart_rate} onChange={(e) => setFormData({...formData, heart_rate: e.target.value})}
              className="input-modern" placeholder="60-100" min="40" max="200" required data-testid="input-heart-rate" />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-2">HRV (ms)</label>
            <input type="number" value={formData.hrv} onChange={(e) => setFormData({...formData, hrv: e.target.value})}
              className="input-modern" placeholder="20-100" min="0" max="200" required data-testid="input-hrv" />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-2">Stress Level (%)</label>
            <input type="number" value={formData.stress_level} onChange={(e) => setFormData({...formData, stress_level: e.target.value})}
              className="input-modern" placeholder="0-100" min="0" max="100" required data-testid="input-stress" />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-2">Fatigue Level (%)</label>
            <input type="number" value={formData.fatigue_level} onChange={(e) => setFormData({...formData, fatigue_level: e.target.value})}
              className="input-modern" placeholder="0-100" min="0" max="100" required data-testid="input-fatigue" />
          </div>
          <div className="col-span-4">
            <button type="submit" className="btn-primary w-full" disabled={submitting} data-testid="submit-health-data">
              {submitting ? 'Processing...' : 'Submit Vital Signs'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ===================== GAUGE CARD COMPONENT =====================
function GaugeCard({ label, value, max, unit, color, baseline, threshold }) {
  const percentage = Math.min((value / max) * 100, 100);
  const isWarning = threshold && value > threshold;
  const circumference = 2 * Math.PI * 60;

  return (
    <div className="text-center">
      <div className="relative w-36 h-36 mx-auto">
        <svg className="w-full h-full" viewBox="0 0 140 140">
          <circle cx="70" cy="70" r="60" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="10" />
          <circle
            cx="70" cy="70" r="60" fill="none"
            stroke={isWarning ? '#ef4444' : color}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference - (percentage / 100) * circumference}
            transform="rotate(-90 70 70)"
            className="transition-all duration-1000"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-3xl font-bold ${isWarning ? 'text-red-400' : 'text-white'}`}>{value.toFixed(0)}</span>
          <span className="text-xs text-gray-500">{unit}</span>
        </div>
      </div>
      <p className="mt-3 text-sm text-gray-400">{label}</p>
      {baseline && <p className="text-xs text-gray-600">Baseline: {baseline.toFixed(1)}</p>}
    </div>
  );
}

// ===================== BIOMETRIC SCAN =====================
function BiometricScan({ astronautId, onScanComplete }) {
  const videoRef = useRef(null);
  const [consent, setConsent] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [results, setResults] = useState(null);
  const [cameraError, setCameraError] = useState(null);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: 640, height: 480 } });
      if (videoRef.current) videoRef.current.srcObject = stream;
      setCameraError(null);
    } catch { setCameraError('Camera access denied'); }
  }, []);

  const stopCamera = useCallback(() => {
    if (videoRef.current?.srcObject) videoRef.current.srcObject.getTracks().forEach(track => track.stop());
  }, []);

  useEffect(() => {
    if (consent) startCamera();
    return () => stopCamera();
  }, [consent, startCamera, stopCamera]);

  const performScan = async () => {
    setScanning(true);
    await new Promise(resolve => setTimeout(resolve, 3500));
    
    const simulatedResults = {
      estimated_hr: 65 + Math.random() * 25,
      respiration_rate: 14 + Math.random() * 6,
      hrv_trend: 45 + Math.random() * 30,
      oxygen_saturation_trend: 95 + Math.random() * 4,
      blood_pressure_trend: Math.random() > 0.5 ? 'normal' : 'slightly_elevated',
      mood_state: ['calm', 'neutral', 'focused', 'alert'][Math.floor(Math.random() * 4)],
      mental_stress_index: 15 + Math.random() * 45,
      fatigue_probability: 15 + Math.random() * 40,
      alertness_level: 55 + Math.random() * 35,
      facial_tension: 10 + Math.random() * 30,
      pain_likelihood: Math.random() * 15,
      blink_rate: 15 + Math.random() * 10,
      eye_openness: 70 + Math.random() * 25,
      skin_hydration_indicator: Math.random() > 0.3 ? 'adequate' : 'low',
      dehydration_risk: Math.random() * 30,
      confidence_scores: { overall: 0.75 + Math.random() * 0.2 }
    };
    
    setResults(simulatedResults);
    
    try {
      await api.storeFacialAnalysis({ astronaut_id: astronautId, ...simulatedResults });
      onScanComplete(simulatedResults);
    } catch (err) {
      console.error('Failed to store:', err);
    }
    
    setScanning(false);
  };

  return (
    <div className="space-y-6 fade-in" data-testid="biometric-scan">
      {!consent ? (
        <div className="glass-card p-12 max-w-2xl mx-auto text-center">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-cyan-400 to-purple-500 flex items-center justify-center mx-auto mb-6 pulse-glow">
            <Scan className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-2xl font-bold mb-3">Biometric Analysis</h2>
          <p className="text-gray-400 mb-8">
            Advanced facial analysis for non-clinical wellness indicators. All processing is performed locally.
          </p>
          
          <div className="text-left mb-8 p-6 rounded-2xl bg-black/30">
            <h4 className="text-cyan-400 font-semibold mb-3">Analysis Capabilities:</h4>
            <div className="grid grid-cols-2 gap-2 text-sm text-gray-400">
              <div className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-400" /> Heart rate estimation</div>
              <div className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-400" /> Stress indicators</div>
              <div className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-400" /> Fatigue detection</div>
              <div className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-400" /> Mood analysis</div>
            </div>
            <p className="text-xs text-yellow-500/80 mt-4">⚠️ Results are estimations only, not medical diagnoses</p>
          </div>
          
          <button onClick={() => setConsent(true)} className="btn-primary" data-testid="consent-button">
            <Camera className="w-5 h-5 mr-2 inline" /> Start Camera
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-6">
          {/* Camera */}
          <div className="glass-card p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Camera className="w-5 h-5 text-cyan-400" /> Live Feed
            </h3>
            {cameraError ? (
              <div className="aspect-video bg-black/50 rounded-xl flex items-center justify-center">
                <p className="text-red-400">{cameraError}</p>
              </div>
            ) : (
              <div className="scanner-frame aspect-video bg-black rounded-xl overflow-hidden relative">
                <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                <div className="scanner-corner scanner-corner-tl" />
                <div className="scanner-corner scanner-corner-tr" />
                <div className="scanner-corner scanner-corner-bl" />
                <div className="scanner-corner scanner-corner-br" />
                {scanning && (
                  <div className="absolute inset-0 bg-cyan-500/10 flex items-center justify-center">
                    <div className="text-center">
                      <div className="spinner mx-auto mb-2" />
                      <p className="text-cyan-400">Analyzing...</p>
                    </div>
                  </div>
                )}
              </div>
            )}
            <div className="mt-4 flex gap-3">
              <button onClick={performScan} disabled={scanning || cameraError} className="btn-primary flex-1" data-testid="scan-button">
                {scanning ? 'Scanning...' : 'Perform Scan'}
              </button>
              <button onClick={() => { setConsent(false); stopCamera(); setResults(null); }} className="btn-secondary">
                Stop
              </button>
            </div>
          </div>

          {/* Results */}
          <div className="space-y-4">
            {results ? (
              <>
                <div className="glass-card p-5">
                  <h4 className="text-sm font-semibold text-cyan-400 mb-4 flex items-center gap-2">
                    <Heart className="w-4 h-4" /> Vital Estimates
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    <ResultBox label="Heart Rate" value={results.estimated_hr?.toFixed(0)} unit="BPM" />
                    <ResultBox label="Respiration" value={results.respiration_rate?.toFixed(0)} unit="/min" />
                    <ResultBox label="HRV Trend" value={results.hrv_trend?.toFixed(0)} unit="ms" />
                    <ResultBox label="SpO2 Trend" value={results.oxygen_saturation_trend?.toFixed(0)} unit="%" />
                  </div>
                </div>
                <div className="glass-card p-5">
                  <h4 className="text-sm font-semibold text-purple-400 mb-4 flex items-center gap-2">
                    <Brain className="w-4 h-4" /> Mental Indicators
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    <ResultBox label="Mood" value={results.mood_state} />
                    <ResultBox label="Stress" value={results.mental_stress_index?.toFixed(0)} unit="%" />
                    <ResultBox label="Fatigue" value={results.fatigue_probability?.toFixed(0)} unit="%" />
                    <ResultBox label="Alertness" value={results.alertness_level?.toFixed(0)} unit="%" />
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/30">
                  <p className="text-sm text-green-400 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" /> Data integrated to dashboard
                  </p>
                </div>
              </>
            ) : (
              <div className="glass-card p-12 text-center">
                <Eye className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-500">Click "Perform Scan" to analyze</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ===================== RESULT BOX COMPONENT =====================
function ResultBox({ label, value, unit }) {
  return (
    <div className="p-3 rounded-xl bg-white/5">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className="font-semibold text-white capitalize">{value || '--'} {unit && <span className="text-xs text-gray-400">{unit}</span>}</p>
    </div>
  );
}

// ===================== HEALTH TIMELINE =====================
function HealthTimeline({ data, astronautId }) {
  const [days, setDays] = useState(7);
  const [timeline, setTimeline] = useState(data?.timeline || []);

  useEffect(() => {
    const loadTimeline = async () => {
      try {
        const result = await api.getTimeline(astronautId, days);
        setTimeline(result.daily_averages || []);
      } catch (err) {
        console.error('Failed to load timeline:', err);
      }
    };
    loadTimeline();
  }, [astronautId, days]);

  return (
    <div className="space-y-6 fade-in" data-testid="health-timeline">
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Clock className="w-5 h-5 text-cyan-400" /> Health Timeline
          </h3>
          <div className="flex gap-2">
            {[7, 14, 30].map(d => (
              <button key={d} onClick={() => setDays(d)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${days === d ? 'bg-gradient-to-r from-cyan-500 to-purple-500 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}>
                {d} Days
              </button>
            ))}
          </div>
        </div>
        
        {timeline.length > 0 ? (
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={timeline}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 11 }} />
              <YAxis tick={{ fill: '#64748b', fontSize: 11 }} />
              <Tooltip contentStyle={{ background: 'rgba(15, 23, 42, 0.95)', border: '1px solid rgba(0, 240, 255, 0.2)', borderRadius: '12px' }} />
              <Line type="monotone" dataKey="avg_hr" name="Heart Rate" stroke="#ff6b6b" strokeWidth={2} dot={{ fill: '#ff6b6b', r: 4 }} />
              <Line type="monotone" dataKey="avg_hrv" name="HRV" stroke="#4ecdc4" strokeWidth={2} dot={{ fill: '#4ecdc4', r: 4 }} />
              <Line type="monotone" dataKey="avg_stress" name="Stress" stroke="#ffd93d" strokeWidth={2} dot={{ fill: '#ffd93d', r: 4 }} />
              <Line type="monotone" dataKey="avg_fatigue" name="Fatigue" stroke="#a855f7" strokeWidth={2} dot={{ fill: '#a855f7', r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[400px] flex items-center justify-center">
            <div className="text-center">
              <BarChart2 className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-500">No timeline data</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ===================== ASTRA SUPPORT (CHAT) =====================
function AstraSupport({ astronautId }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => {
    const loadHistory = async () => {
      try {
        const result = await api.getChatHistory(astronautId);
        setMessages(result.history || []);
      } catch (err) {
        console.error('Failed to load chat:', err);
      }
    };
    loadHistory();
  }, [astronautId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (text) => {
    if (!text.trim() || sending) return;
    
    const userMsg = text.trim();
    setInput('');
    setSending(true);
    
    setMessages(prev => [...prev, { id: Date.now(), user_message: userMsg, assistant_response: null, timestamp: new Date().toISOString() }]);
    
    try {
      const result = await api.sendChat({ astronaut_id: astronautId, message: userMsg });
      setMessages(prev => prev.map(m => m.assistant_response === null ? { ...m, assistant_response: result.response } : m));
    } catch (err) {
      setMessages(prev => prev.slice(0, -1));
    }
    
    setSending(false);
  };

  const quickPrompts = ['I feel stressed', 'Help me focus', 'Breathing exercise', 'Motivation boost', 'Sleep tips'];

  return (
    <div className="h-[calc(100vh-200px)] flex flex-col fade-in" data-testid="astra-support">
      <div className="glass-card flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-white/5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-green-400 to-cyan-400 flex items-center justify-center pulse-glow">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="font-semibold">ASTRA Support Companion</h3>
            <p className="text-xs text-gray-500">AI-powered psychological support</p>
          </div>
          <div className="ml-auto flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/10">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-xs text-green-400">Online</span>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {messages.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-purple-500/20 flex items-center justify-center mx-auto mb-4">
                <MessageCircle className="w-8 h-8 text-cyan-400" />
              </div>
              <h4 className="text-lg font-semibold mb-2">Welcome, Astronaut</h4>
              <p className="text-gray-400 max-w-md mx-auto">
                I'm ASTRA, your psychological support companion. I'm here to help with stress management, focus, and well-being during your mission.
              </p>
            </div>
          ) : (
            messages.map((msg, idx) => (
              <div key={msg.id || idx} className="space-y-3">
                <div className="flex justify-end">
                  <div className="chat-bubble chat-user">
                    <p>{msg.user_message}</p>
                  </div>
                </div>
                {msg.assistant_response ? (
                  <div className="flex justify-start">
                    <div className="chat-bubble chat-assistant">
                      <p>{msg.assistant_response}</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-start">
                    <div className="chat-bubble chat-assistant">
                      <div className="flex items-center gap-2">
                        <div className="spinner w-4 h-4" />
                        <span className="text-gray-400">Thinking...</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Quick Prompts */}
        <div className="px-5 py-3 border-t border-white/5 flex gap-2 overflow-x-auto">
          {quickPrompts.map((prompt, idx) => (
            <button key={idx} onClick={() => sendMessage(prompt)}
              className="px-4 py-2 rounded-full bg-white/5 text-xs text-gray-400 hover:bg-cyan-500/10 hover:text-cyan-400 whitespace-nowrap transition-colors">
              {prompt}
            </button>
          ))}
        </div>

        {/* Input */}
        <div className="p-5 border-t border-white/5 flex gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && sendMessage(input)}
            placeholder="Type your message..."
            className="input-modern flex-1"
            disabled={sending}
            data-testid="chat-input"
          />
          <button onClick={() => sendMessage(input)} disabled={!input.trim() || sending} className="btn-primary px-6" data-testid="send-message">
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ===================== ALERT SYSTEM =====================
function AlertSystem({ data, astronautId, onRefresh }) {
  const alerts = data?.alerts || [];
  const activeAlerts = alerts.filter(a => a.status === 'active');

  const handleAcknowledge = async (alertId, action) => {
    try {
      await api.acknowledgeAlert({ alert_id: alertId, astronaut_id: astronautId, action });
      onRefresh();
    } catch (err) {
      console.error('Failed to acknowledge:', err);
    }
  };

  return (
    <div className="space-y-6 fade-in" data-testid="alert-system">
      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
          <Bell className="w-5 h-5 text-cyan-400" /> Active Alerts ({activeAlerts.length})
        </h3>
        
        {activeAlerts.length > 0 ? (
          <div className="space-y-4">
            {activeAlerts.map(alert => (
              <div key={alert.id} className={`p-5 rounded-xl alert-level-${alert.level}`}>
                <div className="flex items-start gap-4">
                  <AlertTriangle className={`w-6 h-6 flex-shrink-0 ${alert.level === 3 ? 'text-red-400' : alert.level === 2 ? 'text-amber-400' : 'text-orange-400'}`} />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`text-sm font-semibold ${alert.level === 3 ? 'text-red-400' : alert.level === 2 ? 'text-amber-400' : 'text-orange-400'}`}>
                        Level {alert.level} Alert
                      </span>
                      <span className="text-xs text-gray-500">{new Date(alert.created_at).toLocaleString()}</span>
                    </div>
                    <p className="text-white mb-4">{alert.message}</p>
                    <div className="flex gap-2">
                      <button onClick={() => handleAcknowledge(alert.id, 'acknowledged')} className="px-4 py-2 rounded-lg bg-green-500/10 text-green-400 text-sm hover:bg-green-500/20">
                        Acknowledge
                      </button>
                      <button onClick={() => handleAcknowledge(alert.id, 'dismissed')} className="px-4 py-2 rounded-lg bg-gray-500/10 text-gray-400 text-sm hover:bg-gray-500/20">
                        Dismiss
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
            <h4 className="text-lg font-semibold text-green-400 mb-2">All Systems Nominal</h4>
            <p className="text-gray-500">No active alerts at this time</p>
          </div>
        )}
      </div>

      {/* Alert Levels Info */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { level: 1, name: 'Preventive', desc: 'Breathing exercises, grounding', color: 'orange' },
          { level: 2, name: 'Adaptive', desc: 'Rest cycles, workload moderation', color: 'amber' },
          { level: 3, name: 'Medical Review', desc: 'Flagged for authorized review', color: 'red' }
        ].map(item => (
          <div key={item.level} className={`glass-card p-4 border-l-4 border-${item.color}-500`}>
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-3 h-3 rounded-full bg-${item.color}-500`} />
              <span className={`font-semibold text-${item.color}-400`}>Level {item.level} - {item.name}</span>
            </div>
            <p className="text-xs text-gray-500">{item.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ===================== MISSION STATUS =====================
function MissionStatus({ data, astronautId, onRefresh }) {
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    mission_phase: data?.context?.mission_phase || 'transit',
    time_of_day: data?.context?.time_of_day || 'morning',
    work_cycle: data?.context?.work_cycle || 'active',
    days_since_launch: data?.context?.days_since_launch || 1,
    current_workload: data?.context?.current_workload || 'moderate'
  });

  const handleSave = async () => {
    try {
      await api.updateContext({ astronaut_id: astronautId, ...formData });
      setEditing(false);
      onRefresh();
    } catch (err) {
      console.error('Failed to update:', err);
    }
  };

  const context = data?.context;

  return (
    <div className="space-y-6 fade-in" data-testid="mission-status">
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Compass className="w-5 h-5 text-cyan-400" /> Mission Context
          </h3>
          <button onClick={() => setEditing(!editing)} className="btn-secondary text-sm">
            {editing ? 'Cancel' : 'Edit Context'}
          </button>
        </div>

        <div className="grid grid-cols-3 gap-6">
          {[
            { key: 'mission_phase', label: 'Mission Phase', icon: Rocket, options: ['transit', 'eva', 'recovery', 'high-load', 'rest'] },
            { key: 'time_of_day', label: 'Time of Day', icon: Sun, options: ['morning', 'afternoon', 'evening', 'night'] },
            { key: 'work_cycle', label: 'Work Cycle', icon: Activity, options: ['active', 'rest', 'sleep'] },
            { key: 'current_workload', label: 'Workload', icon: Target, options: ['low', 'moderate', 'high', 'critical'] },
          ].map(item => (
            <div key={item.key} className="space-y-2">
              <label className="block text-sm text-gray-400 flex items-center gap-2">
                <item.icon className="w-4 h-4" /> {item.label}
              </label>
              {editing ? (
                <select value={formData[item.key]} onChange={(e) => setFormData({ ...formData, [item.key]: e.target.value })} className="input-modern">
                  {item.options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              ) : (
                <div className="p-4 rounded-xl bg-white/5 flex items-center gap-2">
                  <item.icon className="w-5 h-5 text-cyan-400" />
                  <span className="text-white capitalize">{context?.[item.key] || formData[item.key]}</span>
                </div>
              )}
            </div>
          ))}
          
          <div className="space-y-2">
            <label className="block text-sm text-gray-400 flex items-center gap-2">
              <Clock className="w-4 h-4" /> Days Since Launch
            </label>
            {editing ? (
              <input type="number" value={formData.days_since_launch} onChange={(e) => setFormData({ ...formData, days_since_launch: parseInt(e.target.value) })} className="input-modern" min="1" />
            ) : (
              <div className="p-4 rounded-xl bg-white/5 flex items-center gap-2">
                <Clock className="w-5 h-5 text-cyan-400" />
                <span className="text-white">Day {context?.days_since_launch || formData.days_since_launch}</span>
              </div>
            )}
          </div>
        </div>

        {editing && (
          <div className="mt-6">
            <button onClick={handleSave} className="btn-primary" data-testid="save-context">Save Changes</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ===================== CREW OVERVIEW =====================
function CrewOverview() {
  const [astronauts, setAstronauts] = useState([]);
  const [crewData, setCrewData] = useState({});

  useEffect(() => {
    const loadCrew = async () => {
      try {
        const result = await api.getAstronauts();
        setAstronauts(result.astronauts || []);
        
        const data = {};
        for (const id of (result.astronauts || [])) {
          try {
            const summary = await api.getDashboardSummary(id);
            data[id] = summary;
          } catch { data[id] = null; }
        }
        setCrewData(data);
      } catch (err) {
        console.error('Failed to load crew:', err);
      }
    };
    loadCrew();
  }, []);

  return (
    <div className="space-y-6 fade-in" data-testid="crew-overview">
      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
          <Users className="w-5 h-5 text-cyan-400" /> Crew Health Overview
        </h3>
        <div className="grid grid-cols-3 gap-4">
          {astronauts.map(id => {
            const data = crewData[id];
            const health = data?.health;
            const status = !health ? 'unknown' : health.stress_level > 70 ? 'warning' : 'healthy';
            
            return (
              <div key={id} className="glass-card p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-400 to-purple-500 flex items-center justify-center">
                    <User className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h4 className="font-semibold">{id}</h4>
                    <span className={`text-xs ${status === 'healthy' ? 'text-green-400' : status === 'warning' ? 'text-yellow-400' : 'text-gray-500'}`}>
                      {status === 'healthy' ? 'Optimal' : status === 'warning' ? 'Attention Needed' : 'No Data'}
                    </span>
                  </div>
                </div>
                {health ? (
                  <div className="grid grid-cols-2 gap-2">
                    <MiniMetric label="HR" value={health.heart_rate?.toFixed(0)} unit="BPM" />
                    <MiniMetric label="HRV" value={health.hrv?.toFixed(0)} unit="ms" />
                    <MiniMetric label="Stress" value={health.stress_level?.toFixed(0)} unit="%" />
                    <MiniMetric label="Fatigue" value={health.fatigue_level?.toFixed(0)} unit="%" />
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 text-center py-4">No recent data</p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default App;
