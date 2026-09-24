import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { Center, Loader } from '@mantine/core'
import { useQuery } from '@tanstack/react-query'
import { authService } from '@cmms/api-client'
import { MobileLayout } from './layouts/MobileLayout'

const AssignedWorkOrders = lazy(() => import('./pages/AssignedWorkOrders'))
const WorkOrderExecute = lazy(() => import('./pages/WorkOrderExecute'))
const AssetsList = lazy(() => import('./pages/AssetsList'))
const PartsPage = lazy(() => import('./parts/PartsPage'))
const ProfilePage = lazy(() => import('./pages/ProfilePage'))
const LoginPage = lazy(() => import('./pages/LoginPage'))

const Loading = () => (
  <Center style={{ height: '100vh' }}>
    <Loader color="cmms" />
  </Center>
)

function TechnicianRoute() {
  const { data: user, isLoading, error } = useQuery({ queryKey: ['current-user'], queryFn: authService.me, retry: false, staleTime: 60_000 })
  if (isLoading) return <Loading />
  if (error || !user) return <Navigate to="/login" replace />
  if (!user.roles.includes('TECHNICIAN')) return <Navigate to="/login" replace />
  return <MobileLayout />
}

function App() {
  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<TechnicianRoute />}>
          <Route path="/work-orders" element={<AssignedWorkOrders />} />
          <Route path="/work-orders/:id" element={<WorkOrderExecute />} />
          <Route path="/assets" element={<AssetsList />} />
          <Route path="/parts" element={<PartsPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="*" element={<Navigate to="/work-orders" replace />} />
        </Route>
      </Routes>
    </Suspense>
  )
}

export default App
