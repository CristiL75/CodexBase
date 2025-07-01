import React, { useState } from 'react';
import { 
  Box, 
  Heading, 
  Text, 
  Grid, 
  GridItem,
  Flex,
  Container,
  Button, 
  useToast,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Card,
  CardHeader,
  CardBody,
  CardFooter,
  Stack,
  StatGroup,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Divider,
} from '@chakra-ui/react';
import { useAuth } from '../contexts/AuthContext';

const HomePage: React.FC = () => {
  const { user, disable2FA } = useAuth();
  const [password, setPassword] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const toast = useToast();

  // Funcție pentru dezactivare 2FA
  const handleDisable2FA = async () => {
    try {
      await disable2FA(password);
      setIsOpen(false);
      setPassword('');
      toast({
        title: '2FA Disabled',
        description: 'Two-factor authentication has been disabled for your account',
        status: 'success',
        duration: 5000,
        isClosable: true
      });
    } catch (err) {
      console.error('Failed to disable 2FA:', err);
      toast({
        title: 'Error',
        description: 'Failed to disable 2FA. Please check your password and try again.',
        status: 'error',
        duration: 5000,
        isClosable: true
      });
    }
  };

  return (
    <Container maxW="container.xl" py={8}>
      <Grid templateColumns="repeat(12, 1fr)" gap={6}>
        {/* Header Section */}
        <GridItem colSpan={12} mb={6}>
          <Card>
            <CardHeader bg="blue.500" color="white" borderTopRadius="md">
              <Heading size="lg">Welcome to CodexBase Dashboard</Heading>
            </CardHeader>
            <CardBody>
              <Text fontSize="lg">
                Welcome {user?.name || user?.email}! This is your secure dashboard where you can manage your account settings and security preferences.
              </Text>
            </CardBody>
          </Card>
        </GridItem>

        {/* Account Info Section */}
        <GridItem colSpan={{ base: 12, md: 6 }}>
          <Card h="100%">
            <CardHeader>
              <Heading size="md">Account Information</Heading>
            </CardHeader>
            <CardBody>
              <StatGroup>
                <Stat>
                  <StatLabel>Email</StatLabel>
                  <StatNumber fontSize="md">{user?.email}</StatNumber>
                </Stat>
              </StatGroup>
              
              <Divider my={4} />
              
              <StatGroup>
                <Stat>
                  <StatLabel>Account Created</StatLabel>
                  <StatHelpText>July 1, 2025</StatHelpText>
                </Stat>
                
                <Stat>
                  <StatLabel>Last Login</StatLabel>
                  <StatHelpText>Today</StatHelpText>
                </Stat>
              </StatGroup>
            </CardBody>
          </Card>
        </GridItem>

        {/* Security Section */}
        <GridItem colSpan={{ base: 12, md: 6 }}>
          <Card h="100%">
            <CardHeader>
              <Heading size="md">Security Settings</Heading>
            </CardHeader>
            <CardBody>
              <Stack spacing={4}>
                <Flex justify="space-between" align="center">
                  <Box>
                    <Text fontWeight="bold">Two-Factor Authentication</Text>
                    <Text fontSize="sm" color="gray.600">
                      Add an extra layer of security to your account
                    </Text>
                  </Box>
                  <Box>
                    {user?.is2FAEnabled ? (
                      <Button colorScheme="red" onClick={() => setIsOpen(true)}>
                        Disable
                      </Button>
                    ) : (
                      <Button colorScheme="green" onClick={() => window.location.href = '/2fa-setup'}>
                        Enable
                      </Button>
                    )}
                  </Box>
                </Flex>
                
                <Flex justify="space-between" align="center">
                  <Box>
                    <Text fontWeight="bold">Password Security</Text>
                    <Text fontSize="sm" color="gray.600">
                      Change your password regularly
                    </Text>
                  </Box>
                  <Button>Change Password</Button>
                </Flex>
                
                <Flex justify="space-between" align="center">
                  <Box>
                    <Text fontWeight="bold">Security Log</Text>
                    <Text fontSize="sm" color="gray.600">
                      View recent security events
                    </Text>
                  </Box>
                  <Button>View Log</Button>
                </Flex>
              </Stack>
            </CardBody>
            <CardFooter bg="gray.50" borderBottomRadius="md">
              <Text fontSize="sm" color="gray.600">
                Last security check: Today
              </Text>
            </CardFooter>
          </Card>
        </GridItem>
      </Grid>
      
      {/* Dialog pentru confirmarea dezactivării 2FA */}
      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Disable Two-Factor Authentication</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Text mb={4}>
              Are you sure you want to disable two-factor authentication? This will reduce the security of your account.
            </Text>
            
            <Box mb={4}>
              <Text fontWeight="bold" mb={2}>Confirm your password</Text>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #e2e8f0',
                  borderRadius: '0.375rem',
                }}
              />
            </Box>
          </ModalBody>

          <ModalFooter>
            <Button variant="outline" mr={3} onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button colorScheme="red" onClick={handleDisable2FA}>
              Disable 2FA
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Container>
  );
};

export default HomePage;