import { useEffect, useState } from 'react';
import { Box, Heading, Text, Button, VStack, Spinner, HStack, useToast, AlertDialog, AlertDialogOverlay, AlertDialogContent, AlertDialogHeader, AlertDialogBody, AlertDialogFooter, useDisclosure } from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../contexts/NotificationContext';
import { FaTrash, FaTrashAlt } from 'react-icons/fa';
import { useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { authenticatedFetch } from '../utils/tokenManager';

const NotificationsPage: React.FC = () => {
  const { refreshNotifications } = useNotifications();
  
  type Invitation = {
    _id: string;
    repository?: { name: string };
  };
  
  type OrgInvitation = {
    _id: string;
    organization?: { name: string };
  };
  
  type FollowNotification = {
    _id: string;
    from: { _id: string; name?: string; email?: string };
  };
  
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [orgInvitations, setOrgInvitations] = useState<OrgInvitation[]>([]);
  const [followNotifications, setFollowNotifications] = useState<FollowNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingAll, setDeletingAll] = useState(false);
  const navigate = useNavigate();
  const toast = useToast();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const fetchNotifications = async () => {
      setLoading(true);
      try {
        console.log('🔍 Fetching notifications...');

        // 📋 REPO INVITATIONS - SAFE FETCH
        try {
          const resInv = await authenticatedFetch('/invitation/my');
          if (resInv.ok) {
            const dataInv = await resInv.json();
            console.log('📋 Repo invitations:', dataInv);
            setInvitations(dataInv.invitations || []);
          } else {
            console.log('📋 No repo invitations or endpoint not available');
            setInvitations([]);
          }
        } catch (err) {
          console.log('📋 Repo invitations fetch failed:', err);
          setInvitations([]);
        }

        // 🏢 ORG INVITATIONS - SAFE FETCH
        try {
          const resOrgInv = await authenticatedFetch('/org-invitation/my');
          if (resOrgInv.ok) {
            const dataOrgInv = await resOrgInv.json();
            console.log('🏢 Org invitations:', dataOrgInv);
            setOrgInvitations(dataOrgInv.invitations || []);
          } else {
            console.log('🏢 No org invitations or endpoint not available');
            setOrgInvitations([]);
          }
        } catch (err) {
          console.log('🏢 Org invitations fetch failed:', err);
          setOrgInvitations([]);
        }

        // 👥 FOLLOW NOTIFICATIONS - SAFE FETCH
        try {
          const resFollow = await authenticatedFetch('/user/my-follows');
          if (resFollow.ok) {
            const dataFollow = await resFollow.json();
            console.log('👥 Follow notifications:', dataFollow);
            setFollowNotifications(dataFollow.notifications || []);
          } else {
            console.log('👥 No follow notifications or endpoint error');
            setFollowNotifications([]);
          }
        } catch (err) {
          console.log('👥 Follow notifications fetch failed:', err);
          setFollowNotifications([]);
        }
        
      } catch (err) {
        console.error("❌ General error fetching notifications:", err);
      }
      setLoading(false);
    };
    
    fetchNotifications();
  }, []);

  // 🗑️ ȘTERGE O FOLLOW NOTIFICATION SPECIFICĂ
  const handleDeleteFollowNotification = async (notificationId: string) => {
    try {
      const response = await authenticatedFetch(`/user/follow-notification/${notificationId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        console.log(`✅ Follow notification ${notificationId} deleted`);
        setFollowNotifications(followNotifications.filter(notif => notif._id !== notificationId));
        refreshNotifications();
        toast({ title: "Notification deleted", status: "success", duration: 2000 });
      } else {
        toast({ title: "Failed to delete notification", status: "error" });
      }
    } catch (error) {
      console.error(`❌ Error deleting follow notification:`, error);
      toast({ title: "Server error", status: "error" });
    }
  };

  // 🗑️ ȘTERGE TOATE NOTIFICĂRILE (follow + invitations)
  const handleDeleteAllNotifications = async () => {
    setDeletingAll(true);
    try {
      const response = await authenticatedFetch('/user/mark-all-notifications-read', {
        method: 'POST',
      });

      if (response.ok) {
        console.log('✅ All notifications deleted');
        setFollowNotifications([]);
        setInvitations([]);
        setOrgInvitations([]);
        refreshNotifications();
        toast({ title: "All notifications deleted", status: "success", duration: 2000 });
      } else {
        toast({ title: "Failed to delete all notifications", status: "error" });
      }
    } catch (error) {
      console.error('❌ Error deleting all notifications:', error);
      toast({ title: "Server error", status: "error" });
    }
    setDeletingAll(false);
    onClose();
  };

  const handleAction = async (id: string, action: "accept" | "decline", type: "repo" | "org") => {
    const url =
      type === "repo"
        ? `/invitation/${id}/${action}`
        : `/org-invitation/${id}/${action}`;
    
    try {
      const response = await authenticatedFetch(url, {
        method: 'POST',
      });

      if (response.ok) {
        console.log(`✅ ${action} successful for ${type} invitation ${id}`);
        
        // Actualizează local state-ul
        if (type === "repo") {
          setInvitations(invitations.filter(inv => inv._id !== id));
        } else {
          setOrgInvitations(orgInvitations.filter(inv => inv._id !== id));
        }
        
        // Actualizează count-ul din context
        refreshNotifications();
        toast({ 
          title: `Invitation ${action}ed`, 
          status: action === "accept" ? "success" : "info", 
          duration: 2000 
        });
      } else {
        console.error(`❌ Failed to ${action} ${type} invitation:`, response.status);
        const errorData = await response.text();
        console.error('Error details:', errorData);
        toast({ title: `Failed to ${action} invitation`, status: "error" });
      }
    } catch (error) {
      console.error(`❌ Error handling ${action} for ${type} invitation:`, error);
      toast({ title: "Server error", status: "error" });
    }
  };

  if (loading) {
    return (
      <Box minH="100vh" w="100vw" bg="gray.50" py={10} px={0}>
        <Box maxW="700px" mx="auto" bg="white" borderRadius="lg" boxShadow="lg" p={8}>
          <VStack spacing={4}>
            <Spinner size="xl" />
            <Text>Loading notifications...</Text>
          </VStack>
        </Box>
      </Box>
    );
  }

  const totalNotifications = followNotifications.length + invitations.length + orgInvitations.length;
  console.log('📊 Total notifications to display:', totalNotifications);

  return (
    <Box minH="100vh" w="100vw" bg="gray.50" py={10} px={0}>
      <Box maxW="700px" mx="auto" bg="white" borderRadius="lg" boxShadow="lg" p={8}>
        
        {/* Header cu buton de ștergere toate */}
        <HStack justify="space-between" mb={6}>
          <Heading>Notifications ({totalNotifications})</Heading>
          {totalNotifications > 0 && (
            <Button
              leftIcon={<FaTrashAlt />}
              colorScheme="red"
              variant="outline"
              size="sm"
              onClick={onOpen}
            >
              Delete All
            </Button>
          )}
        </HStack>

        <VStack spacing={4} align="stretch">
          {/* No notifications message */}
          {followNotifications.length === 0 && invitations.length === 0 && orgInvitations.length === 0 && (
            <Box textAlign="center" py={8}>
              <Text color="gray.500" fontSize="lg">No notifications.</Text>
              <Text color="gray.400" fontSize="sm" mt={2}>
                You'll see follow notifications and invitations here.
              </Text>
            </Box>
          )}
          
          {/* Follow notifications */}
          {followNotifications.map((notif: FollowNotification) => (
            <Box key={notif._id} p={4} borderWidth={1} borderRadius="md" bg="blue.50">
              <HStack justify="space-between" align="start">
                <Box flex="1">
                  <Text mb={2}>
                    <b
                      style={{ color: "#319795", cursor: "pointer" }}
                      onClick={() => navigate(`/profile/${notif.from._id}`)}
                    >
                      {notif.from.name || notif.from.email || 'User'}
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
                <Button
                  leftIcon={<FaTrash />}
                  colorScheme="red"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDeleteFollowNotification(notif._id)}
                >
                  Delete
                </Button>
              </HStack>
            </Box>
          ))}
          
          {/* Repo Invitation notifications */}
          {invitations.map(inv => (
            <Box key={inv._id} p={4} borderWidth={1} borderRadius="md" bg="green.50">
              <Text mb={2}>
                You have been invited to collaborate on <b>{inv.repository?.name || 'a repository'}</b>
              </Text>
              <HStack>
                <Button colorScheme="green" size="sm" mr={2} onClick={() => handleAction(inv._id, "accept", "repo")}>
                  Accept
                </Button>
                <Button colorScheme="red" size="sm" onClick={() => handleAction(inv._id, "decline", "repo")}>
                  Decline
                </Button>
              </HStack>
            </Box>
          ))}
          
          {/* Organization Invitation notifications */}
          {orgInvitations.map(inv => (
            <Box key={inv._id} p={4} borderWidth={1} borderRadius="md" bg="purple.50">
              <Text mb={2}>
                You have been invited to join organization <b>{inv.organization?.name || 'an organization'}</b>
              </Text>
              <HStack>
                <Button colorScheme="green" size="sm" mr={2} onClick={() => handleAction(inv._id, "accept", "org")}>
                  Accept
                </Button>
                <Button colorScheme="red" size="sm" onClick={() => handleAction(inv._id, "decline", "org")}>
                  Decline
                </Button>
              </HStack>
            </Box>
          ))}
        </VStack>

        {/* Alert Dialog pentru confirmare ștergere toate */}
        <AlertDialog
          isOpen={isOpen}
          leastDestructiveRef={cancelRef}
          onClose={onClose}
        >
          <AlertDialogOverlay>
            <AlertDialogContent>
              <AlertDialogHeader fontSize="lg" fontWeight="bold">
                Delete All Notifications
              </AlertDialogHeader>

              <AlertDialogBody>
                Are you sure you want to delete all notifications? This action cannot be undone.
                <br /><br />
                <Text fontSize="sm" color="gray.600">
                  • Follow notifications will be permanently deleted
                  • Pending invitations will be declined automatically
                </Text>
              </AlertDialogBody>

              <AlertDialogFooter>
                <Button ref={cancelRef} onClick={onClose}>
                  Cancel
                </Button>
                <Button 
                  colorScheme="red" 
                  onClick={handleDeleteAllNotifications}
                  isLoading={deletingAll}
                  ml={3}
                >
                  Delete All
                </Button>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialogOverlay>
        </AlertDialog>
      </Box>
    </Box>
  );
};

export default NotificationsPage;