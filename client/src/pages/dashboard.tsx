import { useEffect } from 'react';
import Sidebar from '@/components/layout/sidebar';
import TopBar from '@/components/layout/topbar';
import FrameworkTabs from '@/components/training/framework-tabs';
import FileUpload from '@/components/training/file-upload';
import ModelConfig from '@/components/training/model-config';
import TrainingStatus from '@/components/training/training-status';
import PerformanceChart from '@/components/training/performance-chart';
import ModelTesting from '@/components/training/model-testing';
import Deployment from '@/components/training/deployment';
import RecentJobs from '@/components/training/recent-jobs';
import { useWebSocket } from '@/lib/websocket';
import { useState } from 'react';
import { Framework } from '@/types/training';

export default function Dashboard() {
  const [selectedFramework, setSelectedFramework] = useState<Framework>('ollama');
  const [activeTrainingJob, setActiveTrainingJob] = useState<string | null>(null);
  const { isConnected, lastMessage, subscribeToJob } = useWebSocket('/ws');

  useEffect(() => {
    if (activeTrainingJob) {
      subscribeToJob(activeTrainingJob);
    }
  }, [activeTrainingJob, subscribeToJob]);

  const handleTrainingStart = (jobId: string) => {
    setActiveTrainingJob(jobId);
  };

  return (
    <div className="min-h-screen flex bg-gray-50">
      <Sidebar />
      
      <div className="flex-1 ml-64">
        <TopBar />
        
        <main className="p-6 space-y-6">
          <FrameworkTabs 
            selectedFramework={selectedFramework}
            onFrameworkChange={setSelectedFramework}
          />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <FileUpload />
            <ModelConfig 
              framework={selectedFramework}
              onTrainingStart={handleTrainingStart}
            />
            <TrainingStatus 
              jobId={activeTrainingJob}
              lastMessage={lastMessage}
            />
          </div>

          <PerformanceChart />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ModelTesting />
            <Deployment />
          </div>

          <RecentJobs />
        </main>
      </div>
    </div>
  );
}
