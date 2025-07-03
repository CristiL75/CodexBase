import React, { useEffect, useState } from 'react';
import {
  Box,
  Avatar,
  Heading,
  Text,
  Flex,
  Stat,
  StatLabel,
  StatNumber,
  Badge,
  Spinner,
  Divider,
  VStack,
  HStack,
  useColorModeValue,
  Icon,
  SimpleGrid,
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
import { FaUserFriends, FaStar, FaCodeBranch, FaCalendarAlt, FaUserShield } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';

const ProfilePage: React.FC = () => {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [followersList, setFollowersList] = useState<any[]>([]);
  const [followingList, setFollowingList] = useState<any[]>([]);
  const [followersLoading, setFollowersLoading] = useState(false);
  const [followingLoading, setFollowingLoading] = useState(false);
  const cardBg = useColorModeValue('white', 'gray.800');
  const cardBorder = useColorModeValue('gray.200', 'gray.700');
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

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/user/profile`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        setProfile(data);
      } catch {
        setProfile(null);
      }
      setLoading(false);
    };
    fetchProfile();
  }, []);

  const fetchFollowers = async () => {
    if (!profile || !profile._id) return;
    setFollowersLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/user/${profile._id}/followers`,
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
    if (!profile || !profile._id) return;
    setFollowingLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/user/${profile._id}/following`,
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
    if (!profile || !profile._id) return;
    onFollowersOpen();
    fetchFollowers();
  };

  const openFollowing = () => {
    if (!profile || !profile._id) return;
    onFollowingOpen();
    fetchFollowing();
  };

  if (loading) {
    return (
      <Flex align="center" justify="center" minH="100vh" w="100vw">
        <Spinner size="xl" />
      </Flex>
    );
  }

  if (!profile) {
    return (
      <Flex align="center" justify="center" minH="100vh" w="100vw">
        <Text fontSize="xl" color="red.500">Failed to load profile.</Text>
      </Flex>
    );
  }

  return (
    <Box
      bg={useColorModeValue('gray.50', 'gray.900')}
      minH="100vh"
      w="100vw"
      px={0}
      py={0}
      m={0}
    >
      <Flex
        align="center"
        mb={10}
        direction={{ base: 'column', md: 'row' }}
        w="100vw"
        px={{ base: 4, md: 16 }}
        pt={10}
      >
        <Avatar size="2xl" name={profile.name} src={profile.avatar} mr={{ md: 8 }} mb={{ base: 4, md: 0 }} />
        <Box>
          <Heading size="2xl">{profile.name}</Heading>
          <Text color="gray.500" fontSize="xl">{profile.email}</Text>
          <HStack mt={2}>
            {profile.roles?.map((role: string) => (
              <Badge key={role} colorScheme={role === 'admin' ? 'red' : 'blue'}>{role}</Badge>
            ))}
            {profile.is2FAEnabled && (
              <Badge colorScheme="green" ml={2}>2FA Enabled</Badge>
            )}
          </HStack>
          {profile.bio && (
            <Text mt={2} color="gray.600" fontStyle="italic">{profile.bio}</Text>
          )}
        </Box>
      </Flex>

      <Divider mb={10} />

      <SimpleGrid
        minChildWidth="250px"
        spacing={10}
        mb={10}
        w="100vw"
        px={{ base: 4, md: 16 }}
      >
        <Stat bg={cardBg} border="1px solid" borderColor={cardBorder} borderRadius="lg" p={6} boxShadow="md">
          <StatLabel>
            <HStack>
              <Icon as={FaCodeBranch} />
              <span>Repositories</span>
            </HStack>
          </StatLabel>
          <StatNumber fontSize="4xl">{profile.repositories}</StatNumber>
        </Stat>
        <Stat bg={cardBg} border="1px solid" borderColor={cardBorder} borderRadius="lg" p={6} boxShadow="md">
          <StatLabel>
            <HStack>
              <Icon as={FaUserFriends} />
              <span>
                <Box as="span" cursor="pointer" color="teal.500" onClick={openFollowers}>
                  Followers
                </Box>
              </span>
            </HStack>
          </StatLabel>
          <StatNumber fontSize="4xl" color="teal.500" cursor="pointer" onClick={openFollowers}>
            {profile.followers}
          </StatNumber>
        </Stat>
        <Stat bg={cardBg} border="1px solid" borderColor={cardBorder} borderRadius="lg" p={6} boxShadow="md">
          <StatLabel>
            <HStack>
              <Icon as={FaUserFriends} />
              <span>
                <Box as="span" cursor="pointer" color="orange.400" onClick={openFollowing}>
                  Following
                </Box>
              </span>
            </HStack>
          </StatLabel>
          <StatNumber fontSize="4xl" color="orange.400" cursor="pointer" onClick={openFollowing}>
            {profile.following}
          </StatNumber>
        </Stat>
        <Stat bg={cardBg} border="1px solid" borderColor={cardBorder} borderRadius="lg" p={6} boxShadow="md">
          <StatLabel>
            <HStack>
              <Icon as={FaStar} />
              <span>Starred</span>
            </HStack>
          </StatLabel>
          <StatNumber fontSize="4xl">{profile.starred}</StatNumber>
        </Stat>
        <Stat bg={cardBg} border="1px solid" borderColor={cardBorder} borderRadius="lg" p={6} boxShadow="md">
          <StatLabel>
            <HStack>
              <Icon as={FaCalendarAlt} />
              <span>Joined</span>
            </HStack>
          </StatLabel>
          <StatNumber fontSize="2xl">
            {new Date(profile.createdAt).toLocaleDateString()}
          </StatNumber>
        </Stat>
        <Stat bg={cardBg} border="1px solid" borderColor={cardBorder} borderRadius="lg" p={6} boxShadow="md">
          <StatLabel>
            <HStack>
              <Icon as={FaUserShield} />
              <span>Daily Commit Limit</span>
            </HStack>
          </StatLabel>
          <StatNumber fontSize="4xl">{profile.dailyCommitLimit}</StatNumber>
        </Stat>
      </SimpleGrid>

      <VStack align="start" mt={6} spacing={2} px={{ base: 4, md: 16 }}>
        <Text color="gray.600" fontSize="lg">
          <b>Last Commit:</b> {profile.lastCommitAt ? new Date(profile.lastCommitAt).toLocaleString() : 'N/A'}
        </Text>
        <Text color="gray.600" fontSize="lg">
          <b>Total Commits:</b> {profile.commits}
        </Text>
      </VStack>

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
                      color="orange.400"
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

export default ProfilePage;