import { GoogleGenAI, Type, Schema } from "@google/genai";
import { AnalysisResult, Severity, ProjectAnalysis, FileData, ChatMessage } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const analysisSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    overallScore: { type: Type.NUMBER, description: "A score from 0 to 100 representing overall code quality." },
    securityScore: { type: Type.NUMBER, description: "A score from 0 to 100 representing security posture." },
    maintainabilityScore: { type: Type.NUMBER, description: "A score from 0 to 100 representing code maintainability." },
    summary: { type: Type.STRING, description: "A brief executive summary of the code analysis." },
    issues: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          severity: { type: Type.STRING, enum: [Severity.INFO, Severity.LOW, Severity.MEDIUM, Severity.HIGH, Severity.CRITICAL] },
          line: { type: Type.INTEGER, description: "The line number where the issue occurs. If general, use 0." },
          title: { type: Type.STRING, description: "Short title of the issue." },
          description: { type: Type.STRING, description: "Detailed explanation of why this is an issue." },
          suggestion: { type: Type.STRING, description: "Code snippet or text suggestion to fix the issue." }
        },
        required: ["severity", "title", "description", "suggestion"]
      }
    }
  },
  required: ["overallScore", "securityScore", "maintainabilityScore", "summary", "issues"]
};

const projectAnalysisSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    architectureScore: { type: Type.NUMBER, description: "0-100 rating of system design." },
    securityScore: { type: Type.NUMBER, description: "0-100 rating of security." },
    qualityScore: { type: Type.NUMBER, description: "0-100 rating of code cleaniness." },
    securityPosture: { type: Type.STRING, enum: ["WEAK", "MODERATE", "STRONG", "EXCELLENT"] },
    techStack: { 
      type: Type.ARRAY, 
      items: { 
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          version: { type: Type.STRING },
          health: { type: Type.STRING, enum: ["GOOD", "OUTDATED", "VULNERABLE"] }
        },
        required: ["name", "health"]
      } 
    },
    summary: { type: Type.STRING },
    majorVulnerabilities: { type: Type.ARRAY, items: { type: Type.STRING } },
    recommendations: { type: Type.ARRAY, items: { type: Type.STRING } },
    fileInsights: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          path: { type: Type.STRING },
          status: { type: Type.STRING, enum: ["SAFE", "WARNING", "DANGER"] },
          comment: { type: Type.STRING }
        },
        required: ["path", "status", "comment"]
      }
    },
    productionReadiness: {
      type: Type.OBJECT,
      properties: {
        score: { type: Type.NUMBER },
        scalabilityIssues: { type: Type.ARRAY, items: { type: Type.STRING } },
        hardcodedSecrets: { type: Type.ARRAY, items: { type: Type.STRING } },
        missingLogging: { type: Type.ARRAY, items: { type: Type.STRING } },
        errorHandlingGaps: { type: Type.ARRAY, items: { type: Type.STRING } }
      },
      required: ["score", "scalabilityIssues", "hardcodedSecrets", "missingLogging", "errorHandlingGaps"]
    },
    performanceAudit: {
      type: Type.OBJECT,
      properties: {
        score: { type: Type.NUMBER, description: "0-100 rating for performance efficiency." },
        bottlenecks: { type: Type.ARRAY, items: { type: Type.STRING } },
        optimizationSuggestions: { type: Type.ARRAY, items: { type: Type.STRING } },
        resourceIntensiveFiles: { type: Type.ARRAY, items: { type: Type.STRING }, description: "List of files that might be slow." }
      },
      required: ["score", "bottlenecks", "optimizationSuggestions", "resourceIntensiveFiles"]
    }
  },
  required: ["architectureScore", "securityScore", "qualityScore", "securityPosture", "techStack", "summary", "majorVulnerabilities", "recommendations", "fileInsights", "productionReadiness", "performanceAudit"]
};

export const analyzeCode = async (code: string, filename: string): Promise<AnalysisResult> => {
  try {
    const prompt = `
      You are an expert Senior Security Engineer and Code Auditor.
      Analyze the following code file named "${filename}".
      
      Focus on every aspects and perspective including these points:
      1. Real Security Vulnerabilities (OWASP Top 10, Injection, XSS, etc.)
      2. Serious Logic Errors that break functionality.
      3. Critical Performance bottlenecks.
      4. Syntax errors.

      Also report:
      - Trivial styling preferences (like indentation, semicolons, var vs const unless crucial).
      - Nitpicks about missing comments unless the code is unreadable.
      - General "best practices" unless they have a tangible impact.

      IMPORTANT: 
      If the code is standard, secure, and functional, return an empty "issues" array and high scores (95-100). 
      Do not invent issues just to fill the list.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        { text: prompt },
        { text: `CODE:\n${code}` }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: analysisSchema,
        thinkingConfig: { thinkingBudget: 1024 },
        maxOutputTokens: 8192
      }
    });

    if (response.text) {
      const result = JSON.parse(response.text) as AnalysisResult;
      result.timestamp = Date.now();
      return result;
    }
    
    throw new Error("No response generated");
  } catch (error) {
    console.error("Gemini Analysis Failed:", error);
    throw error;
  }
};

export const generateCodeFix = async (code: string, issueDescription: string, language: string, projectContext?: string): Promise<string> => {
    try {
        const prompt = `
            You are a Senior Principal Engineer.
            Task: Refactor or fix the following code.
            
            Language: ${language}
            Goal: ${issueDescription}
            
            ${projectContext ? `PROJECT CONTEXT (The file belongs to this project structure): \n${projectContext}` : ''}

            Requirements:
            1. Return ONLY the full corrected code.
            2. Apply best practices for performance, security, and readability.
            3. Ensure the fix aligns with the provided project context (if any).
            4. Do not add markdown blocks (\`\`\`) or explanations. Just the code.
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [
                { text: prompt },
                { text: `ORIGINAL CODE:\n${code}` }
            ]
        });

        let cleanCode = response.text || code;
        if (cleanCode.startsWith('```')) {
            cleanCode = cleanCode.replace(/^```[a-z]*\n/i, '').replace(/\n```$/, '');
        }
        return cleanCode;
    } catch (error) {
        console.error("Code Fix Failed", error);
        throw error;
    }
};

