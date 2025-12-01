
import React, { useState, useEffect, useRef } from 'react';
import { FileData, Project, CodeIssue, ChatMessage } from './types';
import CodeEditor from './components/Editor';
import AnalysisPanel from './components/AnalysisPanel';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { analyzeCode, analyzeProject, generateCodeFix, generateUnitTests, chatWithAI, agentEditCode } from './services/geminiService';
import { parseGithubUrl, fetchGithubRepo } from './services/githubService';
import { 
  FileCode, 
  UploadCloud, 
  Plus, 
  Trash2, 
  Github, 
  Code2, 
  Folder,
  ArrowLeft,
  LayoutDashboard,
  Play,
  Activity,
  Server,
  Check,
  X,
  Split,
  Wand2,
  Menu,
  PanelRight,
  Sidebar,
  FilePlus,
  FolderPlus,
  Save,
  MoreVertical,
  Edit2,
  CornerDownRight
} from 'lucide-react';

const App: React.FC = () => {
  const [view, setView] = useState<'DASHBOARD' | 'WORKSPACE'>('DASHBOARD');
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [activeFileId, setActiveFileId] = useState<string | null>(null);
  
  // Mobile UI States
  const [showSidebar, setShowSidebar] = useState(true);
  const [showAnalysis, setShowAnalysis] = useState(true);
  
  // Modals / Inputs
  const [githubUrl, setGithubUrl] = useState('');
  const [showGithubModal, setShowGithubModal] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState('');
  const [toastMsg, setToastMsg] = useState('');

  // Diff View State
  const [showDiff, setShowDiff] = useState(false);

  // File Management State
  const [renamingFileId, setRenamingFileId] = useState<string | null>(null);
  const [tempRenameName, setTempRenameName] = useState('');
  
  // Creation State (New File/Folder)
  const [creationState, setCreationState] = useState<{ type: 'file' | 'folder', active: boolean }>({ type: 'file', active: false });
  const [newItemName, setNewItemName] = useState('');
  const creationInputRef = useRef<HTMLInputElement>(null);

  // Chat State
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isChatTyping, setIsChatTyping] = useState(false);

  const currentProject = projects.find(p => p.id === currentProjectId);
  const activeFile = currentProject?.files.find(f => f.id === activeFileId);

  // --- Persistence ---
  useEffect(() => {
    try {
        const savedProjects = localStorage.getItem('codeguard_projects');
        if (savedProjects) {
            setProjects(JSON.parse(savedProjects));
        }
    } catch (e) {
        console.error("Failed to load projects", e);
    }
  }, []);

  useEffect(() => {
    try {
        if (projects.length > 0) {
            localStorage.setItem('codeguard_projects', JSON.stringify(projects));
        }
    } catch (e) {
        console.error("Failed to save projects", e);
    }
  }, [projects]);

  // Toast Timer
  useEffect(() => {
    if (toastMsg) {
        const timer = setTimeout(() => setToastMsg(''), 3000);
        return () => clearTimeout(timer);
    }
  }, [toastMsg]);

  // Auto-focus creation input
  useEffect(() => {
      if (creationState.active && creationInputRef.current) {
          creationInputRef.current.focus();
      }
  }, [creationState.active]);

  const showToast = (msg: string) => setToastMsg(msg);

  // --- Project Management ---

  const createProject = (name: string, files: FileData[], githubUrl?: string) => {
    const newProject: Project = {
      id: Math.random().toString(36).substr(2, 9),
      name,
      createdAt: Date.now(),
      files,
      githubUrl
    };
    setProjects(prev => [newProject, ...prev]);
    setCurrentProjectId(newProject.id);
    if (files.length > 0) setActiveFileId(files[0].id);
    setView('WORKSPACE');
    setChatMessages([]); 
    if (window.innerWidth < 768) {
        setShowSidebar(false);
        setShowAnalysis(false);
    } else {
        setShowSidebar(true);
        setShowAnalysis(true);
    }
    showToast("Project created successfully");
  };

  const deleteProject = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this project?")) return;
    const updatedProjects = projects.filter(p => p.id !== id);
    setProjects(updatedProjects);
    localStorage.setItem('codeguard_projects', JSON.stringify(updatedProjects));
    if (currentProjectId === id) {
      setCurrentProjectId(null);
      setView('DASHBOARD');
    }
    showToast("Project deleted");
  };

  const updateFileContent = (newContent: string) => {
    if (!currentProjectId || !activeFileId) return;
    setProjects(prev => prev.map(p => {
      if (p.id === currentProjectId) {
        return {
          ...p,
          files: p.files.map(f => f.id === activeFileId ? { ...f, content: newContent } : f)
        };
      }
      return p;
    }));
  };

  // --- File System Actions ---

  const handleStartCreate = (type: 'file' | 'folder') => {
      setCreationState({ type, active: true });
      setNewItemName('');
  };

  const handleCreateSubmit = () => {
      if (!currentProjectId || !newItemName.trim()) {
          setCreationState({ ...creationState, active: false });
          return;
      }

      const inputName = newItemName.trim();
      // Logic for new item
      let newFile: FileData;

      if (creationState.type === 'folder') {
          // Creating a folder implies creating a placeholder file inside it to persist in flat list
          const folderPath = inputName.replace(/\/$/, ''); // Remove trailing slash
          newFile = {
              id: Math.random().toString(36).substr(2, 9),
              name: '.gitkeep',
              path: `${folderPath}/.gitkeep`,
              content: '',
              language: 'text'
          };
      } else {
          // File creation
          const fileName = inputName.split('/').pop() || inputName;
          newFile = {
              id: Math.random().toString(36).substr(2, 9),
              name: fileName,
              path: inputName,
              content: `// ${fileName}\n\n`,
              language: fileName.split('.').pop() || 'text'
          };
      }

      setProjects(prev => prev.map(p => {
          if (p.id === currentProjectId) {
              return { ...p, files: [...p.files, newFile] };
          }
          return p;
      }));

      setCreationState({ ...creationState, active: false });
      if (creationState.type === 'file') {
          setActiveFileId(newFile.id);
          showToast(`Created file: ${newFile.name}`);
      } else {
          showToast(`Created folder: ${newItemName}`);
      }
      setNewItemName('');
  };

  const handleDeleteFile = (e: React.MouseEvent, fileId: string) => {
      e.stopPropagation();
      if (!currentProjectId) return;
      if (!confirm("Delete this file?")) return;

      setProjects(prev => prev.map(p => {
          if (p.id === currentProjectId) {
              const newFiles = p.files.filter(f => f.id !== fileId);
              if (activeFileId === fileId) {
                  setActiveFileId(newFiles.length > 0 ? newFiles[0].id : null);
              }
              return { ...p, files: newFiles };
          }
          return p;
      }));
      showToast("File deleted");
  };

  const startRename = (e: React.MouseEvent, file: FileData) => {
      e.stopPropagation();
      setRenamingFileId(file.id);
      setTempRenameName(file.name);
  };

  const finishRename = () => {
      if (!currentProjectId || !renamingFileId) return;
      setProjects(prev => prev.map(p => {
          if (p.id === currentProjectId) {
              return {
                  ...p,
                  files: p.files.map(f => f.id === renamingFileId ? { 
                      ...f, 
                      name: tempRenameName, 
                      path: f.path.replace(f.name, tempRenameName), // Simple path replace, imperfect for complex paths but functional
                      language: tempRenameName.split('.').pop() || 'text'
                  } : f)
              };
          }
          return p;
      }));
      setRenamingFileId(null);
      showToast("File renamed");
  };

  // --- File Upload ---

  const handleFolderUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      const filesArr = Array.from(event.target.files);
      const projectName = filesArr[0].webkitRelativePath.split('/')[0] || 'Uploaded Project';
      let ignoredCount = 0;
      
      const filteredFiles = filesArr.filter(f => {
         const path = f.webkitRelativePath.toLowerCase();
         if (path.includes('/node_modules/') || path.includes('node_modules/') || path.includes('/.git/') || path.includes('.git/') || path.includes('/dist/') || path.includes('/.next/') || path.includes('package-lock.json')) {
             ignoredCount++;
             return false;
         }
         return true;
      });

      const processedFiles: FileData[] = [];
      let loadedCount = 0;

      if (filteredFiles.length === 0) {
        alert(`All files ignored. No valid source code found.`);
        return;
      }

      filteredFiles.forEach(file => {
        const reader = new FileReader();
        reader.onload = (e) => {
          processedFiles.push({
            id: Math.random().toString(36).substr(2, 9),
            name: file.name,
            path: file.webkitRelativePath,
            content: e.target?.result as string,
            language: file.name.split('.').pop() || 'text'
          });
          loadedCount++;
          if (loadedCount === filteredFiles.length) {
            createProject(projectName, processedFiles);
            if (ignoredCount > 0) showToast(`Ignored ${ignoredCount} system files`);
          }
        };
        reader.readAsText(file);
      });
    }
  };

  const handleGithubImport = async () => {
    const coords = parseGithubUrl(githubUrl);
    if (!coords) {
      alert("Invalid GitHub URL.");
      return;
    }
    setLoadingMsg("Cloning Repository...");
    try {
      const files = await fetchGithubRepo(coords.owner, coords.repo);
      createProject(`${coords.owner}/${coords.repo}`, files, githubUrl);
      setShowGithubModal(false);
      setGithubUrl('');
    } catch (e: any) {
      alert(`Import Failed: ${e.message}`);
    } finally {
      setLoadingMsg('');
    }
  };

  // --- AI Actions ---

  const handleFileAnalysis = async () => {
    if (!activeFile || !currentProject) return;
    setProjects(prev => prev.map(p => p.id === currentProjectId ? { ...p, files: p.files.map(f => f.id === activeFileId ? { ...f, isAnalyzing: true } : f) } : p));
    if (window.innerWidth < 768) { setShowAnalysis(true); setShowSidebar(false); }

    try {
      const result = await analyzeCode(activeFile.content, activeFile.name);
      setProjects(prev => prev.map(p => p.id === currentProjectId ? { ...p, files: p.files.map(f => f.id === activeFileId ? { ...f, isAnalyzing: false, analysis: result } : f) } : p));
      showToast("Analysis Complete");
    } catch (error) {
      setProjects(prev => prev.map(p => p.id === currentProjectId ? { ...p, files: p.files.map(f => f.id === activeFileId ? { ...f, isAnalyzing: false } : f) } : p));
      showToast("Analysis Failed");
    }
  };

  const handleProjectAnalysis = async () => {
      if (!currentProject) return;
      setProjects(prev => prev.map(p => p.id === currentProjectId ? { ...p, isAnalyzing: true } : p));
      if (window.innerWidth < 768) { setShowAnalysis(true); setShowSidebar(false); }
      try {
          const result = await analyzeProject(currentProject.files, currentProject.name);
          setProjects(prev => prev.map(p => p.id === currentProjectId ? { ...p, isAnalyzing: false, projectAnalysis: result } : p));
          showToast("Project Audit Complete");
      } catch (error) {
          setProjects(prev => prev.map(p => p.id === currentProjectId ? { ...p, isAnalyzing: false } : p));
          showToast("Project Audit Failed");
      }
  };

  const getProjectContext = () => currentProject ? currentProject.files.map(f => f.path).join('\n') : '';

  const handleFixCode = async (issueDescription: string) => {
    if (!activeFile || !currentProjectId) return;
    setProjects(prev => prev.map(p => p.id === currentProjectId ? { ...p, files: p.files.map(f => f.id === activeFileId ? { ...f, isFixing: true } : f) } : p));
    if (window.innerWidth < 768) setShowAnalysis(false);

    try {
        const projectContext = getProjectContext();
        const fixedCode = await generateCodeFix(activeFile.content, issueDescription, activeFile.language, projectContext);
        setProjects(prev => prev.map(p => p.id === currentProjectId ? { ...p, files: p.files.map(f => f.id === activeFileId ? { ...f, isFixing: false, stagingContent: fixedCode } : f) } : p));
        setShowDiff(true);
        showToast("Fix Generated");
    } catch (e) {
        showToast("Fix Generation Failed");
        setProjects(prev => prev.map(p => p.id === currentProjectId ? { ...p, files: p.files.map(f => f.id === activeFileId ? { ...f, isFixing: false } : f) } : p));
    }
  };

  const handleSmartRefactor = async () => {
      const description = "Comprehensive Refactor: Improve performance, fix potential security flaws, ensure scalability, and clean up code style based on best practices. Maintain logic.";
      await handleFixCode(description);
  };

  const handleFixAllIssues = async (issues: CodeIssue[]) => {
      if (!activeFile || !currentProjectId || issues.length === 0) return;
      const combinedDescription = "Fix ALL issues:\n" + issues.map((i, idx) => `${idx + 1}. ${i.title}: ${i.description}`).join('\n');
      await handleFixCode(combinedDescription);
  };

  const handleAcceptFix = () => {
    if (!activeFile || !activeFile.stagingContent) return;
    const newContent = activeFile.stagingContent;
    const previousContent = activeFile.content;
    setProjects(prev => prev.map(p => p.id === currentProjectId ? {
        ...p,
        files: p.files.map(f => f.id === activeFileId ? { 
            ...f, 
            content: newContent,
            stagingContent: null,
            analysis: null,
            history: [...(f.history || []), { id: Math.random().toString(36).substr(2, 9), timestamp: Date.now(), content: previousContent, description: `Before Fix ${new Date().toLocaleTimeString()}` }]
        } : f)
    } : p));
    setShowDiff(false);
    showToast("Changes Applied");
  };

  const handleRejectFix = () => {
     setProjects(prev => prev.map(p => p.id === currentProjectId ? { ...p, files: p.files.map(f => f.id === activeFileId ? { ...f, stagingContent: null } : f) } : p));
    setShowDiff(false);
    showToast("Changes Rejected");
  };

  const handleRevertVersion = (versionId: string) => {
      if (!activeFile || !currentProjectId) return;
      const versionToRestore = activeFile.history?.find(v => v.id === versionId);
      if (!versionToRestore || !confirm("Revert to this version?")) return;
      const currentAsHistory = { id: Math.random().toString(36).substr(2, 9), timestamp: Date.now(), content: activeFile.content, description: `Before Revert` };
      setProjects(prev => prev.map(p => p.id === currentProjectId ? {
        ...p,
        files: p.files.map(f => f.id === activeFileId ? { ...f, content: versionToRestore.content, analysis: null, history: [...(f.history || []), currentAsHistory] } : f)
    } : p));
    showToast("Version Restored");
  };

  const handleGenerateTests = async () => {
      if (!activeFile || !currentProjectId) return;
      setLoadingMsg("Generating Tests...");
      try {
          const testCode = await generateUnitTests(activeFile.content, activeFile.name);
          const testFilename = activeFile.name.replace(/(\.[\w\d]+)$/, '.test$1');
          const newFile: FileData = { id: Math.random().toString(36).substr(2, 9), name: testFilename, path: activeFile.path.replace(activeFile.name, testFilename), content: testCode, language: activeFile.language };
          setProjects(prev => prev.map(p => p.id === currentProjectId ? { ...p, files: [...p.files, newFile] } : p));
          setActiveFileId(newFile.id);
          showToast("Tests Generated");
      } catch (e) {
          showToast("Test Generation Failed");
      } finally { setLoadingMsg(""); }
  };

  const handleSendMessage = async (text: string) => {
      if (text.startsWith('@edit')) {
          if (!activeFile) { setChatMessages(prev => [...prev, { id: Date.now().toString(), role: 'model', text: "Select a file first.", timestamp: Date.now() }]); return; }
          const instruction = text.replace('@edit', '').trim();
          setChatMessages(prev => [...prev, { id: Date.now().toString(), role: 'user', text, timestamp: Date.now() }]);
          setIsChatTyping(true);
          try {
              const result = await agentEditCode(activeFile.content, instruction, activeFile.language, getProjectContext());
              setProjects(prev => prev.map(p => p.id === currentProjectId ? { ...p, files: p.files.map(f => f.id === activeFileId ? { ...f, stagingContent: result.code } : f) } : p));
              setShowDiff(true);
              setChatMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'model', text: `Fix created: "${result.summary}". check diff.`, timestamp: Date.now(), isAction: true }]);
          } catch (e) { setChatMessages(prev => [...prev, { id: Date.now().toString(), role: 'model', text: "Edit failed.", timestamp: Date.now() }]); } 
          finally { setIsChatTyping(false); }
          return;
      }
      setChatMessages(prev => [...prev, { id: Date.now().toString(), role: 'user', text, timestamp: Date.now() }]);
      setIsChatTyping(true);
      try {
          const res = await chatWithAI(chatMessages, text, activeFile, getProjectContext());
          setChatMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'model', text: res, timestamp: Date.now() }]);
      } catch (e) { setChatMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'model', text: "Error.", timestamp: Date.now() }]); } 
      finally { setIsChatTyping(false); }
  };

  // --- Render ---

  if (view === 'DASHBOARD') {
    return (
      <div className="min-h-screen bg-[#0d1117] text-gray-200 font-sans flex flex-col">
         {toastMsg && <div className="fixed top-4 right-4 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-xl z-[100] animate-bounce">{toastMsg}</div>}
         <Header view="DASHBOARD" />
         <div className="flex-1 p-4 md:p-8 overflow-auto">
            <div className="max-w-6xl mx-auto">
                {/* Actions Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12 mt-8">
                    <label className="flex flex-col items-center justify-center h-48 bg-[#161b22] border-2 border-dashed border-gray-700 rounded-2xl hover:border-blue-500 hover:bg-[#1f242c] transition-all cursor-pointer group relative overflow-hidden">
                        <UploadCloud className="text-blue-400 mb-4 group-hover:scale-110 transition-transform" size={40} />
                        <h3 className="font-semibold text-lg">Upload Folder</h3>
                        <input 
                            type="file" 
                            multiple 
                            {...({ webkitdirectory: "", directory: "" } as any)}
                            className="hidden" 
                            onChange={handleFolderUpload} 
                        />
                    </label>
                    <button onClick={() => setShowGithubModal(true)} className="flex flex-col items-center justify-center h-48 bg-[#161b22] border-2 border-dashed border-gray-700 rounded-2xl hover:border-purple-500 hover:bg-[#1f242c] transition-all group">
                        <Github className="text-purple-400 mb-4 group-hover:scale-110 transition-transform" size={40} />
                        <h3 className="font-semibold text-lg">Import GitHub</h3>
                    </button>
                    <button onClick={() => createProject("New Snippet", [{ id: '1', name: 'main.js', path: 'main.js', content: '// Code here', language: 'javascript' }])} className="flex flex-col items-center justify-center h-48 bg-[#161b22] border-2 border-dashed border-gray-700 rounded-2xl hover:border-green-500 hover:bg-[#1f242c] transition-all group">
                        <Plus className="text-green-400 mb-4 group-hover:scale-110 transition-transform" size={40} />
                        <h3 className="font-semibold text-lg">New Project</h3>
                    </button>
                </div>
                {/* Projects List */}
                <h2 className="text-xl font-semibold mb-6 flex items-center gap-2"><LayoutDashboard size={20} /> Recent Projects</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {projects.map(project => (
                        <div key={project.id} onClick={() => { setCurrentProjectId(project.id); setView('WORKSPACE'); if(project.files.length > 0) setActiveFileId(project.files[0].id); }} className="bg-[#161b22] border border-gray-800 p-5 rounded-xl hover:border-blue-500/50 cursor-pointer group relative">
                            <div className="flex justify-between items-start mb-3">
                                <div className="p-2 bg-gray-800 rounded-lg">{project.githubUrl ? <Github size={20} className="text-purple-400"/> : <Folder size={20} className="text-blue-400"/>}</div>
                                <button onClick={(e) => deleteProject(project.id, e)} className="text-gray-600 hover:text-red-400 p-1"><Trash2 size={16} /></button>
                            </div>
                            <h3 className="font-semibold text-lg text-gray-200 mb-1">{project.name}</h3>
                            <p className="text-sm text-gray-500">{project.files.length} files • {new Date(project.createdAt).toLocaleDateString()}</p>
                        </div>
                    ))}
                </div>
            </div>
            {/* Github Modal */}
            {showGithubModal && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
                    <div className="bg-[#161b22] border border-gray-700 p-6 rounded-2xl w-full max-w-md">
                        <h3 className="text-xl font-bold mb-4 flex items-center gap-2"><Github /> Import Repository</h3>
                        <input type="text" placeholder="https://github.com/owner/repo" value={githubUrl} onChange={(e) => setGithubUrl(e.target.value)} className="w-full bg-[#0d1117] border border-gray-700 rounded-lg px-4 py-3 mb-4 focus:border-blue-500 outline-none text-sm font-mono"/>
                        <div className="flex justify-end gap-3">
                            <button onClick={() => setShowGithubModal(false)} className="px-4 py-2 text-sm text-gray-400">Cancel</button>
                            <button onClick={handleGithubImport} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm">Import</button>
                        </div>
                    </div>
                </div>
            )}
         </div>
         <Footer />
      </div>
    );
  }

  // WORKSPACE VIEW
  return (
    <div className="flex h-screen bg-[#0d1117] overflow-hidden text-gray-200 flex-col">
        <Header view="WORKSPACE" projectName={currentProject?.name} onBack={() => setView('DASHBOARD')} />
        {toastMsg && <div className="absolute top-20 right-8 z-[100] bg-blue-600 text-white px-4 py-2 rounded shadow-lg animate-fade-in-down">{toastMsg}</div>}
        {loadingMsg && <div className="absolute top-20 left-1/2 -translate-x-1/2 z-50 bg-blue-600 text-white px-6 py-2 rounded-full shadow-lg flex items-center gap-2 animate-bounce">{loadingMsg}</div>}

        <div className="md:hidden flex border-b border-gray-800 bg-[#161b22]">
            <button onClick={() => { setShowSidebar(!showSidebar); setShowAnalysis(false); }} className={`flex-1 py-3 text-sm flex justify-center gap-2 ${showSidebar ? 'text-blue-400' : 'text-gray-400'}`}><Sidebar size={16} /> Files</button>
            <button onClick={() => { setShowAnalysis(!showAnalysis); setShowSidebar(false); }} className={`flex-1 py-3 text-sm flex justify-center gap-2 ${showAnalysis ? 'text-purple-400' : 'text-gray-400'}`}><Activity size={16} /> Reports</button>
        </div>

        <div className="flex-1 flex overflow-hidden relative">
            {/* Sidebar */}
            <div className={`absolute md:relative z-20 h-full w-72 bg-[#161b22] border-r border-gray-800 flex flex-col transition-transform duration-300 ${showSidebar ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
                <div className="p-2 border-b border-gray-800 flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider pl-2">Explorer</span>
                    <div className="flex gap-1">
                        <button onClick={() => handleStartCreate('file')} className="p-1 hover:bg-gray-700 rounded text-gray-400 hover:text-white" title="New File"><FilePlus size={14}/></button>
                        <button onClick={() => handleStartCreate('folder')} className="p-1 hover:bg-gray-700 rounded text-gray-400 hover:text-white" title="New Folder"><FolderPlus size={14}/></button>
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto p-2 scrollbar-thin">
                    <ul className="space-y-0.5">
                        {/* New Item Input */}
                        {creationState.active && (
                            <li className="flex items-center px-3 py-1.5 rounded-md bg-[#1f242c] border border-blue-500 mb-1">
                                {creationState.type === 'folder' ? <Folder size={14} className="mr-2 text-blue-400"/> : <FileCode size={14} className="mr-2 text-gray-400"/>}
                                <input 
                                    ref={creationInputRef}
                                    value={newItemName}
                                    onChange={(e) => setNewItemName(e.target.value)}
                                    onBlur={() => { if(!newItemName) setCreationState({...creationState, active: false}) }}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleCreateSubmit();
                                        if (e.key === 'Escape') setCreationState({...creationState, active: false});
                                    }}
                                    className="bg-transparent text-sm text-white w-full outline-none placeholder-gray-600"
                                    placeholder={creationState.type === 'folder' ? 'Folder Name' : 'File Name (path/to/file)'}
                                />
                            </li>
                        )}

                        {currentProject?.files.map(file => {
                             // Hide .gitkeep files from list unless they are the only thing (optional, keeping visible for now so folders 'exist' visually)
                             const isGitKeep = file.name === '.gitkeep';
                             
                             return (
                             <li key={file.id} 
                                 className={`group flex items-center justify-between px-3 py-1.5 rounded-md cursor-pointer text-sm transition-all border-l-2 ${activeFileId === file.id ? 'bg-[#1f6feb]/20 text-blue-400 border-blue-500' : 'border-transparent hover:bg-[#161b22] text-gray-400'}`}
                                 onClick={() => { setActiveFileId(file.id); if (window.innerWidth < 768) setShowSidebar(false); }}
                                 onDoubleClick={(e) => startRename(e, file)}
                             >
                               {renamingFileId === file.id ? (
                                   <input 
                                     autoFocus 
                                     className="bg-gray-900 text-white text-xs px-1 py-0.5 rounded w-full border border-blue-500 outline-none"
                                     value={tempRenameName}
                                     onChange={(e) => setTempRenameName(e.target.value)}
                                     onBlur={finishRename}
                                     onKeyDown={(e) => e.key === 'Enter' && finishRename()}
                                     onClick={(e) => e.stopPropagation()}
                                   />
                               ) : (
                                   <>
                                     <div className="flex items-center truncate">
                                       {isGitKeep ? <Folder size={14} className="mr-2 flex-shrink-0 text-blue-400" /> : <FileCode size={14} className={`mr-2 flex-shrink-0 ${activeFileId === file.id ? 'text-blue-400' : 'text-gray-500'}`} />}
                                       {/* Show full path minus filename if needed, but for flat list, path is clearest */}
                                       <span className="truncate">{isGitKeep ? file.path.replace('/.gitkeep','') : file.path}</span>
                                     </div>
                                     <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                         {file.analysis && file.analysis.issues.length > 0 && <div className={`w-1.5 h-1.5 rounded-full ${file.analysis.issues.some(i => i.severity === 'CRITICAL') ? 'bg-red-500' : 'bg-green-500'}`} />}
                                         <button onClick={(e) => handleDeleteFile(e, file.id)} className="p-1 hover:text-red-400 text-gray-600"><Trash2 size={12} /></button>
                                     </div>
                                   </>
                               )}
                             </li>
                        )})}
                    </ul>
                </div>
                <div className="p-3 border-t border-gray-800">
                    <button onClick={handleProjectAnalysis} disabled={currentProject?.isAnalyzing} className="w-full py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded text-sm font-medium flex justify-center gap-2 shadow-lg disabled:opacity-50">
                        {currentProject?.isAnalyzing ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Server size={16} />} Project Audit
                    </button>
                </div>
            </div>

            {/* Main Editor */}
            <div className="flex-1 flex flex-col min-w-0 h-full w-full">
                {activeFile ? (
                    <>
                        <div className="h-10 border-b border-gray-800 flex items-center justify-between px-4 bg-[#0d1117] flex-shrink-0">
                            <span className="font-mono text-sm text-gray-400 flex items-center gap-2"><FileCode size={14}/> {activeFile.path}</span>
                            <div className="flex items-center gap-2">
                                {showDiff ? (
                                    <>
                                        <button onClick={handleAcceptFix} className="bg-green-600 text-white text-xs px-2 py-1 rounded">Accept</button>
                                        <button onClick={handleRejectFix} className="bg-red-600 text-white text-xs px-2 py-1 rounded">Reject</button>
                                    </>
                                ) : (
                                    <>
                                        <button onClick={() => setShowDiff(!showDiff)} disabled={!activeFile.stagingContent} className={`p-1 rounded ${activeFile.stagingContent ? 'text-purple-400' : 'text-gray-600'}`}><Split size={16}/></button>
                                        <button onClick={handleFileAnalysis} disabled={activeFile.isAnalyzing} className="flex items-center gap-1 px-3 py-1 bg-gray-800 border border-gray-700 text-gray-200 text-xs rounded hover:bg-gray-700">{activeFile.isAnalyzing ? 'Scanning...' : 'Analyze'}</button>
                                    </>
                                )}
                            </div>
                        </div>
                        <div className="flex-1 overflow-hidden relative">
                            {activeFile.isFixing && <div className="absolute inset-0 z-10 bg-black/50 flex items-center justify-center backdrop-blur-sm"><div className="flex flex-col items-center"><Wand2 className="text-purple-400 animate-pulse mb-2" size={32}/><p className="text-white text-sm">Fixing...</p></div></div>}
                            <CodeEditor 
                                fileId={activeFile.id}
                                code={activeFile.content} 
                                stagingCode={activeFile.stagingContent}
                                language={activeFile.language} 
                                onChange={updateFileContent}
                                isDiffMode={showDiff}
                                onGenerateTests={handleGenerateTests}
                                onSmartRefactor={handleSmartRefactor}
                                history={activeFile.history}
                                onRevert={handleRevertVersion}
                                onSave={handleFileAnalysis}
                                showToast={showToast}
                            />
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-500">
                        <Code2 size={48} className="mb-4 opacity-20" />
                        <p>No file selected</p>
                    </div>
                )}
            </div>

            {/* Analysis Panel */}
            <div className={`absolute md:relative z-20 h-full w-full md:w-[400px] bg-[#161b22] border-l border-gray-800 flex flex-col transition-transform duration-300 ${showAnalysis ? 'translate-x-0' : 'translate-x-full md:translate-x-0'}`}>
                <div className="md:hidden p-2 flex justify-end border-b border-gray-800"><button onClick={() => setShowAnalysis(false)} className="p-2 text-gray-400"><X size={20}/></button></div>
                <AnalysisPanel 
                    fileResult={activeFile?.analysis}
                    projectResult={currentProject?.projectAnalysis}
                    isAnalyzing={activeFile?.isAnalyzing || currentProject?.isAnalyzing || false}
                    type={activeFile?.analysis ? 'file' : 'project'}
                    onFixIssue={handleFixCode}
                    onFixAll={handleFixAllIssues}
                    chatMessages={chatMessages}
                    onSendMessage={handleSendMessage}
                    isChatTyping={isChatTyping}
                    onSmartRefactor={handleSmartRefactor}
                />
            </div>
        </div>
    </div>
  );
};

export default App;
