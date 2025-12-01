import React from 'react';

export const Footer: React.FC = () => {
    return (
        <footer className="bg-[#0d1117] border-t border-gray-800 py-6 px-8 text-center no-print">
            <p className="text-gray-500 text-sm mb-2">
                CodeGuard AI v2.0 • Powered by Google Gemini
            </p>
            <div className="flex justify-center gap-4 text-xs text-gray-600">
                <a href="#" className="hover:text-blue-400">Documentation</a>
                <span>•</span>
                <a href="#" className="hover:text-blue-400">Privacy Policy</a>
                <span>•</span>
                <a href="#" className="hover:text-blue-400">Terms of Service</a>
            </div>
        </footer>
    );
};