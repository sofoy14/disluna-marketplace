import { Menu, Bookmark, Share2, Send, Sparkles, FileText, Image, Video, Music, BarChart3 } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';

const suggestions = [
  {
    icon: FileText,
    title: 'Saved Prompt Templates',
    description: 'Users can save frequently used prompts or templates for faster responses.',
  },
  {
    icon: Image,
    title: 'Media Type Selection',
    description: 'Users can specify the type of content they want tailored interactions.',
  },
  {
    icon: Sparkles,
    title: 'Multilingual Support',
    description: 'Choose language for better interactions.',
  },
];

const tabs = [
  { icon: Sparkles, label: 'AI' },
  { icon: FileText, label: 'Text' },
  { icon: Image, label: 'Image' },
  { icon: Video, label: 'Video' },
  { icon: Music, label: 'Music' },
  { icon: BarChart3, label: 'Analytics' },
];

interface ChatAreaProps {
  onMenuClick: () => void;
}

export function ChatArea({ onMenuClick }: ChatAreaProps) {
  return (
    <div className="flex-1 flex flex-col bg-gradient-to-br from-black via-gray-900 to-purple-950 overflow-hidden">
      {/* Header */}
      <div className="px-3 md:px-6 py-3 md:py-4 border-b border-gray-800 flex items-center justify-between">
        <div className="flex items-center gap-2 md:gap-3 min-w-0 flex-1">
          {/* Mobile Menu Button */}
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 md:hidden flex-shrink-0"
            onClick={onMenuClick}
          >
            <Menu className="w-5 h-5" />
          </Button>
          
          <span className="text-sm truncate">Name chat</span>
          <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30 text-xs hidden sm:inline-flex">
            CHAT GPT 3.5
          </Badge>
        </div>
        <div className="flex items-center gap-1 md:gap-2 flex-shrink-0">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Bookmark className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 hidden sm:flex">
            <Share2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <ScrollArea className="flex-1">
        <div className="flex items-center justify-center p-4 md:p-6 min-h-full">
          <div className="w-full max-w-3xl">
            {/* Welcome Card */}
            <div className="bg-[#2a2a2a]/50 backdrop-blur-sm rounded-2xl p-4 md:p-8 border border-gray-800">
              {/* Icon */}
              <div className="flex justify-center mb-4 md:mb-6">
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-purple-500/20 flex items-center justify-center">
                  <div className="w-7 h-7 md:w-8 md:h-8 rounded-full border-2 border-purple-500 relative">
                    <div className="absolute inset-1 border border-purple-500 rounded-full" />
                  </div>
                </div>
              </div>

              {/* Title */}
              <h1 className="text-center text-xl md:text-3xl mb-2 md:mb-3">How can i help you today?</h1>
              <p className="text-center text-gray-400 text-xs md:text-sm mb-6 md:mb-8 max-w-xl mx-auto px-2">
                This code will display a prompt asking the user for their name, and then it will display a greeting message with the name entered by the user.
              </p>

              {/* Suggestion Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4 mb-6 md:mb-8">
                {suggestions.map((suggestion, index) => (
                  <div
                    key={index}
                    className="bg-[#3a3a3a] p-3 md:p-4 rounded-xl hover:bg-[#4a4a4a] cursor-pointer transition-colors border border-gray-700"
                  >
                    <div className="flex justify-center mb-2 md:mb-3">
                      <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                        <suggestion.icon className="w-4 h-4 md:w-5 md:h-5 text-purple-400" />
                      </div>
                    </div>
                    <h3 className="text-center text-xs md:text-sm mb-1 md:mb-2">{suggestion.title}</h3>
                    <p className="text-center text-xs text-gray-500 leading-relaxed">
                      {suggestion.description}
                    </p>
                  </div>
                ))}
              </div>

              {/* Tabs - Scrollable on mobile */}
              <div className="mb-4 md:mb-6 overflow-hidden">
                <div className="flex md:grid md:grid-cols-6 items-center justify-start md:justify-center gap-3 md:gap-6 overflow-x-auto pb-2 md:pb-0 px-2 -mx-2 scrollbar-hide">
                  {tabs.map((tab, index) => (
                    <button
                      key={index}
                      className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors flex-shrink-0 ${
                        index === 0 ? 'text-purple-400' : 'text-gray-400 hover:text-gray-300'
                      }`}
                    >
                      <tab.icon className="w-4 h-4 md:w-5 md:h-5" />
                      <span className="text-xs whitespace-nowrap">{tab.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Input */}
              <div className="relative">
                <div className="flex items-center gap-2 md:gap-3 bg-white rounded-full px-3 md:px-4 py-2 md:py-3">
                  <div className="w-5 h-5 md:w-6 md:h-6 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center flex-shrink-0">
                    <div className="w-3 h-3 md:w-4 md:h-4 border-2 border-white rounded-full" />
                  </div>
                  <Input
                    placeholder="Type your prompt here..."
                    className="flex-1 border-0 bg-transparent text-black placeholder:text-gray-500 focus-visible:ring-0 focus-visible:ring-offset-0 p-0 text-sm md:text-base"
                  />
                  <Button
                    size="icon"
                    className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-purple-500 hover:bg-purple-600 flex-shrink-0"
                  >
                    <Send className="w-3 h-3 md:w-4 md:h-4 text-black" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="px-3 md:px-6 py-3 md:py-4 text-center">
        <p className="text-xs text-gray-500">
          ChatGPT can make mistakes. Consider checking important information.
        </p>
      </div>
    </div>
  );
}
