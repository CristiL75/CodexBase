import { useEffect, useState } from "react";
import {
  Box, Heading, Text, List, ListItem, Spinner, Divider, Button, Input, HStack, useToast, Badge, VStack, List as ChakraList
} from "@chakra-ui/react";
import { useParams, Link as RouterLink } from "react-router-dom";
import { useAuth } from '../contexts/AuthContext';
import { authenticatedFetch } from '../utils/tokenManager';

export default function OrganizationDetailPage() {
  const { orgId } = useParams();
  const [org, setOrg] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState("");
  const [repoId, setRepoId] = useState("");
  const [addRepoLoading, setAddRepoLoading] = useState(false);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [repos, setRepos] = useState<any[]>([]);
  const [userSuggestions, setUserSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchRepo, setSearchRepo] = useState("");
  const toast = useToast();

  // Remove this line since we'll use authenticatedFetch
  // const token = localStorage.getItem("token");
  const { user } = useAuth();
  const userId = user?.id || '';

  useEffect(() => {
    const fetchOrganization = async () => {
      try {
        const response = await authenticatedFetch(`/organization/${orgId}`);
        const data = await response.json();
        setOrg(data);
      } catch (error) {
        console.error('Error fetching organization:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchOrganization();
  }, [orgId]);

  useEffect(() => {
    const fetchRepositories = async () => {
      try {
        const response = await authenticatedFetch('/repository/repositories');
        const data = await response.json();
        setRepos(data);
      } catch (error) {
        console.error('Error fetching repositories:', error);
        setRepos([]);
      }
    };
    fetchRepositories();
  }, []);

  useEffect(() => {
    const search = async () => {
      if (inviteEmail.length < 2) {
        setUserSuggestions([]);
        setShowSuggestions(false);
        return;
      }
      try {
        const response = await authenticatedFetch('/user/find', {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ query: inviteEmail }),
        });
        if (response.ok) {
          const data = await response.json();
          setUserSuggestions(data.users || []);
          setShowSuggestions(true);
        }
      } catch (error) {
        console.error('Error searching users:', error);
        setUserSuggestions([]);
      }
    };
    search();
  }, [inviteEmail]);

  const handleInvite = async (userObj?: any) => {
    setInviteLoading(true);
    let user = userObj;
    if (!user) {
      try {
        const userRes = await authenticatedFetch('/user/by-email', {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email: inviteEmail }),
        });
        user = await userRes.json();
      } catch (error) {
        console.error('Error finding user by email:', error);
      }
    }
    if (!user?._id) {
      toast({ title: "User not found", status: "error" });
      setInviteLoading(false);
      return;
    }
    try {
      const response = await authenticatedFetch(`/org-invitation/${orgId}/invite`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId: user._id }),
      });
      if (response.ok) {
        toast({ title: "User invited!", status: "success" });
        setInviteEmail("");
        setUserSuggestions([]);
        setShowSuggestions(false);
        // Refresh organization data
        try {
          const orgResponse = await authenticatedFetch(`/organization/${orgId}`);
          const orgData = await orgResponse.json();
          setOrg(orgData);
        } catch (err) {
          console.error('Error refreshing org data:', err);
        }
      } else {
        toast({ title: "Invite failed", status: "error" });
      }
    } catch (error) {
      console.error('Error inviting user:', error);
      toast({ title: "Invite failed", status: "error" });
    }
    setInviteLoading(false);
  };

  const handleAddRepo = async () => {
    setAddRepoLoading(true);
    const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/organization/${orgId}/add-repo`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
      body: JSON.stringify({ repoId }),
    });
    if (res.ok) {
      toast({ title: "Repository added!", status: "success" });
      setRepoId("");
      fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/organization/${orgId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      })
        .then(res => res.json())
        .then(data => setOrg(data));
    } else {
      toast({ title: "Add repo failed", status: "error" });
    }
    setAddRepoLoading(false);
  };

  if (loading) return <Spinner />;
  if (!org) return <Text>Organization not found.</Text>;

  const isOwner = org.owner?._id?.toString() === userId?.toString();

  return (
    <Box w="100vw" minH="100vh" bg="gray.50" p={0} m={0}>
      <Box w="100vw" minH="100vh" bg="white" p={8}>
        <Heading size="lg">{org.name}</Heading>
        <Text color="gray.600" mb={4}>{org.description}</Text>
        <Badge colorScheme="purple" mb={2}>Owner: {org.owner?.name || org.owner?.email}</Badge>
        <Divider my={4} />

        <Heading size="md" mb={2}>Members</Heading>
        <List mb={2}>
          {org.members.map((m: any) => (
            <ListItem key={m._id}>
              <HStack>
                <Text>{m.name || m.email}</Text>
                {org.owner?._id === m._id && <Badge colorScheme="purple">Owner</Badge>}
              </HStack>
            </ListItem>
          ))}
        </List>
        {isOwner && (
          <Box mb={4} position="relative">
            <HStack>
              <Input
                size="sm"
                placeholder="Invite by email or username"
                value={inviteEmail}
                onChange={e => {
                  setInviteEmail(e.target.value);
                  setShowSuggestions(true);
                }}
                autoComplete="off"
              />
              <Button
                size="sm"
                colorScheme="teal"
                onClick={() => handleInvite()}
                isLoading={inviteLoading}
                isDisabled={!inviteEmail}
              >
                Invite
              </Button>
            </HStack>
            {showSuggestions && userSuggestions.length > 0 && (
              <Box
                position="absolute"
                zIndex={10}
                bg="white"
                borderWidth={1}
                borderRadius="md"
                mt={1}
                w="100%"
                maxH="200px"
                overflowY="auto"
                boxShadow="md"
              >
                <ChakraList spacing={1}>
                  {userSuggestions.map((user: any) => (
                    <ListItem
                      key={user._id}
                      px={3}
                      py={2}
                      _hover={{ bg: "gray.100", cursor: "pointer" }}
                      onClick={() => {
                        setInviteEmail(user.email || user.username);
                        setShowSuggestions(false);
                        handleInvite(user);
                      }}
                    >
                      <Text fontWeight="bold">{user.name || user.username || user.email}</Text>
                      <Text fontSize="xs" color="gray.500">{user.email}</Text>
                    </ListItem>
                  ))}
                </ChakraList>
              </Box>
            )}
          </Box>
        )}

        <Divider my={4} />
        <Heading size="md" mb={2}>Repositories</Heading>
        <Input
          size="sm"
          placeholder="Search repositories..."
          value={searchRepo}
          onChange={e => setSearchRepo(e.target.value)}
          mb={2}
        />
        <VStack align="stretch" spacing={2}>
          {org.repositories
            .filter((r: any) =>
              r.name.toLowerCase().includes(searchRepo.toLowerCase())
            )
            .length === 0 && <Text color="gray.400">No repositories found.</Text>}
          {org.repositories
            .filter((r: any) =>
              r.name.toLowerCase().includes(searchRepo.toLowerCase())
            )
            .map((r: any) => (
              <Box
                as={RouterLink}
                to={`/repository/${r._id}`}
                key={r._id}
                p={2}
                bg="gray.50"
                borderRadius="md"
                borderWidth={1}
                _hover={{ bg: "teal.50", textDecoration: "underline" }}
                textDecoration="none"
                display="block"
              >
                <Heading size="sm" mb={1}>{r.name}</Heading>
                <Text fontSize="sm" color="gray.600">{r.description}</Text>
              </Box>
            ))}
        </VStack>
        {isOwner && (
          <HStack mt={4}>
            <Input
              size="sm"
              placeholder="Repository ID"
              value={repoId}
              onChange={e => setRepoId(e.target.value)}
              list="repo-list"
            />
            <datalist id="repo-list">
              {repos.map((r: any) => (
                <option key={r._id} value={r._id}>{r.name}</option>
              ))}
            </datalist>
            <Button
              size="sm"
              colorScheme="teal"
              onClick={handleAddRepo}
              isLoading={addRepoLoading}
              isDisabled={!repoId}
            >
              Add Repo
            </Button>
            <Button
              as={RouterLink}
              to={`/new-repo?orgId=${orgId}`}
              colorScheme="teal"
              size="sm"
            >
              Create Repository
            </Button>
          </HStack>
        )}
      </Box>
    </Box>
  );
}