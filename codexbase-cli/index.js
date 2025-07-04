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

// Add file(s) and commit directly (no staging)
program
  .command('commit <repoId> <file...>')
  .option('-m, --message <msg>', 'Commit message')
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
    const commitFiles = files.map(file => ({
      name: file,
      content: fs.readFileSync(file, 'utf8')
    }));
    const res = await fetch(`${API_URL}/repository/${repoId}/commit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ message: options.message, files: commitFiles }),
    });
    if (res.ok) {
      console.log('Committed and pushed files!');
    } else {
      const err = await res.text();
      console.log('Commit failed:', err);
    }
  });

// Push all files in current directory as a commit
program
  .command('pushall <repoId>')
  .option('-m, --message <msg>', 'Commit message')
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
    const files = fs.readdirSync('.').filter(f => fs.lstatSync(f).isFile() && !f.startsWith('.codexbase'));
    const commitFiles = files.map(file => ({
      name: file,
      content: fs.readFileSync(file, 'utf8')
    }));
    const res = await fetch(`${API_URL}/repository/${repoId}/commit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ message: options.message, files: commitFiles }),
    });
    if (res.ok) {
      console.log('All files committed and pushed!');
    } else {
      const err = await res.text();
      console.log('Push failed:', err);
    }
  });

// Pull latest files and commits
program
  .command('pull <repoId>')
  .description('Pull latest files and commits')
  .action(async (repoId) => {
    const token = getToken();
    if (!token) {
      console.log('Please login first using: codexbase login <token>');
      return;
    }
    const res = await fetch(`${API_URL}/repository/${repoId}/pull`, {
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

// Clone repository (download all files)
program
  .command('clone <repoId>')
  .description('Clone repository files and commits')
  .action(async (repoId) => {
    const token = getToken();
    if (!token) {
      console.log('Please login first using: codexbase login <token>');
      return;
    }
    const res = await fetch(`${API_URL}/repository/${repoId}/clone`, {
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

// Show commit history
program
  .command('log <repoId>')
  .description('Show commit history')
  .action(async (repoId) => {
    const token = getToken();
    if (!token) {
      console.log('Please login first using: codexbase login <token>');
      return;
    }
    const res = await fetch(`${API_URL}/repository/${repoId}/commits`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      const err = await res.text();
      console.log('Log failed:', err);
      return;
    }
    const commits = await res.json();
    commits.forEach(commit => {
      console.log(`- ${commit.hash} | ${commit.author?.name || 'unknown'} | ${commit.message} | ${commit.createdAt}`);
    });
  });

program.parse(process.argv);