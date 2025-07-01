import React from 'react';
import { Box, Flex, Button, Heading, Spacer, Menu, MenuButton, MenuList, MenuItem, IconButton } from '@chakra-ui/react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { FaUser, FaBook, FaCodeBranch, FaBell, FaPlus, FaChevronDown } from 'react-icons/fa';

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
          <Flex align="center">
            {/* Navigație suplimentară pentru useri logați */}
            <Link to="/explore">
              <Button leftIcon={<FaBook />} colorScheme="teal" variant="ghost" mr={2}>
                Explore
              </Button>
            </Link>
            <Link to="/repositories">
              <Button leftIcon={<FaCodeBranch />} colorScheme="teal" variant="ghost" mr={2}>
                Repositories
              </Button>
            </Link>
            <Link to="/pulls">
              <Button leftIcon={<FaCodeBranch />} colorScheme="teal" variant="ghost" mr={2}>
                Pull Requests
              </Button>
            </Link>
            <Link to="/notifications">
              <IconButton
                aria-label="Notifications"
                icon={<FaBell />}
                colorScheme="teal"
                variant="ghost"
                mr={2}
              />
            </Link>
            <Menu>
              <MenuButton
                as={Button}
                rightIcon={<FaChevronDown />}
                colorScheme="teal"
                variant="ghost"
                mr={2}
              >
                <FaUser style={{ marginRight: 8 }} />
                {user?.email?.split('@')[0] || 'Profile'}
              </MenuButton>
              <MenuList color="black">
                <MenuItem as={Link} to="/profile">
                  Profile
                </MenuItem>
                <MenuItem as={Link} to="/new-repo" icon={<FaPlus />}>
                  New Repository
                </MenuItem>
                <MenuItem as={Link} to="/stars">
                  Starred
                </MenuItem>
                <MenuItem as={Link} to="/organizations">
                  Organizations
                </MenuItem>
                <MenuItem onClick={logout} color="red.500">
                  Logout
                </MenuItem>
              </MenuList>
            </Menu>
      
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