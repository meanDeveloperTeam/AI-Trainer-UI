
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { RefreshCw, Download, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface OllamaStatus {
  status: 'connected' | 'disconnected';
  modelsCount?: number;
  models?: string[];
  error?: string;
}

export default function OllamaStatus() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedModel, setSelectedModel] = useState<string>('');

  const { data: status, isLoading: statusLoading } = useQuery<OllamaStatus>({
    queryKey: ['/api/ollama/status'],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const { data: baseModels = [] } = useQuery<string[]>({
    queryKey: ['/api/ollama/base-models'],
  });

  const pullMutation = useMutation({
    mutationFn: async (model: string) => {
      const response = await apiRequest('POST', '/api/ollama/pull', { model });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Success",
        description: data.message,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/ollama/status'] });
      queryClient.invalidateQueries({ queryKey: ['/api/models/available'] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handlePullModel = () => {
    if (!selectedModel) {
      toast({
        title: "Error",
        description: "Please select a model to pull",
        variant: "destructive",
      });
      return;
    }
    pullMutation.mutate(selectedModel);
  };

  const getStatusIcon = () => {
    if (statusLoading) return <RefreshCw className="w-4 h-4 animate-spin" />;
    if (status?.status === 'connected') return <CheckCircle className="w-4 h-4 text-green-500" />;
    return <XCircle className="w-4 h-4 text-red-500" />;
  };

  const getStatusBadge = () => {
    if (statusLoading) return <Badge variant="secondary">Checking...</Badge>;
    if (status?.status === 'connected') return <Badge variant="default" className="bg-green-500">Connected</Badge>;
    return <Badge variant="destructive">Disconnected</Badge>;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          {getStatusIcon()}
          <span>Ollama Status</span>
          {getStatusBadge()}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {status?.status === 'connected' ? (
          <div className="space-y-3">
            <div className="text-sm text-muted-foreground">
              <div>Models available: {status.modelsCount || 0}</div>
              {status.models && status.models.length > 0 && (
                <div className="mt-2">
                  <div className="font-medium">Recent models:</div>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {status.models.map((model) => (
                      <Badge key={model} variant="outline" className="text-xs">
                        {model}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            <Separator />
            
            <div className="space-y-3">
              <h4 className="text-sm font-medium">Pull New Model</h4>
              <div className="flex space-x-2">
                <Select value={selectedModel} onValueChange={setSelectedModel}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select a model to pull" />
                  </SelectTrigger>
                  <SelectContent>
                    {baseModels.map((model) => (
                      <SelectItem key={model} value={model}>
                        {model}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button 
                  onClick={handlePullModel}
                  disabled={!selectedModel || pullMutation.isPending}
                  size="sm"
                >
                  {pullMutation.isPending ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                  Pull
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center space-x-2 text-amber-600">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm">Ollama is not running</span>
            </div>
            <div className="text-xs text-muted-foreground">
              {status?.error || 'Please start Ollama to use real model training and inference.'}
            </div>
            <div className="text-xs text-muted-foreground">
              To install Ollama: <code className="bg-muted px-1 py-0.5 rounded">curl -fsSL https://ollama.com/install.sh | sh</code>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
