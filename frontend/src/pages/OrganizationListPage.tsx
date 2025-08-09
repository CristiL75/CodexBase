import { useEffect, useState } from "react";
import { Box, Heading, Button, List, ListItem, Spinner, Text } from "@chakra-ui/react";
import { Link as RouterLink } from "react-router-dom";
import { useAuth } from '../contexts/AuthContext';
import { authenticatedFetch } from '../utils/tokenManager';

export default function OrganizationListPage() {
  const [orgs, setOrgs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrganizations = async () => {
      try {
        const response = await authenticatedFetch('/organization/my');
        const data = await response.json();
        setOrgs(data);
      } catch (error) {
        console.error('Error fetching organizations:', error);
        setOrgs([]);
      } finally {
        setLoading(false);
      }
    };
    
    fetchOrganizations();
  }, []);

return (
  <Box w="100vw" minH="100vh" bg="gray.50" p={0} m={0}>
    <Box w="100vw" h="100vh" bg="white" p={8}>
      <Heading size="lg" mb={4}>My Organizations</Heading>
      <Button as={RouterLink} to="/organizations/new" colorScheme="teal" mb={4}>Create Organization</Button>
      {loading ? <Spinner /> : (
        <List spacing={3}>
          {orgs.map(org => (
            <ListItem key={org._id} mb={2}>
              <Box
                as={RouterLink}
                to={`/organizations/${org._id}`}
                p={3}
                borderWidth={1}
                borderRadius="md"
                bg="gray.50"
                _hover={{ bg: "teal.50", textDecoration: "none", cursor: "pointer" }}
                display="block"
              >
                <Text fontWeight="bold" color="teal.700">{org.name}</Text>
                <Text fontSize="sm" color="gray.600">{org.description}</Text>
                <Text fontSize="xs" color="gray.400">Owner: {org.owner?.name || org.owner?.email || "N/A"}</Text>
              </Box>
            </ListItem>
          ))}
        </List>
      )}
    </Box>
  </Box>
);
}