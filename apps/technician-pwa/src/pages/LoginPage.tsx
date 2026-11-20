import { useI18n } from '../i18n'
import { useState } from 'react'
import { Alert, Box, Button, Paper, PasswordInput, Stack, Text, TextInput } from '@mantine/core'
import { useNavigate } from 'react-router-dom'
import { useQueryClient, useQuery } from '@tanstack/react-query'
import { apiClient, authService, canUseEngineer, getApiError } from '@cmms/api-client'

export default function LoginPage() {
  const { language, setLanguage, t } = useI18n()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const methods = useQuery({ queryKey: ['auth-methods'], queryFn: authService.methods })
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string>()
  const [loading, setLoading] = useState(false)

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!username || !password) return setError(t('Username and password are required'))
    setLoading(true)
    setError(undefined)
    try {
      await authService.login(username, password)
      const user = await queryClient.fetchQuery({ queryKey: ['current-user'], queryFn: authService.me })
      if (!canUseEngineer(user)) {
        await authService.logout()
        queryClient.removeQueries({ queryKey: ['current-user'] })
        throw new Error(t('This account does not have CMMS Engineer access'))
      }
      navigate('/work-orders', { replace: true })
    } catch (cause) {
      setError(getApiError(cause, t('Login failed')))
    } finally {
      setLoading(false)
    }
  }

  return <Box mih="100vh" display="flex" style={{ alignItems: 'center', justifyContent: 'center' }} p="md">
    <Paper withBorder shadow="sm" p="xl" w="100%" maw={420}>
      <form onSubmit={submit}>
        <Stack>
          <Text fw={700} size="xl" ta="center" c="cmms">{t('CMMS Engineer')}</Text>
          {error && <Alert color="red">{error}</Alert>}
          <TextInput label={t('Username')} value={username} onChange={(event) => setUsername(event.currentTarget.value)} required />
          <PasswordInput label={t('Password')} value={password} onChange={(event) => setPassword(event.currentTarget.value)} required />
          <Button.Group>
            <Button type="button" variant={language === 'en' ? 'filled' : 'default'} onClick={() => setLanguage('en')} style={{ flex: 1 }}>English</Button>
            <Button type="button" variant={language === 'id' ? 'filled' : 'default'} onClick={() => setLanguage('id')} style={{ flex: 1 }}>Bahasa</Button>
          </Button.Group>
          <Button type="submit" loading={loading}>{t('Sign In')}</Button>
        </Stack>
      </form>
          {methods.data?.entra && <Button fullWidth mt="md" variant="default" onClick={() => window.location.assign(`${apiClient.defaults.baseURL ?? '/api'}/auth/entra?app=engineer`)}>Sign in with Microsoft</Button>}
          {new URLSearchParams(window.location.search).has('identityError') && <Text size="sm" c="red" mt="sm">Microsoft sign-in failed or the identity is not linked to an active CMMS account. Contact your administrator.</Text>}
    </Paper>
  </Box>
}
