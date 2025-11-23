
import React, { useEffect } from 'react';
import { CheckCircle, AlertCircle, X } from 'lucide-react';

interface ToastProps {
  message: string;
  type: 'success' | 'error';
  onClose: () => void;
}

const Toast: React.FC<ToastProps> = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-lg shadow-xl border animate-in slide-in-from-right-10 fade-in duration-300 ${
      type === 'success' 
        ? 'bg-white border-green-500 text-gray-800' 
        : 'bg-white border-red-500 text-gray-800'
    }`}>
      <div className={`p-1 rounded-full ${type === 'success' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
        {type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
      </div>
      <div>
        <h4 className={`text-sm font-bold ${type === 'success' ? 'text-green-800' : 'text-red-800'}`}>
          {type === 'success' ? 'Success' : 'Error'}
        </h4>
        <p className="text-sm text-gray-600">{message}</p>
      </div>
      <button onClick={onClose} className="text-gray-400 hover:text-gray-600 ml-2">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

export default Toast;
