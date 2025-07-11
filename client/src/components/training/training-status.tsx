import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Activity, Square, Pause } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { WebSocketMessage } from '@/lib/websocket';
import { TrainingJob } from '@shared/schema';

interface TrainingStatusProps {
  jobId: string | null;
  lastMessage: WebSocketMessage | null;
}

export default function TrainingStatus({ jobId, lastMessage }: TrainingStatusProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [trainingData, setTrainingData] = useState<any>(null);

  const { data: job, isLoading } = useQuery<TrainingJob>({
    queryKey: ['/api/training/jobs', jobId],
    enabled: !!jobId,
    refetchInterval: jobId ? 5000 : false,
  });

  const stopMutation = useMutation({
    mutationFn: async () => {
      if (!jobId) throw new Error('No job ID');
      const response = await apiRequest('POST', `/api/training/jobs/${jobId}/stop`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/training/jobs'] });
      toast({
        title: "Success",
        description: "Training job stopped",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update training data from WebSocket messages
  useEffect(() => {
    if (lastMessage && lastMessage.type === 'training_update' && lastMessage.jobId === jobId) {
      setTrainingData(lastMessage);
    }
  }, [lastMessage, jobId]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'training': return 'bg-orange-500';
      case 'completed': return 'bg-green-500';
      case 'failed': return 'bg-red-500';
      case 'cancelled': return 'bg-gray-500';
      default: return 'bg-blue-500';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'training': return 'Training';
      case 'completed': return 'Completed';
      case 'failed': return 'Failed';
      case 'cancelled': return 'Cancelled';
      default: return 'Pending';
    }
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  };

  if (!jobId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Training Status</span>
            <Activity className="w-5 h-5 text-gray-400" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <Activity className="w-8 h-8 mx-auto mb-2 text-gray-300" />
            <p>No training job active</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Training Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const currentData = trainingData || job;
  const progress = currentData?.progress || 0;
  const currentEpoch = currentData?.currentEpoch || 0;
  const totalEpochs = job?.totalEpochs || 1;
  const loss = currentData?.loss || 0;
  const status = currentData?.status || job?.status || 'pending';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Training Status</span>
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${getStatusColor(status)} ${status === 'training' ? 'animate-pulse' : ''}`}></div>
            <Badge variant="outline">{getStatusText(status)}</Badge>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-600">Progress</span>
            <span className="font-medium text-gray-900">{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-600">Current Epoch</p>
            <p className="font-semibold text-gray-900">{currentEpoch}/{totalEpochs}</p>
          </div>
          <div>
            <p className="text-gray-600">Loss</p>
            <p className="font-semibold text-gray-900">{loss.toFixed(3)}</p>
          </div>
        </div>

        {status === 'training' && (
          <div className="space-y-2">
            <div className="text-xs text-gray-500 font-mono bg-gray-50 p-2 rounded">
              <div>Epoch {currentEpoch}/{totalEpochs}: {Math.round(progress)}%</div>
              <div>Loss: {loss.toFixed(3)} | Learning Rate: {job?.learningRate}</div>
            </div>
          </div>
        )}

        {status === 'training' && (
          <div className="flex space-x-2">
            <Button
              variant="outline"
              className="flex-1 text-red-600 hover:text-red-700"
              onClick={() => stopMutation.mutate()}
              disabled={stopMutation.isPending}
            >
              <Square className="w-4 h-4 mr-2" />
              Stop
            </Button>
            <Button
              variant="outline"
              className="flex-1 text-yellow-600 hover:text-yellow-700"
              disabled
            >
              <Pause className="w-4 h-4 mr-2" />
              Pause
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
