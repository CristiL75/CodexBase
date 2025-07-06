import React, { useEffect, useState } from "react";
import {
  Box, Heading, VStack, HStack, Text, Input, Button, Avatar, Badge, Spinner, SimpleGrid, Code
} from "@chakra-ui/react";
import { Link } from "react-router-dom";
import { FaStar, FaBook } from "react-icons/fa";

const ExplorePage: React.FC = () => {
  const [repos, setRepos] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [activity, setActivity] = useState<any>(null);
  const [search, setSearch] = useState("");
  const [loadingRepos, setLoadingRepos] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingActivity, setLoadingActivity] = useState(true);

  // Fetch public repositories
  useEffect(() => {
    const fetchRepos = async () => {
      setLoadingRepos(true);
      try {
        const res = await fetch(
          `${import.meta.env.VITE_API_URL || "http://localhost:5000"}/repository/public`
        );
        const data = await res.json();
        setRepos(Array.isArray(data) ? data : []);
      } catch {
        setRepos([]);
      }
      setLoadingRepos(false);
    };
    fetchRepos();
  }, []);

  // Fetch popular users
  useEffect(() => {
    const fetchUsers = async () => {
      setLoadingUsers(true);
      try {
        const res = await fetch(
          `${import.meta.env.VITE_API_URL || "http://localhost:5000"}/repository/popular`
        );
        const data = await res.json();
        setUsers(Array.isArray(data) ? data : []);
      } catch {
        setUsers([]);
      }
      setLoadingUsers(false);
    };
    fetchUsers();
  }, []);

  // Fetch recent activity
  useEffect(() => {
    const fetchActivity = async () => {
      setLoadingActivity(true);
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(
          `${import.meta.env.VITE_API_URL || "http://localhost:5000"}/repository/activity/recent`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        const data = await res.json();
        setActivity(data);
      } catch {
        setActivity(null);
      }
      setLoadingActivity(false);
    };
    fetchActivity();
  }, []);

  // Search repositories
  const filteredRepos = repos.filter(
    repo =>
      repo.name.toLowerCase().includes(search.toLowerCase()) ||
      (repo.description && repo.description.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <Box minH="100vh" w="100vw" bg="gray.50" py={0} px={0}>
      <Box maxW="1100px" mx="auto" mt={10} p={6} bg="white" borderRadius="lg" boxShadow="lg" minH="90vh">
        <Heading size="lg" mb={6}>Explore CodexBase</Heading>

        {/* Search bar */}
        <Box mb={8}>
          <Input
            placeholder="Search repositories..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            size="lg"
            bg="gray.50"
          />
        </Box>

        {/* Trending/Public Repositories */}
        <Heading size="md" mb={4}>Trending Repositories</Heading>
        {loadingRepos ? (
          <Spinner />
        ) : (
          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={5} mb={10}>
            {filteredRepos.length === 0 && (
              <Text color="gray.400">No repositories found.</Text>
            )}
            {filteredRepos.map(repo => (
              <Box key={repo._id} p={5} borderWidth={1} borderRadius="md" bg="gray.50">
                <HStack justify="space-between">
                  <Box>
                    <Link to={`/repository/${repo._id}`}>
                      <Heading size="sm" mb={1}>{repo.name}</Heading>
                    </Link>
                    <Text fontSize="sm" color="gray.600" mb={2}>{repo.description}</Text>
                    <HStack spacing={2}>
                      <Avatar size="xs" src={repo.owner?.avatar} />
                      <Text fontSize="xs" color="gray.500">{repo.owner?.name || repo.owner?.email}</Text>
                    </HStack>
                  </Box>
                  <VStack>
                    <Badge colorScheme="yellow" px={2} py={1}>
                      <FaStar style={{ marginRight: 4 }} />
                      {repo.stars || 0} Stars
                    </Badge>
                    <Badge colorScheme="teal" px={2} py={1}>
                      {repo.isPrivate ? "Private" : "Public"}
                    </Badge>
                  </VStack>
                </HStack>
              </Box>
            ))}
          </SimpleGrid>
        )}

        {/* Popular Users */}
        <Heading size="md" mb={4}>Popular Users</Heading>
        {loadingUsers ? (
          <Spinner />
        ) : (
          <SimpleGrid columns={{ base: 1, md: 3 }} spacing={5} mb={10}>
            {users.length === 0 && (
              <Text color="gray.400">No users found.</Text>
            )}
            {users.map(user => (
              <Box key={user._id} p={4} borderWidth={1} borderRadius="md" bg="gray.50">
                <HStack>
                  <Avatar src={user.avatar} name={user.name || user.email} />
                  <Box>
                    <Link to={`/profile/${user._id}`}>
                      <Text fontWeight="bold">{user.name || user.email}</Text>
                    </Link>
                    <Text fontSize="sm" color="gray.500">{user.email}</Text>
                    <Text fontSize="xs" color="gray.400">{user.repositories} repositories</Text>
                  </Box>
                </HStack>
              </Box>
            ))}
          </SimpleGrid>
        )}

        {/* Quick Actions */}
        <Heading size="md" mb={4}>Quick Actions</Heading>
        <HStack spacing={4} mb={8}>
          <Link to="/new-repo">
            <Button leftIcon={<FaBook />} colorScheme="teal" variant="solid">
              New Repository
            </Button>
          </Link>
          <Link to="/repositories">
            <Button leftIcon={<FaBook />} colorScheme="teal" variant="outline">
              My Repositories
            </Button>
          </Link>
        </HStack>

        {/* Activity Feed */}
        <Heading size="md" mb={4}>Recent Activity</Heading>
        {loadingActivity ? (
          <Spinner />
        ) : activity ? (
          <VStack align="stretch" spacing={3}>
            {/* Repo create */}
            {activity.repos && activity.repos.map((repo: any) => (
              <Box key={repo._id} p={3} bg="gray.50" borderRadius="md" borderWidth={1}>
                <Text fontSize="sm" color="gray.600">
                  <b>{repo.owner?.email || repo.owner?.name}</b> created repository <Code colorScheme="teal">{repo.name}</Code>
                </Text>
              </Box>
            ))}
            {/* Starred */}
            {activity.starred && activity.starred.map((repo: any) =>
              repo.starredBy.map((user: any) => (
                <Box key={repo._id + user._id} p={3} bg="gray.50" borderRadius="md" borderWidth={1}>
                  <Text fontSize="sm" color="gray.600">
                    <b>{user.email || user.name}</b> starred <Code colorScheme="teal">{repo.name}</Code>
                  </Text>
                </Box>
              ))
            )}
            {/* PRs */}
            {activity.prs && activity.prs.map((pr: any) => (
              <Box key={pr._id} p={3} bg="gray.50" borderRadius="md" borderWidth={1}>
                <Text fontSize="sm" color="gray.600">
                  <b>{pr.author?.email || pr.author?.name}</b> opened PR <Code colorScheme="teal">{pr.title}</Code> in <Code colorScheme="teal">{pr.repository?.name}</Code>
                </Text>
              </Box>
            ))}
            {/* Commits */}
            {activity.commits && activity.commits.map((commit: any) => (
              <Box key={commit._id} p={3} bg="gray.50" borderRadius="md" borderWidth={1}>
                <Text fontSize="sm" color="gray.600">
                  <b>{commit.author?.email || commit.author?.name}</b> committed <Code colorScheme="teal">{commit.message}</Code> in <Code colorScheme="teal">{commit.repository?.name}</Code>
                </Text>
              </Box>
            ))}
          </VStack>
        ) : (
          <Text color="gray.400">No recent activity.</Text>
        )}
      </Box>
    </Box>
  );
};

export default ExplorePage;