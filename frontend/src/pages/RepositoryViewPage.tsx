import React, { useEffect, useState } from 'react';
import {
  Box, Heading, Text, Button, VStack, Input, Textarea, HStack, Icon, useToast, Spinner, Badge, Avatar, List, ListItem, Alert, AlertIcon
} from '@chakra-ui/react';
import { FaStar, FaRegStar, FaFileAlt, FaTrash } from 'react-icons/fa';
import { useParams, useNavigate } from 'react-router-dom';

const RepositoryViewPage: React.FC = () => {
  const { repoId } = useParams<{ repoId: string }>();
  const [repo, setRepo] = useState<any>(null);
  const [files, setFiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [fileName, setFileName] = useState('');
  const [fileContent, setFileContent] = useState('');
  const [starred, setStarred] = useState(false);
  const [stars, setStars] = useState(0);
  const [inviteInput, setInviteInput] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const toast = useToast();
  const navigate = useNavigate();

  // Fetch repo info and files
  useEffect(() => {
    const fetchRepo = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/repository/my`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const allRepos = await res.json();
      const found = allRepos.find((r: any) => r._id === repoId);
      setRepo(found);

      // === AICI ADAUGI LOGURILE ===
      if (found) {
        console.log('repo.owner:', found.owner);
        console.log('user id:', JSON.parse(atob(token!.split('.')[1])).id);
      }
      // ============================
      setStarred(found?.isStarred || false);
      setStars(found?.stars || 0);
    } catch {}
    setLoading(false);
  };
    const fetchFiles = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/repository/${repoId}/files`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        setFiles(data);
      } catch {
        setFiles([]);
      }
    };
    fetchRepo();
    fetchFiles();
  }, [repoId]);

  const handleAddFile = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdding(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/repository/${repoId}/files`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: fileName, content: fileContent }),
      });
      if (res.ok) {
        toast({ title: "File added!", status: "success" });
        setFileName('');
        setFileContent('');
        // Refresh files
        const filesRes = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/repository/${repoId}/files`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setFiles(await filesRes.json());
      } else {
        toast({ title: "Error adding file", status: "error" });
      }
    } catch {
      toast({ title: "Server error", status: "error" });
    }
    setAdding(false);
  };

  const handleStar = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/repository/star/${repoId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setStarred(data.starred);
      setStars(data.stars);
    } catch {
      toast({ title: "Error starring repository", status: "error" });
    }
  };

  // Caută utilizatori după username/email și afișează lista
  const handleSearchUsers = async (value: string) => {
    setInviteInput(value);
    setSearchResults([]);
    if (!value || value.length < 2) return;
    setSearching(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/user/find`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ query: value }),
        }
      );
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
      const token = localStorage.getItem('token');
      const resInvite = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/invitation/${repoId}/invite`,
        {
            method: 'POST',
            headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ userId }),
        }
        );
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

  // Șterge repository-ul dacă ești owner
  const handleDeleteRepo = async () => {
    setDeleteLoading(true);
    setDeleteError('');
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/repository/${repoId}`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (res.ok) {
        toast({ title: "Repository deleted!", status: "success" });
        navigate('/repositories');
      } else {
        const err = await res.json();
        setDeleteError(err.message || "Error deleting repository");
      }
    } catch {
      setDeleteError("Server error");
    }
    setDeleteLoading(false);
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
        <HStack justify="space-between" mb={4}>
          <Heading>{repo.name}</Heading>
          <HStack>
            <Button
              leftIcon={<Icon as={starred ? FaStar : FaRegStar} color={starred ? "yellow.400" : "gray.400"} />}
              colorScheme={starred ? "yellow" : "gray"}
              variant="outline"
              onClick={handleStar}
            >
              {stars} Star{stars === 1 ? "" : "s"}
            </Button>
            {/* Buton de ștergere vizibil doar pentru owner */}
            
            {repo.owner && repo.owner._id === JSON.parse(atob(localStorage.getItem('token')!.split('.')[1])).id && (
            <Button
                leftIcon={<FaTrash />}
                colorScheme="red"
                variant="outline"
                onClick={handleDeleteRepo}
                isLoading={deleteLoading}
            >
                Delete Repo
            </Button>
            )}
          </HStack>
        </HStack>
        {deleteError && (
          <Alert status="error" mb={4}>
            <AlertIcon />
            {deleteError}
          </Alert>
        )}
        <Text color="gray.600" mb={2}>{repo.description}</Text>
        <Badge colorScheme={repo.isPrivate ? "red" : "green"} mb={4}>
          {repo.isPrivate ? "Private" : "Public"}
        </Badge>

        {/* Invita utilizator */}
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

        <Heading size="md" mt={8} mb={4}>Files</Heading>
        {files.length === 0 ? (
          <Text color="gray.400" mb={4}>No files in this repository.</Text>
        ) : (
          <VStack align="stretch" spacing={3} mb={6}>
            {files.map(file => (
              <Box key={file._id} p={4} borderWidth={1} borderRadius="md" bg="gray.50">
                <HStack>
                  <Icon as={FaFileAlt} color="teal.400" />
                  <Text fontWeight="bold">{file.name}</Text>
                </HStack>
                <Box mt={2} bg="gray.100" p={2} borderRadius="md" fontFamily="mono" fontSize="sm" whiteSpace="pre-wrap">
                  {file.content}
                </Box>
              </Box>
            ))}
          </VStack>
        )}

        <Heading size="sm" mb={2}>Add new file</Heading>
        <form onSubmit={handleAddFile}>
          <VStack align="stretch" spacing={3}>
            <Input
              value={fileName}
              onChange={e => setFileName(e.target.value)}
              placeholder="File name (ex: index.js)"
              isRequired
            />
            <Textarea
              value={fileContent}
              onChange={e => setFileContent(e.target.value)}
              placeholder="File content"
              rows={6}
              isRequired
            />
            <Button colorScheme="teal" type="submit" isLoading={adding}>
              Add File
            </Button>
          </VStack>
        </form>
      </Box>
    </Box>
  );
};

export default RepositoryViewPage;