// ...existing imports...
import { useEffect, useState } from 'react';
import { Box, Heading, Text, Button, VStack, Spinner } from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';

const NotificationsPage: React.FC = () => {
  const [invitations, setInvitations] = useState<any[]>([]);
  const [orgInvitations, setOrgInvitations] = useState<any[]>([]);
  const [followNotifications, setFollowNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchNotifications = async () => {
      setLoading(true);
      const token = localStorage.getItem('token');
      try {
        // Repo invitations
        const resInv = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/invitation/my`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const dataInv = await resInv.json();
        setInvitations(dataInv.invitations || []);

        // Org invitations
        const resOrgInv = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/org-invitation/my`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const dataOrgInv = await resOrgInv.json();
        setOrgInvitations(dataOrgInv.invitations || []);

        // Follow notifications
        const resFollow = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/user/my-follows`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!resFollow.ok) {
          const errText = await resFollow.text();
          throw new Error(`Status: ${resFollow.status} - ${errText}`);
        }
        const dataFollow = await resFollow.json();
        setFollowNotifications(dataFollow.notifications || []);
      } catch (err) {
        console.error("Eroare la fetch notifications:", err);
        alert("Eroare la fetch notifications: " + err);
      }
      setLoading(false);
    };
    fetchNotifications();
  }, []);

  const handleAction = async (id: string, action: "accept" | "decline", type: "repo" | "org") => {
    const token = localStorage.getItem('token');
    const url =
      type === "repo"
        ? `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/invitation/${id}/${action}`
        : `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/org-invitation/${id}/${action}`;
    await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (type === "repo") {
      setInvitations(invitations.filter(inv => inv._id !== id));
    } else {
      setOrgInvitations(orgInvitations.filter(inv => inv._id !== id));
    }
  };

  if (loading) return <Spinner />;

  return (
    <Box minH="100vh" w="100vw" bg="gray.50" py={10} px={0}>
      <Box maxW="700px" mx="auto" bg="white" borderRadius="lg" boxShadow="lg" p={8}>
        <Heading mb={6}>Notifications</Heading>
        <VStack spacing={4} align="stretch">
          {/* Follow notifications */}
          {followNotifications.length === 0 && invitations.length === 0 && orgInvitations.length === 0 && (
            <Text>No notifications.</Text>
          )}
          {followNotifications.map((notif: any) => (
            <Box key={notif._id} p={4} borderWidth={1} borderRadius="md" bg="gray.50">
              <Text mb={2}>
                <b
                  style={{ color: "#319795", cursor: "pointer" }}
                  onClick={() => navigate(`/profile/${notif.from._id}`)}
                >
                  {notif.from.name || notif.from.email}
                </b>{" "}
                started following you!
              </Text>
              <Button
                colorScheme="teal"
                size="sm"
                onClick={() => navigate(`/profile/${notif.from._id}`)}
              >
                View Profile
              </Button>
            </Box>
          ))}
          {/* Repo Invitation notifications */}
          {invitations.map(inv => (
            <Box key={inv._id} p={4} borderWidth={1} borderRadius="md">
              <Text mb={2}>
                You have been invited to <b>{inv.repository?.name}</b>
              </Text>
              <Button colorScheme="green" size="sm" mr={2} onClick={() => handleAction(inv._id, "accept", "repo")}>
                Accept
              </Button>
              <Button colorScheme="red" size="sm" onClick={() => handleAction(inv._id, "decline", "repo")}>
                Decline
              </Button>
            </Box>
          ))}
          {/* Organization Invitation notifications */}
          {orgInvitations.map(inv => (
            <Box key={inv._id} p={4} borderWidth={1} borderRadius="md" bg="purple.50">
              <Text mb={2}>
                You have been invited to join organization <b>{inv.organization?.name}</b>
              </Text>
              <Button colorScheme="green" size="sm" mr={2} onClick={() => handleAction(inv._id, "accept", "org")}>
                Accept
              </Button>
              <Button colorScheme="red" size="sm" onClick={() => handleAction(inv._id, "decline", "org")}>
                Decline
              </Button>
            </Box>
          ))}
        </VStack>
      </Box>
    </Box>
  );
};

export default NotificationsPage;