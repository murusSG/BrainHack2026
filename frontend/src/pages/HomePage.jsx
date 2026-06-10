import { Link } from 'react-router-dom';
import { Badge, Box, Button, Card, Container, Group, SimpleGrid, Text, Title } from '@mantine/core';

const FEATURES = [
  { title: 'Live Incident Map', body: 'Active hazards & shelters near you.' },
  { title: 'Foresight Engine', body: 'Predicts escalation before it spreads.' },
  { title: 'Public Advisories', body: 'Trusted, official safety instructions.' },
];

export function HomePage() {
  return (
    <Box className="standalone-page-content" mih="100vh">
      <Group component="header" justify="space-between" px="lg" py="md" style={{ borderBottom: '1px solid rgba(166,17,34,0.12)' }}>
        <Group gap="sm">
          <Box
            w={28}
            h={28}
            style={{
              borderRadius: 8,
              display: 'grid',
              placeItems: 'center',
              color: '#fff8f8',
              fontWeight: 900,
              background: 'linear-gradient(180deg, #ea3948, #c5162b)',
            }}
          >
            M
          </Box>
          <Text fw={900}>MURUS SG</Text>
        </Group>
        <Group gap="sm">
          <Button component={Link} to="/login" variant="default">
            Log In
          </Button>
          <Button component={Link} to="/signup">
            Sign Up
          </Button>
        </Group>
      </Group>

      <Container className="landing-page-content" component="main" size="md" py={56} ta="center">
        <Badge color="brandRed.6" variant="light" radius="xl" mb="md">
          Unified Crisis Management
        </Badge>
        <Title order={1} fz={{ base: 32, sm: 44 }} fw={900} lh={1.1}>
          One picture of the crisis.
          <br />
          <Text span c="brandRed.6" inherit>
            Every responder aligned.
          </Text>
        </Title>
        <Text c="dimmed" mt="md" maw={520} mx="auto">
          Real-time incident awareness, resource allocation & public advisories — for commanders,
          responders, hospitals and residents.
        </Text>

        <SimpleGrid cols={{ base: 1, sm: 3 }} mt={48} spacing="md">
          {FEATURES.map((f) => (
            <Card key={f.title} withBorder radius="md" padding="lg" ta="left">
              <Text fw={700}>{f.title}</Text>
              <Text c="dimmed" fz="sm" mt={4}>
                {f.body}
              </Text>
            </Card>
          ))}
        </SimpleGrid>
      </Container>

      <Box component="footer" ta="center" py="md" c="dimmed" fz="xs" style={{ borderTop: '1px solid rgba(166,17,34,0.1)' }}>
        A Singapore command network service
      </Box>
    </Box>
  );
}
