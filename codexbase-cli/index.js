#!/usr/bin/env node
const { program } = require('commander');
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

const API_URL = 'http://localhost:5000';

// Helper: read token from config file
function getToken() {
  const configPath = path.join(process.cwd(), '.codexbaseconfig');
  if (fs.existsSync(configPath)) {
    const config = JSON.parse(fs.readFileSync(configPath));
    return config.token;
  }
  return null;
}

// Helper: save token to config file
function saveToken(token) {
  const configPath = path.join(process.cwd(), '.codexbaseconfig');
  fs.writeFileSync(configPath, JSON.stringify({ token }, null, 2));
}

// Login (save token locally)
program
  .command('login <token>')
  .description('Save your authentication token locally')
  .action((token) => {
    saveToken(token);
    console.log('Token saved!');
  });

// Commit one or more files directly (optionally on a branch)
program
  .command('commit <repoId> <file...>')
  .option('-m, --message <msg>', 'Commit message')
  .option('-b, --branch <branch>', 'Branch name (default: main)')
  .description('Commit one or more files directly')
  .action(async (repoId, files, options) => {
    const token = getToken();
    if (!token) {
      console.log('Please login first using: codexbase login <token>');
      return;
    }
    if (!options.message) {
      console.log('Please provide a commit message with -m "message"');
      return;
    }
    const branch = options.branch || 'main';
    const commitFiles = files.map(file => ({
      name: file,
      content: fs.readFileSync(file, 'utf8')
    }));
    const res = await fetch(`${API_URL}/repository/${repoId}/commit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ message: options.message, files: commitFiles, branch }),
    });
    if (res.ok) {
      console.log('Committed and pushed files!');
    } else {
      const err = await res.text();
      console.log('Commit failed:', err);
    }
  });

// Push all files in current directory as a commit (optionally on a branch)
program
  .command('pushall <repoId>')
  .option('-m, --message <msg>', 'Commit message')
  .option('-b, --branch <branch>', 'Branch name (default: main)')
  .description('Push all files in current directory as a commit')
  .action(async (repoId, options) => {
    const token = getToken();
    if (!token) {
      console.log('Please login first using: codexbase login <token>');
      return;
    }
    if (!options.message) {
      console.log('Please provide a commit message with -m "message"');
      return;
    }
    const branch = options.branch || 'main';
    const files = fs.readdirSync('.').filter(f => fs.lstatSync(f).isFile() && !f.startsWith('.codexbase'));
    const commitFiles = files.map(file => ({
      name: file,
      content: fs.readFileSync(file, 'utf8')
    }));
    const res = await fetch(`${API_URL}/repository/${repoId}/commit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ message: options.message, files: commitFiles, branch }),
    });
    if (res.ok) {
      console.log('All files committed and pushed!');
    } else {
      const err = await res.text();
      console.log('Push failed:', err);
    }
  });

// Pull latest files and commits (optionally for a branch)
program
  .command('pull <repoId>')
  .option('-b, --branch <branch>', 'Branch name (default: main)')
  .description('Pull latest files and commits')
  .action(async (repoId, options) => {
    const token = getToken();
    if (!token) {
      console.log('Please login first using: codexbase login <token>');
      return;
    }
    const branch = options.branch || 'main';
    const res = await fetch(`${API_URL}/repository/${repoId}/pull?branch=${branch}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      const err = await res.text();
      console.log('Pull failed:', err);
      return;
    }
    const data = await res.json();
    fs.writeFileSync('.codexbase-files.json', JSON.stringify(data.files, null, 2));
    fs.writeFileSync('.codexbase-commits.json', JSON.stringify(data.commits, null, 2));
    console.log('Pulled latest files and commits');
  });

// Clone repository (download all files, optionally for a branch)
program
  .command('clone <repoId>')
  .option('-b, --branch <branch>', 'Branch name (default: main)')
  .description('Clone repository files and commits')
  .action(async (repoId, options) => {
    const token = getToken();
    if (!token) {
      console.log('Please login first using: codexbase login <token>');
      return;
    }
    const branch = options.branch || 'main';
    const res = await fetch(`${API_URL}/repository/${repoId}/clone?branch=${branch}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      const err = await res.text();
      console.log('Clone failed:', err);
      return;
    }
    const data = await res.json();
    data.files.forEach(file => {
      fs.writeFileSync(file.name, file.content);
    });
    fs.writeFileSync('.codexbase-commits.json', JSON.stringify(data.commits, null, 2));
    console.log('Cloned repository');
  });

