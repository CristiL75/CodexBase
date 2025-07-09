import { useEffect, useState } from "react";
import {
  Box, Heading, Text, List, ListItem, Spinner, Divider, Button, Input, HStack, useToast, Badge, VStack, List as ChakraList
} from "@chakra-ui/react";
import { useParams, Link } from "react-router-dom";

import { Link as RouterLink } from "react-router-dom";

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
  const [searchRepo, setSearchRepo] = useState(""); // <-- pentru căutare repo-uri
  const toast = useToast();

  const token = localStorage.getItem("token");
  const userId = token ? JSON.parse(atob(token.split('.')[1])).id : '';

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/organization/${orgId}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
    })
      .then(res => res.json())
      .then(data => { setOrg(data); setLoading(false); });
  }, [orgId]);

  // Fetch all user repositories for add-repo (optional)
  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/repository/repositories`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
    })
      .then(res => res.json())
      .then(data => setRepos(data));
  }, []);

  // Caută sugestii user după email sau username
  useEffect(() => {
    const search = async () => {
      if (inviteEmail.length < 2) {
        setUserSuggestions([]);
        setShowSuggestions(false);
        return;
      }
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/user/find`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ query: inviteEmail }),
      });
      if (res.ok) {
        const data = await res.json();
        setUserSuggestions(data.users || []);
        setShowSuggestions(true);
      }
    };
    search();
  }, [inviteEmail]);

  const handleInvite = async (userObj?: any) => {
    setInviteLoading(true);
    let user = userObj;
    if (!user) {
      // Caută userId după email dacă nu e selectat din listă
      const userRes = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/user/by-email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ email: inviteEmail }),
      });
      user = await userRes.json();
    }
    if (!user?._id) {
      toast({ title: "User not found", status: "error" });
      setInviteLoading(false);
      return;
    }
    // Folosește endpointul corect pentru invitație la organizație!
    const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/org-invitation/${orgId}/invite`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
      body: JSON.stringify({ userId: user._id }),
    });
    if (res.ok) {
      toast({ title: "User invited!", status: "success" });
      setInviteEmail("");
      setUserSuggestions([]);
      setShowSuggestions(false);
      // Refresh members dacă vrei
      fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/organization/${orgId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      })
        .then(res => res.json())
        .then(data => setOrg(data));
    } else {
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
      // Refresh org
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
    <Box maxW="700px" mx="auto" mt={8}>
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
                key={r._id}
                p={2}
                bg="gray.50"
                borderRadius="md"
                borderWidth={1}
                _hover={{ bg: "teal.50" }}
            >
                <Heading size="sm" mb={1}>
                <RouterLink to={`/repository/${r._id}`} style={{ textDecoration: "none" }}>
                    {r.name}
                </RouterLink>
                </Heading>
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
            as={Link}
            to={`/new-repo?orgId=${orgId}`}
            colorScheme="teal"
            size="sm"
          >
            Create Repository
          </Button>
        </HStack>
      )}
    </Box>
  );
}