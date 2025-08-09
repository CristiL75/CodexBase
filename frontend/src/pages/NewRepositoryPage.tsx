import React, { useState } from 'react';
import {
  Box,
  Heading,
  Input,
  Textarea,
  Button,
  Switch,
  FormControl,
  FormLabel,
  useToast,
  VStack,
  HStack,
  Avatar,
  Text,
  Divider,
  Icon,
  useColorModeValue,
  Flex,
} from '@chakra-ui/react';
import { FaLock, FaUnlock, FaUserPlus } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { authenticatedFetch } from '../utils/tokenManager';

type UserResult = {
  _id: string;
  name: string;
  email: string;
  avatar?: string;
};

const NewRepositoryPage: React.FC = () => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [collaborators, setCollaborators] = useState<string[]>([]);
  const [searchUser, setSearchUser] = useState('');
  const [userResults, setUserResults] = useState<UserResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const toast = useToast();
  const navigate = useNavigate();

  // Caută useri pentru colaboratori (simulare rapidă)
  const handleSearchUser = async () => {
    if (!searchUser) return;
    setSearching(true);
    try {
      const response = await authenticatedFetch(`/user/search?query=${searchUser}`);
      const data = await response.json();
      setUserResults(data.users || []);
    } catch {
      setUserResults([]);
    }
    setSearching(false);
  };

  const handleAddCollaborator = (userId: string) => {
    if (!collaborators.includes(userId)) {
      setCollaborators([...collaborators, userId]);
    }
  };

  const handleRemoveCollaborator = (userId: string) => {
    setCollaborators(collaborators.filter(id => id !== userId));
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await authenticatedFetch('/repository/new', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, description, isPrivate, collaborators }),
      });
      if (response.ok) {
        toast({ title: "Repository created!", status: "success" });
        navigate('/repositories');
      } else {
        const data = await response.json();
        toast({ title: data.message || "Error creating repository", status: "error" });
      }
    } catch {
      toast({ title: "Server error", status: "error" });
    }
    setLoading(false);
  };

  const bg = useColorModeValue('gray.50', 'gray.900');
  const cardBg = useColorModeValue('white', 'gray.800');

  return (
    <Box minH="100vh" w="100vw" bg={bg} py={10} px={0}>
      <Flex justify="center" align="flex-start" w="100%">
        <Box
          w={{ base: "100vw", md: "80vw", lg: "60vw" }}
          maxW="1200px"
          bg={cardBg}
          borderRadius="lg"
          boxShadow="lg"
          p={{ base: 4, md: 10 }}
        >
          <Heading mb={6}>Create a new repository</Heading>
          <form onSubmit={handleCreate}>
            <VStack spacing={6} align="stretch">
              <FormControl isRequired>
                <FormLabel>Repository name</FormLabel>
                <Input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="my-awesome-repo"
                  autoFocus
                />
              </FormControl>
              <FormControl>
                <FormLabel>Description (optional)</FormLabel>
                <Textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Describe your repository"
                  resize="vertical"
                />
              </FormControl>
              <FormControl display="flex" alignItems="center">
                <FormLabel mb="0">Private</FormLabel>
                <Switch
                  isChecked={isPrivate}
                  onChange={e => setIsPrivate(e.target.checked)}
                  colorScheme="teal"
                  mr={2}
                />
                <Icon as={isPrivate ? FaLock : FaUnlock} color={isPrivate ? "red.400" : "green.400"} />
                <Text ml={2} color="gray.500">
                  {isPrivate ? "Only you and collaborators can see this repository." : "Anyone can see this repository."}
                </Text>
              </FormControl>

              <Divider />

              {/* Collaborators */}
              <Box>
                <FormLabel>Collaborators</FormLabel>
                <HStack>
                  <Input
                    value={searchUser}
                    onChange={e => setSearchUser(e.target.value)}
                    placeholder="Search users by name or email"
                    size="sm"
                  />
                  <Button size="sm" onClick={handleSearchUser} isLoading={searching}>
                    Search
                  </Button>
                </HStack>
                {userResults.length > 0 && (
                  <Box mt={2} borderWidth={1} borderRadius="md" p={2} bg="gray.50">
                    {userResults.map(user => (
                      <HStack key={user._id} spacing={3} py={1}>
                        <Avatar size="sm" src={user.avatar} name={user.name} />
                        <Text>{user.name} <span style={{ color: "#888" }}>({user.email})</span></Text>
                        <Button
                          size="xs"
                          leftIcon={<FaUserPlus />}
                          onClick={() => handleAddCollaborator(user._id)}
                          isDisabled={collaborators.includes(user._id)}
                        >
                          Add
                        </Button>
                      </HStack>
                    ))}
                  </Box>
                )}
                {collaborators.length > 0 && (
                  <Box mt={3}>
                    <Text fontWeight="bold" mb={1}>Selected collaborators:</Text>
                    {collaborators.map(id => {
                      const user = userResults.find(u => u._id === id);
                      return (
                        <HStack key={id} spacing={3} py={1}>
                          <Avatar size="sm" src={user?.avatar} name={user?.name} />
                          <Text>{user?.name || id}</Text>
                          <Button
                            size="xs"
                            colorScheme="red"
                            onClick={() => handleRemoveCollaborator(id)}
                          >
                            Remove
                          </Button>
                        </HStack>
                      );
                    })}
                  </Box>
                )}
              </Box>

              <Button colorScheme="teal" type="submit" isLoading={loading} size="lg">
                Create Repository
              </Button>
            </VStack>
          </form>
        </Box>
      </Flex>
    </Box>
  );
};

export default NewRepositoryPage;