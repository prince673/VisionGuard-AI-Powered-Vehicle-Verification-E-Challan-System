
import React from 'react';
import { VehicleData, AIAnalysisResult } from '../types';
import { ShieldAlert, CheckCircle, FileWarning, BadgeAlert, Printer, Mail, MessageSquareWarning } from 'lucide-react';
import { getSeverityColor } from '../utils';

interface AnalysisResultProps {
  vehicle: VehicleData;
  analysis: AIAnalysisResult;
  onGenerateChallan: () => void;
  onIssueWarning: () => void;
}

const AnalysisResult: React.FC<AnalysisResultProps> = ({ vehicle, analysis, onGenerateChallan, onIssueWarning }) => {
  const isHighRisk = analysis.riskScore > 50;

  return (
    <div className="flex flex-col gap-6">
      {/* Risk Score Header */}
      <div className={`rounded-xl p-6 text-white shadow-lg ${isHighRisk ? 'bg-gradient-to-r from-red-600 to-red-800' : 'bg-gradient-to-r from-green-600 to-green-800'}`}>
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-lg font-medium opacity-90">Risk Assessment</h3>
            <p className="text-3xl font-bold mt-1">{analysis.riskScore}/100</p>
            <p className="mt-2 text-sm opacity-90">{analysis.summary}</p>
          </div>
          <div className="bg-white/20 p-3 rounded-full">
            {isHighRisk ? <ShieldAlert className="w-8 h-8" /> : <CheckCircle className="w-8 h-8" />}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Vehicle Details Card */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Vehicle Information</h3>
          <div className="space-y-3">
            <div className="flex justify-between border-b pb-2">
              <span className="text-gray-500">Plate Number</span>
              <span className="font-mono font-bold text-lg text-gray-900">{vehicle.plateNumber}</span>
            </div>
            <div className="flex justify-between border-b pb-2">
              <span className="text-gray-500">Owner</span>
              <span className="font-medium text-gray-900">{vehicle.owner.name}</span>
            </div>
            <div className="flex justify-between border-b pb-2">
              <span className="text-gray-500">Model</span>
              <span className="font-medium text-gray-900">{vehicle.model}</span>
            </div>
            <div className="flex justify-between pt-2">
              <span className="text-gray-500">Stolen Status</span>
              {vehicle.isStolen ? (
                <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-bold rounded">THEFT REPORTED</span>
              ) : (
                <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-bold rounded">CLEAN</span>
              )}
            </div>
          </div>
        </div>

        {/* Document Status Card */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Document Status</h3>
          <div className="space-y-4">
            <StatusRow label="RC Validity" status={vehicle.documents.rcStatus} date={vehicle.documents.rcExpiry} />
            <StatusRow label="Insurance" status={vehicle.documents.insuranceStatus} date={vehicle.documents.insuranceExpiry} />
            <StatusRow label="PUC" status={vehicle.documents.pucStatus} date={vehicle.documents.pucExpiry} />
          </div>
        </div>
      </div>

      {/* Violations Section */}
      {analysis.violations.length > 0 && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-red-100">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-red-800 flex items-center gap-2">
              <BadgeAlert className="w-5 h-5" />
              Detected Violations
            </h3>
            <span className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm font-bold">
              Total Fine: ₹{analysis.totalFine}
            </span>
          </div>
          
          <div className="space-y-3">
            {analysis.violations.map((violation, idx) => (
              <div key={idx} className="flex justify-between items-center p-3 bg-red-50 rounded-lg border border-red-100">
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded ${getSeverityColor(violation.severity)}`}>
                      {violation.severity}
                    </span>
                    <span className="font-bold text-gray-800">{violation.rule}</span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{violation.description}</p>
                </div>
                <div className="text-right">
                  <span className="block font-bold text-red-700">₹{violation.fineAmount}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 flex gap-3">
             <button 
              onClick={onIssueWarning}
              className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-white py-3 px-4 rounded-lg font-bold flex items-center justify-center gap-2 transition"
            >
              <MessageSquareWarning className="w-5 h-5" />
              Issue Warning
            </button>
            <button 
              onClick={onGenerateChallan}
              className="flex-1 bg-police-600 hover:bg-police-700 text-white py-3 px-4 rounded-lg font-bold flex items-center justify-center gap-2 transition"
            >
              <FileWarning className="w-5 h-5" />
              Generate E-Challan
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const StatusRow = ({ label, status, date }: { label: string, status: string, date: string }) => {
  const isExpired = status === 'Expired' || status === 'Suspended';
  return (
    <div className="flex justify-between items-center">
      <div className="flex flex-col">
        <span className="text-sm font-medium text-gray-700">{label}</span>
        <span className="text-xs text-gray-500">Expires: {date}</span>
      </div>
      <span className={`px-2 py-1 rounded text-xs font-bold ${isExpired ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
        {status.toUpperCase()}
      </span>
    </div>
  );
};

export default AnalysisResult;
