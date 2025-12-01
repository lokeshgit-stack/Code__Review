import React from 'react';
import { Code2, ArrowLeft, Github } from 'lucide-react';

interface HeaderProps {
    view: 'DASHBOARD' | 'WORKSPACE';
    projectName?: string;
    onBack?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ view, projectName, onBack }) => {
    return (
        <header className="h-16 bg-[#161b22] border-b border-gray-800 flex items-center justify-between px-6 no-print flex-shrink-0">
            <div className="flex items-center gap-4">
                {view === 'WORKSPACE' && (
                    <button onClick={onBack} className="p-2 hover:bg-gray-700 rounded-lg text-gray-400 hover:text-white transition-colors">
                        <ArrowLeft size={20} />
                    </button>
                )}
                <div className="flex items-center gap-2">
                    <Code2 className="text-blue-500" size={24} />
                    <h1 className="text-xl font-bold text-white tracking-tight">CodeGuard AI</h1>
                </div>
                {projectName && (
                     <>
                        <span className="text-gray-600 text-xl font-light">/</span>
                        <span className="text-gray-200 font-medium">{projectName}</span>
                     </>
                )}
            </div>
            
            <div className="flex items-center gap-4">
                <a href="https://github.com" target="_blank" rel="noreferrer" className="text-gray-400 hover:text-white transition-colors">
                    <Github size={20} />
                </a>
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-lg shadow-blue-900/50">
                    AI
                </div>
            </div>
        </header>
    );
};