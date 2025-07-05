import React, { useEffect, useState, useRef } from 'react';
import {
  Box, Heading, Text, Button, VStack, Input, HStack, Icon, useToast, Spinner, Code, useClipboard, Modal, ModalOverlay, ModalContent, ModalHeader, ModalCloseButton, ModalBody, ModalFooter, Textarea, Badge
} from '@chakra-ui/react';
import { FaFileAlt, FaEdit, FaUpload, FaCodeBranch, FaTerminal, FaCopy } from 'react-icons/fa';
import { useParams, useNavigate, Link } from 'react-router-dom';

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

  // Token for CLI
  const token = localStorage.getItem('token');
  const { onCopy, hasCopied } = useClipboard(token || '');

  // User id for edit rights
  let userId = '';
  try {
    userId = token ? JSON.parse(atob(token.split('.')[1])).id : '';
  } catch {}

  // Fetch repo, branches, PRs
  useEffect(() => {
    const fetchRepo = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(
          `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/repository/my`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const allRepos = await res.json();
        const found = allRepos.find((r: any) => r._id === repoId);
        setRepo(found);
      } catch {}
      setLoading(false);
    };
    const fetchPRs = async () => {
      setPullRequestsLoading(true);
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(
          `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/repository/${repoId}/pull-requests`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const data = await res.json();
        setPullRequests(Array.isArray(data) ? data : []);
      } catch {
        setPullRequests([]);
      }
      setPullRequestsLoading(false);
    };
    const fetchBranches = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(
          `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/repository/${repoId}/branches`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        let data = await res.json();
        // Always ensure at least 'main' exists
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
        const token = localStorage.getItem('token');
        const res = await fetch(
          `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/repository/${repoId}/files?branch=${selectedBranch}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const data = await res.json();
        setFiles(data);
      } catch {
        setFiles([]);
      }
    };

    const fetchCommits = async () => {
      setCommitsLoading(true);
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(
          `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/repository/${repoId}/commits?branch=${selectedBranch}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const data = await res.json();
        setCommits(data);
      } catch {
        setCommits([]);
      }
      setCommitsLoading(false);
    };

    fetchFiles();
    fetchCommits();
  }, [repoId, selectedBranch]);

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
      const token = localStorage.getItem('token');
      const res = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/repository/${repoId}/file`,
        {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ name: fileName, branch: selectedBranch }),
        }
      );
      if (res.ok) {
        toast({ title: "File deleted!", status: "success" });
        // Refresh files and commits
        const filesRes = await fetch(
          `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/repository/${repoId}/files?branch=${selectedBranch}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setFiles(await filesRes.json());
        const commitsRes = await fetch(
          `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/repository/${repoId}/commits?branch=${selectedBranch}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
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
    if (!selectedFile || !commitMessage) {
      toast({ title: "Select a file and enter a commit message!", status: "warning" });
      return;
    }
    setUploading(true);
    try {
      const fileText = await selectedFile.text();
      const token = localStorage.getItem('token');
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/repository/${repoId}/commit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          message: commitMessage,
          files: [{ name: selectedFile.name, content: fileText }],
          branch: selectedBranch,
        }),
      });
      if (res.ok) {
        toast({ title: "File uploaded & committed!", status: "success" });
        setSelectedFile(null);
        setCommitMessage('');
        // Refresh files and commits
        const filesRes = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/repository/${repoId}/files?branch=${selectedBranch}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setFiles(await filesRes.json());
        const commitsRes = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/repository/${repoId}/commits?branch=${selectedBranch}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setCommits(await commitsRes.json());
      } else {
        toast({ title: "Error uploading file", status: "error" });
      }
    } catch {
      toast({ title: "Server error", status: "error" });
    }
    setUploading(false);
  };

  // Edit file logic
  const canEdit = repo && (repo.owner?._id === userId || (repo.collaborators && repo.collaborators.some((c: any) => c._id === userId)));

  const handleOpenEdit = (file: any) => {
    setEditingFile(file);
    setEditingContent(file.content);
  };

  const handleSaveEdit = async () => {
    if (!editingFile) return;
    setEditingLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/repository/${repoId}/commit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
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
        const filesRes = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/repository/${repoId}/files?branch=${selectedBranch}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setFiles(await filesRes.json());
        const commitsRes = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/repository/${repoId}/commits?branch=${selectedBranch}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
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

  if (loading || !repo) {
    return (
      <Box minH="60vh" display="flex" alignItems="center" justifyContent="center">
        <Spinner size="xl" />
      </Box>
    );
  }

  return (
    <Box minH="100vh" w="100vw" bg="gray.50" py={10} px={0}>
      <Box maxW="900px" mx="auto" bg="white" borderRadius="lg" boxShadow="lg" p={8}>
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
                _hover={{ bg: "teal.50", cursor: canEdit ? "pointer" : "default" }}
                onClick={() => canEdit && handleOpenEdit(file)}
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
      <Badge colorScheme={
        pr.status === "open" ? "green" : pr.status === "merged" ? "blue" : "red"
      }>
        {pr.status}
      </Badge>
      {/* Butonul de merge doar pentru owner și doar dacă PR-ul e open */}
    {repo?.owner?._id === userId && pr.status === "open" && (
  <>
    <Button
      size="xs"
      colorScheme="teal"
      onClick={async () => {
        try {
          const token = localStorage.getItem('token');
          const res = await fetch(
            `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/repository/pull-request/${pr._id}/merge`,
            { method: "POST", headers: { Authorization: `Bearer ${token}` } }
          );
          if (res.ok) {
            toast({ title: "Pull request merged!", status: "success" });
            // Reîncarcă lista de PR-uri
            // (poți apela fetchPRs sau reîncarcă pagina)
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
          const token = localStorage.getItem('token');
          const res = await fetch(
            `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/repository/pull-request/${pr._id}/close`,
            { method: "POST", headers: { Authorization: `Bearer ${token}` } }
          );
          if (res.ok) {
            toast({ title: "Pull request closed!", status: "info" });
            // Reîncarcă lista de PR-uri
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

        {/* Drag & Drop Upload and Commit */}
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
              ? `Selected file: ${selectedFile.name}`
              : "Drag and drop a file here, or click to select"}
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
              onClick={handleUploadAndCommit}
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
                {`codexbase login ${token}`}
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