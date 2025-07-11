import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Eye, Square, FileText, RotateCcw, ArrowRight } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { TrainingJob } from '@shared/schema';

export default function RecentJobs() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: jobs = [] } = useQuery<TrainingJob[]>({
    queryKey: ['/api/training/jobs'],
  });

  const stopMutation = useMutation({
    mutationFn: async (jobId: number) => {
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'training': return 'bg-orange-100 text-orange-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'failed': return 'bg-red-100 text-red-800';
      case 'cancelled': return 'bg-gray-100 text-gray-800';
      default: return 'bg-blue-100 text-blue-800';
    }
  };

  const getFrameworkColor = (framework: string) => {
    switch (framework) {
      case 'ollama': return 'bg-blue-100 text-blue-800';
      case 'vllm': return 'bg-gray-100 text-gray-800';
      case 'transformers': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDuration = (startTime: string | null, endTime: string | null) => {
    if (!startTime) return 'Not started';
    
    const start = new Date(startTime);
    const end = endTime ? new Date(endTime) : new Date();
    const duration = Math.floor((end.getTime() - start.getTime()) / 1000);
    
    const hours = Math.floor(duration / 3600);
    const minutes = Math.floor((duration % 3600) / 60);
    const seconds = duration % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    } else {
      return `${seconds}s`;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Recent Training Jobs</span>
          <Button variant="ghost" size="sm" className="text-primary">
            View All <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {jobs.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <FileText className="w-8 h-8 mx-auto mb-2 text-gray-300" />
            <p>No training jobs yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Job ID</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Model</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Framework</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Status</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Duration</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {jobs.slice(0, 10).map((job) => (
                  <tr key={job.id} className="hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <span className="text-sm font-mono text-gray-700">{job.jobId}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-sm text-gray-700">{job.baseModel}</span>
                    </td>
                    <td className="py-3 px-4">
                      <Badge className={`text-xs ${getFrameworkColor(job.framework)}`}>
                        {job.framework}
                      </Badge>
                    </td>
                    <td className="py-3 px-4">
                      <Badge className={`text-xs ${getStatusColor(job.status)}`}>
                        {job.status}
                      </Badge>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-sm text-gray-700">
                        {formatDuration(job.startTime, job.endTime)}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4 text-gray-400" />
                        </Button>
                        {job.status === 'training' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => stopMutation.mutate(job.id)}
                            disabled={stopMutation.isPending}
                            title="Stop Training"
                          >
                            <Square className="w-4 h-4 text-gray-400 hover:text-red-600" />
                          </Button>
                        )}
                        {job.status === 'failed' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            title="Retry"
                          >
                            <RotateCcw className="w-4 h-4 text-gray-400 hover:text-blue-600" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
