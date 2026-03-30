'use client';

import { useTheme } from '@/context/ThemeContext';
import FeedbackButton from '@/components/FeedbackButton';

interface DashboardShellProps {
  children: React.ReactNode;
  userId: string;
  userName: string;
}

export default function DashboardShell({ children, userId, userName }: DashboardShellProps) {
  const { colors } = useTheme();

  return (
    <div
      style={{
        backgroundColor: colors.bg,
        fontFamily: 'Montserrat, sans-serif',
        minHeight: '100vh',
        transition: 'background-color 0.2s ease',
      }}
    >
      {children}
      <FeedbackButton userId={userId} userName={userName} />
    </div>
  );
}
