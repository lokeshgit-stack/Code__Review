
export enum Severity {
  INFO = 'INFO',
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

export interface CodeIssue {
  severity: Severity;
  line?: number;
  title: string;
  description: string;
  suggestion: string;
}

export interface AnalysisResult {
  overallScore: number;
  summary: string;
  issues: CodeIssue[];
  securityScore: number;
  maintainabilityScore: number;
  timestamp?: number;
}

export interface FileInsight {
  path: string;
  status: 'SAFE' | 'WARNING' | 'DANGER';
  comment: string;
}

export interface ProductionReadiness {
    score: number;
    scalabilityIssues: string[];
    hardcodedSecrets: string[];
    missingLogging: string[];
    errorHandlingGaps: string[];
}

export interface PerformanceAudit {
  score: number;
  bottlenecks: string[];
  optimizationSuggestions: string[];
  resourceIntensiveFiles: string[];
}

export interface ProjectAnalysis {
  architectureScore: number;
  securityScore: number;
  qualityScore: number;
  securityPosture: string;
  techStack: { name: string; version?: string; health: 'GOOD' | 'OUTDATED' | 'VULNERABLE' }[];
  summary: string;
  majorVulnerabilities: string[];
  recommendations: string[];
  fileInsights: FileInsight[];
  productionReadiness: ProductionReadiness;
  performanceAudit: PerformanceAudit;
  timestamp: number;
}

export interface FileVersion {
  id: string;
  timestamp: number;
  content: string;
  description: string;
}

export interface CursorPosition {
  line: number;
  column: number;
}

export interface FileData {
  id: string;
  name: string;
  path: string;
  content: string;
  language: string;
  analysis?: AnalysisResult | null;
  isAnalyzing?: boolean;
  stagingContent?: string | null; // For Diff View (AI suggested fix)
  isFixing?: boolean;
  history?: FileVersion[]; // Version Control
  cursor?: CursorPosition;
}

export interface Project {
  id: string;
  name: string;
  createdAt: number;
  files: FileData[];
  projectAnalysis?: ProjectAnalysis | null;
  isAnalyzing?: boolean;
  githubUrl?: string;
}

export interface ChatMessage {
    id: string;
    role: 'user' | 'model';
    text: string;
    timestamp: number;
    isAction?: boolean; // If true, this message triggered an action (like @edit)
}
