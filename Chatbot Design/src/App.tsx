import { useState } from 'react';
import { SidebarContent } from './components/SidebarContent';
import { ChatArea } from './components/ChatArea';
import { Sheet, SheetContent, SheetTitle, SheetDescription } from './components/ui/sheet';

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-black text-white overflow-hidden">
      {/* Desktop Sidebar */}
      <div className="hidden md:flex w-64 bg-[#1a1a1a] border-r border-gray-800">
        <SidebarContent />
      </div>

      {/* Mobile Drawer */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="p-0 w-64 bg-[#1a1a1a] border-gray-800">
          <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
          <SheetDescription className="sr-only">
            Access your chats, folders, and create new conversations
          </SheetDescription>
          <SidebarContent />
        </SheetContent>
      </Sheet>

      {/* Chat Area */}
      <ChatArea onMenuClick={() => setSidebarOpen(true)} />
    </div>
  );
}
