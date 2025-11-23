
import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Scan, 
  History, 
  Siren,
  Menu,
  Shield,
  LogOut,
  Filter,
  Trash2,
  Download,
  AlertTriangle,
  Bot,
  TrendingUp,
  Activity,
  Clock,
  Calendar,
  ChevronRight,
  Zap,
  CheckCircle2,
  MapPin,
  Camera
} from 'lucide-react';
import { VehicleData, AIAnalysisResult, ScanSession, User } from './types';
import CameraCapture from './components/CameraCapture';
import AnalysisResult from './components/AnalysisResult';
import ChallanModal from './components/ChallanModal';
import LoginPage from './components/LoginPage';
import AIAssistant from './components/AIAssistant';
import Toast from './components/Toast';
import { extractLicensePlate, analyzeVehicleCompliance, analyzeVideoFootage } from './services/geminiService';
import { fetchVehicleDetails } from './services/mockDb';
import { exportToCSV } from './utils';
import { sendNotification } from './services/notificationService';

const App: React.FC = () => {
  // Auth State
  const [user, setUser] = useState<User | null>(() => {
    const savedUser = localStorage.getItem('traffic_guard_user');
    if (savedUser) {
      try { return JSON.parse(savedUser); } catch (e) { return null; }
    }
    return null;
  });

  // App State
  const [activeTab, setActiveTab] = useState<'dashboard' | 'scan' | 'history' | 'assistant'>('dashboard');
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [showChallanModal, setShowChallanModal] = useState(false);
  const [showClearModal, setShowClearModal] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // Notification State
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // State for Scanning Process
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentScan, setCurrentScan] = useState<{
    image: string; // or first frame of video
    plate: string | null;
    vehicle: VehicleData | null;
    analysis: AIAnalysisResult | null;
    type: 'image' | 'video';
  } | null>(null);

  // History State
  const [scanHistory, setScanHistory] = useState<ScanSession[]>(() => {
    const savedHistory = localStorage.getItem('traffic_guard_history');
    if (savedHistory) {
      try { return JSON.parse(savedHistory); } catch (e) { return []; }
    }
    return [];
  });
  
  const [historyFilter, setHistoryFilter] = useState<string>('All');

  // Persistence & Permissions
  useEffect(() => {
    try {
      if (user) localStorage.setItem('traffic_guard_user', JSON.stringify(user));
      else localStorage.removeItem('traffic_guard_user');
    } catch (error) { console.error(error); }
  }, [user]);

  useEffect(() => {
    try {
      localStorage.setItem('traffic_guard_history', JSON.stringify(scanHistory));
    } catch (error) {
       // Quota handler
    }
  }, [scanHistory]);

  useEffect(() => {
    if ("Notification" in window) {
      Notification.requestPermission();
    }
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleLogin = (userData: User) => setUser(userData);
  const handleLogout = () => setUser(null);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
  };

  const handleClearHistoryRequest = () => setShowClearModal(true);
  const confirmClearHistory = () => {
    setScanHistory([]);
    localStorage.removeItem('traffic_guard_history');
    setShowClearModal(false);
    showToast("History cleared successfully", "success");
  };

  // Main Logic for Image/Video Capture
  const handleCapture = async (data: string | string[], type: 'image' | 'video') => {
    setIsProcessing(true);
    // Reset current scan view
    setCurrentScan(null);

    try {
      let plate: string | null = null;
      let vehicle: VehicleData | null = null;
      let analysis: AIAnalysisResult | null = null;
      let displayImage = '';

      if (type === 'image') {
        const imageSrc = data as string;
        displayImage = imageSrc;
        
        // 1. Fast ALPR
        plate = await extractLicensePlate(imageSrc);
        
        if (plate && plate !== 'UNKNOWN') {
           vehicle = await fetchVehicleDetails(plate);
           if (vehicle) {
             analysis = await analyzeVehicleCompliance(vehicle);
           }
        } else {
           // Fallback to manual? Or unknown vehicle
           plate = 'UNKNOWN';
           vehicle = await fetchVehicleDetails('UNKNOWN'); // Mock generic
           if(vehicle) analysis = await analyzeVehicleCompliance(vehicle);
        }
      } else {
        // VIDEO MODE
        const frames = data as string[];
        displayImage = frames[0]; // Thumbnail
        
        // Analyze Video with Gemini 3 Pro
        analysis = await analyzeVideoFootage(frames);
        
        // Try to guess vehicle data from analysis if possible, or leave as Unknown
        plate = 'DETECTED_IN_VIDEO';
        vehicle = {
           plateNumber: 'VIDEO_EVIDENCE',
           model: 'Identified in Video',
           type: 'Four Wheeler',
           owner: { name: 'Unknown', email: '', phone: '', address: '' },
           documents: { rcStatus: 'Active', rcExpiry: '', insuranceStatus: 'Active', insuranceExpiry: '', pucStatus: 'Active', pucExpiry: '' },
           isStolen: false
        };
      }

      if (vehicle && analysis) {
        // Critical Alert Logic
        const criticalViolations = analysis.violations.filter(v => v.severity === 'Critical');
        if (criticalViolations.length > 0) {
          const alertMsg = `CRITICAL ALERT: ${criticalViolations[0].rule}`;
          showToast(alertMsg, 'error');
          
          if (Notification.permission === 'granted') {
             new Notification("🚨 CRITICAL VEHICLE ALERT", {
               body: `Vehicle ${vehicle.plateNumber} flagged: ${criticalViolations[0].rule}`,
               icon: 'https://cdn-icons-png.flaticon.com/512/595/595067.png',
               requireInteraction: true,
               silent: false
             });
          }
        }

        const newSession: ScanSession = {
          id: Math.random().toString(36).substr(2, 9),
          type: type,
          timestamp: new Date().toISOString(),
          imageUrl: displayImage,
          plateNumber: plate,
          vehicleData: vehicle,
          analysis: analysis,
          // 'scanned' means found violations/issues, 'verified' means clean
          status: analysis.violations.length > 0 ? 'scanned' : 'verified'
        };

        setCurrentScan({ image: displayImage, plate, vehicle, analysis, type });
        setScanHistory(prev => [newSession, ...prev]);
        setActiveTab('scan');
      }

    } catch (error) {
      console.error("Workflow Error", error);
      showToast("Scan failed. Please try again.", "error");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSendChallan = async () => {
    if (!currentScan?.vehicle) return;

    try {
      await sendNotification(currentScan.vehicle.owner, {
        type: 'CHALLAN',
        plateNumber: currentScan.vehicle.plateNumber,
        amount: currentScan.analysis?.totalFine,
        violations: currentScan.analysis?.violations.map(v => v.rule)
      });

      if (currentScan) {
        setScanHistory(prev => prev.map(item => 
          (item.imageUrl === currentScan.image) ? { ...item, status: 'challan_generated' as const } : item
        ));
      }
      
      showToast(`E-Challan sent to ${currentScan.vehicle.owner.name}`, "success");

      setTimeout(() => {
          setShowChallanModal(false);
          setActiveTab('history');
          setCurrentScan(null);
      }, 1000);
    } catch (error) {
      showToast("Failed to send Challan. Network Error.", "error");
    }
  };

  const handleIssueWarning = async () => {
    if (!currentScan?.vehicle) return;
    
    // Optimistic UI update
    showToast("Sending warning notification...", "success");
    
    await sendNotification(currentScan.vehicle.owner, {
      type: 'WARNING',
      plateNumber: currentScan.vehicle.plateNumber,
      violations: currentScan.analysis?.violations.map(v => v.rule)
    });

    setScanHistory(prev => prev.map(item => 
        (item.imageUrl === currentScan.image) ? { ...item, status: 'verified' as const } : item
    ));
    
    showToast(`Warning sent to ${currentScan.vehicle.owner.name}`, "success");
    setActiveTab('history');
    setCurrentScan(null);
  };

  const SidebarItem = ({ id, icon: Icon, label }: { id: typeof activeTab, icon: any, label: string }) => (
    <button
      onClick={() => { setActiveTab(id); setSidebarOpen(false); }}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all mb-1 ${
        activeTab === id 
          ? 'bg-police-600 text-white shadow-lg shadow-police-900/20 font-semibold' 
          : 'text-gray-400 hover:bg-gray-800 hover:text-white'
      }`}
    >
      <Icon className="w-5 h-5" />
      <span>{label}</span>
      {activeTab === id && <ChevronRight className="w-4 h-4 ml-auto" />}
    </button>
  );

  // Helper for dashboard stats
  const totalFines = scanHistory.reduce((acc, curr) => acc + (curr.analysis?.totalFine || 0), 0);
  const totalViolations = scanHistory.filter(s => s.analysis?.violations.length).length;

  if (!user) return <LoginPage onLogin={handleLogin} />;

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden font-sans">
      {/* Toast Container */}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Mobile Overlay */}
      {isSidebarOpen && <div className="fixed inset-0 bg-black/50 z-20 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-30 w-72 bg-gray-900 text-white transform transition-transform duration-300 lg:relative lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} shadow-2xl`}>
        <div className="p-6 flex items-center gap-3 bg-gray-950/50">
          <div className="w-12 h-12 bg-gradient-to-br from-police-500 to-police-700 rounded-xl flex items-center justify-center shadow-lg shadow-police-500/20">
            <Siren className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-xl tracking-tight">TrafficGuard AI</h1>
            <p className="text-xs text-gray-400 font-medium">Enforcement System</p>
          </div>
        </div>
        
        <nav className="p-4 mt-4">
          <p className="px-4 text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Main Menu</p>
          <SidebarItem id="dashboard" icon={LayoutDashboard} label="Command Center" />
          <SidebarItem id="scan" icon={Scan} label="Scan Vehicle" />
          <SidebarItem id="assistant" icon={Bot} label="AI Consultant" />
          <SidebarItem id="history" icon={History} label="Logs & Records" />
        </nav>

        <div className="absolute bottom-0 w-full p-4 bg-gray-950/30 backdrop-blur-sm border-t border-gray-800">
           <div className="flex items-center gap-3 mb-4 px-2">
             <div className="w-10 h-10 rounded-full bg-police-800 flex items-center justify-center border border-police-700">
                <Shield className="w-5 h-5 text-police-400" />
             </div>
             <div className="overflow-hidden">
               <p className="font-bold text-sm truncate">{user.name}</p>
               <p className="text-xs text-police-400">{user.badgeNumber}</p>
             </div>
           </div>
           <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-red-400 bg-red-950/30 hover:bg-red-900/50 rounded-lg transition-colors border border-red-900/50">
             <LogOut className="w-4 h-4" /> Sign Out
           </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative bg-slate-50">
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 lg:px-8 shadow-sm z-10">
          <div className="flex items-center gap-4">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 text-gray-600 hover:bg-gray-100 rounded-lg"><Menu className="w-6 h-6" /></button>
            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              {activeTab === 'dashboard' ? (
                <>
                  <LayoutDashboard className="w-5 h-5 text-police-600" /> Dashboard
                </>
              ) : activeTab === 'scan' ? (
                <>
                  <Scan className="w-5 h-5 text-police-600" /> Live Scanner
                </>
              ) : activeTab === 'assistant' ? (
                <>
                  <Bot className="w-5 h-5 text-purple-600" /> AI Assistant
                </>
              ) : (
                <>
                  <History className="w-5 h-5 text-police-600" /> Enforcement Logs
                </>
              )}
            </h2>
          </div>
          <div className="flex items-center gap-4">
             <div className="hidden md:flex flex-col items-end mr-2">
               <span className="text-sm font-bold text-gray-800 flex items-center gap-1">
                 <Clock className="w-3 h-3 text-gray-500" />
                 {currentTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
               </span>
               <span className="text-xs text-gray-500 flex items-center gap-1">
                 <Calendar className="w-3 h-3" />
                 {currentTime.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })}
               </span>
             </div>
             <div className="h-8 w-[1px] bg-gray-200 hidden md:block"></div>
             <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 text-green-700 rounded-full border border-green-200 text-xs font-bold">
               <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
               System Online
             </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 lg:p-8">
          {activeTab === 'dashboard' && (
            <div className="space-y-8 animate-in fade-in duration-500">
               {/* Welcome Banner */}
               <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-police-900 to-police-700 text-white p-8 shadow-xl">
                  <div className="absolute top-0 right-0 p-4 opacity-10">
                    <Siren className="w-64 h-64 transform rotate-12 translate-x-10 -translate-y-10" />
                  </div>
                  <div className="relative z-10">
                    <h1 className="text-3xl font-bold mb-2">Welcome back, Officer {user.name.split(' ')[0]}</h1>
                    <p className="text-police-100 max-w-xl text-lg">
                      TrafficGuard AI is active and monitoring. You have processed <span className="font-bold text-white">{scanHistory.length} vehicles</span> today.
                    </p>
                  </div>
               </div>

               {/* Stats Grid */}
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                 <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                   <div className="flex justify-between items-start mb-4">
                     <div className="p-3 bg-blue-50 rounded-lg text-blue-600">
                       <Scan className="w-6 h-6" />
                     </div>
                     <span className="text-xs font-medium text-green-600 flex items-center gap-1 bg-green-50 px-2 py-1 rounded">
                       <TrendingUp className="w-3 h-3" /> +12%
                     </span>
                   </div>
                   <p className="text-gray-500 text-sm font-medium">Total Scans</p>
                   <p className="text-3xl font-bold text-gray-900">{scanHistory.length}</p>
                 </div>

                 <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                   <div className="flex justify-between items-start mb-4">
                     <div className="p-3 bg-red-50 rounded-lg text-red-600">
                       <AlertTriangle className="w-6 h-6" />
                     </div>
                     <span className="text-xs font-medium text-red-600 flex items-center gap-1 bg-red-50 px-2 py-1 rounded">
                       Action Req.
                     </span>
                   </div>
                   <p className="text-gray-500 text-sm font-medium">Violations Detected</p>
                   <p className="text-3xl font-bold text-gray-900">{totalViolations}</p>
                 </div>

                 <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                   <div className="flex justify-between items-start mb-4">
                     <div className="p-3 bg-green-50 rounded-lg text-green-600">
                       <Shield className="w-6 h-6" />
                     </div>
                     <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded">Today</span>
                   </div>
                   <p className="text-gray-500 text-sm font-medium">Compliance Rate</p>
                   <p className="text-3xl font-bold text-gray-900">
                     {scanHistory.length > 0 ? Math.round(((scanHistory.length - totalViolations) / scanHistory.length) * 100) : 100}%
                   </p>
                 </div>

                 <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                   <div className="flex justify-between items-start mb-4">
                     <div className="p-3 bg-orange-50 rounded-lg text-orange-600">
                       <Zap className="w-6 h-6" />
                     </div>
                     <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded">Estimated</span>
                   </div>
                   <p className="text-gray-500 text-sm font-medium">Revenue Impact</p>
                   <p className="text-3xl font-bold text-gray-900">₹{totalFines.toLocaleString()}</p>
                 </div>
               </div>

               <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                 {/* Main Actions Column */}
                 <div className="lg:col-span-2 space-y-8">
                   <div>
                     <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                       <Activity className="w-5 h-5 text-police-600" /> Quick Actions
                     </h3>
                     <div className="grid md:grid-cols-2 gap-4">
                        <button 
                          onClick={() => setActiveTab('scan')}
                          className="group relative overflow-hidden bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:border-police-500 hover:shadow-md transition-all text-left"
                        >
                          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                            <Scan className="w-24 h-24 text-police-600" />
                          </div>
                          <div className="relative z-10">
                            <div className="w-12 h-12 bg-police-100 rounded-lg flex items-center justify-center mb-4 text-police-600 group-hover:bg-police-600 group-hover:text-white transition-colors">
                              <Scan className="w-6 h-6" />
                            </div>
                            <h4 className="text-lg font-bold text-gray-900 mb-1">Start Patrol Scan</h4>
                            <p className="text-sm text-gray-500">Scan license plates or traffic videos to detect violations instantly.</p>
                          </div>
                        </button>

                        <button 
                          onClick={() => setActiveTab('assistant')}
                          className="group relative overflow-hidden bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:border-purple-500 hover:shadow-md transition-all text-left"
                        >
                          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                            <Bot className="w-24 h-24 text-purple-600" />
                          </div>
                          <div className="relative z-10">
                            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4 text-purple-600 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                              <Bot className="w-6 h-6" />
                            </div>
                            <h4 className="text-lg font-bold text-gray-900 mb-1">Consult AI Assistant</h4>
                            <p className="text-sm text-gray-500">Get legal advice, find RTO services, or analyze complex situations.</p>
                          </div>
                        </button>
                     </div>
                   </div>

                   {/* Recent Activity List */}
                   <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                     <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                       <h3 className="font-bold text-gray-800">Recent Activity</h3>
                       <button onClick={() => setActiveTab('history')} className="text-sm text-police-600 font-medium hover:underline flex items-center gap-1">
                         View All <ChevronRight className="w-4 h-4" />
                       </button>
                     </div>
                     <div className="divide-y divide-gray-100">
                       {scanHistory.length === 0 ? (
                         <div className="p-8 text-center text-gray-500">No activity recorded today. Start a scan to see data here.</div>
                       ) : (
                         scanHistory.slice(0, 5).map((scan) => (
                           <div key={scan.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                             <div className="flex items-center gap-4">
                               <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                 scan.status === 'challan_generated' ? 'bg-red-100 text-red-600' : 
                                 scan.status === 'scanned' ? 'bg-orange-100 text-orange-600' :
                                 'bg-green-100 text-green-600'
                               }`}>
                                 {scan.type === 'video' ? <Scan className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
                               </div>
                               <div>
                                 <p className="font-bold text-gray-900 text-sm">{scan.plateNumber || 'Unknown'}</p>
                                 <p className="text-xs text-gray-500">{new Date(scan.timestamp).toLocaleTimeString()}</p>
                               </div>
                             </div>
                             <div className="text-right">
                               <p className="text-sm font-bold text-gray-900">₹{scan.analysis?.totalFine}</p>
                               <p className={`text-xs font-bold ${
                                 scan.status === 'challan_generated' ? 'text-red-600' : 
                                 scan.status === 'scanned' ? 'text-orange-600' :
                                 'text-green-600'
                               }`}>
                                 {scan.status === 'challan_generated' ? 'Challan Sent' : 
                                  scan.status === 'scanned' ? 'Flagged' : 'Verified'}
                               </p>
                             </div>
                           </div>
                         ))
                       )}
                     </div>
                   </div>
                 </div>

                 {/* System Health / Right Sidebar */}
                 <div className="space-y-6">
                   <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                     <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                       <Shield className="w-5 h-5 text-green-600" /> System Status
                     </h3>
                     <div className="space-y-4">
                       <div className="flex justify-between items-center">
                         <span className="text-sm text-gray-600">Gemini AI Vision</span>
                         <span className="flex items-center gap-1 text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-full">
                           <CheckCircle2 className="w-3 h-3" /> Operational
                         </span>
                       </div>
                       <div className="flex justify-between items-center">
                         <span className="text-sm text-gray-600">RTO Database</span>
                         <span className="flex items-center gap-1 text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-full">
                           <CheckCircle2 className="w-3 h-3" /> Connected
                         </span>
                       </div>
                       <div className="flex justify-between items-center">
                         <span className="text-sm text-gray-600">Geolocation</span>
                         <span className="flex items-center gap-1 text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-full">
                           <MapPin className="w-3 h-3" /> Active
                         </span>
                       </div>
                       <div className="flex justify-between items-center">
                         <span className="text-sm text-gray-600">Notification Svc</span>
                         <span className="flex items-center gap-1 text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-full">
                           <CheckCircle2 className="w-3 h-3" /> Ready
                         </span>
                       </div>
                     </div>
                     <div className="mt-6 pt-4 border-t border-gray-100">
                        <div className="bg-blue-50 p-4 rounded-lg">
                           <p className="text-xs font-bold text-blue-800 mb-1">Tip of the Day</p>
                           <p className="text-xs text-blue-600 leading-relaxed">
                             Use the "AI Consultant" to verify non-standard license plates or international driving permits effectively.
                           </p>
                        </div>
                     </div>
                   </div>
                 </div>
               </div>
            </div>
          )}

          {activeTab === 'scan' && (
            <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4">
              {!currentScan?.vehicle && (
                <CameraCapture onCapture={handleCapture} isProcessing={isProcessing} />
              )}
              {currentScan?.vehicle && currentScan.analysis && (
                <div>
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-gray-800">
                        {currentScan.type === 'video' ? 'Video Analysis Report' : 'Verification Report'}
                    </h2>
                    <button onClick={() => setCurrentScan(null)} className="text-police-600 hover:underline text-sm font-medium">Scan Another</button>
                  </div>
                  <AnalysisResult 
                    vehicle={currentScan.vehicle} 
                    analysis={currentScan.analysis} 
                    onGenerateChallan={() => setShowChallanModal(true)}
                    onIssueWarning={handleIssueWarning}
                  />
                </div>
              )}
            </div>
          )}

          {activeTab === 'assistant' && (
             <div className="max-w-4xl mx-auto h-full animate-in fade-in duration-300">
               <AIAssistant />
             </div>
          )}

          {activeTab === 'history' && (
            <div className="space-y-4 animate-in fade-in duration-300">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-gray-800">Enforcement Logs</h3>
                <div className="flex gap-2">
                   <select 
                      value={historyFilter} onChange={(e) => setHistoryFilter(e.target.value)}
                      className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-police-500 focus:border-police-500 outline-none"
                   >
                     <option value="All">All Vehicle Types</option>
                     <option value="Two Wheeler">Two Wheeler</option>
                     <option value="Four Wheeler">Four Wheeler</option>
                   </select>
                   <button onClick={() => exportToCSV(scanHistory.filter(s => historyFilter === 'All' || s.vehicleData?.type === historyFilter))} className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 transition"><Download className="w-5 h-5" /></button>
                   <button onClick={handleClearHistoryRequest} className="p-2 border border-red-200 rounded-lg text-red-600 hover:bg-red-50 transition"><Trash2 className="w-5 h-5" /></button>
                </div>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-4 font-semibold text-gray-700">Time</th>
                      <th className="px-6 py-4 font-semibold text-gray-700">Type</th>
                      <th className="px-6 py-4 font-semibold text-gray-700">Plate / ID</th>
                      <th className="px-6 py-4 font-semibold text-gray-700">Status</th>
                      <th className="px-6 py-4 font-semibold text-gray-700">Fine</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {scanHistory.filter(s => historyFilter === 'All' || s.vehicleData?.type === historyFilter).map(scan => (
                      <tr key={scan.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 text-gray-600">{new Date(scan.timestamp).toLocaleTimeString()}</td>
                        <td className="px-6 py-4 capitalize text-gray-800 font-medium flex items-center gap-2">
                           {scan.type === 'video' ? <Scan className="w-4 h-4 text-blue-500" /> : <Camera className="w-4 h-4 text-gray-400" />}
                           {scan.type}
                        </td>
                        <td className="px-6 py-4 font-mono font-bold text-gray-900">{scan.plateNumber || 'N/A'}</td>
                        <td className="px-6 py-4">
                           <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${
                             scan.status === 'challan_generated' ? 'bg-red-50 text-red-700 border-red-200' : 
                             scan.status === 'scanned' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                             'bg-green-50 text-green-700 border-green-200'
                           }`}>
                             {scan.status === 'challan_generated' ? 'CHALLAN SENT' : 
                              scan.status === 'scanned' ? 'FLAGGED' : 'VERIFIED'}
                           </span>
                        </td>
                        <td className="px-6 py-4 font-bold text-gray-900">₹{scan.analysis?.totalFine || 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {scanHistory.length === 0 && (
                  <div className="p-12 text-center text-gray-400">
                    <History className="w-12 h-12 mx-auto mb-3 opacity-20" />
                    <p>No records found in this session.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Modals */}
      {showChallanModal && currentScan?.vehicle && currentScan.analysis && (
        <ChallanModal 
          vehicle={currentScan.vehicle}
          analysis={currentScan.analysis}
          onClose={() => setShowChallanModal(false)}
          onSend={handleSendChallan}
        />
      )}
      {showClearModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
           <div className="bg-white p-6 rounded-xl shadow-2xl max-w-sm text-center transform scale-100 animate-in fade-in zoom-in-95 duration-200">
             <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-8 h-8 text-red-600" />
             </div>
             <h3 className="font-bold text-xl text-gray-900">Clear History?</h3>
             <p className="text-gray-500 mt-2 text-sm">This will permanently delete all local scan records. This action cannot be undone.</p>
             <div className="flex gap-3 mt-6">
               <button onClick={() => setShowClearModal(false)} className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors">Cancel</button>
               <button onClick={confirmClearHistory} className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold shadow-lg shadow-red-500/30 transition-all">Clear Data</button>
             </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default App;
