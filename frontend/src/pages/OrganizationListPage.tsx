import { useEffect, useState } from "react";
import { Box, Heading, Button, List, ListItem, Spinner, Text } from "@chakra-ui/react";
import { Link } from "react-router-dom";

export default function OrganizationListPage() {
  const [orgs, setOrgs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/organization/my`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
    })
      .then(res => res.json())
      .then(data => { setOrgs(data); setLoading(false); });
  }, []);

  return (
    <Box maxW="600px" mx="auto" mt={8}>
      <Heading size="lg" mb={4}>My Organizations</Heading>
      <Button as={Link} to="/organizations/new" colorScheme="teal" mb={4}>Create Organization</Button>
      {loading ? <Spinner /> : (
        <List spacing={3}>
          {orgs.map(org => (
            <ListItem key={org._id} mb={2}>
              <Box p={3} borderWidth={1} borderRadius="md" bg="gray.50">
                <Button as={Link} to={`/organizations/${org._id}`} variant="link" colorScheme="teal" fontWeight="bold">
                  {org.name}
                </Button>
                <Text fontSize="sm" color="gray.600">{org.description}</Text>
                <Text fontSize="xs" color="gray.400">Owner: {org.owner?.name || org.owner?.email || "N/A"}</Text>
              </Box>
            </ListItem>
          ))}
        </List>
      )}
    </Box>
  );
}