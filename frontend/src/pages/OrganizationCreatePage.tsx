import { useState } from "react";
import { Box, Heading, Input, Textarea, Button, Flex } from "@chakra-ui/react";
import { useNavigate } from "react-router-dom";
import { useAuth } from '../contexts/AuthContext';
import { authenticatedFetch } from '../utils/tokenManager';

export default function OrganizationCreatePage() {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const navigate = useNavigate();

  const handleCreate = async () => {
    const response = await authenticatedFetch('/organization/new', {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name, description }),
    });
    if (response.ok) {
      const org = await response.json();
      navigate(`/organizations/${org._id}`);
    }
  };

return (
  <Flex minH="100vh" minW="100vw" align="center" justify="center" bg="gray.50">
    <Box
      w="100vw"
      h="100vh"
      bg="white"
      p={8}
      borderRadius="none"
      boxShadow="none"
      display="flex"
      flexDirection="column"
      justifyContent="center"
    >
      <Heading size="lg" mb={4}>Create Organization</Heading>
      <Input placeholder="Organization name" mb={3} value={name} onChange={e => setName(e.target.value)} />
      <Textarea placeholder="Description" mb={3} value={description} onChange={e => setDescription(e.target.value)} />
      <Button colorScheme="teal" onClick={handleCreate} isDisabled={!name} w="100%">Create</Button>
    </Box>
  </Flex>
);
}