// Show commit history (optionally for a branch)
program
  .command('log <repoId>')
  .option('-b, --branch <branch>', 'Branch name (default: main)')
  .description('Show commit history')
  .action(async (repoId, options) => {
    const token = getToken();
    if (!token) {
      console.log('Please login first using: codexbase login <token>');
      return;
    }
    const branch = options.branch || 'main';
    const res = await fetch(`${API_URL}/repository/${repoId}/commits?branch=${branch}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      const err = await res.text();
      console.log('Log failed:', err);
      return;
    }
    const commits = await res.json();
    commits.forEach(commit => {
      console.log(`- ${commit.hash} | ${commit.author?.name || 'unknown'} | ${commit.message} | ${commit.createdAt} | branch: ${commit.branch || 'main'}`);
    });
  });

// List branches
program
  .command('branches <repoId>')
  .description('List all branches for a repository')
  .action(async (repoId) => {
    const token = getToken();
    if (!token) {
      console.log('Please login first using: codexbase login <token>');
      return;
    }
    const res = await fetch(`${API_URL}/repository/${repoId}/branches`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      const err = await res.text();
      console.log('Branches failed:', err);
      return;
    }
    const branches = await res.json();
    branches.forEach(branch => {
      console.log(`- ${branch}`);
    });
  });

// Create a new branch
program
  .command('branch-create <repoId> <branchName>')
  .option('-f, --from <fromBranch>', 'Source branch to copy from (default: main)')
  .description('Create a new branch from an existing branch')
  .action(async (repoId, branchName, options) => {
    const token = getToken();
    if (!token) {
      console.log('Please login first using: codexbase login <token>');
      return;
    }
    const fromBranch = options.from || 'main';
    const res = await fetch(`${API_URL}/repository/${repoId}/branch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ branchName, fromBranch }),
    });
    if (res.ok) {
      console.log(`Branch '${branchName}' created from '${fromBranch}'`);
    } else {
      const err = await res.text();
      console.log('Branch create failed:', err);
    }
  });

// Create a pull request
program
  .command('pr-create <repoId>')
  .requiredOption('-s, --source <sourceBranch>', 'Source branch')
  .requiredOption('-t, --target <targetBranch>', 'Target branch')
  .requiredOption('--title <title>', 'Pull request title')
  .option('--desc <description>', 'Pull request description')
  .description('Create a pull request')
  .action(async (repoId, options) => {
    const token = getToken();
    if (!token) {
      console.log('Please login first using: codexbase login <token>');
      return;
    }
    const res = await fetch(`${API_URL}/repository/${repoId}/pull-request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        sourceBranch: options.source,
        targetBranch: options.target,
        title: options.title,
        description: options.desc || ''
      }),
    });
    if (res.ok) {
      console.log('Pull request created!');
    } else {
      const err = await res.text();
      console.log('PR create failed:', err);
    }
  });

// List pull requests
program
  .command('pr-list <repoId>')
  .description('List all pull requests for a repository')
  .action(async (repoId) => {
    const token = getToken();
    if (!token) {
      console.log('Please login first using: codexbase login <token>');
      return;
    }
    const res = await fetch(`${API_URL}/repository/${repoId}/pull-requests`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      const err = await res.text();
      console.log('PR list failed:', err);
      return;
    }
    const prs = await res.json();
    prs.forEach(pr => {
      console.log(`- [${pr.status}] ${pr._id} | ${pr.title} | ${pr.sourceBranch} -> ${pr.targetBranch} | by ${pr.author}`);
    });
  });

// Merge a pull request
program
  .command('pr-merge <prId>')
  .description('Merge a pull request')
  .action(async (prId) => {
    const token = getToken();
    if (!token) {
      console.log('Please login first using: codexbase login <token>');
      return;
    }
    const res = await fetch(`${API_URL}/repository/pull-request/${prId}/merge`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      console.log('Pull request merged!');
    } else {
      const err = await res.text();
      console.log('PR merge failed:', err);
    }
  });

program.parse(process.argv);