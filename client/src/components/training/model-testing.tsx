import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TestTube, Play, History } from 'lucide-react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { TrainedModel } from '@shared/schema';

interface TestForm {
  modelId: string;
  prompt: string;
}

export default function ModelTesting() {
  const { toast } = useToast();
  const [testResult, setTestResult] = useState<any>(null);

  const { data: models = [] } = useQuery<TrainedModel[]>({
    queryKey: ['/api/models'],
  });

  const form = useForm<TestForm>({
    defaultValues: {
      modelId: '',
      prompt: '',
    },
  });

  const testMutation = useMutation({
    mutationFn: async (data: TestForm) => {
      const response = await apiRequest('POST', `/api/models/${data.modelId}/test`, {
        prompt: data.prompt,
      });
      return response.json();
    },
    onSuccess: (data) => {
      setTestResult(data);
      toast({
        title: "Success",
        description: "Model test completed",
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

  const onSubmit = (data: TestForm) => {
    if (!data.modelId) {
      toast({
        title: "Error",
        description: "Please select a model",
        variant: "destructive",
      });
      return;
    }
    testMutation.mutate(data);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Model Testing</span>
          <TestTube className="w-5 h-5 text-gray-400" />
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="modelId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Select Model</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a trained model" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {models.map((model) => (
                        <SelectItem key={model.id} value={model.id.toString()}>
                          {model.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="prompt"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Test Prompt</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Enter your test prompt here..."
                      className="h-24 resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex space-x-2">
              <Button
                type="submit"
                className="flex-1"
                disabled={testMutation.isPending}
              >
                <Play className="w-4 h-4 mr-2" />
                {testMutation.isPending ? 'Testing...' : 'Test Model'}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                disabled
              >
                <History className="w-4 h-4" />
              </Button>
            </div>

            {testResult && (
              <div>
                <FormLabel>Response</FormLabel>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 h-32 overflow-y-auto">
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">
                    {testResult.response}
                  </p>
                </div>
                <div className="flex justify-between text-xs text-gray-500 mt-2">
                  <span>Response time: {testResult.responseTime}ms</span>
                  <span>Tokens: {testResult.tokens}</span>
                </div>
              </div>
            )}
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
