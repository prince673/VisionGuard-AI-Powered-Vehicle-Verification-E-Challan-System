
import React, { useState } from 'react';
import { VehicleData, AIAnalysisResult } from '../types';
import { X, Check, Mail, Smartphone, Download, Loader2 } from 'lucide-react';

interface ChallanModalProps {
  vehicle: VehicleData;
  analysis: AIAnalysisResult;
  onClose: () => void;
  onSend: () => Promise<void>;
}

const ChallanModal: React.FC<ChallanModalProps> = ({ vehicle, analysis, onClose, onSend }) => {
  const [isSending, setIsSending] = useState(false);
  const [isSent, setIsSent] = useState(false);
  
  const handleSend = async () => {
    setIsSending(true);
    await onSend();
    setIsSending(false);
    setIsSent(true);
  };

  const challanId = `CH-${Math.floor(Math.random() * 1000000)}`;
  const date = new Date().toLocaleDateString();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-lg rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-police-900 text-white p-4 flex justify-between items-center">
          <h2 className="text-lg font-bold flex items-center gap-2">
             E-Challan Generated
          </h2>
          <button onClick={onClose} disabled={isSending} className="hover:bg-white/20 p-1 rounded transition disabled:opacity-50">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content (Scrollable) */}
        <div className="p-6 overflow-y-auto bg-gray-50 flex-1">
          <div className="bg-white border border-gray-200 p-6 shadow-sm mb-4">
            <div className="text-center border-b border-gray-200 pb-4 mb-4">
              <h1 className="text-2xl font-bold text-gray-800">TRAFFIC POLICE DEPARTMENT</h1>
              <p className="text-sm text-gray-500">Notice of Violation</p>
            </div>

            <div className="flex justify-between mb-4 text-sm">
              <div>
                <p className="text-gray-500">Challan No:</p>
                <p className="font-bold">{challanId}</p>
              </div>
              <div className="text-right">
                <p className="text-gray-500">Date:</p>
                <p className="font-bold">{date}</p>
              </div>
            </div>

            <div className="bg-gray-50 p-3 rounded mb-4 text-sm">
              <p><span className="font-bold">Vehicle No:</span> {vehicle.plateNumber}</p>
              <p><span className="font-bold">Owner Name:</span> {vehicle.owner.name}</p>
              <p><span className="font-bold">Violations:</span></p>
              <ul className="list-disc ml-5 mt-1 space-y-1">
                {analysis.violations.map((v, i) => (
                  <li key={i}>{v.rule} - ₹{v.fineAmount}</li>
                ))}
              </ul>
            </div>

            <div className="flex justify-between items-center border-t border-gray-200 pt-4">
              <span className="text-lg font-bold text-gray-800">Total Payable</span>
              <span className="text-2xl font-bold text-red-600">₹{analysis.totalFine}</span>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-white border-t border-gray-100 flex flex-col gap-3">
          {isSent ? (
            <div className="w-full bg-green-100 text-green-800 py-3 rounded-lg flex items-center justify-center gap-2 font-bold animate-pulse">
              <Check className="w-5 h-5" />
              Sent Successfully!
            </div>
          ) : (
            <>
              <div className="flex gap-3">
                <button disabled={isSending} className="flex-1 py-2 px-4 border border-gray-300 rounded-lg flex items-center justify-center gap-2 hover:bg-gray-50 disabled:opacity-50">
                  <Download className="w-4 h-4" /> PDF
                </button>
                <button onClick={handleSend} disabled={isSending} className="flex-1 py-2 px-4 bg-police-600 text-white rounded-lg flex items-center justify-center gap-2 hover:bg-police-700 font-bold disabled:opacity-70">
                  {isSending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Sending...
                    </>
                  ) : (
                    <>
                      <Mail className="w-4 h-4" /> Send to Owner
                    </>
                  )}
                </button>
              </div>
              <p className="text-xs text-center text-gray-400">
                Will be sent to {vehicle.owner.email} and {vehicle.owner.phone}
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChallanModal;
