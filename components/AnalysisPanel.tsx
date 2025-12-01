import React, { useState } from 'react';
import { AnalysisResult, Severity, CodeIssue, ProjectAnalysis, ChatMessage } from '../types';
import { AlertTriangle, CheckCircle, Shield, XCircle, Activity, Lightbulb, Server, Layers, Box, Download, Printer, FileText, Cpu, CheckSquare, Wand2, Zap, AlertOctagon, MessageSquare, Sparkles, Gauge } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts';
import { ChatInterface } from './ChatInterface';

interface AnalysisPanelProps {
  fileResult: AnalysisResult | null | undefined;
  projectResult: ProjectAnalysis | null | undefined;
  isAnalyzing: boolean;
  type: 'file' | 'project';
  onFixIssue?: (issue: string) => void;
  onFixAll?: (issues: CodeIssue[]) => void;
  chatMessages: ChatMessage[];
  onSendMessage: (text: string) => Promise<void>;
  isChatTyping: boolean;
  onSmartRefactor?: () => void;
}

const SeverityBadge: React.FC<{ severity: Severity }> = ({ severity }) => {
  const colors = {
    [Severity.CRITICAL]: 'bg-red-900/50 text-red-200 border-red-700',
    [Severity.HIGH]: 'bg-orange-900/50 text-orange-200 border-orange-700',
    [Severity.MEDIUM]: 'bg-yellow-900/50 text-yellow-200 border-yellow-700',
    [Severity.LOW]: 'bg-blue-900/50 text-blue-200 border-blue-700',
    [Severity.INFO]: 'bg-gray-700 text-gray-300 border-gray-600',
  };

  return (
    <span className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded border ${colors[severity]}`}>
      {severity}
    </span>
  );
};

const AnalysisPanel: React.FC<AnalysisPanelProps> = ({ 
    fileResult, 
    projectResult, 
    isAnalyzing, 
    type, 
    onFixIssue, 
    onFixAll, 
    chatMessages, 
    onSendMessage, 
    isChatTyping,
    onSmartRefactor
}) => {
  const [activeTab, setActiveTab] = useState<'file' | 'project' | 'chat'>(type === 'project' ? 'project' : 'file');

  const handleExportJSON = () => {
      const data = activeTab === 'file' ? fileResult : projectResult;
      if (!data) return;
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `codeguard-${activeTab}-report-${Date.now()}.json`;
      a.click();
  };

  const handlePrintPDF = () => {
    window.print();
  };

  if (isAnalyzing && activeTab !== 'chat') {
    return (
      <div className="h-full flex flex-col items-center justify-center space-y-4 p-8 text-center animate-pulse">
        <div className="relative w-16 h-16">
           <div className="absolute inset-0 border-4 border-blue-500/30 rounded-full"></div>
           <div className="absolute inset-0 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
        <h3 className="text-xl font-semibold text-blue-400">Performing Deep Audit...</h3>
        <p className="text-gray-400 text-sm">Analyzing structure, logic, security, and performance vectors.</p>
      </div>
    );
  }

  const renderFileAnalysis = () => {
    if (!fileResult) return (
      <div className="flex flex-col items-center justify-center py-12 text-center opacity-60">
        <Shield size={48} className="text-gray-500 mb-4" />
        <h3 className="text-lg font-medium text-gray-300">No File Analysis</h3>
        <p className="text-sm text-gray-500 max-w-xs mb-4">Run an audit on this specific file to see details.</p>
        {onSmartRefactor && (
             <button onClick={onSmartRefactor} className="flex items-center gap-2 px-4 py-2 bg-purple-700 hover:bg-purple-600 text-white rounded-lg text-sm transition-colors">
                 <Sparkles size={16} /> Auto-Optimize File
             </button>
        )}
      </div>
    );

    const chartData = [
        { name: 'Security', value: fileResult.securityScore, color: '#ef4444' },
        { name: 'Quality', value: fileResult.overallScore, color: '#3b82f6' },
        { name: 'Maintain', value: fileResult.maintainabilityScore, color: '#10b981' },
    ];

    return (
        <div className="space-y-6 animate-fadeIn pb-10">
             <div className="bg-gray-800 rounded-xl p-5 border border-gray-700 shadow-lg print:border-gray-200">
                <div className="flex justify-between items-start mb-4">
                    <h2 className="text-lg font-semibold text-white flex items-center gap-2 print:text-black">
                        <Activity className="text-blue-400 print:text-blue-600" size={20} />
                        File Scorecard
                    </h2>
                    <span className="text-xs text-gray-400 print:text-gray-600 font-mono">{new Date(fileResult.timestamp || 0).toLocaleDateString()}</span>
                </div>
                
                <div className="h-40 w-full mb-2">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} layout="vertical" margin={{ left: 10, right: 30 }}>
                             <XAxis type="number" domain={[0, 100]} hide />
                             <YAxis dataKey="name" type="category" width={60} tick={{fill: '#9ca3af', fontSize: 10}} />
                             <Bar dataKey="value" barSize={20} radius={[0, 4, 4, 0]}>
                                {chartData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                             </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
                <p className="text-sm text-gray-300 leading-snug print:text-black mt-2">{fileResult.summary}</p>
            </div>

            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-md font-semibold text-white flex items-center gap-2 print:text-black">
                        <AlertTriangle className="text-yellow-400 print:text-yellow-600" size={18} />
                        Issues ({fileResult.issues.length})
                    </h3>
                    {fileResult.issues.length > 0 && onFixAll && (
                        <button 
                            onClick={() => onFixAll(fileResult.issues)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white text-xs font-medium rounded-lg transition-all shadow-lg shadow-blue-900/30 no-print"
                        >
                            <Wand2 size={12} /> Fix All Issues
                        </button>
                    )}
                </div>

                {fileResult.issues.length === 0 ? (
                    <div className="p-6 bg-green-900/20 border border-green-700/50 rounded-xl text-center flex flex-col items-center justify-center gap-2">
                        <div className="bg-green-900/50 p-3 rounded-full mb-2">
                             <CheckCircle size={24} className="text-green-400" />
                        </div>
                        <h4 className="text-green-300 font-medium">No Issues Found</h4>
                        <p className="text-gray-400 text-sm">This file passed all security and quality checks.</p>
                    </div>
                ) : (
                    fileResult.issues.map((issue, idx) => (
                    <div key={idx} className="bg-[#161b22] border border-gray-700 rounded-lg p-4 hover:border-blue-500/50 transition-colors group print:bg-white print:border-gray-300">
                        <div className="flex justify-between items-start mb-2">
                            <div className="flex items-center gap-2">
                                <SeverityBadge severity={issue.severity} />
                                <span className="font-semibold text-gray-200 text-sm truncate max-w-[200px] print:text-black">{issue.title}</span>
                            </div>
                            {issue.line && issue.line > 0 && (
                                <span className="text-xs text-gray-500 font-mono">Ln {issue.line}</span>
                            )}
                        </div>
                        <p className="text-sm text-gray-400 mb-3 print:text-gray-700">{issue.description}</p>
                        <div className="flex items-center justify-between mt-2">
                            {issue.suggestion && (
                                <div className="text-xs text-gray-500 flex items-center gap-1">
                                    <Lightbulb size={12} /> Suggestion available
                                </div>
                            )}
                            {onFixIssue && (
                                <button 
                                    onClick={() => onFixIssue(issue.description)}
                                    className="flex items-center gap-1.5 px-3 py-1 bg-gray-700 hover:bg-gray-600 border border-gray-600 text-gray-300 text-xs rounded transition-colors no-print"
                                >
                                    <Wand2 size={12} /> Fix with AI
                                </button>
                            )}
                        </div>
                    </div>
                    ))
                )}
            </div>
        </div>
    );
  };

  const renderProjectAnalysis = () => {
    if (!projectResult) return (
      <div className="flex flex-col items-center justify-center py-12 text-center opacity-60">
        <Server size={48} className="text-gray-500 mb-4" />
        <h3 className="text-lg font-medium text-gray-300">No Project Report</h3>
        <p className="text-sm text-gray-500 max-w-xs">Run a "Full Project Scan" to analyze architecture and stack.</p>
      </div>
    );

    const safeFiles = projectResult.fileInsights?.filter(f => f.status === 'SAFE').length || 0;
    const warnFiles = projectResult.fileInsights?.filter(f => f.status === 'WARNING').length || 0;
    const dangerFiles = projectResult.fileInsights?.filter(f => f.status === 'DANGER').length || 0;

    const fileHealthData = [
        { name: 'Safe', count: safeFiles, fill: '#10b981' },
        { name: 'Warning', count: warnFiles, fill: '#f59e0b' },
        { name: 'Danger', count: dangerFiles, fill: '#ef4444' },
    ];

    return (
        <div className="space-y-6 animate-fadeIn pb-10">
            {/* Header / Summary */}
             <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-5 border border-gray-700 shadow-lg print:from-white print:to-white print:border-gray-200">
                <div className="flex justify-between items-start mb-4">
                    <h2 className="text-lg font-semibold text-white flex items-center gap-2 print:text-black">
                        <Layers className="text-purple-400 print:text-purple-600" size={20} />
                        Audit Dashboard
                    </h2>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                        projectResult.securityPosture === 'EXCELLENT' ? 'bg-green-900 text-green-300' : 
                        projectResult.securityPosture === 'WEAK' ? 'bg-red-900 text-red-300' : 'bg-blue-900 text-blue-300'
                    }`}>
                        {projectResult.securityPosture} SECURITY
                    </span>
                </div>
                <p className="text-sm text-gray-300 mb-6 border-b border-gray-700 pb-4 print:text-gray-700">{projectResult.summary}</p>
                
                {/* Score Cards */}
                <div className="grid grid-cols-4 gap-2 mb-4">
                    <div className="bg-[#161b22] p-3 rounded-lg text-center border border-gray-700 print:bg-gray-50 print:border-gray-300">
                        <div className="text-xs text-gray-400 uppercase mb-1">Security</div>
                        <div className={`text-xl font-bold ${projectResult.securityScore > 80 ? 'text-green-400' : 'text-red-400'} print:text-black`}>{projectResult.securityScore}</div>
                    </div>
                    <div className="bg-[#161b22] p-3 rounded-lg text-center border border-gray-700 print:bg-gray-50 print:border-gray-300">
                         <div className="text-xs text-gray-400 uppercase mb-1">Architecture</div>
                         <div className={`text-xl font-bold ${projectResult.architectureScore > 80 ? 'text-blue-400' : 'text-yellow-400'} print:text-black`}>{projectResult.architectureScore}</div>
                    </div>
                    <div className="bg-[#161b22] p-3 rounded-lg text-center border border-gray-700 print:bg-gray-50 print:border-gray-300">
                         <div className="text-xs text-gray-400 uppercase mb-1">Quality</div>
                         <div className={`text-xl font-bold ${projectResult.qualityScore > 80 ? 'text-purple-400' : 'text-orange-400'} print:text-black`}>{projectResult.qualityScore}</div>
                    </div>
                     <div className="bg-[#161b22] p-3 rounded-lg text-center border border-gray-700 print:bg-gray-50 print:border-gray-300">
                         <div className="text-xs text-gray-400 uppercase mb-1">Perf</div>
                         <div className={`text-xl font-bold ${projectResult.performanceAudit?.score > 80 ? 'text-cyan-400' : 'text-pink-400'} print:text-black`}>{projectResult.performanceAudit?.score || 0}</div>
                    </div>
                </div>

                {/* Tech Stack Rating */}
                <div className="space-y-2">
                    <h4 className="text-xs font-bold text-gray-500 uppercase flex items-center gap-1">
                        <Cpu size={12}/> Tech Stack Health
                    </h4>
                    <div className="flex flex-wrap gap-2">
                        {projectResult.techStack.map((tech, i) => (
                            <span key={i} className={`px-2 py-1 rounded text-xs font-mono border flex items-center gap-1 ${
                                tech.health === 'GOOD' ? 'bg-green-900/20 border-green-800 text-green-300' :
                                tech.health === 'VULNERABLE' ? 'bg-red-900/20 border-red-800 text-red-300' :
                                'bg-gray-700 border-gray-600 text-gray-300'
                            }`}>
                                {tech.name}
                                {tech.health === 'GOOD' && <CheckCircle size={10} />}
                                {tech.health === 'VULNERABLE' && <AlertTriangle size={10} />}
                            </span>
                        ))}
                    </div>
                </div>
            </div>

            {/* Performance Audit Section */}
            {projectResult.performanceAudit && (
                 <div className="bg-[#161b22] border border-cyan-900/30 rounded-lg p-5 print:bg-white print:border-cyan-200">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-sm font-semibold text-cyan-400 flex items-center gap-2 print:text-cyan-700">
                            <Gauge size={16} />
                            Performance Audit
                        </h3>
                        <span className="text-sm font-bold text-gray-300">{projectResult.performanceAudit.score}/100</span>
                    </div>

                    <div className="space-y-4">
                        {projectResult.performanceAudit.bottlenecks.length > 0 && (
                            <div className="space-y-1">
                                <span className="text-xs text-gray-500 uppercase">Bottlenecks</span>
                                {projectResult.performanceAudit.bottlenecks.map((item, i) => (
                                    <p key={i} className="text-xs text-gray-300 flex gap-1 bg-red-900/10 p-1 rounded border border-red-900/20">
                                        <Activity size={10} className="mt-0.5 text-red-500 flex-shrink-0"/>{item}
                                    </p>
                                ))}
                            </div>
                        )}
                        {projectResult.performanceAudit.optimizationSuggestions.length > 0 && (
                            <div className="space-y-1">
                                <span className="text-xs text-gray-500 uppercase">Optimizations</span>
                                {projectResult.performanceAudit.optimizationSuggestions.map((item, i) => (
                                    <p key={i} className="text-xs text-gray-300 flex gap-1"><Zap size={10} className="mt-0.5 text-yellow-500 flex-shrink-0"/>{item}</p>
                                ))}
                            </div>
                        )}
                    </div>
                 </div>
            )}

            {/* Production Readiness */}
            {projectResult.productionReadiness && (
                <div className="bg-[#161b22] border border-orange-900/30 rounded-lg p-5 print:bg-white print:border-orange-200">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-sm font-semibold text-orange-400 flex items-center gap-2 print:text-orange-700">
                            <Zap size={16} />
                            Production Readiness
                        </h3>
                        <span className="text-sm font-bold text-gray-300">{projectResult.productionReadiness.score}/100</span>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <span className="text-xs text-gray-500 uppercase">Scalability</span>
                            {projectResult.productionReadiness.scalabilityIssues.length === 0 ? <p className="text-xs text-green-400">No issues</p> : 
                            projectResult.productionReadiness.scalabilityIssues.map((issue, i) => <p key={i} className="text-xs text-gray-300 flex gap-1"><AlertOctagon size={10} className="mt-0.5 text-orange-500 flex-shrink-0"/>{issue}</p>)}
                        </div>
                        <div className="space-y-1">
                            <span className="text-xs text-gray-500 uppercase">Security Secrets</span>
                             {projectResult.productionReadiness.hardcodedSecrets.length === 0 ? <p className="text-xs text-green-400">Clean</p> : 
                            projectResult.productionReadiness.hardcodedSecrets.map((issue, i) => <p key={i} className="text-xs text-red-300 flex gap-1"><XCircle size={10} className="mt-0.5 flex-shrink-0"/>{issue}</p>)}
                        </div>
                    </div>
                </div>
            )}

            {/* File Health Chart */}
            {projectResult.fileInsights && (
                <div className="bg-[#161b22] border border-gray-800 rounded-lg p-5 print:bg-white print:border-gray-300">
                    <h3 className="text-sm font-semibold text-gray-300 mb-4 print:text-black">File Health Distribution</h3>
                    <div className="h-40 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={fileHealthData} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" stroke="#374151" horizontal={false} />
                                <XAxis type="number" stroke="#9ca3af" fontSize={12} />
                                <YAxis dataKey="name" type="category" stroke="#9ca3af" fontSize={12} width={60} />
                                <Tooltip 
                                    contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: '#f3f4f6' }}
                                    itemStyle={{ color: '#f3f4f6' }}
                                />
                                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                                    {fileHealthData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.fill} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}

            {/* Recommendations */}
             <div className="bg-[#161b22] border border-blue-900/30 rounded-lg p-5 print:bg-white print:border-blue-200">
                 <h3 className="text-md font-semibold text-blue-400 flex items-center gap-2 mb-3 print:text-blue-700">
                    <Lightbulb size={18} />
                    Strategic Recommendations
                 </h3>
                 <ul className="space-y-2">
                    {projectResult.recommendations.map((rec, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-gray-300 print:text-black">
                            <CheckSquare size={16} className="text-blue-500 mt-0.5 flex-shrink-0" />
                            {rec}
                        </li>
                    ))}
                 </ul>
            </div>
        </div>
    );
  };

  return (
    <div className="h-full flex flex-col bg-[#0d1117] analysis-panel">
      {/* Header Actions */}
      <div className="flex items-center justify-between border-b border-gray-800 no-print flex-shrink-0 overflow-x-auto">
        <div className="flex">
            <button 
                onClick={() => setActiveTab('file')}
                className={`px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap ${activeTab === 'file' ? 'text-white border-b-2 border-blue-500 bg-gray-800/50' : 'text-gray-500 hover:text-gray-300'}`}
            >
                Current File
            </button>
            <button 
                onClick={() => setActiveTab('project')}
                className={`px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap ${activeTab === 'project' ? 'text-white border-b-2 border-purple-500 bg-gray-800/50' : 'text-gray-500 hover:text-gray-300'}`}
            >
                Project Overview
            </button>
            <button 
                onClick={() => setActiveTab('chat')}
                className={`px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap flex items-center gap-2 ${activeTab === 'chat' ? 'text-white border-b-2 border-green-500 bg-gray-800/50' : 'text-gray-500 hover:text-gray-300'}`}
            >
                <MessageSquare size={14} /> AI Chat
            </button>
        </div>
        <div className="flex gap-2 pr-4 pl-2">
             <button onClick={handleExportJSON} className="p-1.5 text-gray-400 hover:text-white rounded hover:bg-gray-700" title="Export JSON">
                 <Download size={16} />
             </button>
             <button onClick={handlePrintPDF} className="p-1.5 text-gray-400 hover:text-white rounded hover:bg-gray-700" title="Print / Save PDF">
                 <Printer size={16} />
             </button>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto bg-[#0d1117] scrollbar-thin">
        {activeTab === 'chat' ? (
            <ChatInterface 
                messages={chatMessages} 
                onSendMessage={onSendMessage} 
                isTyping={isChatTyping} 
            />
        ) : (
            <div className="p-6">
                 {activeTab === 'file' ? renderFileAnalysis() : renderProjectAnalysis()}
            </div>
        )}
      </div>
    </div>
  );
};

export default AnalysisPanel;