import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Rocket, Check, Download, Server, Zap } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { TrainedModel } from '@shared/schema';

export default function Deployment() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: models = [] } = useQuery<TrainedModel[]>({
    queryKey: ['/api/models'],
  });

  const deployMutation = useMutation({
    mutationFn: async ({ modelId, framework }: { modelId: number; framework: string }) => {
      const response = await apiRequest('POST', `/api/models/${modelId}/deploy`, {
        framework,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/models'] });
      toast({
        title: "Success",
        description: "Model deployed successfully",
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

  const formatSize = (bytes: number) => {
    if (!bytes) return 'Unknown';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const getFrameworkIcon = (framework: string) => {
    switch (framework) {
      case 'ollama': return <Server className="w-4 h-4" />;
      case 'vllm': return <Zap className="w-4 h-4" />;
      default: return <Rocket className="w-4 h-4" />;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Deployment Options</span>
          <Rocket className="w-5 h-5 text-gray-400" />
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-3">Trained Models</h4>
          <div className="space-y-2">
            {models.length === 0 ? (
              <div className="text-center py-4 text-gray-500">
                <Rocket className="w-6 h-6 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">No trained models available</p>
              </div>
            ) : (
              models.map((model) => (
                <div key={model.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                      <Check className="text-green-600 w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700">{model.name}</p>
                      <p className="text-xs text-gray-500">
                        {model.framework} • {formatSize(model.size || 0)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {model.deployed && (
                      <Badge variant="outline" className="text-green-600">
                        Deployed
                      </Badge>
                    )}
                    <div className="flex space-x-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deployMutation.mutate({ modelId: model.id, framework: model.framework })}
                        disabled={deployMutation.isPending}
                        title="Deploy"
                      >
                        {getFrameworkIcon(model.framework)}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        title="Download"
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="space-y-3">
          <Button
            className="w-full flex items-center justify-center space-x-2"
            disabled={models.length === 0}
          >
            <Server className="w-4 h-4" />
            <span>Deploy to Ollama Local</span>
          </Button>

          <Button
            variant="outline"
            className="w-full flex items-center justify-center space-x-2 bg-gray-800 text-white hover:bg-gray-900"
            disabled={models.length === 0}
          >
            <Zap className="w-4 h-4" />
            <span>Deploy to vLLM Server</span>
          </Button>

          <Button
            variant="outline"
            className="w-full flex items-center justify-center space-x-2"
            disabled={models.length === 0}
          >
            <Download className="w-4 h-4" />
            <span>Download Model Files</span>
          </Button>
        </div>

        {models.some(model => model.deployed) && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-sm font-medium text-green-800">Live Deployment</span>
            </div>
            <p className="text-xs text-green-700 mt-1">
              {models.find(m => m.deployed)?.name} running on {models.find(m => m.deployed)?.framework}
            </p>
            <p className="text-xs text-green-600 mt-1">
              Endpoint: {models.find(m => m.deployed)?.deploymentEndpoint}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
