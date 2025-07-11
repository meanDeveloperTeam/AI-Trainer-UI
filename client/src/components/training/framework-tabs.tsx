import { Button } from '@/components/ui/button';
import { Framework } from '@/types/training';
import { Bot, Server, Code } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FrameworkTabsProps {
  selectedFramework: Framework;
  onFrameworkChange: (framework: Framework) => void;
}

const frameworks = [
  { id: 'ollama' as Framework, name: 'Ollama Local', icon: Bot },
  { id: 'vllm' as Framework, name: 'vLLM Server', icon: Server },
  { id: 'transformers' as Framework, name: 'Transformers Fine-tuning', icon: Code },
];

export default function FrameworkTabs({ selectedFramework, onFrameworkChange }: FrameworkTabsProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200">
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8 px-6" aria-label="Tabs">
          {frameworks.map((framework) => {
            const Icon = framework.icon;
            const isSelected = selectedFramework === framework.id;
            
            return (
              <button
                key={framework.id}
                onClick={() => onFrameworkChange(framework.id)}
                className={cn(
                  "border-b-2 py-4 px-1 text-sm font-medium whitespace-nowrap flex items-center space-x-2",
                  isSelected
                    ? "border-primary text-primary"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                )}
              >
                <Icon className="w-4 h-4" />
                <span>{framework.name}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
