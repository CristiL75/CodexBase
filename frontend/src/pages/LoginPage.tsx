import React, { useState } from 'react';
import {
  Box,
  Button,
  FormControl,
  FormLabel,
  Input,
  VStack,
  Heading,
  Text,
  Alert,
  AlertIcon,
  Divider,
  Flex,
  useColorModeValue,
  Container,
  Grid,
  GridItem,
} from '@chakra-ui/react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login, loading, error, needs2FAVerification } = useAuth();
  const navigate = useNavigate();

  // Culori dinamice pentru tema light/dark
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  const pageBg = useColorModeValue('gray.50', 'gray.900');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!email || !email.includes('@')) {
        throw new Error('Please enter a valid email');
      }
      if (!password || password.length < 6) {
        throw new Error('Password must be at least 6 characters');
      }
      await login(email, password);
      if (needs2FAVerification) {
        navigate('/2fa-verify');
        return;
      }
      navigate('/');
    } catch (err) {
      console.error('Login failed:', err);
    }
  };

  const handleGoogleLogin = () => {
    const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    window.location.href = `${apiBaseUrl}/auth/google`;
  };

  return (
    <Box w="100vw" minH="100vh" bg={pageBg} display="flex" flexDirection="column">
      <Flex flex="1" align="center" justify="center" w="100%" minH="0">
        <Container maxW="container.xl" py={16} flex="1">
          <Grid
            templateColumns={{ base: '1fr', md: '1fr' }}
            gap={0}
            alignItems="stretch"
            h={{ base: 'auto', md: '70vh' }}
          >
            {/* Login Form */}
            <GridItem
              bg={bgColor}
              borderRight="none"
              display="flex"
              alignItems="center"
              justifyContent="center"
              px={{ base: 4, md: 16 }}
              py={{ base: 8, md: 0 }}
            >
              <Box w="100%" maxW="400px">
                <VStack spacing={8} align="stretch">
                  <Heading size="xl" textAlign="center">
                    Login to CodexBase
                  </Heading>
                  {error && (
                    <Alert status="error" borderRadius="md">
                      <AlertIcon />
                      {error}
                    </Alert>
                  )}
                  <form onSubmit={handleSubmit}>
                    <VStack spacing={6} align="stretch">
                      <FormControl isRequired>
                        <FormLabel fontSize="lg">Email</FormLabel>
                        <Input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="youremail@example.com"
                          focusBorderColor="blue.400"
                          size="lg"
                          height="56px"
                          fontSize="md"
                        />
                      </FormControl>
                      <FormControl isRequired>
                        <FormLabel fontSize="lg">Password</FormLabel>
                        <Input
                          type="password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Enter your password"
                          focusBorderColor="blue.400"
                          size="lg"
                          height="56px"
                          fontSize="md"
                        />
                      </FormControl>
                      <Button
                        colorScheme="blue"
                        type="submit"
                        width="100%"
                        size="lg"
                        isLoading={loading}
                        mt={4}
                        height="56px"
                        fontSize="lg"
                        _hover={{
                          bg: 'blue.500',
                          transform: 'translateY(-2px)',
                          boxShadow: 'lg',
                        }}
                        transition="all 0.2s"
                      >
                        Login
                      </Button>
                    </VStack>
                  </form>
                  <Divider />
                  <Button
                    onClick={handleGoogleLogin}
                    colorScheme="red"
                    width="100%"
                    size="lg"
                    height="56px"
                    fontSize="lg"
                    _hover={{
                      bg: 'red.500',
                      transform: 'translateY(-2px)',
                      boxShadow: 'lg',
                    }}
                    transition="all 0.2s"
                  >
                    Login with Google
                  </Button>
                  <Text fontSize="lg" textAlign="center">
                    Don't have an account?{' '}
                    <Button
                      variant="link"
                      onClick={() => navigate('/signup')}
                      color="blue.500"
                      fontSize="lg"
                      _hover={{
                        textDecoration: 'underline',
                      }}
                    >
                      Sign Up
                    </Button>
                  </Text>
                </VStack>
              </Box>
            </GridItem>
          </Grid>
        </Container>
      </Flex>
    </Box>
  );
};

export default LoginPage;