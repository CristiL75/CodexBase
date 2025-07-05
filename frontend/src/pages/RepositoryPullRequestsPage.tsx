import React, { useEffect, useState } from "react";
import {
  Box, Heading, VStack, HStack, Badge, Text, Spinner, Button, Code, useToast
} from "@chakra-ui/react";
import { Link, useParams, useNavigate } from "react-router-dom";

const RepositoryPullRequestsPage: React.FC = () => {
  const { repoId } = useParams();
  const [prs, setPrs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const toast = useToast();

  const token = localStorage.getItem("token") || "";

  useEffect(() => {
    const fetchPRs = async () => {
      setLoading(true);
      const token = localStorage.getItem("token");
      const res = await fetch(
        `${import.meta.env.VITE_API_URL || "http://localhost:5000"}/repository/${repoId}/pull-requests`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await res.json();
      setPrs(Array.isArray(data) ? data : []);
      setLoading(false);
    };
    fetchPRs();
  }, [repoId]);

  return (
    <>
      <Box maxW="900px" mx="auto" mt={10} p={6} bg="white" borderRadius="lg" boxShadow="lg">
        <HStack justify="space-between" mb={6}>
          <Heading size="lg">Pull Requests</Heading>
          <Button colorScheme="teal" onClick={() => navigate(`/repository/${repoId}/pulls/new`)}>
            New Pull Request
          </Button>
        </HStack>
        {loading ? (
          <Spinner />
        ) : (
          <VStack align="stretch" spacing={3}>
            {prs.length === 0 && <Text color="gray.500">No pull requests found.</Text>}
            {prs.map(pr => (
              <Box key={pr._id} p={4} borderWidth={1} borderRadius="md" bg="gray.50">
                <HStack justify="space-between">
                  <Box>
                    <Link to={`/repository/${repoId}/pulls/${pr._id}`}>
                      <Text fontWeight="bold" fontSize="lg">{pr.title}</Text>
                    </Link>
                    <Text fontSize="sm" color="gray.600">
                      {pr.sourceBranch} → {pr.targetBranch} &middot; by {pr.author?.name || pr.author?.email}
                    </Text>
                  </Box>
                  <Badge colorScheme={
                    pr.status === "open" ? "green" : pr.status === "merged" ? "blue" : "red"
                  } fontSize="md">
                    {pr.status}
                  </Badge>
                </HStack>
              </Box>
            ))}
          </VStack>
        )}
      </Box>
      <Box mb={6} maxW="900px" mx="auto">
        <HStack align="start">
          <Box flex="1" maxW="80%">
            <Code
              px={2}
              py={1}
              borderRadius="md"
              bg="gray.100"
              fontSize="md"
              whiteSpace="pre-wrap"
              wordBreak="break-all"
              w="100%"
              display="block"
            >
              {`codexbase login ${token}`}
            </Code>
          </Box>
          <Button
            size="xs"
            colorScheme="teal"
            variant="outline"
            onClick={() => {
              navigator.clipboard.writeText(`codexbase login ${token}`);
              toast({ title: "Login command copied!", status: "success", duration: 1500 });
            }}
          >
            Copy
          </Button>
        </HStack>
        <Text fontSize="xs" color="gray.500" mt={1}>
          Use this command to authenticate the CLI with your account.
        </Text>
      </Box>
    </>
  );
};

export default RepositoryPullRequestsPage;