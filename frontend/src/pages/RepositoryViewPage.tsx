import React, { useEffect, useState, useRef } from 'react';
import {
  Box, Heading, Text, Button, VStack, Input, HStack, Icon, useToast, Spinner, Code, useClipboard, Modal, ModalOverlay, ModalContent, ModalHeader, ModalCloseButton, ModalBody, ModalFooter, Textarea, Badge, Progress, Tooltip, List, ListItem, Avatar, Alert, AlertIcon
} from '@chakra-ui/react';
import { FaFileAlt, FaEdit, FaUpload, FaCodeBranch, FaTerminal, FaCopy, FaChartPie, FaRobot, FaLightbulb, FaUserPlus, FaTimes } from 'react-icons/fa';
import { useParams } from 'react-router-dom';
import { useDisclosure } from '@chakra-ui/react';
import { useAuth } from '../contexts/AuthContext';
import { authenticatedFetch } from '../utils/tokenManager';

const RepositoryViewPage: React.FC = () => {
  const { repoId } = useParams<{ repoId: string }>();
  const [repo, setRepo] = useState<any>(null);
  const [files, setFiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [commitMessage, setCommitMessage] = useState('');
  const [uploading, setUploading] = useState(false);
  const [editingFile, setEditingFile] = useState<any>(null);
  const [editingContent, setEditingContent] = useState('');
  const [editingLoading, setEditingLoading] = useState(false);
  const [commits, setCommits] = useState<any[]>([]);
  const [commitsLoading, setCommitsLoading] = useState(false);
  const [branches, setBranches] = useState<string[]>([]);
  const [selectedBranch, setSelectedBranch] = useState('main');
  const toast = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [pullRequests, setPullRequests] = useState<any[]>([]);
  const [pullRequestsLoading, setPullRequestsLoading] = useState(false);
  const [viewingFile, setViewingFile] = useState<any>(null);
  const [langStats, setLangStats] = useState<Record<string, number>>({});
  const [langStatsLoading, setLangStatsLoading] = useState(true);

  const [aiExplainLoading, setAiExplainLoading] = useState(false);
  const [aiExplain, setAiExplain] = useState<string | null>(null);
  const [aiExplainFile, setAiExplainFile] = useState<any>(null);
  const [aiCommitMsgLoading, setAiCommitMsgLoading] = useState(false);
  const [aiCommitMsg, setAiCommitMsg] = useState<string | null>(null);
  const [aiReviewFeedback, setAiReviewFeedback] = useState<{ [prId: string]: string | null }>({});
  const [aiSummary, setAiSummary] = useState<{ [prId: string]: string | null }>({});
  const [aiReviewLoading, setAiReviewLoading] = useState<{ [prId: string]: boolean }>({});
  const [aiSummaryLoading, setAiSummaryLoading] = useState<{ [prId: string]: boolean }>({});
  const [comments, setComments] = useState<{ [prId: string]: any[] }>({});
  const [commentInputs, setCommentInputs] = useState<{ [prId: string]: string }>({});
  const [commentsLoading, setCommentsLoading] = useState<{ [prId: string]: boolean }>({});
  const [commentsOpen, setCommentsOpen] = useState<{ [prId: string]: boolean }>({});

  // 🎯 INVITE LOGIC DIN CODUL TAU
  const [inviteInput, setInviteInput] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

  // Get auth context
  const { user, isAuthenticated } = useAuth();

 
  // Token for CLI - folosește accessToken din sesiune
  const token = localStorage.getItem('accessToken');
  const { onCopy, hasCopied } = useClipboard(token || '');

  // User id for edit rights
  const userId = user?.id || (user as any)?._id || '';

  console.log('🔍 User info:', { user, userId });

  // 🎯 INVITE FUNCTIONS DIN CODUL TAU
  // Caută utilizatori după username/email și afișează lista
  const handleSearchUsers = async (value: string) => {
    setInviteInput(value);
    setSearchResults([]);
    if (!value || value.length < 2) return;
    setSearching(true);
    try {
      const res = await authenticatedFetch('/user/find', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: value }),
      });
      const data = await res.json();
      if (res.ok && data.users) {
        setSearchResults(data.users);
      } else {
        setSearchResults([]);
      }
    } catch {
      setSearchResults([]);
    }
    setSearching(false);
  };

  // Invită utilizatorul selectat din listă
  const handleInviteUser = async (userId: string) => {
    setInviteLoading(true);
    try {
      const resInvite = await authenticatedFetch(`/invitation/${repoId}/invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId }),
      });
      if (resInvite.ok) {
        toast({ title: "User invited!", status: "success" });
        setInviteInput('');
        setSearchResults([]);
      } else {
        const err = await resInvite.json();
        toast({ title: err.message || "Error inviting user", status: "error" });
      }
    } catch {
      toast({ title: "Server error", status: "error" });
    }
    setInviteLoading(false);
  };

  useEffect(() => {
    const fetchLangStats = async () => {
      setLangStatsLoading(true);
      try {
        const res = await authenticatedFetch(`/repository/${repoId}/lang-stats`);
        const data = await res.json();
        setLangStats(data);
      } catch {
        setLangStats({});
      }
      setLangStatsLoading(false);
    };
    fetchLangStats();
  }, [repoId, files.length]);

  // Fetch repo, branches, PRs
  useEffect(() => {
    const fetchRepo = async () => {
      setLoading(true);
      try {
        console.log(`[Frontend] Fetching repository ${repoId}`);
        const url = `/repository/${repoId}`;
        console.log(`[Frontend] Full URL: ${url}`);
        const res = await authenticatedFetch(url);
        console.log(`[Frontend] Response status: ${res.status}`);
        console.log(`[Frontend] Response headers:`, Object.fromEntries(res.headers.entries()));
        
        if (res.ok) {
          const data = await res.json();
          console.log(`[Frontend] Repository data received:`, data);
          setRepo(data);
        } else {
          console.error(`[Frontend] Repository fetch failed: ${res.status} ${res.statusText}`);
          const responseText = await res.text();
          console.error(`[Frontend] Error response body:`, responseText);
          setRepo(null);
        }
      } catch (error) {
        console.error(`[Frontend] Repository fetch error:`, error);
        setRepo(null);
      }
      setLoading(false);
    };
    const fetchPRs = async () => {
      setPullRequestsLoading(true);
      try {
        const res = await authenticatedFetch(`/repository/${repoId}/pull-requests`);
        const data = await res.json();
        setPullRequests(Array.isArray(data) ? data : []);
      } catch {
        setPullRequests([]);
      }
      setPullRequestsLoading(false);
    };
    const fetchBranches = async () => {
      try {
        const res = await authenticatedFetch(`/repository/${repoId}/branches`);
        let data = await res.json();
        if (!Array.isArray(data) || data.length === 0) {
          data = ['main'];
        } else if (!data.includes('main')) {
          data = ['main', ...data];
        }
        setBranches(data);
        if (!data.includes(selectedBranch)) setSelectedBranch('main');
      } catch {
        setBranches(['main']);
        setSelectedBranch('main');
      }
    };
    fetchRepo();
    fetchBranches();
    if (repoId) fetchPRs();
    // eslint-disable-next-line
  }, [repoId]);

  // Fetch files and commits when branch changes
  useEffect(() => {
    const fetchFiles = async () => {
      try {
        const res = await authenticatedFetch(`/repository/${repoId}/files?branch=${selectedBranch}`);
        const data = await res.json();
        setFiles(data);
      } catch {
        setFiles([]);
      }
    };

    const fetchCommits = async () => {
      setCommitsLoading(true);
      try {
        const res = await authenticatedFetch(`/repository/${repoId}/commits?branch=${selectedBranch}`);
        const data = await res.json();
        setCommits(data);
      } catch {
        setCommits([]);
      }
      setCommitsLoading(false);
    };

    fetchFiles();
    fetchCommits();
    // eslint-disable-next-line
  }, [repoId, selectedBranch, token]);

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  };
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
  };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setSelectedFile(e.dataTransfer.files[0]);
    }
  };
  const handleDeleteFile = async (fileName: string) => {
    if (!window.confirm(`Are you sure you want to delete "${fileName}" from branch "${selectedBranch}"?`)) return;
    try {
      const res = await authenticatedFetch(`/repository/${repoId}/file`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: fileName, branch: selectedBranch }),
      });
      if (res.ok) {
        toast({ title: "File deleted!", status: "success" });
        // Refresh files and commits
        const filesRes = await authenticatedFetch(`/repository/${repoId}/files?branch=${selectedBranch}`);
        setFiles(await filesRes.json());
        const commitsRes = await authenticatedFetch(`/repository/${repoId}/commits?branch=${selectedBranch}`);
        setCommits(await commitsRes.json());
      } else {
        toast({ title: "Error deleting file", status: "error" });
      }
    } catch {
      toast({ title: "Server error", status: "error" });
    }
  };
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
    }
  };

  // Upload file and commit
  const handleUploadAndCommit = async () => {
    console.log('🔧 Starting upload process...', { selectedFile, commitMessage });
    
    if (!selectedFile || !commitMessage) {
      toast({ title: "Select a file and enter a commit message!", status: "warning" });
      return;
    }
    
    // Check file size (50MB limit for testing - increased from 10MB)
    const maxSize = 50 * 1024 * 1024; // 50MB in bytes
    console.log('🔧 File size check:', { 
      fileSize: selectedFile.size, 
      maxSize, 
      fileSizeMB: (selectedFile.size / 1024 / 1024).toFixed(1),
      fileSizeKB: (selectedFile.size / 1024).toFixed(1)
    });
    
    if (selectedFile.size > maxSize) {
      toast({ 
        title: "File too large!", 
        description: `File size is ${(selectedFile.size / 1024 / 1024).toFixed(1)}MB. Maximum allowed is 50MB for testing.`,
        status: "error" 
      });
      return;
    }
    
    setUploading(true);
    try {
      console.log('🔧 Reading file content...');
      const fileText = await selectedFile.text();
      console.log('🔧 File content read:', { 
        contentLength: fileText.length,
        fileName: selectedFile.name,
        firstChars: fileText.substring(0, 100) + '...'
      });
      
      const requestBody = {
        message: commitMessage,
        files: [{ name: selectedFile.name, content: fileText }],
        branch: selectedBranch,
      };
      
      console.log('🔧 Making request to:', `/repository/${repoId}/commit`);
      console.log('🔧 Request body structure:', {
        message: requestBody.message,
        filesCount: requestBody.files.length,
        fileName: requestBody.files[0].name,
        contentSize: requestBody.files[0].content.length,
        branch: requestBody.branch
      });
      
      const jsonBody = JSON.stringify(requestBody);
      const jsonSizeBytes = new Blob([jsonBody]).size;
      const jsonSizeMB = (jsonSizeBytes / 1024 / 1024).toFixed(2);
      
      console.log('🔧 JSON payload size:', {
        bytes: jsonSizeBytes,
        mb: jsonSizeMB,
        isLargePayload: jsonSizeBytes > 50 * 1024 * 1024
      });
      

      // Folosește accessToken din localStorage pentru commit (CLI și API)
      const accessToken = localStorage.getItem('accessToken');
      const commitUrl = `/repository/${repoId}/commit`;
      console.log('[Commit] URL:', commitUrl);
      const res = await authenticatedFetch(commitUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify(requestBody),
      });
      
      console.log('🔧 Upload response:', { 
        status: res.status, 
        statusText: res.statusText,
        ok: res.ok 
      });
      if (res.ok) {
        const responseData = await res.json();
        console.log('🔧 Upload response data:', responseData);
        
        // Check if there are security warnings
        if (responseData.securityWarning) {
          toast({ 
            title: "File uploaded with security warning!", 
            description: responseData.securityWarning,
            status: "warning",
            duration: 6000,
            isClosable: true
          });
        } else {
          toast({ title: "File uploaded & committed!", status: "success" });
        }
        
        setSelectedFile(null);
        setCommitMessage('');
        // Refresh files and commits
        const filesRes = await authenticatedFetch(`/repository/${repoId}/files?branch=${selectedBranch}`);
        setFiles(await filesRes.json());
        const commitsRes = await authenticatedFetch(`/repository/${repoId}/commits?branch=${selectedBranch}`);
        setCommits(await commitsRes.json());
      } else {
        const errorText = await res.text();
        console.log('🔧 Upload failed with error:', { 
          status: res.status, 
          statusText: res.statusText,
          errorText 
        });
        toast({ title: "Error uploading file", status: "error" });
      }
    } catch (error) {
      console.log('🔧 Upload caught exception:', error);
      toast({ title: "Server error", status: "error" });
    }
    setUploading(false);
  };

  // Edit file logic
  const canEdit = repo && (
    (repo.owner?._id?.toString?.() || repo.owner?.toString?.() || repo.owner) === userId ||
    (repo.collaborators && repo.collaborators.some((c: any) =>
      (c?._id?.toString?.() || c?.toString?.() || c) === userId
    ))
  );

  // Debug logs for ownership
  console.log('🔍 Ownership check:', {
    userId,
    repoOwner: repo?.owner,
    repoOwnerId: repo?.owner?._id?.toString?.() || repo?.owner?.toString?.() || repo?.owner,
    canEdit,
    isOwner: repo && ((repo.owner?._id?.toString?.() || repo.owner?.toString?.() || repo.owner) === userId),
    collaborators: repo?.collaborators,
    repo: repo,
    user: user
  });
  localStorage.getItem('token');
        console.log(localStorage.getItem('token'));
  
  console.log('🔍 Detailed comparison:', {
    'userId (from user.id)': userId,
    'repo.owner': repo?.owner,
    'repo.owner._id': repo?.owner?._id,
    'repo.owner._id.toString()': repo?.owner?._id?.toString?.(),
    'Are they equal?': (repo?.owner?._id?.toString?.() || repo?.owner?.toString?.() || repo?.owner) === userId,
    'typeof userId': typeof userId,
    'typeof repoOwnerId': typeof (repo?.owner?._id?.toString?.() || repo?.owner?.toString?.() || repo?.owner),
    'canEdit': canEdit,
    'repo exists': !!repo,
    'userId exists': !!userId,
    'user object': user
  });
  const handleOpenEdit = (file: any) => {
    setEditingFile(file);
    setEditingContent(file.content);
  };

  const handleSaveEdit = async () => {
    if (!editingFile) return;
    setEditingLoading(true);
    try {
      const res = await authenticatedFetch(`/repository/${repoId}/commit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: `Edit ${editingFile.name}`,
          files: [{ name: editingFile.name, content: editingContent }],
          branch: selectedBranch,
        }),
      });
      if (res.ok) {
        toast({ title: "File updated!", status: "success" });
        setEditingFile(null);
        setEditingContent('');
        // Refresh files and commits
        const filesRes = await authenticatedFetch(`/repository/${repoId}/files?branch=${selectedBranch}`);
        setFiles(await filesRes.json());
        const commitsRes = await authenticatedFetch(`/repository/${repoId}/commits?branch=${selectedBranch}`);
        setCommits(await commitsRes.json());
      } else {
        toast({ title: "Error updating file", status: "error" });
      }
    } catch {
      toast({ title: "Server error", status: "error" });
    }
    setEditingLoading(false);
  };

  const handleCancelEdit = () => {
    setEditingFile(null);
    setEditingContent('');
  };

  // Vizualizare cod fișier (oricine poate vedea, doar colaboratorii pot edita)
  const handleViewFile = (file: any) => {
    setViewingFile(file);
  };
  const handleCloseViewFile = () => {
    setViewingFile(null);
  };

  const handleAIReview = async (pr: any) => {
    setAiReviewLoading(prev => ({ ...prev, [pr._id]: true }));
    setAiReviewFeedback(prev => ({ ...prev, [pr._id]: null }));
    if (!(pr.diff || pr.diffText) || !pr._id) {
      setAiReviewFeedback(prev => ({ ...prev, [pr._id]: "No diff or PR id available for AI review." }));
      setAiReviewLoading(prev => ({ ...prev, [pr._id]: false }));
      return;
    }
    try {
      const res = await authenticatedFetch(`/repository/${repoId}/ai-review`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ diff: pr.diff || pr.diffText, prId: pr._id }),
      });
      const data = await res.json();
      setAiReviewFeedback(prev => ({ ...prev, [pr._id]: data.feedback }));
    } catch {
      setAiReviewFeedback(prev => ({ ...prev, [pr._id]: "AI review failed." }));
    }
    setAiReviewLoading(prev => ({ ...prev, [pr._id]: false }));
  };

  const handleAISummary = async (pr: any) => {
    setAiSummaryLoading(prev => ({ ...prev, [pr._id]: true }));
    setAiSummary(prev => ({ ...prev, [pr._id]: null }));
    if (!(pr.diff || pr.diffText) || !pr._id) {
      setAiSummary(prev => ({ ...prev, [pr._id]: "No diff or PR id available for AI summary." }));
      setAiSummaryLoading(prev => ({ ...prev, [pr._id]: false }));
      return;
    }
    try {
      const res = await authenticatedFetch(`/repository/${repoId}/ai-summary`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ diff: pr.diff || pr.diffText || '', prId: pr._id }),
      });
      const data = await res.json();
      setAiSummary(prev => ({ ...prev, [pr._id]: data.summary }));
    } catch {
      setAiSummary(prev => ({ ...prev, [pr._id]: "AI summary failed." }));
    }
    setAiSummaryLoading(prev => ({ ...prev, [pr._id]: false }));
  };

  const handleAIExplainFile = async (file: any) => {
    setAiExplainLoading(true);
    setAiExplainFile(file);
    setAiExplain(null);
    try {
      const res = await authenticatedFetch(`/repository/${repoId}/ai-explain-file`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fileContent: file.content, fileName: file.name }),
      });
      const data = await res.json();
      setAiExplain(data.explanation);
    } catch {
      setAiExplain("AI explanation failed.");
    }
    setAiExplainLoading(false);
  };

  const handleAICommitMsg = async (diff: string) => {
    setAiCommitMsgLoading(true);
    setAiCommitMsg(null);
    try {
      const res = await authenticatedFetch(`/repository/${repoId}/ai-commit-message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ diff }),
      });
      const data = await res.json();
      setAiCommitMsg(data.commitMessage);
    } catch {
      setAiCommitMsg("AI commit message failed.");
    }
    setAiCommitMsgLoading(false);
  };

  const fetchComments = async (prId: string) => {
    setCommentsLoading(prev => ({ ...prev, [prId]: true }));
    try {
      const res = await authenticatedFetch(`/repository/pull-request/${prId}/comments`);
      const data = await res.json();
      setComments(prev => ({ ...prev, [prId]: Array.isArray(data) ? data : [] }));
    } catch {
      setComments(prev => ({ ...prev, [prId]: [] }));
    }
    setCommentsLoading(prev => ({ ...prev, [prId]: false }));
  };

  // Add comment to a PR
  const handleAddComment = async (prId: string) => {
    const content = commentInputs[prId]?.trim();
    if (!content) return;
    try {
      const res = await authenticatedFetch(
        `/repository/pull-request/${prId}/comment`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ content }),
        }
      );
      if (res.ok) {
        setCommentInputs(prev => ({ ...prev, [prId]: "" }));
        fetchComments(prId);
      } else {
        toast({ title: "Failed to add comment", status: "error" });
      }
    } catch {
      toast({ title: "Server error", status: "error" });
    }
  };

  if (loading) {
    return (
      <Box minH="60vh" display="flex" alignItems="center" justifyContent="center">
        <Spinner size="xl" />
      </Box>
    );
  }

  if (!repo) {
    return (
      <Box minH="60vh" display="flex" alignItems="center" justifyContent="center">
        <Text color="red.500" fontWeight="bold">Repository not found or you do not have access.</Text>
      </Box>
    );
  }

  return (
    <Box minH="100vh" w="100vw" bg="gray.50" py={10} px={0}>
      <Box maxW="900px" mx="auto" bg="white" borderRadius="lg" boxShadow="lg" p={8}>
        
        {/* Repository Header */}
        <Box mb={6}>
          <Heading size="lg" mb={2}>{repo.name}</Heading>
          <Text color="gray.600" mb={2}>{repo.description}</Text>
          <Text fontSize="sm" color="gray.500">
            Owner: <strong>{repo.owner?.name || repo.owner?.email}</strong>
            {repo.isPrivate && <Badge ml={2} colorScheme="red">Private</Badge>}
          </Text>
        </Box>

        {/* 🎯 INVITE COLLABORATORS SECTION DIN CODUL TAU (doar pentru owner) */}
        {repo.owner?._id === userId && (
          <Box mb={8}>
            <Heading size="sm" mb={2}>Invite user to repository</Heading>
            <VStack align="stretch" spacing={2}>
              <Input
                value={inviteInput}
                onChange={e => handleSearchUsers(e.target.value)}
                placeholder="Username or email"
                isRequired
                autoComplete="off"
              />
              {searching && <Text color="gray.400" fontSize="sm">Searching...</Text>}
              {searchResults.length > 0 && (
                <List spacing={1} borderWidth={1} borderRadius="md" borderColor="gray.200" maxH="180px" overflowY="auto" bg="gray.50">
                  {searchResults.map(user => (
                    <ListItem
                      key={user._id}
                      _hover={{ bg: "gray.100", cursor: "pointer" }}
                      px={3}
                      py={2}
                      display="flex"
                      alignItems="center"
                      onClick={() => handleInviteUser(user._id)}
                    >
                      <Avatar src={user.avatar} name={user.name || user.username} size="sm" mr={2} />
                      <Box>
                        <Text fontWeight="bold">{user.name || user.username}</Text>
                        <Text fontSize="xs" color="gray.500">{user.email}</Text>
                      </Box>
                    </ListItem>
                  ))}
                </List>
              )}
            </VStack>
          </Box>
        )}

        {/* Language Stats Section */}
        <Box mb={8}>
          <HStack mb={2}>
            <Icon as={FaChartPie} color="teal.500" />
            <Heading size="sm">Language Statistics</Heading>
          </HStack>
          {langStatsLoading ? (
            <Spinner size="sm" />
          ) : Object.keys(langStats).length === 0 ? (
            <Text color="gray.400">No code detected.</Text>
          ) : (
            <VStack align="stretch" spacing={2}>
              {Object.entries(langStats)
                .sort((a, b) => b[1] - a[1])
                .map(([lang, percent]) => (
                  <HStack key={lang}>
                    <Tooltip label={lang} placement="top">
                      <Text w="120px" fontWeight="bold" isTruncated>{lang}</Text>
                    </Tooltip>
                    <Progress value={percent} colorScheme="teal" flex="1" borderRadius="md" />
                    <Text w="40px" textAlign="right">{percent}%</Text>
                  </HStack>
                ))}
            </VStack>
          )}
        </Box>

        {/* Branch selector */}
        <HStack mb={6}>
          <Text fontWeight="bold">Branch:</Text>
          <select
            value={selectedBranch}
            onChange={e => setSelectedBranch(e.target.value)}
            style={{ padding: '4px 8px', borderRadius: 4, border: '1px solid #ccc' }}
          >
            {branches.map(branch => (
              <option key={branch} value={branch}>{branch}</option>
            ))}
          </select>
        </HStack>

        <Heading size="md" mt={8} mb={4}>Files</Heading>
        {files.length === 0 ? (
          <Text color="gray.400" mb={4}>No files in this repository.</Text>
        ) : (
          <VStack align="stretch" spacing={1} mb={6}>
            {files.map(file => (
              <HStack
                key={file._id}
                p={3}
                borderWidth={1}
                borderRadius="md"
                bg="gray.50"
                _hover={{ bg: "teal.50", cursor: "pointer" }}
                onClick={() => handleViewFile(file)}
                justify="space-between"
              >
                <HStack>
                  <Icon as={FaFileAlt} color="teal.400" />
                  <Text fontWeight="bold">{file.name}</Text>
                </HStack>
                {canEdit && (
                  <HStack>
                    <Button
                      size="xs"
                      leftIcon={<FaEdit />}
                      variant="ghost"
                      colorScheme="teal"
                      onClick={e => {
                        e.stopPropagation();
                        handleOpenEdit(file);
                      }}
                    >
                      Edit
                    </Button>
                    <Button
                      size="xs"
                      leftIcon={<FaCopy />}
                      variant="ghost"
                      colorScheme="red"
                      onClick={e => {
                        e.stopPropagation();
                        handleDeleteFile(file.name);
                      }}
                    >
                      Delete
                    </Button>
                  </HStack>
                )}
              </HStack>
            ))}
          </VStack>
        )}

        {/* Vizualizare cod fișier (oricine poate vedea, doar colaboratorii pot edita) */}
        <Modal isOpen={!!viewingFile} onClose={handleCloseViewFile} size="4xl">
          <ModalOverlay />
          <ModalContent>
            <ModalHeader>
              View file: {viewingFile?.name}
            </ModalHeader>
            <ModalCloseButton />
            <ModalBody>
              <Code
                px={2}
                py={2}
                borderRadius="md"
                bg="gray.100"
                fontSize="md"
                whiteSpace="pre-wrap"
                wordBreak="break-all"
                w="100%"
                display="block"
              >
                {viewingFile?.content || "No content"}
              </Code>
            </ModalBody>
            <ModalFooter>
              <Button onClick={handleCloseViewFile}>Close</Button>
              {canEdit && (
                <Button
                  colorScheme="teal"
                  ml={3}
                  onClick={() => {
                    setEditingFile(viewingFile);
                    setEditingContent(viewingFile.content);
                    setViewingFile(null);
                  }}
                >
                  Edit
                </Button>
              )}
            </ModalFooter>
          </ModalContent>
        </Modal>

        {/* Pull Requests Section */}
        {pullRequests.slice(0, 5).map(pr => (
          <Box key={pr._id} p={3} bg="white" borderRadius="md" borderWidth={1}>
            <HStack justify="space-between">
              <Box>
                <Text fontWeight="bold">{pr.title}</Text>
                <Text fontSize="sm" color="gray.600">
                  {pr.sourceBranch} → {pr.targetBranch} &middot; by {pr.author?.name || pr.author?.email}
                </Text>
              </Box>
              <Box mt={3}>
                <Button
                  size="xs"
                  variant="outline"
                  colorScheme="gray"
                  onClick={() => {
                    setCommentsOpen(prev => ({ ...prev, [pr._id]: !prev[pr._id] }));
                    if (!comments[pr._id]) fetchComments(pr._id);
                  }}
                >
                  {commentsOpen[pr._id] ? "Hide Comments" : "Show Comments"}
                </Button>
                {commentsOpen[pr._id] && (
                  <Box mt={2} bg="gray.50" borderRadius="md" p={2}>
                    {commentsLoading[pr._id] ? (
                      <Spinner size="sm" />
                    ) : (
                      <>
                        {comments[pr._id]?.length === 0 ? (
                          <Text color="gray.400" fontSize="sm">No comments yet.</Text>
                        ) : (
                          <VStack align="stretch" spacing={1} mb={2}>
                            {comments[pr._id].map((c: any) => (
                              <Box key={c._id} p={2} bg="white" borderRadius="md" borderWidth={1}>
                                <Text fontSize="sm" fontWeight="bold">{c.author?.name || c.author?.email || "User"}</Text>
                                <Text fontSize="sm">{c.content}</Text>
                                <Text fontSize="xs" color="gray.500">{new Date(c.createdAt).toLocaleString()}</Text>
                              </Box>
                            ))}
                          </VStack>
                        )}
                        {canEdit && (
                          <HStack mt={2}>
                            <Input
                              size="sm"
                              placeholder="Add a comment..."
                              value={commentInputs[pr._id] || ""}
                              onChange={e => setCommentInputs(prev => ({ ...prev, [pr._id]: e.target.value }))}
                              onKeyDown={e => {
                                if (e.key === "Enter") handleAddComment(pr._id);
                              }}
                            />
                            <Button
                              size="sm"
                              colorScheme="teal"
                              onClick={() => handleAddComment(pr._id)}
                              isDisabled={!commentInputs[pr._id]?.trim()}
                            >
                              Comment
                            </Button>
                          </HStack>
                        )}
                      </>
                    )}
                  </Box>
                )}
              </Box>
              <Badge colorScheme={
                pr.status === "open" ? "green" : pr.status === "merged" ? "blue" : "red"
              }>
                {pr.status}
              </Badge>
              {repo?.owner?._id === userId && pr.status === "open" && (
                <>
                  <Button
                    size="xs"
                    colorScheme="teal"
                    onClick={async () => {
                      try {
                        const res = await authenticatedFetch(
                          `/repository/pull-request/${pr._id}/merge`,
                          { method: "POST" }
                        );
                        if (res.ok) {
                          toast({ title: "Pull request merged!", status: "success" });
                        } else {
                          toast({ title: "Merge failed", status: "error" });
                        }
                      } catch {
                        toast({ title: "Server error", status: "error" });
                      }
                    }}
                    mr={2}
                  >
                    Merge
                  </Button>
                  <Button
                    size="xs"
                    colorScheme="red"
                    variant="outline"
                    onClick={async () => {
                      try {
                        const res = await authenticatedFetch(
                          `/repository/pull-request/${pr._id}/close`,
                          { method: "POST" }
                        );
                        if (res.ok) {
                          toast({ title: "Pull request closed!", status: "info" });
                        } else {
                          toast({ title: "Close failed", status: "error" });
                        }
                      } catch {
                        toast({ title: "Server error", status: "error" });
                      }
                    }}
                  >
                    Reject
                  </Button>
                </>
              )}
            </HStack>
          </Box>
        ))}

        {/* Edit file modal */}
        <Modal isOpen={!!editingFile} onClose={handleCancelEdit} size="xl">
          <ModalOverlay />
          <ModalContent>
            <ModalHeader>Edit file: {editingFile?.name}</ModalHeader>
            <ModalCloseButton />
            <ModalBody>
              <Textarea
                value={editingContent}
                onChange={e => setEditingContent(e.target.value)}
                rows={16}
                fontFamily="mono"
                fontSize="sm"
              />
            </ModalBody>
            <ModalFooter>
              <Button colorScheme="teal" mr={3} onClick={handleSaveEdit} isLoading={editingLoading}>
                Save
              </Button>
              <Button variant="ghost" onClick={handleCancelEdit}>
                Cancel
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>

        {/* DEBUG INFO */}
        {!canEdit && (
          <Box p={4} bg="red.50" border="1px solid" borderColor="red.200" borderRadius="md" mb={4}>
            <Text fontWeight="bold" color="red.600">🐛 DEBUG: Upload not available</Text>
            <Text fontSize="sm" color="red.500">canEdit: {canEdit ? 'true' : 'false'}</Text>
            <Text fontSize="sm" color="red.500">userId: "{userId}"</Text>
            <Text fontSize="sm" color="red.500">repo exists: {repo ? 'true' : 'false'}</Text>
            <Text fontSize="sm" color="red.500">repo.owner._id: "{repo?.owner?._id}"</Text>
            <Text fontSize="sm" color="red.500">user.id: "{user?.id}"</Text>
          </Box>
        )}

        {/* Drag & Drop Upload and Commit */}
        {canEdit && (
          <>
            <Heading size="sm" mb={2}>Upload & Commit a File (Drag & Drop)</Heading>
            <Box
              borderWidth={2}
              borderStyle="dashed"
              borderColor={dragActive ? "teal.400" : "gray.300"}
              borderRadius="md"
              p={8}
              textAlign="center"
              mb={4}
              bg={dragActive ? "teal.50" : "gray.50"}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              cursor="pointer"
              onClick={() => inputRef.current?.click()}
            >
              <Icon as={FaUpload} boxSize={8} color="teal.400" mb={2} />
              <Text>
                {selectedFile
                  ? `Selected file: ${selectedFile.name} (${(selectedFile.size / 1024 / 1024).toFixed(1)}MB)`
                  : "Drag and drop a file here, or click to select"}
              </Text>
              <Text fontSize="xs" color="gray.500" mt={1}>
                Maximum file size: 50MB (increased for testing)
              </Text>
              <Input
                ref={inputRef}
                type="file"
                display="none"
                onChange={handleFileChange}
              />
            </Box>
            {selectedFile && (
              <VStack align="stretch" spacing={2} mb={4}>
                <Input
                  value={commitMessage}
                  onChange={e => setCommitMessage(e.target.value)}
                  placeholder="Commit message"
                  isRequired
                />
                <Button
                  colorScheme="teal"
                  onClick={() => {
                    console.log('🎯 Upload button clicked!');
                    handleUploadAndCommit();
                  }}
                  isLoading={uploading}
                >
                  Commit File
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  colorScheme="gray"
                  onClick={() => {
                    setSelectedFile(null);
                    setCommitMessage('');
                  }}
                >
                  Cancel
                </Button>
              </VStack>
            )}
          </>
        )}

        {/* AI Section */}
        <Box mb={8}>
          <HStack mb={2}>
            <Icon as={FaRobot} color="teal.500" />
            <Heading size="sm">AI-powered Tools</Heading>
          </HStack>
          <VStack align="stretch" spacing={3}>
            {/* AI Review for PR */}
            {pullRequests.length > 0 && (
              <Box>
                <Text fontWeight="bold" mb={1}>AI Review for Pull Requests</Text>
                {pullRequests.map(pr => (
                  <Box key={pr._id} mb={2} p={3} borderWidth={1} borderRadius="md" bg="gray.50">
                    <HStack>
                      <Text fontWeight="bold">{pr.title}</Text>
                      <Button
                        size="xs"
                        colorScheme="teal"
                        leftIcon={<FaRobot />}
                        isLoading={!!aiReviewLoading[pr._id]}
                        onClick={() => handleAIReview(pr)}
                      >
                        AI Review
                      </Button>
                      <Button
                        size="xs"
                        colorScheme="blue"
                        leftIcon={<FaLightbulb />}
                        isLoading={!!aiSummaryLoading[pr._id]}
                        onClick={() => handleAISummary(pr)}
                      >
                        AI Summary
                      </Button>
                    </HStack>
                    {aiReviewFeedback[pr._id] && (
                      <Box mt={2} p={2} bg="gray.100" borderRadius="md">
                        <Text fontWeight="bold" color="teal.700">AI Review:</Text>
                        <Text fontSize="sm" whiteSpace="pre-line">{aiReviewFeedback[pr._id]}</Text>
                      </Box>
                    )}
                    {aiSummary[pr._id] && (
                      <Box mt={2} p={2} bg="gray.100" borderRadius="md">
                        <Text fontWeight="bold" color="blue.700">AI Summary:</Text>
                        <Text fontSize="sm" whiteSpace="pre-line">{aiSummary[pr._id]}</Text>
                      </Box>
                    )}
                  </Box>
                ))}
              </Box>
            )}
            {/* AI Explain File */}
            {files.length > 0 && (
              <Box>
                <Text fontWeight="bold" mb={1}>AI Explain File</Text>
                <HStack flexWrap="wrap" spacing={2}>
                  {files.slice(0, 5).map(file => (
                    <Button
                      key={file._id}
                      size="xs"
                      colorScheme="purple"
                      leftIcon={<FaRobot />}
                      isLoading={aiExplainLoading && aiExplainFile?._id === file._id}
                      onClick={() => handleAIExplainFile(file)}
                    >
                      {file.name}
                    </Button>
                  ))}
                </HStack>
                {aiExplain && aiExplainFile && (
                  <Box mt={2} p={2} bg="gray.100" borderRadius="md">
                    <Text fontWeight="bold" color="purple.700">AI Explanation for {aiExplainFile.name}:</Text>
                    <Text fontSize="sm" whiteSpace="pre-line">{aiExplain}</Text>
                  </Box>
                )}
              </Box>
            )}
            {/* AI Commit Message Suggestion */}
            <Box>
              <Text fontWeight="bold" mb={1}>AI Commit Message Suggestion</Text>
              <Button
                size="xs"
                colorScheme="orange"
                leftIcon={<FaLightbulb />}
                isLoading={aiCommitMsgLoading}
                onClick={() => handleAICommitMsg(
                  commits.length > 0 && commits[0].files && commits[0].files[0]?.content
                    ? commits[0].files[0].content
                    : "Example diff"
                )}
              >
                Suggest Commit Message
              </Button>
              {aiCommitMsg && (
                <Box mt={2} p={2} bg="gray.100" borderRadius="md">
                  <Text fontWeight="bold" color="orange.700">AI Commit Message:</Text>
                  <Text fontSize="sm" whiteSpace="pre-line">{aiCommitMsg}</Text>
                </Box>
              )}
            </Box>
          </VStack>
        </Box>

        {/* Activity Timeline */}
        <Box mt={10} mb={6} p={6} bg="gray.50" borderRadius="lg" borderWidth={1} boxShadow="sm">
          <Heading size="sm" mb={4}>Repository Activity</Heading>
          {commitsLoading ? (
            <Spinner />
          ) : commits.length === 0 ? (
            <Text color="gray.400">No activity yet.</Text>
          ) : (
            <VStack align="stretch" spacing={3}>
              {commits.slice(0, 10).map((commit) => (
                <Box key={commit._id} p={3} bg="white" borderRadius="md" borderWidth={1}>
                  <HStack align="start">
                    <Icon as={FaCodeBranch} color="teal.400" mt={1} />
                    <Box flex="1">
                      <Text fontWeight="bold" fontSize="sm">{commit.message}</Text>
                      <Text color="gray.500" fontSize="xs" mb={1}>
                        {commit.author?.name || "Unknown"} &middot; {new Date(commit.createdAt).toLocaleString()}
                      </Text>
                      {commit.files && commit.files.length > 0 && (
                        <Box mt={1}>
                          <Text fontSize="xs" color="gray.600" mb={1}>Files:</Text>
                          <VStack align="start" spacing={0}>
                            {commit.files.map((file: any, idx: number) => (
                              <HStack key={idx} spacing={2}>
                                <Icon as={FaFileAlt} color="teal.300" boxSize={3} />
                                <Code fontSize="xs" colorScheme="teal">{file.name}</Code>
                              </HStack>
                            ))}
                          </VStack>
                        </Box>
                      )}
                    </Box>
                  </HStack>
                </Box>
              ))}
            </VStack>
          )}
        </Box>

        {/* CLI USAGE SECTION */}
        <Box mt={12} p={6} borderWidth={1} borderRadius="lg" bg="gray.50">
          <HStack mb={2}>
            <Icon as={FaTerminal} color="teal.500" />
            <Heading size="sm">CodexBase CLI Quick Actions</Heading>
          </HStack>

          <VStack align="start" spacing={2} fontSize="sm">
            <HStack>
              <Code px={2} py={1} borderRadius="md" bg="gray.100" fontSize="md">
                codexbase clone {repo._id} -b {selectedBranch}
              </Code>
              <Button size="xs" colorScheme="teal" variant="outline" onClick={() => navigator.clipboard.writeText(`codexbase clone ${repo._id} -b ${selectedBranch}`)}>
                Copy
              </Button>
            </HStack>
            <HStack>
              <Code px={2} py={1} borderRadius="md" bg="gray.100" fontSize="md">
                codexbase pushall {repo._id} -m "your message" -b {selectedBranch}
              </Code>
              <Button size="xs" colorScheme="teal" variant="outline" onClick={() => navigator.clipboard.writeText(`codexbase pushall ${repo._id} -m "your message" -b ${selectedBranch}`)}>
                Copy
              </Button>
            </HStack>
            <HStack>
              <Code px={2} py={1} borderRadius="md" bg="gray.100" fontSize="md">
                codexbase commit {repo._id} &lt;file&gt; -m "your message" -b {selectedBranch}
              </Code>
              <Button size="xs" colorScheme="teal" variant="outline" onClick={() => navigator.clipboard.writeText(`codexbase commit ${repo._id} <file> -m "your message" -b ${selectedBranch}`)}>
                Copy
              </Button>
            </HStack>
            <HStack>
              <Code px={2} py={1} borderRadius="md" bg="gray.100" fontSize="md">
                codexbase log {repo._id} -b {selectedBranch}
              </Code>
              <Button size="xs" colorScheme="teal" variant="outline" onClick={() => navigator.clipboard.writeText(`codexbase log ${repo._id} -b ${selectedBranch}`)}>
                Copy
              </Button>
            </HStack>
            <HStack>
              <Code px={2} py={1} borderRadius="md" bg="gray.100" fontSize="md">
                codexbase branches {repo._id}
              </Code>
              <Button size="xs" colorScheme="teal" variant="outline" onClick={() => navigator.clipboard.writeText(`codexbase branches ${repo._id}`)}>
                Copy
              </Button>
            </HStack>
            <HStack>
              <Code px={2} py={1} borderRadius="md" bg="gray.100" fontSize="md">
                codexbase branch-create {repo._id} &lt;branchName&gt; --from {selectedBranch}
              </Code>
              <Button size="xs" colorScheme="teal" variant="outline" onClick={() => navigator.clipboard.writeText(`codexbase branch-create ${repo._id} <branchName> --from ${selectedBranch}`)}>
                Copy
              </Button>
            </HStack>
            <HStack>
              <Code px={2} py={1} borderRadius="md" bg="gray.100" fontSize="md">
                codexbase branch-create {repo._id} &lt;branchName&gt; --from ""
              </Code>
              <Button size="xs" colorScheme="teal" variant="outline" onClick={() => navigator.clipboard.writeText(`codexbase branch-create ${repo._id} <branchName> --from ""`)}>
                Copy
              </Button>
            </HStack>
            <HStack>
              <Code px={2} py={1} borderRadius="md" bg="gray.100" fontSize="md">
                codexbase pr-create {repo._id} -s &lt;sourceBranch&gt; -t &lt;targetBranch&gt; --title "PR title"
              </Code>
              <Button size="xs" colorScheme="teal" variant="outline" onClick={() => navigator.clipboard.writeText(`codexbase pr-create ${repo._id} -s <sourceBranch> -t <targetBranch> --title "PR title"`)} >
                Copy
              </Button>
            </HStack>
            <HStack>
              <Code px={2} py={1} borderRadius="md" bg="gray.100" fontSize="md">
                codexbase pr-list {repo._id}
              </Code>
              <Button size="xs" colorScheme="teal" variant="outline" onClick={() => navigator.clipboard.writeText(`codexbase pr-list ${repo._id}`)}>
                Copy
              </Button>
            </HStack>
            <HStack>
              <Code px={2} py={1} borderRadius="md" bg="gray.100" fontSize="md">
                codexbase pr-merge &lt;prId&gt;
              </Code>
              <Button size="xs" colorScheme="teal" variant="outline" onClick={() => navigator.clipboard.writeText(`codexbase pr-merge <prId>`)} >
                Copy
              </Button>
            </HStack>
          </VStack>
          <Text mt={4} fontSize="xs" color="gray.400">
            * Make sure you are in the folder where you want to run these commands.
          </Text>
        </Box>
        
        <Box mb={6}>
          <HStack align="start">
            <Box flex="1" maxW="80%">
              <Code
                px={2}
                py={1}
                borderRadius="md"
                bg="gray.100"
                fontSize="md"
                whiteSpace="pre-wrap"
                wordBreak="break-all"
                w="100%"
                display="block"
              >
                {token ? `codexbase login ${token}` : "Autentifică-te pentru a primi tokenul CLI"}
              </Code>
            </Box>
            <Button
              size="xs"
              colorScheme="teal"
              variant="outline"
              onClick={() => {
                navigator.clipboard.writeText(`codexbase login ${token}`);
                toast({ title: "Login command copied!", status: "success", duration: 1500 });
              }}
            >
              Copy
            </Button>
          </HStack>
          <Text fontSize="xs" color="gray.500" mt={1}>
            Use this command to authenticate the CLI with your account.
          </Text>
        </Box>
      </Box>
    </Box>
  );
};

export default RepositoryViewPage;
