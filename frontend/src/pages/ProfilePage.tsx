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
} from '@chakra-ui/react';
import { FaUserFriends, FaStar, FaCodeBranch, FaCalendarAlt, FaUserShield } from 'react-icons/fa';

const ProfilePage: React.FC = () => {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const cardBg = useColorModeValue('white', 'gray.800');
  const cardBorder = useColorModeValue('gray.200', 'gray.700');

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

  if (loading) {
    return (
      <Flex align="center" justify="center" minH="60vh">
        <Spinner size="xl" />
      </Flex>
    );
  }

  if (!profile) {
    return (
      <Flex align="center" justify="center" minH="60vh">
        <Text fontSize="xl" color="red.500">Failed to load profile.</Text>
      </Flex>
    );
  }

  return (
    <Box bg={useColorModeValue('gray.50', 'gray.900')} minH="100vh" w="100vw" px={0} py={10}>
      <Flex
        align="center"
        mb={10}
        direction={{ base: 'column', md: 'row' }}
        w="100%"
        px={{ base: 4, md: 16 }}
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

      <SimpleGrid minChildWidth="250px" spacing={10} mb={10} w="100%">
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
              <span>Followers</span>
            </HStack>
          </StatLabel>
          <StatNumber fontSize="4xl">{profile.followers}</StatNumber>
        </Stat>
        <Stat bg={cardBg} border="1px solid" borderColor={cardBorder} borderRadius="lg" p={6} boxShadow="md">
          <StatLabel>
            <HStack>
              <Icon as={FaUserFriends} />
              <span>Following</span>
            </HStack>
          </StatLabel>
          <StatNumber fontSize="4xl">{profile.following}</StatNumber>
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
    </Box>
  );
};

export default ProfilePage;