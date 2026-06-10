import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Anchor, Box, Button, Card, Container, Divider, Group, PasswordInput, Stack, Text, TextInput, Title,
} from '@mantine/core';
import { signIn, signInWithGoogle } from '../services/auth';

export function LoginPage({ onAuthenticate }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError('Please enter your email and password.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const session = await signIn(email.trim(), password.trim());
      onAuthenticate?.(session);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setError('');
    try {
      await signInWithGoogle();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <Box className="standalone-page-content auth-page-content" mih="100vh">
      <Container size={460} py={56}>
        <Card className="identity-auth-card" withBorder radius="md" padding="xl">
          <Text c="brandRed.6" fz="xs" fw={700} tt="uppercase" lts="0.12em">
            System Authentication
          </Text>
          <Title order={2} fw={900} mt={4}>
            Log in to continue
          </Title>
          <Text c="dimmed" fz="sm" mt={4} mb="lg">
            For commanders, responders, hospitals and registered residents.
          </Text>

          <form onSubmit={handleSubmit} noValidate>
            <Stack gap="sm">
              <TextInput
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="leader.ops@murus.sg"
                autoComplete="username"
                disabled={loading}
              />
              <PasswordInput
                label="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                disabled={loading}
              />
              {error ? <Text c="brandRed.6" fz="sm" role="alert">{error}</Text> : null}
              <Button type="submit" loading={loading} fullWidth>
                Log in
              </Button>
            </Stack>
          </form>

          <Divider label="or" labelPosition="center" my="md" />
          <Button variant="default" fullWidth onClick={handleGoogle} disabled={loading}>
            Continue with Google
          </Button>

          <Group justify="center" mt="md">
            <Text fz="sm" c="dimmed">
              New here?{' '}
              <Anchor component={Link} to="/signup" c="brandRed.6" fw={700}>
                Create an account
              </Anchor>
            </Text>
          </Group>
        </Card>
      </Container>
    </Box>
  );
}
