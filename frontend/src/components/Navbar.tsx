import React from 'react';
import { Box, Flex, Button, Heading, Spacer } from '@chakra-ui/react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Navbar: React.FC = () => {
  const { isAuthenticated, user, logout } = useAuth();

  return (
    <Flex
      as="nav"
      align="center"
      justify="space-between"
      wrap="wrap"
      padding="1.5rem"
      bg="teal.500"
      color="white"
    >
      <Flex align="center" mr={5}>
        <Heading as="h1" size="lg">
          <Link to="/">CodexBase</Link>
        </Heading>
      </Flex>

      <Spacer />

      <Box>
        {isAuthenticated ? (
          <Flex>
            <Box mr={4}>Welcome, {user?.email}</Box>
            {user?.is2FAEnabled ? (
              <Box mr={4} bg="green.400" px={2} borderRadius="md">
                2FA Enabled
              </Box>
            ) : (
              <Link to="/2fa-setup">
                <Button colorScheme="yellow" size="sm" mr={4}>
                  Enable 2FA
                </Button>
              </Link>
            )}
            <Button colorScheme="red" size="sm" onClick={logout}>
              Logout
            </Button>
          </Flex>
        ) : (
          <Flex>
            <Link to="/login">
              <Button colorScheme="teal" variant="outline" mr={3}>
                Login
              </Button>
            </Link>
            <Link to="/signup">
              <Button colorScheme="teal" variant="solid">
                Signup
              </Button>
            </Link>
          </Flex>
        )}
      </Box>
    </Flex>
  );
};

export default Navbar;