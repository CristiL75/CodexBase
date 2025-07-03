import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Heading,
  Text,
  Avatar,
  Spinner,
  VStack,
  Badge,
  HStack,
  Alert,
  AlertIcon,
  Button,
  useToast,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  List,
  ListItem,
  Link as ChakraLink,
  useDisclosure,
} from '@chakra-ui/react';

const UserProfilePage: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [followersList, setFollowersList] = useState<any[]>([]);
  const [followingList, setFollowingList] = useState<any[]>([]);
  const [followersLoading, setFollowersLoading] = useState(false);
  const [followingLoading, setFollowingLoading] = useState(false);
  const toast = useToast();
  const navigate = useNavigate();
  const {
    isOpen: isFollowersOpen,
    onOpen: onFollowersOpen,
    onClose: onFollowersClose,
  } = useDisclosure();
  const {
    isOpen: isFollowingOpen,
    onOpen: onFollowingOpen,
    onClose: onFollowingClose,
  } = useDisclosure();

  // Verifică dacă userul logat îl urmărește deja pe acest user
  useEffect(() => {
    const fetchUser = async () => {
      setLoading(true);
      setError('');
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(
          `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/user/${userId}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        if (!res.ok) {
          setError('User not found');
          setUser(null);
        } else {
          const data = await res.json();
          setUser(data.user || data);
          // Verifică dacă userul logat îl urmărește deja
          const loggedUserId = JSON.parse(atob(token!.split('.')[1])).id;
          setIsFollowing((data.user || data).followers?.includes(loggedUserId));
        }
      } catch {
        setError('Server error');
        setUser(null);
      }
      setLoading(false);
    };
    if (userId) fetchUser();
  }, [userId]);

  const handleFollow = async () => {
    setFollowLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/user/${userId}/follow`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (res.ok) {
        setIsFollowing(true);
        setUser((prev: any) => ({
          ...prev,
          followers: [...(prev.followers || []), JSON.parse(atob(token!.split('.')[1])).id],
        }));
        toast({
          title: "Followed!",
          status: "success",
          duration: 2000,
          isClosable: true,
        });
      } else {
        toast({
          title: "Could not follow user.",
          status: "error",
          duration: 2000,
          isClosable: true,
        });
      }
    } catch {
      toast({
        title: "Server error.",
        status: "error",
        duration: 2000,
        isClosable: true,
      });
    }
    setFollowLoading(false);
  };

  const handleUnfollow = async () => {
    setFollowLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/user/${userId}/unfollow`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (res.ok) {
        setIsFollowing(false);
        setUser((prev: any) => ({
          ...prev,
          followers: (prev.followers || []).filter((id: string) => id !== JSON.parse(atob(token!.split('.')[1])).id),
        }));
        toast({
          title: "Unfollowed!",
          status: "info",
          duration: 2000,
          isClosable: true,
        });
      } else {
        toast({
          title: "Could not unfollow user.",
          status: "error",
          duration: 2000,
          isClosable: true,
        });
      }
    } catch {
      toast({
        title: "Server error.",
        status: "error",
        duration: 2000,
        isClosable: true,
      });
    }
    setFollowLoading(false);
  };

  const fetchFollowers = async () => {
    setFollowersLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/user/${userId}/followers`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const data = await res.json();
      setFollowersList(data.followers || []);
    } catch {
      setFollowersList([]);
    }
    setFollowersLoading(false);
  };

  const fetchFollowing = async () => {
    setFollowingLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/user/${userId}/following`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const data = await res.json();
      setFollowingList(data.following || []);
    } catch {
      setFollowingList([]);
    }
    setFollowingLoading(false);
  };

  const openFollowers = () => {
    onFollowersOpen();
    fetchFollowers();
  };

  const openFollowing = () => {
    onFollowingOpen();
    fetchFollowing();
  };

  if (loading) {
    return (
      <Box minH="60vh" display="flex" alignItems="center" justifyContent="center">
        <Spinner size="xl" />
      </Box>
    );
  }

  if (error) {
    return (
      <Box maxW="500px" mx="auto" mt={10}>
        <Alert status="error">
          <AlertIcon />
          {error}
        </Alert>
      </Box>
    );
  }

  if (!user) return null;

  return (
    <Box
      minH="100vh"
      w="100vw"
      bg="gray.50"
      display="flex"
      alignItems="center"
      justifyContent="center"
      px={0}
      py={0}
      m={0}
    >
      <Box
        w={{ base: "100%", md: "600px" }}
        maxW="100vw"
        p={8}
        bg="white"
        borderRadius="lg"
        boxShadow="lg"
        display="flex"
        flexDirection="column"
        alignItems="center"
      >
        <VStack spacing={4} align="center" w="100%">
          <Avatar size="2xl" src={user.avatar} name={user.name || user.email} />
          <Heading size="lg">{user.name || user.email}</Heading>
          <Text color="gray.500">{user.email}</Text>
          {user.bio && <Text color="gray.600">{user.bio}</Text>}
          <HStack spacing={4} mt={2}>
            <Badge colorScheme="teal">Repositories: {user.repositories ?? user.repoCount ?? 0}</Badge>
            <Badge
              colorScheme="purple"
              as="button"
              cursor="pointer"
              onClick={openFollowers}
            >
              Followers: {user.followers?.length ?? 0}
            </Badge>
            <Badge
              colorScheme="orange"
              as="button"
              cursor="pointer"
              onClick={openFollowing}
            >
              Following: {user.following?.length ?? 0}
            </Badge>
          </HStack>
          <Text fontSize="sm" color="gray.400" mt={4}>
            Joined: {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
          </Text>
          <Button
            colorScheme={isFollowing ? "gray" : "teal"}
            onClick={isFollowing ? handleUnfollow : handleFollow}
            isLoading={followLoading}
            mt={2}
          >
            {isFollowing ? "Unfollow" : "Follow"}
          </Button>
        </VStack>
      </Box>

      {/* Followers Modal */}
      <Modal isOpen={isFollowersOpen} onClose={onFollowersClose} size="md">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Followers</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {followersLoading ? (
              <Spinner />
            ) : (
              <List spacing={3}>
                {followersList.length === 0 && <Text>No followers.</Text>}
                {followersList.map((f) => (
                  <ListItem key={f._id}>
                    <ChakraLink
                      color="teal.500"
                      onClick={() => {
                        onFollowersClose();
                        navigate(`/profile/${f._id}`);
                      }}
                      _hover={{ textDecoration: "underline" }}
                    >
                      {f.name || f.email}
                    </ChakraLink>
                  </ListItem>
                ))}
              </List>
            )}
          </ModalBody>
        </ModalContent>
      </Modal>

      {/* Following Modal */}
      <Modal isOpen={isFollowingOpen} onClose={onFollowingClose} size="md">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Following</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {followingLoading ? (
              <Spinner />
            ) : (
              <List spacing={3}>
                {followingList.length === 0 && <Text>Not following anyone.</Text>}
                {followingList.map((f) => (
                  <ListItem key={f._id}>
                    <ChakraLink
                      color="teal.500"
                      onClick={() => {
                        onFollowingClose();
                        navigate(`/profile/${f._id}`);
                      }}
                      _hover={{ textDecoration: "underline" }}
                    >
                      {f.name || f.email}
                    </ChakraLink>
                  </ListItem>
                ))}
              </List>
            )}
          </ModalBody>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default UserProfilePage;