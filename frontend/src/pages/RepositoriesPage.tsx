import React, { useEffect, useState } from 'react';
import {
  Box,
  Heading,
  Text,
  Flex,
  Avatar,
  Badge,
  Spinner,
  SimpleGrid,
  HStack,
  Icon,
  useColorModeValue,
  Tooltip,
} from '@chakra-ui/react';
import { FaLock, FaUnlock, FaStar } from 'react-icons/fa';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { authenticatedFetch } from '../utils/tokenManager';

type User = {
  _id: string;
  name: string;
  avatar?: string;
};

type Repository = {
  _id: string;
  name: string;
  description?: string;
  isPrivate: boolean;
  isStarred?: boolean;
  owner?: User;
  stars: number;
  collaborators?: User[];
  createdAt?: string;
  updatedAt?: string;
};

const RepositoriesPage: React.FC = () => {
  const [repos, setRepos] = useState<Repository[]>([]);
  const [loading, setLoading] = useState(true);
  const { isAuthenticated } = useAuth();
  const cardBg = useColorModeValue('white', 'gray.800');
  const cardBorder = useColorModeValue('gray.200', 'gray.700');
  const pageBg = useColorModeValue('gray.50', 'gray.900');

  useEffect(() => {
    const fetchRepos = async () => {
      setLoading(true);
      
      if (!isAuthenticated) {
        setRepos([]);
        setLoading(false);
        return;
      }

      try {
        const response = await authenticatedFetch(
          `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/repository/my`
        );
        
        if (response.ok) {
          const data = await response.json();
          setRepos(data);
        } else {
          setRepos([]);
        }
      } catch (error) {
        console.error('Error fetching repositories:', error);
        setRepos([]);
      } finally {
        setLoading(false);
      }
    };

    fetchRepos();
  }, [isAuthenticated]);

  if (loading) {
    return (
      <Flex align="center" justify="center" minH="60vh">
        <Spinner size="xl" />
      </Flex>
    );
  }

  return (
    <Box minH="100vh" w="100vw" bg={pageBg} py={10} px={0}>
      <Box maxW="1200px" mx="auto">
        <Heading mb={8}>Your Repositories</Heading>
        {repos.length === 0 ? (
          <Text color="gray.500">You don't have any repositories yet.</Text>
        ) : (
          <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={8}>
            {repos.map(repo => (
              <Box
                key={repo._id}
                bg={cardBg}
                border="1px solid"
                borderColor={cardBorder}
                borderRadius="lg"
                p={6}
                boxShadow="md"
                position="relative"
              >
                <Flex align="center" mb={2}>
                  <Heading size="md" mr={2}>
                    <Link to={`/repository/${repo._id}`}>{repo.name}</Link>
                  </Heading>
                  <Tooltip label={repo.isPrivate ? "Private" : "Public"}>
                    <span>
                      <Icon as={repo.isPrivate ? FaLock : FaUnlock} color={repo.isPrivate ? "red.400" : "green.400"} ml={2} />
                    </span>
                  </Tooltip>
                  {repo.isStarred && (
                    <Tooltip label="You starred this repository">
                      <Icon as={FaStar} color="yellow.400" ml={2} />
                    </Tooltip>
                  )}
                </Flex>
                <Text color="gray.600" mb={3}>{repo.description || <i>No description</i>}</Text>
                <HStack mb={3}>
                  <Avatar size="sm" src={repo.owner?.avatar} name={repo.owner?.name} />
                  <Text fontSize="sm" color="gray.500">
                    Owner: {repo.owner?.name}
                  </Text>
                </HStack>
                <HStack mb={3} spacing={2}>
                  <Badge colorScheme="purple">{repo.stars} Stars</Badge>
                  <Badge colorScheme="blue">{repo.collaborators?.length || 0} Collaborators</Badge>
                </HStack>
                <Box>
                  <Text fontSize="xs" color="gray.400">
                    Created: {repo.createdAt ? new Date(repo.createdAt).toLocaleDateString() : 'N/A'}
                  </Text>
                  <Text fontSize="xs" color="gray.400">
                    Updated: {repo.updatedAt ? new Date(repo.updatedAt).toLocaleDateString() : 'N/A'}
                  </Text>
                </Box>
                <Box mt={4}>
                  <Text fontSize="sm" fontWeight="bold" mb={1}>Collaborators:</Text>
                  <HStack spacing={2}>
                    {repo.collaborators && repo.collaborators.length > 0 ? (
                      repo.collaborators.map((user: User) => (
                        <Tooltip key={user._id} label={user.name}>
                          <Avatar size="xs" src={user.avatar} name={user.name} />
                        </Tooltip>
                      ))
                    ) : (
                      <Text fontSize="xs" color="gray.400">No collaborators</Text>
                    )}
                  </HStack>
                </Box>
              </Box>
            ))}
          </SimpleGrid>
        )}
      </Box>
    </Box>
  );
};

export default RepositoriesPage;