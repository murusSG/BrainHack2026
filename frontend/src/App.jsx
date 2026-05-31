import { DashboardLayout } from './layouts/DashboardLayout';
import { OverviewPage } from './pages/OverviewPage';

export default function App() {
  return (
    <DashboardLayout>
      <OverviewPage />
    </DashboardLayout>
  );
}
