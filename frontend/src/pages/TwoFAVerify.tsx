import React, { useState } from 'react';
import { 
  Box, Button, FormControl, FormLabel, 
  Input, VStack, Heading, Text, 
  Alert, AlertIcon 
} from '@chakra-ui/react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const TwoFAVerify: React.FC = () => {
  const [token, setToken] = useState('');
  const { verify2FA, loading, error, tempEmail } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await verify2FA(token);
      navigate('/'); // Redirect la home după verificare reușită
    } catch (err) {
      console.error('2FA verification failed:', err);
    }
  };

  // Dacă nu există un email temporar, nu ar trebui să fim pe această pagină
  if (!tempEmail) {
    navigate('/login');
    return null;
  }

  return (
    <Box maxW="md" mx="auto" mt={8} p={6} borderWidth={1} borderRadius="lg">
      <VStack spacing={4} align="stretch">
        <Heading textAlign="center">Two-Factor Authentication</Heading>
        
        <Text textAlign="center">
          Please enter the 6-digit code from your authenticator app for {tempEmail}
        </Text>
        
        {error && (
          <Alert status="error">
            <AlertIcon />
            {error}
          </Alert>
        )}
        
        <form onSubmit={handleSubmit}>
          <VStack spacing={4} align="stretch">
            <FormControl isRequired>
              <FormLabel>Authentication Code</FormLabel>
              <Input 
                type="text" 
                placeholder="6-digit code"
                value={token} 
                onChange={(e) => setToken(e.target.value.replace(/\D/g, ''))}
                maxLength={6}
              />
            </FormControl>
            
            <Button 
              colorScheme="blue" 
              type="submit" 
              width="full"
              isLoading={loading}
            >
              Verify
            </Button>
          </VStack>
        </form>
      </VStack>
    </Box>
  );
};

export default TwoFAVerify;