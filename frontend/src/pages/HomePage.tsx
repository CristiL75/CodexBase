import React from 'react';
import {
  Box,
  Heading,
  Text,
  Button,
  Flex,
  Container,
  VStack,
  HStack,
  Icon,
  Divider,
  SimpleGrid,
  useColorModeValue,
} from '@chakra-ui/react';
import { FaGithub, FaUsers, FaRobot, FaCodeBranch, FaLock, FaBolt } from 'react-icons/fa';

const HomePage: React.FC = () => {
  const cardBg = useColorModeValue('white', 'gray.800');
  const cardBorder = useColorModeValue('gray.200', 'gray.700');

  return (
    <Box minH="100vh" bg={useColorModeValue('gray.50', 'gray.900')}>
      <Container maxW="container.xl" py={12}>
        <VStack spacing={10} align="stretch">
          <Box textAlign="center">
            <Heading size="2xl" mb={4}>
              CodexBase
            </Heading>
            <Text fontSize="xl" color="gray.600" maxW="2xl" mx="auto">
              Platformă colaborativă pentru echipe de dezvoltare: scrieți cod în timp real, creați pull requests, primiți feedback AI și lucrați împreună ca pe GitHub, dar cu superputeri!
            </Text>
          </Box>

          <SimpleGrid columns={{ base: 1, md: 3 }} spacing={8}>
            <Box
              bg={cardBg}
              border="1px solid"
              borderColor={cardBorder}
              borderRadius="lg"
              p={6}
              boxShadow="md"
              textAlign="center"
            >
              <Icon as={FaCodeBranch} boxSize={10} color="blue.500" mb={4} />
              <Heading size="md" mb={2}>Editor colaborativ</Heading>
              <Text color="gray.600">
                Scrieți cod împreună, în timp real, cu Monaco Editor (VS Code) și sincronizare instant prin Socket.IO și CRDT (Yjs).
              </Text>
            </Box>
            <Box
              bg={cardBg}
              border="1px solid"
              borderColor={cardBorder}
              borderRadius="lg"
              p={6}
              boxShadow="md"
              textAlign="center"
            >
              <Icon as={FaRobot} boxSize={10} color="purple.500" mb={4} />
              <Heading size="md" mb={2}>Feedback AI la Pull Request</Heading>
              <Text color="gray.600">
                Creează un PR, iar AI-ul (GPT-4) analizează codul și îți dă sugestii de îmbunătățire, bugfix și best practices.
              </Text>
            </Box>
            <Box
              bg={cardBg}
              border="1px solid"
              borderColor={cardBorder}
              borderRadius="lg"
              p={6}
              boxShadow="md"
              textAlign="center"
            >
              <Icon as={FaLock} boxSize={10} color="green.500" mb={4} />
              <Heading size="md" mb={2}>Securitate & Control</Heading>
              <Text color="gray.600">
                Autentificare OAuth2, 2FA, roluri (admin/editor/viewer), rate limiting și salvare sigură a codului în MongoDB.
              </Text>
            </Box>
          </SimpleGrid>

          <Divider />

          <Flex direction={{ base: 'column', md: 'row' }} align="center" justify="space-between" gap={8}>
            <VStack align="start" spacing={4}>
              <Heading size="lg">Funcționalități cheie:</Heading>
              <HStack spacing={4}>
                <Icon as={FaUsers} color="blue.400" />
                <Text>Colaborare în echipă, chat și live presence</Text>
              </HStack>
              <HStack spacing={4}>
                <Icon as={FaBolt} color="yellow.400" />
                <Text>Sincronizare cod rapidă cu Socket.IO & Yjs</Text>
              </HStack>
              <HStack spacing={4}>
                <Icon as={FaGithub} color="gray.700" />
                <Text>Pull requests, code review și istoric versiuni</Text>
              </HStack>
            </VStack>
            <Button
              colorScheme="blue"
              size="lg"
              px={10}
              py={6}
              fontSize="xl"
              onClick={() => window.location.href = '/editor'}
              leftIcon={<FaCodeBranch />}
            >
              Începe să colaborezi
            </Button>
          </Flex>
        </VStack>
      </Container>
    </Box>
  );
};

export default HomePage;