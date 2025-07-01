import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  VStack,
  Heading,
  Text,
  Image,
  Input,
  FormControl,
  FormLabel,
  Alert,
  AlertIcon,
  useToast,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
  Code
} from '@chakra-ui/react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const TwoFASetup: React.FC = () => {
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [secret, setSecret] = useState<string>('');
  const [token, setToken] = useState<string>('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  
  const { setup2FA, confirm2FA, generateBackupCodes, loading, error, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const { isOpen, onOpen, onClose } = useDisclosure();
  
  useEffect(() => {
    // Verifică dacă utilizatorul este autentificat
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    
    // Inițiază setup-ul 2FA
    const initSetup = async () => {
      try {
        const result = await setup2FA();
        setQrCodeUrl(result.qrCodeUrl);
        setSecret(result.secret);
      } catch (err) {
        console.error('Failed to setup 2FA:', err);
      }
    };
    
    initSetup();
  }, [isAuthenticated, navigate, setup2FA]);
  
  // Funcție pentru verificarea și confirmarea codului 2FA
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || token.length !== 6) {
      toast({
        title: 'Invalid token',
        description: 'Please enter a valid 6-digit token',
        status: 'error',
        duration: 5000,
        isClosable: true
      });
      return;
    }
    
    try {
      await confirm2FA(token);
      
      // După activare, generăm coduri de backup
      const codes = await generateBackupCodes();
      setBackupCodes(codes);
      onOpen(); // Deschide modalul cu coduri de backup
      
      toast({
        title: '2FA Enabled Successfully',
        description: 'Two-factor authentication has been enabled for your account',
        status: 'success',
        duration: 5000,
        isClosable: true
      });
    } catch (err) {
      console.error('Failed to verify 2FA token:', err);
    }
  };
  
  return (
    <Box maxW="md" mx="auto" mt={8} p={6} borderWidth={1} borderRadius="lg">
      <VStack spacing={6} align="stretch">
        <Heading textAlign="center">Setup Two-Factor Authentication</Heading>
        
        {error && (
          <Alert status="error">
            <AlertIcon />
            {error}
          </Alert>
        )}
        
        <Text>
          Enhance the security of your account by enabling two-factor authentication.
        </Text>
        
        <Box>
          <Text fontWeight="bold" mb={2}>Step 1: Scan QR Code</Text>
          <Text fontSize="sm" mb={4}>
            Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)
          </Text>
          {qrCodeUrl && <Image src={qrCodeUrl} alt="QR Code for 2FA" mx="auto" mb={4} />}
          
          <Text fontSize="sm">
            If you can't scan the QR code, enter this secret key manually:
          </Text>
          <Code p={2} mb={4} fontSize="sm">{secret}</Code>
        </Box>
        
        <form onSubmit={handleSubmit}>
          <Box>
            <Text fontWeight="bold" mb={2}>Step 2: Verify Setup</Text>
            <Text fontSize="sm" mb={4}>
              Enter the 6-digit code from your authenticator app to verify the setup
            </Text>
            
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
              mt={4}
              isLoading={loading}
            >
              Verify and Enable 2FA
            </Button>
          </Box>
        </form>
      </VStack>
      
      {/* Modal pentru codurile de backup */}
      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Backup Codes</ModalHeader>
          <ModalBody>
            <Text mb={4}>
              These are your backup codes. Save them in a secure place. You can use these codes to access your account
              if you lose access to your authenticator app.
            </Text>
            <VStack align="stretch">
              {backupCodes.map((code, index) => (
                <Code key={index} p={2}>{code}</Code>
              ))}
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button colorScheme="blue" onClick={() => {
              onClose();
              navigate('/');
            }}>
              I've Saved My Codes
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default TwoFASetup;