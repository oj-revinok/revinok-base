'use client';

import { useTheme } from '@/context/ThemeContext';
import NavigationLoader from './NavigationLoader';
import { ToastProvider } from './Toast';
import NotificationListener from './NotificationListener';

interface DashboardShellProps {
  children: React.ReactNode;
  userId: string;
  userName: string;
}

export default function DashboardShell({ children, userId, userName }: DashboardShellProps) {
  const { colors } = useTheme();

  return (
    <ToastProvider>
      <NotificationListener currentUserId={userId} currentUserName={userName} />
      <div
        style={{
          backgroundColor: colors.bg,
          fontFamily: 'Montserrat, sans-serif',
          minHeight: '100vh',
          transition: 'background-color 0.2s ease',
        }}
      >
        <NavigationLoader />
        {children}
      </div>
    </ToastProvider>
  );
}
