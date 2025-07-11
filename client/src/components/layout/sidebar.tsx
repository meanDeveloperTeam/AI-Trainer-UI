import { Brain, Home, Upload, Settings, Play, BarChart3, Server, TestTube } from 'lucide-react';
import { Link, useLocation } from 'wouter';
import { cn } from '@/lib/utils';

const navigation = [
  { name: 'Dashboard', href: '/', icon: Home },
  { name: 'Dataset Upload', href: '/upload', icon: Upload },
  { name: 'Model Config', href: '/config', icon: Settings },
  { name: 'Training', href: '/training', icon: Play },
  { name: 'Monitoring', href: '/monitoring', icon: BarChart3 },
  { name: 'Deployment', href: '/deployment', icon: Server },
  { name: 'Model Testing', href: '/testing', icon: TestTube },
];

export default function Sidebar() {
  const [location] = useLocation();

  return (
    <div className="w-64 bg-white shadow-lg border-r border-gray-200 fixed h-full z-30">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
            <Brain className="text-white text-lg" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">AI Trainer</h1>
            <p className="text-sm text-gray-500">Multi-Framework Platform</p>
          </div>
        </div>
      </div>
      
      <nav className="p-4 space-y-2">
        {navigation.map((item) => {
          const Icon = item.icon;
          const isActive = location === item.href;
          
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors",
                isActive
                  ? "text-primary bg-primary/10 border-l-4 border-primary"
                  : "text-gray-700 hover:bg-gray-100"
              )}
            >
              <Icon className="w-5 h-5" />
              <span className={cn("font-medium", isActive && "font-semibold")}>
                {item.name}
              </span>
            </Link>
          );
        })}
      </nav>

      <div className="absolute bottom-4 left-4 right-4">
        <div className="bg-gray-100 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="text-sm font-medium text-gray-700">System Status</span>
          </div>
          <p className="text-xs text-gray-600">All frameworks online</p>
          <div className="mt-2 text-xs text-gray-500">
            <div>GPU: Available</div>
            <div>Memory: 24GB Free</div>
          </div>
        </div>
      </div>
    </div>
  );
}
