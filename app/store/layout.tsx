import { StoreNavigation } from '@/components/store/Navigation';
import { StoreFooter } from '@/components/store/Footer';
import { ChatWidgetWrapper } from '@/components/store/ChatWidgetWrapper';

export default function StoreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-white">
      <StoreNavigation />
      <main>{children}</main>
      <StoreFooter />
      {/* Chat Widget - appears on all store pages */}
      <ChatWidgetWrapper />
    </div>
  );
}

