import React, { useEffect, useState } from "react";
import {
  Box, Heading, VStack, HStack, Text, Input, Button, Avatar, Badge, Spinner, SimpleGrid, Code, useColorModeValue, Stack, Flex
} from "@chakra-ui/react";
import { Link } from "react-router-dom";
import { FaStar, FaBook, FaPlus, FaGithub, FaUsers, FaHistory, FaFire, FaChevronRight } from "react-icons/fa";
import { authenticatedFetch } from '../utils/tokenManager';

const ExplorePage: React.FC = () => {
  interface Repo {
    _id: string;
    name: string;
    description?: string;
    isPrivate?: boolean;
    owner?: {
      name?: string;
      email?: string;
      avatar?: string;
    };
    stars?: number;
  }

  interface User {
    _id: string;
    name?: string;
    email?: string;
    avatar?: string;
    repositories?: number;
  }

  interface PullRequest {
    _id: string;
    title: string;
    author?: {
      name?: string;
      email?: string;
      avatar?: string;
    };
    repository?: {
      name?: string;
    };
  }

  interface CommitItem {
    _id: string;
    message: string;
    author?: {
      name?: string;
      email?: string;
      avatar?: string;
    };
    repository?: {
      name?: string;
    };
  }

  // Activity item types
  type RepoActivity = Repo & { type: 'repo' };
  type StarActivity = { 
    type: 'star'; 
    _id: string; 
    name: string; 
    starredBy: { 
      name?: string; 
      email?: string; 
      avatar?: string; 
    } 
  };
  type PullRequestActivity = PullRequest & { type: 'pr' };
  type CommitActivity = CommitItem & { type: 'commit' };

  type ActivityItem = RepoActivity | StarActivity | PullRequestActivity | CommitActivity;

  interface Activity {
    repos?: Repo[];
    starred?: Array<{
      _id: string;
      name: string;
      starredBy: Array<{
        name?: string;
        email?: string;
        avatar?: string;
      }>;
    }>;
    prs?: PullRequest[];
    commits?: CommitItem[];
  }

  const [repos, setRepos] = useState<Repo[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [activity, setActivity] = useState<Activity | null>(null);
  const [search, setSearch] = useState("");
  const [loadingRepos, setLoadingRepos] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingActivity, setLoadingActivity] = useState(true);
  const [showAllRepos, setShowAllRepos] = useState(false);
  const [showAllUsers, setShowAllUsers] = useState(false);
  const [showAllActivity, setShowAllActivity] = useState(false);

  const cardBg = useColorModeValue('white', 'gray.800');
  const cardBorder = useColorModeValue('gray.200', 'gray.700');
  const bgColor = useColorModeValue('gray.50', 'gray.900');

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
        const response = await authenticatedFetch("/repository/activity/recent");
        const data = await response.json();
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

  // Limit display
  const displayedRepos = showAllRepos ? filteredRepos : filteredRepos.slice(0, 6);
  const displayedUsers = showAllUsers ? users : users.slice(0, 6);
  
  // Activity items count
  const activityItems: ActivityItem[] = [];
  
  if (activity?.repos) {
    activityItems.push(...activity.repos.map((item: Repo): RepoActivity => ({ ...item, type: 'repo' })));
  }
  
  if (activity?.starred) {
    activity.starred.forEach((repo) => {
      repo.starredBy.forEach((user) => {
        activityItems.push({ 
          _id: repo._id, 
          name: repo.name, 
          starredBy: user, 
          type: 'star' 
        } as StarActivity);
      });
    });
  }
  
  if (activity?.prs) {
    activityItems.push(...activity.prs.map((item: PullRequest): PullRequestActivity => ({ ...item, type: 'pr' })));
  }
  
  if (activity?.commits) {
    activityItems.push(...activity.commits.map((item: CommitItem): CommitActivity => ({ ...item, type: 'commit' })));
  }

  const displayedActivity = showAllActivity ? activityItems : activityItems.slice(0, 8);

  return (
    <Box minH="100vh" w="100vw" bg={bgColor} py={8} px={4}>
      <Box maxW="1200px" mx="auto">
        {/* Header */}
        <VStack spacing={6} mb={10} textAlign="center">
          <Heading size="2xl" fontWeight="bold">
            Explore CodexBase
          </Heading>
          <Text fontSize="lg" color="gray.600" maxW="600px">
            Discover trending repositories, connect with developers, and stay updated with the latest activity in our community.
          </Text>
        </VStack>

        {/* Search Section */}
        <Box bg={cardBg} p={6} borderRadius="xl" boxShadow="md" border="1px solid" borderColor={cardBorder} mb={8}>
          <HStack spacing={4}>
            <Input
              placeholder="Search repositories by name or description..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              size="lg"
              bg={bgColor}
              borderRadius="lg"
              _focus={{ borderColor: "teal.400", boxShadow: "0 0 0 1px teal.400" }}
            />
            <Button colorScheme="teal" size="lg" px={8}>
              Search
            </Button>
          </HStack>
        </Box>

        {/* Quick Actions */}
        <Box bg={cardBg} p={6} borderRadius="xl" boxShadow="md" border="1px solid" borderColor={cardBorder} mb={8}>
          <Heading size="md" mb={4} display="flex" alignItems="center">
            <FaPlus style={{ marginRight: '8px' }} />
            Quick Actions
          </Heading>
          <Stack direction={{ base: "column", md: "row" }} spacing={4}>
            <Link to="/new-repo">
              <Button leftIcon={<FaBook />} colorScheme="teal" variant="solid" size="lg" w={{ base: "full", md: "auto" }}>
                Create Repository
              </Button>
            </Link>
            <Link to="/repositories">
              <Button leftIcon={<FaGithub />} colorScheme="teal" variant="outline" size="lg" w={{ base: "full", md: "auto" }}>
                My Repositories
              </Button>
            </Link>
            <Link to="/organizations">
              <Button leftIcon={<FaUsers />} colorScheme="purple" variant="outline" size="lg" w={{ base: "full", md: "auto" }}>
                Organizations
              </Button>
            </Link>
          </Stack>
        </Box>

        {/* Trending Repositories */}
        <Box bg={cardBg} p={6} borderRadius="xl" boxShadow="md" border="1px solid" borderColor={cardBorder} mb={8}>
          <Flex justify="space-between" align="center" mb={4}>
            <Heading size="md" display="flex" alignItems="center">
              <FaFire style={{ marginRight: '8px' }} />
              Trending Repositories
            </Heading>
            {filteredRepos.length > 6 && (
              <Button
                variant="ghost"
                colorScheme="teal"
                rightIcon={<FaChevronRight />}
                onClick={() => setShowAllRepos(!showAllRepos)}
              >
                {showAllRepos ? 'Show Less' : 'See More'}
              </Button>
            )}
          </Flex>
          
          {loadingRepos ? (
            <Flex justify="center" py={8}>
              <Spinner size="lg" color="teal.500" />
            </Flex>
          ) : (
            <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6}>
              {displayedRepos.length === 0 && (
                <Box gridColumn="1 / -1" textAlign="center" py={8}>
                  <Text color="gray.400" fontSize="lg">No repositories found.</Text>
                </Box>
              )}
              {displayedRepos.map(repo => (
                <Box key={repo._id} p={5} borderWidth={1} borderRadius="lg" bg={bgColor} _hover={{ transform: "translateY(-2px)", boxShadow: "lg" }} transition="all 0.2s">
                  <VStack align="start" spacing={3}>
                    <HStack justify="space-between" w="full">
                      <Link to={`/repository/${repo._id}`}>
                        <Heading size="sm" color="teal.500" _hover={{ color: "teal.600" }}>
                          {repo.name}
                        </Heading>
                      </Link>
                      <Badge colorScheme={repo.isPrivate ? "red" : "green"} borderRadius="full">
                        {repo.isPrivate ? "Private" : "Public"}
                      </Badge>
                    </HStack>
                    
                    <Text fontSize="sm" color="gray.600" noOfLines={2}>
                      {repo.description || "No description available"}
                    </Text>
                    
                    <HStack justify="space-between" w="full">
                      <HStack spacing={2}>
                        <Avatar size="xs" src={repo.owner?.avatar} />
                        <Text fontSize="xs" color="gray.500">
                          {repo.owner?.name || repo.owner?.email}
                        </Text>
                      </HStack>
                      <HStack spacing={1}>
                        <FaStar color="gold" size={12} />
                        <Text fontSize="xs" color="gray.500">
                          {repo.stars || 0}
                        </Text>
                      </HStack>
                    </HStack>
                  </VStack>
                </Box>
              ))}
            </SimpleGrid>
          )}
        </Box>

        {/* Popular Users */}
        <Box bg={cardBg} p={6} borderRadius="xl" boxShadow="md" border="1px solid" borderColor={cardBorder} mb={8}>
          <Flex justify="space-between" align="center" mb={4}>
            <Heading size="md" display="flex" alignItems="center">
              <FaUsers style={{ marginRight: '8px' }} />
              Popular Developers
            </Heading>
            {users.length > 6 && (
              <Button
                variant="ghost"
                colorScheme="teal"
                rightIcon={<FaChevronRight />}
                onClick={() => setShowAllUsers(!showAllUsers)}
              >
                {showAllUsers ? 'Show Less' : 'See More'}
              </Button>
            )}
          </Flex>
          
          {loadingUsers ? (
            <Flex justify="center" py={8}>
              <Spinner size="lg" color="teal.500" />
            </Flex>
          ) : (
            <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6}>
              {displayedUsers.length === 0 && (
                <Box gridColumn="1 / -1" textAlign="center" py={8}>
                  <Text color="gray.400" fontSize="lg">No users found.</Text>
                </Box>
              )}
              {displayedUsers.map(user => (
                <Box key={user._id} p={4} borderWidth={1} borderRadius="lg" bg={bgColor} _hover={{ transform: "translateY(-2px)", boxShadow: "lg" }} transition="all 0.2s">
                  <HStack spacing={3}>
                    <Avatar src={user.avatar} name={user.name || user.email} size="md" />
                    <VStack align="start" spacing={1} flex="1">
                      <Link to={`/profile/${user._id}`}>
                        <Text fontWeight="bold" color="teal.500" _hover={{ color: "teal.600" }}>
                          {user.name || user.email}
                        </Text>
                      </Link>
                      <Text fontSize="sm" color="gray.500" noOfLines={1}>
                        {user.email}
                      </Text>
                      <Text fontSize="xs" color="gray.400">
                        {user.repositories || 0} repositories
                      </Text>
                    </VStack>
                  </HStack>
                </Box>
              ))}
            </SimpleGrid>
          )}
        </Box>

        {/* Activity Feed */}
        <Box bg={cardBg} p={6} borderRadius="xl" boxShadow="md" border="1px solid" borderColor={cardBorder}>
          <Flex justify="space-between" align="center" mb={4}>
            <Heading size="md" display="flex" alignItems="center">
              <FaHistory style={{ marginRight: '8px' }} />
              Recent Activity
            </Heading>
            {activityItems.length > 8 && (
              <Button
                variant="ghost"
                colorScheme="teal"
                rightIcon={<FaChevronRight />}
                onClick={() => setShowAllActivity(!showAllActivity)}
              >
                {showAllActivity ? 'Show Less' : 'See More'}
              </Button>
            )}
          </Flex>
          
          {loadingActivity ? (
            <Flex justify="center" py={8}>
              <Spinner size="lg" color="teal.500" />
            </Flex>
          ) : displayedActivity.length > 0 ? (
            <VStack align="stretch" spacing={3}>
              {displayedActivity.map((item: ActivityItem, index: number) => (
                <Box key={index} p={4} bg={bgColor} borderRadius="lg" borderWidth={1} borderColor={cardBorder}>
                  <HStack spacing={3}>
                    <Avatar 
                      size="sm" 
                      src={item.type === 'star' ? item.starredBy?.avatar : 
                           item.type === 'repo' ? item.owner?.avatar :
                           item.type === 'pr' ? item.author?.avatar :
                           item.type === 'commit' ? item.author?.avatar : undefined} 
                      name={item.type === 'star' ? item.starredBy?.name || item.starredBy?.email : 
                            item.type === 'repo' ? item.owner?.name || item.owner?.email :
                            item.type === 'pr' ? item.author?.name || item.author?.email :
                            item.type === 'commit' ? item.author?.name || item.author?.email : undefined}
                    />
                    <Box flex="1">
                      {item.type === 'repo' && (
                        <Text fontSize="sm">
                          <Text as="span" fontWeight="bold" color="teal.600">
                            {item.owner?.name || item.owner?.email}
                          </Text>
                          {' '}created repository{' '}
                          <Code colorScheme="teal" fontSize="xs">{item.name}</Code>
                        </Text>
                      )}
                      {item.type === 'star' && (
                        <Text fontSize="sm">
                          <Text as="span" fontWeight="bold" color="teal.600">
                            {item.starredBy?.name || item.starredBy?.email}
                          </Text>
                          {' '}starred{' '}
                          <Code colorScheme="teal" fontSize="xs">{item.name}</Code>
                        </Text>
                      )}
                      {item.type === 'pr' && (
                        <Text fontSize="sm">
                          <Text as="span" fontWeight="bold" color="teal.600">
                            {item.author?.name || item.author?.email}
                          </Text>
                          {' '}opened PR{' '}
                          <Code colorScheme="teal" fontSize="xs">{item.title}</Code>
                          {' '}in{' '}
                          <Code colorScheme="teal" fontSize="xs">{item.repository?.name}</Code>
                        </Text>
                      )}
                      {item.type === 'commit' && (
                        <Text fontSize="sm">
                          <Text as="span" fontWeight="bold" color="teal.600">
                            {item.author?.name || item.author?.email}
                          </Text>
                          {' '}committed{' '}
                          <Code colorScheme="teal" fontSize="xs">{item.message}</Code>
                          {' '}in{' '}
                          <Code colorScheme="teal" fontSize="xs">{item.repository?.name}</Code>
                        </Text>
                      )}
                    </Box>
                  </HStack>
                </Box>
              ))}
            </VStack>
          ) : (
            <Box textAlign="center" py={8}>
              <Text color="gray.400" fontSize="lg">No recent activity.</Text>
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
};

export default ExplorePage;