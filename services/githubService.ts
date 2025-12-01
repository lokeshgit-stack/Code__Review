import { FileData } from "../types";

const IGNORED_PATHS = [
  'node_modules', 
  '.git', 
  'dist', 
  'build', 
  'package-lock.json', 
  'yarn.lock', 
  '.DS_Store',
  'coverage',
  '.next',
  '.vscode',
  '__pycache__',
  '.idea'
];

interface GithubTreeItem {
  path: string;
  mode: string;
  type: 'blob' | 'tree';
  sha: string;
  size?: number;
  url: string;
}

export const parseGithubUrl = (url: string) => {
  try {
    const urlObj = new URL(url);
    const parts = urlObj.pathname.split('/').filter(Boolean);
    if (parts.length < 2) return null;
    return { owner: parts[0], repo: parts[1] };
  } catch (e) {
    return null;
  }
};

export const fetchGithubRepo = async (owner: string, repo: string): Promise<FileData[]> => {
  // 1. Get the Default Branch
  const repoResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}`);
  if (!repoResponse.ok) throw new Error("Repository not found or private");
  const repoData = await repoResponse.json();
  const defaultBranch = repoData.default_branch;

  // 2. Get the Recursive Tree
  const treeResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/trees/${defaultBranch}?recursive=1`);
  if (!treeResponse.ok) throw new Error("Failed to fetch repository tree");
  const treeData = await treeResponse.json();

  // 3. Filter Files
  const filesToFetch = (treeData.tree as GithubTreeItem[])
    .filter(item => item.type === 'blob')
    .filter(item => !IGNORED_PATHS.some(ignored => item.path.includes(ignored)))
    .slice(0, 30); // Hard limit for demo performance

  if (filesToFetch.length === 0) {
      throw new Error("No readable source files found in repository.");
  }

  const fetchedFiles: FileData[] = [];

  // 4. Fetch Content (Try Raw, Fallback to API)
  await Promise.all(filesToFetch.map(async (item) => {
    try {
        let content = '';
        const extension = item.path.split('.').pop() || 'text';

        // Method A: Raw Content (Faster, but CORS sensitive)
        const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${defaultBranch}/${item.path}`;
        try {
            const rawRes = await fetch(rawUrl);
            if (rawRes.ok) {
                content = await rawRes.text();
            } else {
                throw new Error("Raw fetch failed");
            }
        } catch (rawErr) {
            // Method B: API Content (Base64 encoded)
            console.warn(`Fallback to API for ${item.path}`);
            const apiRes = await fetch(item.url); // item.url is the git blob api url
            if (apiRes.ok) {
                const blobData = await apiRes.json();
                content = atob(blobData.content.replace(/\n/g, ''));
            }
        }

        if (content) {
            fetchedFiles.push({
                id: item.sha,
                name: item.path.split('/').pop() || item.path,
                path: item.path,
                content: content,
                language: extension,
            });
        }
    } catch (err) {
      console.warn(`Failed to fetch ${item.path}`, err);
    }
  }));

  return fetchedFiles;
};