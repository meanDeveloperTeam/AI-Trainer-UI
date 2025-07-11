import { Button } from '@/components/ui/button';
import { Clock, Plus } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function TopBar() {
  const [currentTime, setCurrentTime] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('en-US', { 
        hour12: false, 
        timeZone: 'UTC',
        hour: '2-digit',
        minute: '2-digit'
      }) + ' UTC');
    };
    
    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">AI Model Training Dashboard</h2>
          <p className="text-gray-600 mt-1">Train and deploy models across multiple AI frameworks</p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2 bg-gray-100 rounded-lg px-3 py-2">
            <Clock className="text-gray-500 w-4 h-4" />
            <span className="text-sm text-gray-700">{currentTime}</span>
          </div>
          <Button className="bg-primary hover:bg-primary/90">
            <Plus className="w-4 h-4 mr-2" />
            New Training Job
          </Button>
        </div>
      </div>
    </header>
  );
}
