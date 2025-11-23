import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, MapPin, BrainCircuit, Loader2, ExternalLink } from 'lucide-react';
import { ChatMessage } from '../types';
import { askLegalAssistant, findNearbyServices } from '../services/geminiService';

const AIAssistant: React.FC = () => {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      role: 'model',
      text: 'Hello, Officer. I am your AI Legal Assistant. You can ask me about traffic laws, penalties, or find nearby RTO services.',
      timestamp: new Date()
    }
  ]);
  const [isThinking, setIsThinking] = useState(false);
  const [useMaps, setUseMaps] = useState(false);
  const [useDeepThinking, setUseDeepThinking] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsThinking(true);

    try {
      let responseText = '';
      let mapData = null;

      if (useMaps) {
        // Check permission and get location
        if ("geolocation" in navigator) {
          try {
            const position = await new Promise<GeolocationPosition>((resolve, reject) => {
              navigator.geolocation.getCurrentPosition(resolve, reject);
            });
            const { latitude, longitude } = position.coords;
            const result = await findNearbyServices(userMsg.text, latitude, longitude);
            responseText = result.text || "No details found.";
            mapData = result.groundingChunks;
          } catch (e) {
            responseText = "Please enable location services to use Maps features.";
          }
        } else {
          responseText = "Geolocation is not supported by your browser.";
        }
      } else if (useDeepThinking) {
        responseText = await askLegalAssistant(userMsg.text);
      } else {
        // Fallback or simple query (could use standard flash)
        responseText = await askLegalAssistant(userMsg.text); 
      }

      const botMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: responseText,
        groundingMetadata: mapData,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, botMsg]);

    } catch (error) {
      console.error(error);
      const errorMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: "I encountered an error processing your request.",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsThinking(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="bg-police-50 p-4 border-b border-gray-200 flex justify-between items-center">
        <h3 className="font-bold text-police-900 flex items-center gap-2">
          <Bot className="w-5 h-5" />
          AI Legal & Operations Assistant
        </h3>
        <div className="flex gap-2">
           <button 
            onClick={() => { setUseDeepThinking(!useDeepThinking); setUseMaps(false); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition ${useDeepThinking ? 'bg-purple-100 text-purple-700 border border-purple-200' : 'bg-gray-100 text-gray-500'}`}
          >
            <BrainCircuit className="w-3 h-3" />
            Thinking Mode
          </button>
          <button 
            onClick={() => { setUseMaps(!useMaps); setUseDeepThinking(false); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition ${useMaps ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-gray-100 text-gray-500'}`}
          >
            <MapPin className="w-3 h-3" />
            Maps Grounding
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] rounded-2xl p-4 ${
              msg.role === 'user' 
                ? 'bg-police-600 text-white rounded-tr-none' 
                : 'bg-gray-100 text-gray-800 rounded-tl-none'
            }`}>
              <p className="whitespace-pre-wrap text-sm leading-relaxed">{msg.text}</p>
              
              {/* Maps & Web Grounding Data Rendering */}
              {msg.groundingMetadata && msg.groundingMetadata.length > 0 && (
                <div className="mt-4 grid gap-2">
                  <p className="text-xs font-bold opacity-60 uppercase tracking-wider">References & Locations</p>
                  {msg.groundingMetadata.map((chunk: any, i: number) => {
                     // Handle Web Source
                     if (chunk.web?.uri) {
                        return (
                          <a key={i} href={chunk.web.uri} target="_blank" rel="noreferrer" className="flex items-center gap-2 bg-white p-2 rounded-lg border border-gray-200 text-blue-600 hover:bg-blue-50 transition shadow-sm">
                             <ExternalLink className="w-3 h-3 flex-shrink-0" />
                             <span className="text-xs truncate font-medium">{chunk.web.title || "Web Source"}</span>
                          </a>
                        )
                     }
                     // Handle Maps Source (Specific handling)
                     if (chunk.maps?.uri) {
                        return (
                           <a key={i} href={chunk.maps.uri} target="_blank" rel="noreferrer" className="flex items-center gap-2 bg-white p-2 rounded-lg border border-gray-200 text-green-700 hover:bg-green-50 transition shadow-sm">
                             <MapPin className="w-3 h-3 flex-shrink-0 text-red-500" />
                             <span className="text-xs truncate font-bold">{chunk.maps.title || "View on Google Maps"}</span>
                          </a>
                        )
                     }
                     return null;
                  })}
                </div>
              )}
            </div>
          </div>
        ))}
        {isThinking && (
          <div className="flex justify-start">
             <div className="bg-gray-100 rounded-2xl rounded-tl-none p-4 flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-gray-500" />
                <span className="text-xs text-gray-500 font-medium">
                  {useDeepThinking ? "Deeply reasoning..." : useMaps ? "Locating services..." : "Processing..."}
                </span>
             </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 bg-gray-50 border-t border-gray-200">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder={useMaps ? "Find nearby police station, RTO..." : "Ask about IPC sections, fines, rules..."}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-police-500"
          />
          <button 
            onClick={handleSend}
            disabled={!input.trim() || isThinking}
            className="bg-police-600 text-white p-2 rounded-lg hover:bg-police-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default AIAssistant;