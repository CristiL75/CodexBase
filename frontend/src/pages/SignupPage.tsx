import React, { useState } from 'react';
import {
  Box, Button, FormControl, FormLabel,
  Input, VStack, Heading, Text,
  Alert, AlertIcon, Divider,
  Container, useColorModeValue,
  InputGroup, InputRightElement,
  FormHelperText
} from '@chakra-ui/react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const SignupPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [tempToken, setTempToken] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const { loading, error } = useAuth();
  const navigate = useNavigate();

  // 2FA state
  const [require2FA, setRequire2FA] = useState(false);
  const [qrCode, setQrCode] = useState('');
  const [twoFACode, setTwoFACode] = useState('');
  const [twoFAError, setTwoFAError] = useState('');

  // Culori dinamice pentru tema light/dark
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  const cardBg = useColorModeValue('white', 'gray.700');

  // Validare parolă
  const validatePassword = (pass: string) => {
    if (pass.length < 8) {
      return "Password must be at least 8 characters";
    }
    if (!/[A-Z]/.test(pass)) {
      return "Password must contain at least one uppercase letter";
    }
    if (!/[0-9]/.test(pass)) {
      return "Password must contain at least one number";
    }
    if (!/[!@#$%^&*]/.test(pass)) {
      return "Password must contain at least one special character";
    }
    return "";
  };

  // 1. Submit signup form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setTwoFAError('');

    if (!email.includes('@') || !email.includes('.')) {
      setPasswordError('Please enter a valid email address');
      return;
    }
    const passError = validatePassword(password);
    if (passError) {
      setPasswordError(passError);
      return;
    }
    if (password !== confirmPassword) {
      setPasswordError('Passwords do not match');
      return;
    }

    try {
      // 1. Signup user (fără navigate!)
      const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const res = await fetch(`${apiBaseUrl}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        setPasswordError(data.message || 'Signup failed');
        return;
      }

      // Salvează tempToken pentru 2FA
      setTempToken(data.tempToken);

      // 2. Inițializează 2FA pentru user (obligatoriu)
    const twoFARes = await fetch(`${apiBaseUrl}/auth/2fa/setup`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${data.tempToken}` // Folosește direct tokenul din răspuns!
  }
});
      const twoFAData = await twoFARes.json();

      if (twoFARes.ok && twoFAData.qrCode) {
        setQrCode(twoFAData.qrCode);
        setRequire2FA(true);
        console.log('Trimiti cod:', twoFACode, twoFACode.length);
      } else {
        setPasswordError('Could not initialize 2FA');
      }
    } catch (err) {
      setPasswordError('Signup failed');
    }
  };

  // 2. Submit 2FA code
  const handle2FAVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setTwoFAError('');
    try {
      const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const res = await fetch(`${apiBaseUrl}/auth/2fa/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tempToken}`
        },
        body: JSON.stringify({ token: twoFACode }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        // 2FA activat cu succes, redirect la login
        navigate('/login');
      } else {
        setTwoFAError(data.message || 'Invalid 2FA code');
      }
    } catch (err) {
      setTwoFAError('2FA verification failed');
    }
  };

  const handleGoogleSignup = () => {
    const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    window.location.href = `${apiBaseUrl}/auth/google`;
  };

  return (
    <Box w="100vw" minH="100vh" bg={useColorModeValue('gray.50', 'gray.900')} display="flex" flexDirection="column">
      <Container maxW="container.xl" py={16} flex="1" display="flex" alignItems="center" justifyContent="center">
        <Box
          w="100%"
          maxW="600px"
          mx="auto"
          p={{ base: 6, md: 12 }}
          borderWidth={1}
          borderRadius="2xl"
          boxShadow="2xl"
          bg={cardBg}
          borderColor={borderColor}
        >
          <VStack spacing={8} align="stretch">
            <Heading textAlign="center" size="xl" mb={2}>Create Your Account</Heading>
            {error && (
              <Alert status="error" borderRadius="md">
                <AlertIcon />
                {error}
              </Alert>
            )}
            {passwordError && (
              <Alert status="error" borderRadius="md">
                <AlertIcon />
                {passwordError}
              </Alert>
            )}

            {/* 2FA Setup Step */}
            {require2FA ? (
              <form onSubmit={handle2FAVerify}>
                <VStack spacing={5} align="stretch">
                  <Text fontWeight="bold" textAlign="center">
                    Scan the QR code below with your authenticator app and enter the generated code.
                  </Text>
                  {qrCode && (
                    <Box display="flex" justifyContent="center">
                      <img src={qrCode} alt="2FA QR Code" style={{ width: 200, height: 200 }} />
                    </Box>
                  )}
                  <FormControl isRequired>
                    <FormLabel>2FA Code</FormLabel>
                    <Input
                      type="text"
                      value={twoFACode}
                      onChange={(e) => setTwoFACode(e.target.value)}
                      placeholder="Enter code from app"
                      focusBorderColor="blue.400"
                      size="lg"
                    />
                  </FormControl>
                  {twoFAError && (
                    <Alert status="error" borderRadius="md">
                      <AlertIcon />
                      {twoFAError}
                    </Alert>
                  )}
                  <Button
                    colorScheme="blue"
                    type="submit"
                    width="full"
                    size="lg"
                    mt={2}
                  >
                    Activate 2FA & Finish Signup
                  </Button>
                </VStack>
              </form>
            ) : (
              // Signup Form Step
              <form onSubmit={handleSubmit}>
                <VStack spacing={5} align="stretch">
                  <FormControl isRequired>
                    <FormLabel>Email</FormLabel>
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="youremail@example.com"
                      focusBorderColor="blue.400"
                      size="lg"
                    />
                    <FormHelperText>We'll never share your email</FormHelperText>
                  </FormControl>
                  <FormControl isRequired>
                    <FormLabel>Full Name</FormLabel>
                    <Input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="John Doe"
                      focusBorderColor="blue.400"
                      size="lg"
                    />
                  </FormControl>
                  <FormControl isRequired>
                    <FormLabel>Password</FormLabel>
                    <InputGroup>
                      <Input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Create a strong password"
                        focusBorderColor="blue.400"
                        size="lg"
                      />
                      <InputRightElement width="4.5rem" h="100%">
                        <Button
                          h="1.75rem"
                          size="sm"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? "Hide" : "Show"}
                        </Button>
                      </InputRightElement>
                    </InputGroup>
                    <FormHelperText>
                      Password must be at least 8 characters with numbers, uppercase and special characters
                    </FormHelperText>
                  </FormControl>
                  <FormControl isRequired>
                    <FormLabel>Confirm Password</FormLabel>
                    <InputGroup>
                      <Input
                        type={showConfirmPassword ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Confirm your password"
                        focusBorderColor="blue.400"
                        size="lg"
                      />
                      <InputRightElement width="4.5rem" h="100%">
                        <Button
                          h="1.75rem"
                          size="sm"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        >
                          {showConfirmPassword ? "Hide" : "Show"}
                        </Button>
                      </InputRightElement>
                    </InputGroup>
                  </FormControl>
                  <Button
                    colorScheme="blue"
                    type="submit"
                    width="full"
                    isLoading={loading}
                    size="lg"
                    mt={4}
                    _hover={{ bg: 'blue.600' }}
                  >
                    Create Account
                  </Button>
                </VStack>
              </form>
            )}

            {!require2FA && (
              <>
                <Divider />
                <Button
                  onClick={handleGoogleSignup}
                  colorScheme="red"
                  width="full"
                  size="lg"
                  _hover={{ bg: 'red.600' }}
                >
                  Sign Up with Google
                </Button>
              </>
            )}
            <Text textAlign="center" fontSize="md">
              Already have an account?{" "}
              <Button
                variant="link"
                onClick={() => navigate('/login')}
                color="blue.500"
                _hover={{ textDecoration: 'underline' }}
              >
                Login
              </Button>
            </Text>
          </VStack>
        </Box>
      </Container>
    </Box>
  );
};

export default SignupPage;