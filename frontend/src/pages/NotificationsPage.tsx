import React, { useEffect, useState } from 'react';
import { Box, Heading, Text, Button, VStack, Spinner } from '@chakra-ui/react';

const NotificationsPage: React.FC = () => {
  const [invitations, setInvitations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInvitations = async () => {
      setLoading(true);
      const token = localStorage.getItem('token');
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/invitation/my`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setInvitations(data.invitations || []);
      setLoading(false);
    };
    fetchInvitations();
  }, []);

  const handleAction = async (id: string, action: "accept" | "decline") => {
    const token = localStorage.getItem('token');
    await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/invitation/${id}/${action}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    setInvitations(invitations.filter(inv => inv._id !== id));
  };

  if (loading) return <Spinner />;

  return (
    <Box maxW="600px" mx="auto" mt={10}>
      <Heading mb={6}>Invitations</Heading>
      <VStack spacing={4} align="stretch">
        {invitations.length === 0 && <Text>No invitations.</Text>}
        {invitations.map(inv => (
          <Box key={inv._id} p={4} borderWidth={1} borderRadius="md">
            <Text mb={2}>
              You have been invited to <b>{inv.repository?.name}</b>
            </Text>
            <Button colorScheme="green" size="sm" mr={2} onClick={() => handleAction(inv._id, "accept")}>
              Accept
            </Button>
            <Button colorScheme="red" size="sm" onClick={() => handleAction(inv._id, "decline")}>
              Decline
            </Button>
          </Box>
        ))}
      </VStack>
    </Box>
  );
};

export default NotificationsPage;