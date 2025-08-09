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
  ModalFooter,
  List,
  ListItem,
  Link as ChakraLink,
  useDisclosure,
  Code,
  Tooltip,
  Textarea,
  Button,
} from '@chakra-ui/react';
import { FaUserFriends, FaStar, FaCodeBranch, FaCalendarAlt, FaUserShield, FaClock, FaEdit } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { authenticatedFetch } from '../utils/tokenManager';

const ProfilePage: React.FC = () => {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [followersList, setFollowersList] = useState<any[]>([]);
  const [followingList, setFollowingList] = useState<any[]>([]);
  const [followersLoading, setFollowersLoading] = useState(false);
  const [followingLoading, setFollowingLoading] = useState(false);
  const [recentCommits, setRecentCommits] = useState<any[]>([]);
  const [commitsLoading, setCommitsLoading] = useState(false);
  const [activityData, setActivityData] = useState<{ date: string, count: number }[]>([]);
  const cardBg = useColorModeValue('white', 'gray.800');
  const cardBorder = useColorModeValue('gray.200', 'gray.700');
  const pageBg = useColorModeValue('gray.50', 'gray.900');
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

  // About Me edit state
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [bioDraft, setBioDraft] = useState('');
  const [bioSaving, setBioSaving] = useState(false);

  // Get auth context
  const { user } = useAuth();
  const loggedUserId = user?.id || '';

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      try {
        const res = await authenticatedFetch('/user/profile');
        const data = await res.json();
        setProfile(data);
        setBioDraft(data.bio || '');
      } catch {
        setProfile(null);
      }
      setLoading(false);
    };
    fetchProfile();
  }, []);

  useEffect(() => {
    const fetchCommits = async () => {
      if (!profile || !profile._id) return;
      setCommitsLoading(true);
      try {
        const res = await authenticatedFetch(`/user/${profile._id}/commits`);
        const data = await res.json();
        setRecentCommits(data.commits || data || []);
      } catch {
        setRecentCommits([]);
      }
      setCommitsLoading(false);
    };
    fetchCommits();
  }, [profile]);

  useEffect(() => {
    const fetchActivity = async () => {
      if (!profile || !profile._id) return;
      try {
        const response = await authenticatedFetch(`/user/${profile._id}/activity-calendar`);
        const data = await response.json();
        setActivityData(data);
      } catch {
        setActivityData([]);
      }
    };
    fetchActivity();
  }, [profile]);

  const fetchFollowers = async () => {
    if (!profile || !profile._id) return;
    setFollowersLoading(true);
    try {
      const response = await authenticatedFetch(`/user/${profile._id}/followers`);
      const data = await response.json();
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
      const response = await authenticatedFetch(`/user/${profile._id}/following`);
      const data = await response.json();
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

  function getColor(count: number) {
    if (count === 0) return "gray.200";
    if (count < 2) return "green.100";
    if (count < 5) return "green.300";
    if (count < 10) return "green.500";
    return "green.700";
  }

  function getLastNDays(n: number) {
    const days = [];
    const today = new Date();
    for (let i = n - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      days.push(d.toISOString().slice(0, 10));
    }
    return days;
  }

  // Save About Me (bio)
  const handleSaveBio = async () => {
    setBioSaving(true);
    try {
      const res = await authenticatedFetch('/user/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ bio: bioDraft }),
      });
      if (res.ok) {
        setProfile({ ...profile, bio: bioDraft });
        setIsEditingBio(false);
      }
    } catch {
      // Handle error silently
    }
    setBioSaving(false);
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
      bg={pageBg}
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
        </Box>
        {/* About Me Section */}
        <Box mt={4} ml={{ md: 8 }}>
          <HStack align="center" mb={2}>
            <Heading size="md">About Me</Heading>
            {profile._id === loggedUserId && (
              <Button
                size="xs"
                leftIcon={<FaEdit />}
                variant="ghost"
                colorScheme="teal"
                onClick={() => {
                  setBioDraft(profile.bio || '');
                  setIsEditingBio(true);
                }}
              >
                {profile.bio ? "Edit" : "Add"}
              </Button>
            )}
          </HStack>
          <Text color="gray.700" fontSize="md" whiteSpace="pre-line">
            {profile.bio ? profile.bio : "No description yet."}
          </Text>
        </Box>
      </Flex>

      {/* Edit About Me Modal */}
      <Modal isOpen={isEditingBio} onClose={() => setIsEditingBio(false)} size="md">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Edit About Me</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Textarea
              value={bioDraft}
              onChange={e => setBioDraft(e.target.value)}
              placeholder="Write something about yourself..."
              rows={5}
            />
          </ModalBody>
          <ModalFooter>
            <Button colorScheme="teal" mr={3} onClick={handleSaveBio} isLoading={bioSaving}>
              Save
            </Button>
            <Button variant="ghost" onClick={() => setIsEditingBio(false)}>
              Cancel
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

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

      {/* Activity Calendar */}
      <Box mt={10} mb={10} p={6} bg={cardBg} border="1px solid" borderColor={cardBorder} borderRadius="lg" boxShadow="md">
        <Heading size="md" mb={4}>Activity Calendar</Heading>
        <Box display="flex" flexWrap="wrap" maxW="360px">
          {getLastNDays(112).map(date => {
            const found = activityData.find(d => d.date === date);
            const count = found ? found.count : 0;
            return (
              <Tooltip key={date} label={`${date}: ${count} commit${count !== 1 ? 's' : ''}`}>
                <Box
                  w="16px"
                  h="16px"
                  m="2px"
                  borderRadius="sm"
                  bg={getColor(count)}
                  border="1px solid"
                  borderColor="gray.300"
                  display="inline-block"
                />
              </Tooltip>
            );
          })}
        </Box>
        <Text fontSize="xs" color="gray.500" mt={2}>
          Last 16 weeks of activity (greener = more commits)
        </Text>
      </Box>

      {/* Recent Activity / Commits */}
      <Box
        mt={10}
        mx={{ base: 4, md: 16 }}
        p={6}
        bg={cardBg}
        border="1px solid"
        borderColor={cardBorder}
        borderRadius="lg"
        boxShadow="md"
      >
        <Heading size="md" mb={4}>Recent Activity</Heading>
        {commitsLoading ? (
          <Spinner />
        ) : recentCommits.length === 0 ? (
          <Text color="gray.400">No recent commits.</Text>
        ) : (
          <VStack align="stretch" spacing={3}>
            {recentCommits.slice(0, 10).map((commit) => (
              <Box key={commit._id} p={3} bg="gray.50" borderRadius="md" borderWidth={1}>
                <HStack>
                  <Icon as={FaCodeBranch} color="teal.400" />
                  <Text fontWeight="bold" fontSize="sm">
                    {commit.message}
                  </Text>
                  <Badge colorScheme="teal" ml={2} fontSize="xs">
                    {commit.repository?.name || "Repo"}
                  </Badge>
                  <Text color="gray.500" fontSize="xs" ml="auto">
                    <Icon as={FaClock} mr={1} />
                    {new Date(commit.createdAt).toLocaleString()}
                  </Text>
                </HStack>
              </Box>
            ))}
          </VStack>
        )}
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