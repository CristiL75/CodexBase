import React from 'react';
import {
  Box,
  Heading,
  Text,
  VStack,
  useColorModeValue,
} from '@chakra-ui/react';

const HomePage: React.FC = () => {
  const bgGradient = useColorModeValue(
    'linear(to-r, teal.400, teal.600)',
    'linear(to-r, teal.600, teal.800)'
  );

  return (
    <Box minH="100vh" w="100vw">
      <Box 
        minH="100vh"
        bgGradient={bgGradient}
        display="flex" 
        alignItems="center" 
        justifyContent="center"
        p={12}
      >
        <VStack spacing={8} align="center" maxW="800px" color="white" textAlign="center">
          <Heading size="4xl" lineHeight="1.1" fontWeight="bold">
            CodexBase
          </Heading>
          <Text fontSize="2xl" lineHeight="1.4" opacity={0.95} fontWeight="medium">
            Modern collaborative platform for development teams
          </Text>
          <Text fontSize="lg" lineHeight="1.6" opacity={0.85} maxW="600px">
            Manage repositories, create pull requests, get AI-powered feedback and streamline your development workflow with ease. Built for teams who value efficiency and collaboration.
          </Text>
          <Text fontSize="md" lineHeight="1.5" opacity={0.75} maxW="500px" mt={4}>
            Experience seamless code collaboration with intelligent tools designed to enhance productivity and foster innovation in your development projects.
          </Text>
        </VStack>
      </Box>
    </Box>
  );
};

export default HomePage;