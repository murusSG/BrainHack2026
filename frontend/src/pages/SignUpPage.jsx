import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Anchor, Box, Button, Card, Container, Divider, Group, PasswordInput, Stack, Text, TextInput, Title,
} from '@mantine/core';
import { signUp, signInWithGoogle } from '../services/auth';

const PHONE_RE = /^(\+65)?[689]\d{7}$/;

export function SignUpPage({ onAuthenticate }) {
  const [values, setValues] = useState({ name: '', email: '', phone: '', password: '', confirm: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function update(field) {
    return (event) => setValues((v) => ({ ...v, [field]: event.target.value }));
  }

  function validate() {
    if (!values.name.trim()) return 'Please enter your full name.';
    if (!/^\S+@\S+\.\S+$/.test(values.email.trim())) return 'Please enter a valid email.';
    if (!PHONE_RE.test(values.phone.replace(/\s/g, ''))) return 'Please enter a valid Singapore phone number.';
    if (values.password.length < 6) return 'Password must be at least 6 characters.';
    if (values.password !== values.confirm) return 'Passwords do not match.';
    return '';
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const message = validate();
    if (message) {
      setError(message);
      return;
    }
    setError('');
    setLoading(true);
    try {
      const session = await signUp(
        values.name.trim(),
        values.phone.replace(/\s/g, ''),
        values.email.trim(),
        values.password
      );
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
    <Box mih="100vh" bg="linear-gradient(180deg, #fff9f7 0%, #fff1ed 100%)">
      <Container size={460} py={56}>
        <Card withBorder radius="md" padding="xl" bg="rgba(255,255,255,0.94)">
          <Text c="brandRed.6" fz="xs" fw={700} tt="uppercase" lts="0.12em">
            Public Registration
          </Text>
          <Title order={2} fw={900} mt={4}>
            Create your account
          </Title>
          <Text c="dimmed" fz="sm" mt={4} mb="lg">
            Sign up to access live advisories, shelters, and report incidents.
          </Text>

          <form onSubmit={handleSubmit} noValidate>
            <Stack gap="sm">
              <TextInput label="Full name" value={values.name} onChange={update('name')} autoComplete="name" disabled={loading} />
              <TextInput label="Email" type="email" value={values.email} onChange={update('email')} autoComplete="email" disabled={loading} />
              <TextInput label="Phone number" type="tel" value={values.phone} onChange={update('phone')} placeholder="91234567" autoComplete="tel" disabled={loading} />
              <PasswordInput label="Password" value={values.password} onChange={update('password')} autoComplete="new-password" disabled={loading} />
              <PasswordInput label="Confirm password" value={values.confirm} onChange={update('confirm')} autoComplete="new-password" disabled={loading} />
              {error ? <Text c="brandRed.6" fz="sm" role="alert">{error}</Text> : null}
              <Button type="submit" loading={loading} fullWidth>
                Create account
              </Button>
            </Stack>
          </form>

          <Divider label="or" labelPosition="center" my="md" />
          <Button variant="default" fullWidth onClick={handleGoogle} disabled={loading}>
            Continue with Google
          </Button>

          <Group justify="center" mt="md">
            <Text fz="sm" c="dimmed">
              Already have an account?{' '}
              <Anchor component={Link} to="/login" c="brandRed.6" fw={700}>
                Log in
              </Anchor>
            </Text>
          </Group>
        </Card>
      </Container>
    </Box>
  );
}
