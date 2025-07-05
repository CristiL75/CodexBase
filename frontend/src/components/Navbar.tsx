import React, { useState } from 'react';
import {
  Box, Flex, Button, Heading, Spacer, Menu, MenuButton, MenuList, MenuItem, IconButton, Input, InputGroup, InputRightElement, List, ListItem
} from '@chakra-ui/react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { FaUser, FaBook, FaCodeBranch, FaBell, FaPlus, FaChevronDown, FaSearch } from 'react-icons/fa';

const Navbar: React.FC = () => {
  const { isAuthenticated, user, logout } = useAuth();
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const navigate = useNavigate();

  // Caută utilizatori după email sau username
  const handleSearch = async (value: string) => {
    setSearch(value);
    setShowDropdown(!!value);
    if (!value || value.length < 2) {
      setResults([]);
      return;
    }
    setSearching(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/user/find`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ query: value }),
        }
      );
      const data = await res.json();
      if (res.ok && data.users) {
        setResults(data.users);
      } else {
        setResults([]);
      }
    } catch {
      setResults([]);
    }
    setSearching(false);
  };

  const handleSelectUser = (userId: string) => {
    setShowDropdown(false);
    setSearch('');
    setResults([]);
    navigate(`/profile/${userId}`);
  };

  return (
    <Flex
      as="nav"
      align="center"
      justify="space-between"
      wrap="wrap"
      padding="1.5rem"
      bg="teal.500"
      color="white"
      position="relative"
      zIndex={10}
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
            {/* Search bar utilizatori */}
            <Box position="relative" mr={4}>
              <InputGroup>
                <Input
                  placeholder="Search users..."
                  value={search}
                  onChange={e => handleSearch(e.target.value)}
                  bg="white"
                  color="black"
                  width="200px"
                  _placeholder={{ color: 'gray.400' }}
                  onFocus={() => setShowDropdown(!!search)}
                  onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
                />
                <InputRightElement pointerEvents="none">
                  <FaSearch color="gray.400" />
                </InputRightElement>
              </InputGroup>
              {showDropdown && results.length > 0 && (
                <List
                  position="absolute"
                  top="40px"
                  left={0}
                  width="100%"
                  bg="white"
                  color="black"
                  borderRadius="md"
                  boxShadow="md"
                  zIndex={20}
                  maxH="220px"
                  overflowY="auto"
                >
                  {results.map(u => (
                    <ListItem
                      key={u._id}
                      px={3}
                      py={2}
                      _hover={{ bg: "gray.100", cursor: "pointer" }}
                      onMouseDown={() => handleSelectUser(u._id)}
                    >
                      <Flex align="center">
                        <Box fontWeight="bold" mr={2}>{u.name || u.email}</Box>
                        <Box fontSize="sm" color="gray.500">{u.email}</Box>
                      </Flex>
                    </ListItem>
                  ))}
                </List>
              )}
              {showDropdown && !searching && results.length === 0 && (
                <Box
                  position="absolute"
                  top="40px"
                  left={0}
                  width="100%"
                  bg="white"
                  color="gray.500"
                  borderRadius="md"
                  boxShadow="md"
                  zIndex={20}
                  px={3}
                  py={2}
                  fontSize="sm"
                >
                  No users found.
                </Box>
              )}
            </Box>
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