// New Service for Chat-based Editing
export const agentEditCode = async (code: string, instruction: string, language: string, projectContext?: string): Promise<{code: string, summary: string}> => {
    try {
        const prompt = `
            You are an intelligent Code Editor Agent.
            User Instruction: "${instruction}"
            
            Language: ${language}
            
            ${projectContext ? `PROJECT CONTEXT:\n${projectContext}` : ''}
            
            Task:
            1. Apply the user's instruction to the provided code.
            2. Return a JSON object containing the new code and a very brief summary of changes.
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [
                { text: prompt },
                { text: `CODE:\n${code}` }
            ],
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        code: { type: Type.STRING },
                        summary: { type: Type.STRING }
                    },
                    required: ["code", "summary"]
                }
            }
        });

        if (response.text) {
             return JSON.parse(response.text);
        }
        throw new Error("No edit generated");

    } catch (error) {
        console.error("Agent Edit Failed", error);
        throw error;
    }
}

export const generateUnitTests = async (code: string, filename: string): Promise<string> => {
    try {
        const prompt = `
            You are a QA Automation Engineer. Generate a comprehensive unit test file for the provided code.
            
            Filename: ${filename}
            
            1. Use the most popular testing framework for the language (e.g., Jest/Vitest for JS/TS, PyTest for Python, JUnit for Java).
            2. Cover happy paths, edge cases, and error handling.
            3. Return ONLY the code for the test file (no markdown, no explanations).
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [
                { text: prompt },
                { text: `SOURCE CODE:\n${code}` }
            ],
            config: {
                thinkingConfig: { thinkingBudget: 1024 },
                maxOutputTokens: 8192
            }
        });

        let cleanCode = response.text || "";
        if (cleanCode.startsWith('```')) {
            cleanCode = cleanCode.replace(/^```[a-z]*\n/i, '').replace(/\n```$/, '');
        }
        return cleanCode;
    } catch (error) {
        console.error("Test Generation Failed", error);
        throw error;
    }
};

export const analyzeProject = async (files: FileData[], projectName: string): Promise<ProjectAnalysis> => {
    try {
        // Prepare context: File structure + Content of configuration/key files
        const fileStructure = files.map(f => f.path).join('\n');
        
        // Pick critical files for context
        const criticalFiles = files.filter(f => 
            f.name.match(/package\.json|tsconfig\.json|requirements\.txt|dockerfile|readme\.md|index\.|app\.|server\./i)
        ).slice(0, 15);

        const prompt = `
            You are a Chief Technology Officer and Security Architect. 
            Analyze this project named "${projectName}".
            
            Based on the file structure and key configuration files provided below:
            1. Identify the Tech Stack and rate its health (Modern/Good vs Legacy/Vulnerable).
            2. Evaluate the Project Architecture, Security, and Code Quality. Give scores out of 100.
            3. Provide a "File Wise Report" (fileInsights) - for files you see in the structure, infer their risk based on naming conventions and content.
            4. Perform a "Production Readiness Audit": Check for scalability, secrets, logging, and error handling gaps.
            5. Perform a "Performance Audit": Identify algorithmic complexity issues, potential memory leaks, unoptimized queries, and resource-heavy files.
            6. IMPORTANT: If the project is a standard boilerplate or looks clean, rate it highly (Strong/Excellent). Do not force findings.

            File Structure:
            ${fileStructure}

            Key Files Content:
            ${criticalFiles.map(f => `--- ${f.name} ---\n${f.content.substring(0, 2000)}`).join('\n\n')}
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [{ text: prompt }],
            config: {
                responseMimeType: "application/json",
                responseSchema: projectAnalysisSchema,
                thinkingConfig: { thinkingBudget: 2048 },
                maxOutputTokens: 16384
            }
        });

        if (response.text) {
            const result = JSON.parse(response.text) as ProjectAnalysis;
            result.timestamp = Date.now();
            return result;
        }

        throw new Error("No project response");
    } catch (error) {
        console.error("Project Analysis Failed", error);
        throw error;
    }
}

export const chatWithAI = async (
    history: ChatMessage[], 
    newMessage: string, 
    currentFile: FileData | undefined, 
    projectContext: string
): Promise<string> => {
    try {
        const prompt = `
            You are a Senior Lead Developer and Mentor. 
            Answer the user's question about their code or project.
            
            Context:
            - Current File: ${currentFile ? currentFile.name : 'None selected'}
            - Project Structure:
            ${projectContext}
            
            ${currentFile ? `Current File Content:\n${currentFile.content.substring(0, 5000)}` : ''}
            
            Question: ${newMessage}
        `;

        const chatSession = ai.chats.create({
            model: 'gemini-2.5-flash',
            config: {
                systemInstruction: "You are a helpful, expert coding assistant. Keep answers concise, practical, and code-focused.",
            }
        });

        const response = await chatSession.sendMessage({ message: prompt });
        return response.text || "I couldn't generate a response.";

    } catch (error) {
        console.error("Chat Failed", error);
        throw error;
    }
}