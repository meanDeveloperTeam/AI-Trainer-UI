import { useState } from 'react';
import { useForm } from 'react-hook-form';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { TestTube, Play, History } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { TrainedModel } from '@shared/schema';

interface TestForm {
  modelId: string;
  prompt: string;
}

export default function ModelTesting() {
  const { toast } = useToast();
  const [testResult, setTestResult] = useState<string>('');
  const [responseTime, setResponseTime] = useState<number | null>(null);
  const [tokenCount, setTokenCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const { data: models = [] } = useQuery<TrainedModel[]>({
    queryKey: ['/api/models'],
  });

  const form = useForm<TestForm>({
    defaultValues: {
      modelId: '',
      prompt: '',
    },
  });

  const onSubmit = async (data: TestForm) => {
    if (!data.modelId) {
      toast({
        title: 'Error',
        description: 'Please select a model',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    setTestResult('');
    setResponseTime(null);
    setTokenCount(null);

    try {
      const response = await fetch(`/api/models/${data.modelId}/test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt: data.prompt }),
      });

      if (!response.ok || !response.body) {
        throw new Error('Streaming failed');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let finalChunk: any = {};
      const startTime = Date.now();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunkText = decoder.decode(value);
        if (chunkText) {
          setTestResult((prev) => prev + chunkText);
        }
      }

      const endTime = Date.now();
      setResponseTime(endTime - startTime);

      toast({
        title: 'Success',
        description: 'Streaming test completed.',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
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
              <Button type="submit" className="flex-1" disabled={loading}>
                <Play className="w-4 h-4 mr-2" />
                {loading ? 'Testing...' : 'Test Model'}
              </Button>
              <Button type="button" variant="outline" size="icon" disabled>
                <History className="w-4 h-4" />
              </Button>
            </div>

            {testResult && (
              <div>
                <FormLabel>Response</FormLabel>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 h-80 overflow-y-auto">
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">
                    {testResult}
                  </p>
                </div>
                <div className="flex justify-between text-xs text-gray-500 mt-2">
                  {responseTime !== null && <span>Time: {responseTime}ms</span>}
                  {tokenCount !== null && <span>Tokens: {tokenCount}</span>}
                </div>
              </div>
            )}
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}