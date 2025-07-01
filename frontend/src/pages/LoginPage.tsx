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
import { useNavigate } from 'react-router-dom';
// Dacă ai context de autentificare, decomentează linia de mai jos
// import { useAuth } from '../context/AuthContext';

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [twoFACode, setTwoFACode] = useState('');
  const [show2FA, setShow2FA] = useState(false);
  const [tempToken, setTempToken] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Pentru regenerare QR
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [showQR, setShowQR] = useState(false);

  const navigate = useNavigate();
  // Dacă ai context de autentificare, decomentează linia de mai jos
  // const { setToken } = useAuth();

  // Culori dinamice pentru tema light/dark
  const bgColor = useColorModeValue('white', 'gray.800');
  const pageBg = useColorModeValue('gray.50', 'gray.900');

  // Login normal (email + parolă)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!email || !email.includes('@')) {
        setError('Please enter a valid email');
        setLoading(false);
        return;
      }
      if (!password || password.length < 6) {
        setError('Password must be at least 6 characters');
        setLoading(false);
        return;
      }

      const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const res = await fetch(`${apiBaseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.message || 'Login failed');
        setLoading(false);
        return;
      }

      // Dacă backend-ul cere 2FA, setează tokenul și arată formularul de cod
      if (data.require2FA || data.require2FASetup) {
        setShow2FA(true);
        setTempToken(data.tempToken);
        setLoading(false);
        return;
      }

      // Dacă login-ul e complet fără 2FA, salvează tokenul și navighează
      if (data.token) {
        localStorage.setItem('token', data.token);
        // Dacă ai context de autentificare, decomentează linia de mai jos
        // setToken(data.token);
        navigate('/');
        setLoading(false);
        return;
      }

      setError('Unexpected response from server');
      setLoading(false);
    } catch (err) {
      setError('Login failed');
      setLoading(false);
    }
  };

  // Trimite codul 2FA la backend
  const handle2FAVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!tempToken) {
        setError('Token missing. Please re-login.');
        setLoading(false);
        return;
      }
      if (!twoFACode || twoFACode.length !== 6) {
        setError('Please enter a valid 6-digit 2FA code');
        setLoading(false);
        return;
      }
      const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const res = await fetch(`${apiBaseUrl}/auth/2fa/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tempToken}`,
        },
        body: JSON.stringify({ token: twoFACode }),
      });
      const data = await res.json();

      if (res.ok && data.token) {
        localStorage.setItem('token', data.token);
        // Dacă ai context de autentificare, decomentează linia de mai jos
        // setToken(data.token);
        navigate('/');
      } else if (res.ok && data.success) {
        navigate('/');
      } else {
        setError(data.message || 'Invalid 2FA code');
      }
      setLoading(false);
    } catch (err) {
      setError('2FA verification failed');
      setLoading(false);
    }
  };

  // Regenerare QR pentru 2FA
  const handleRegenerate2FAQr = async () => {
  setError('');
  setLoading(true);
  try {
    const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    const token = localStorage.getItem('token') || tempToken;
    if (!token) {
      setError('You must be logged in or have a valid session.');
      setLoading(false);
      return;
    }
    const res = await fetch(`${apiBaseUrl}/auth/2fa/setup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });
    const data = await res.json();
    // Folosește cheia corectă din backend: qrCode
    if (res.ok && data.qrCode) {
      setQrUrl(data.qrCode);
      setShowQR(true);
    } else {
      setError(data.message || 'Could not generate QR code');
    }
  } catch {
    setError('Could not generate QR code');
  }
  setLoading(false);
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

                  {!show2FA ? (
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
                  ) : (
                    <>
                      <form onSubmit={handle2FAVerify}>
                        <VStack spacing={6} align="stretch">
                          <FormControl isRequired>
                            <FormLabel fontSize="lg">2FA Code</FormLabel>
                            <Input
                              type="text"
                              value={twoFACode}
                              onChange={(e) => setTwoFACode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                              placeholder="Enter 2FA code"
                              focusBorderColor="blue.400"
                              size="lg"
                              height="56px"
                              fontSize="md"
                              maxLength={6}
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
                            Verify 2FA
                          </Button>
                        </VStack>
                      </form>
                      <Button
                        colorScheme="orange"
                        variant="outline"
                        onClick={handleRegenerate2FAQr}
                        isLoading={loading}
                        mt={4}
                      >
                        Regenerate 2FA QR Code
                      </Button>
                      {showQR && qrUrl && (
                        <Box textAlign="center" mt={4}>
                          <Text mb={2}>Scan this QR code with your authenticator app:</Text>
                          <img src={qrUrl} alt="2FA QR Code" style={{ margin: '0 auto', maxWidth: 200 }} />
                        </Box>
                      )}
                    </>
                  )}

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