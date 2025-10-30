import { Search, Folder, MessageSquare, Plus, MoreHorizontal, Settings } from 'lucide-react';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';

const folders = [
  { name: 'Work chats', icon: Folder },
  { name: 'Life chats', icon: Folder },
  { name: 'Projects chats', icon: Folder },
  { name: 'Clients chats', icon: Folder },
];

const chats = [
  {
    title: 'Plan a 3-day trip',
    description: 'A 3-day trip to visit the northern lights in Norway...',
  },
  {
    title: 'Ideas for a customer loyalty program',
    description: 'Here are some ideas for a customer loyalty...',
  },
  {
    title: 'Help me pick',
    description: 'Here are some gift ideas for your fishing-lovin...',
  },
];

export function SidebarContent() {
  return (
    <div className="w-full h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-800">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center">
              <div className="w-4 h-4 border-2 border-white rounded-full" />
            </div>
            <span className="text-sm text-white">My Chats</span>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-white hover:text-white">
            <Settings className="w-4 h-4" />
          </Button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <Input
            placeholder="Search"
            className="pl-9 bg-[#2a2a2a] border-gray-700 text-sm h-9 text-white"
          />
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        {/* Folders */}
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-gray-400">Folders</span>
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" className="h-5 w-5 text-gray-400 hover:text-white">
                <Plus className="w-3 h-3" />
              </Button>
              <Button variant="ghost" size="icon" className="h-5 w-5 text-gray-400 hover:text-white">
                <MoreHorizontal className="w-3 h-3" />
              </Button>
            </div>
          </div>

          <div className="space-y-1">
            {folders.map((folder) => (
              <div
                key={folder.name}
                className="flex items-center justify-between px-3 py-2 rounded-lg bg-[#2a2a2a] hover:bg-[#3a3a3a] cursor-pointer group"
              >
                <div className="flex items-center gap-2">
                  <Folder className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-300">{folder.name}</span>
                </div>
                <MoreHorizontal className="w-4 h-4 text-gray-500 opacity-0 group-hover:opacity-100" />
              </div>
            ))}
          </div>
        </div>

        {/* Chats */}
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-gray-400">Chats</span>
            <Button variant="ghost" size="icon" className="h-5 w-5 text-gray-400 hover:text-white">
              <MoreHorizontal className="w-3 h-3" />
            </Button>
          </div>

          <div className="space-y-1">
            {chats.map((chat, index) => (
              <div
                key={index}
                className="flex items-start gap-2 px-3 py-2 rounded-lg bg-[#2a2a2a] hover:bg-[#3a3a3a] cursor-pointer group"
              >
                <MessageSquare className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm text-gray-200 truncate">{chat.title}</h4>
                    <MoreHorizontal className="w-4 h-4 text-gray-500 opacity-0 group-hover:opacity-100 flex-shrink-0" />
                  </div>
                  <p className="text-xs text-gray-500 truncate">{chat.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </ScrollArea>

      {/* New Chat Button */}
      <div className="p-4 border-t border-gray-800">
        <Button className="w-full bg-purple-500 hover:bg-purple-600 text-black">
          New chat
          <Plus className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}
