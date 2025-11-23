
import React, { useState, useEffect } from 'react';
import { Siren, ShieldCheck, Lock, ArrowRight, AlertTriangle, UserX, Clock } from 'lucide-react';
import { User } from '../types';
import { isDisposableEmail } from '../services/securityService';

interface LoginPageProps {
  onLogin: (user: User) => void;
}

const MAX_ATTEMPTS = 3;
const LOCKOUT_TIME = 30000; // 30 seconds for demo

const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Availability & Security State
  const [attempts, setAttempts] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [lockoutTimer, setLockoutTimer] = useState(0);

  // Handle Lockout Timer
  useEffect(() => {
    let interval: any;
    if (isLocked && lockoutTimer > 0) {
      interval = setInterval(() => {
        setLockoutTimer((prev) => prev - 1);
      }, 1000);
    } else if (lockoutTimer === 0 && isLocked) {
      setIsLocked(false);
      setAttempts(0);
      setError('');
    }
    return () => clearInterval(interval);
  }, [isLocked, lockoutTimer]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    
    // 1. Availability Check (Brute Force Protection)
    if (isLocked) {
      return;
    }

    setError('');
    setLoading(true);

    // 2. Integrity Check (Input Validation)
    // Block Temporary/Disposable Emails
    if (isDisposableEmail(email)) {
      setLoading(false);
      setError('Security Alert: Temporary or disposable email addresses are not permitted. Please use an official organizational email.');
      return;
    }

    // Simulate API Call for Authentication
    setTimeout(() => {
      // 3. Confidentiality Check (Authentication)
      // Mock Credentials
      if (email === 'officer@trafficguard.in' && password === 'traffic123') {
        const user: User = {
          id: 'POL-8821',
          name: 'Vikram Malhotra',
          badgeNumber: 'MH-POL-8821',
          email: email,
          role: 'Officer'
        };
        onLogin(user);
      } else if (email === 'prince@gmail.com' && password === 'y.ellow') {
        // ADMIN ACCESS FOR PROTOTYPE
        const user: User = {
          id: 'ADM-001',
          name: 'Prince (Admin)',
          badgeNumber: 'SYS-ADMIN',
          email: email,
          role: 'Admin'
        };
        onLogin(user);
      } else {
        // Failed Attempt Logic
        const newAttempts = attempts + 1;
        setAttempts(newAttempts);
        setLoading(false);

        if (newAttempts >= MAX_ATTEMPTS) {
          setIsLocked(true);
          setLockoutTimer(LOCKOUT_TIME / 1000);
          setError(`Security Lockout: Too many failed attempts. System unavailable for ${LOCKOUT_TIME / 1000}s.`);
        } else {
          // Generic error message to protect User Enumeration (Confidentiality)
          setError(`Invalid credentials. Access denied. (${MAX_ATTEMPTS - newAttempts} attempts remaining)`);
        }
      }
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl overflow-hidden">
        <div className="bg-police-900 p-8 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-police-600 opacity-20 pattern-grid-lg"></div>
          <div className="relative z-10 flex flex-col items-center">
            <div className="w-16 h-16 bg-white rounded-xl flex items-center justify-center mb-4 shadow-lg">
              <Siren className="w-8 h-8 text-police-600" />
            </div>
            <h1 className="text-3xl font-bold text-white tracking-tight">TrafficGuard AI</h1>
            <p className="text-police-100 mt-2 text-sm">Official Traffic Enforcement System</p>
          </div>
        </div>

        <div className="p-8">
          {isLocked ? (
            <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center animate-pulse">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Clock className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-lg font-bold text-red-800 mb-2">System Locked</h3>
              <p className="text-sm text-gray-600 mb-4">
                To protect system availability against brute force attacks, login is temporarily disabled.
              </p>
              <div className="text-2xl font-mono font-bold text-red-600">
                00:{lockoutTimer.toString().padStart(2, '0')}
              </div>
            </div>
          ) : (
            <form onSubmit={handleLogin} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Badge ID / Email</label>
                <div className="relative">
                  <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-police-500 focus:border-police-500 outline-none transition"
                    placeholder="officer@trafficguard.in"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Secure Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-police-500 focus:border-police-500 outline-none transition"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              {error && (
                <div className={`p-3 text-sm rounded-lg flex items-start gap-2 ${error.includes('Security') ? 'bg-orange-50 text-orange-800' : 'bg-red-50 text-red-600'}`}>
                  {error.includes('Security') ? <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" /> : <UserX className="w-4 h-4 mt-0.5 shrink-0" />}
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-police-600 text-white py-3 px-4 rounded-lg font-bold hover:bg-police-700 transition flex items-center justify-center gap-2 disabled:opacity-70"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Verifying Credentials...
                  </>
                ) : (
                  <>
                    Secure Login <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </form>
          )}

          <div className="mt-6 text-center space-y-2">
            <p className="text-xs text-gray-400 border-t pt-4">
              Restricted Access. Unauthorized use is a punishable offense under Cyber Security Act.
            </p>
            <div className="flex justify-center gap-4 text-[10px] text-gray-300 uppercase tracking-widest">
              <span>Confidentiality</span> • <span>Integrity</span> • <span>Availability</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
