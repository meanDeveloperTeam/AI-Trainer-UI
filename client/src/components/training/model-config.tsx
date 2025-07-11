import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Settings, Play } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Framework } from '@/types/training';

const configSchema = z.object({
  baseModel: z.string().min(1, 'Base model is required'),
  totalEpochs: z.number().min(1).max(100),
  batchSize: z.number().min(1).max(128),
  learningRate: z.number().min(0.0001).max(0.1),
  contextLength: z.number().min(512).max(32768),
});

type ConfigFormData = z.infer<typeof configSchema>;

interface ModelConfigProps {
  framework: Framework;
  onTrainingStart: (jobId: string) => void;
}

export default function ModelConfig({ framework, onTrainingStart }: ModelConfigProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: availableModels = [] } = useQuery<string[]>({
    queryKey: ['/api/models/available', framework],
    queryFn: async () => {
      const response = await fetch(`/api/models/available?framework=${framework}`);
      if (!response.ok) throw new Error('Failed to fetch models');
      return response.json();
    },
  });

  const form = useForm<ConfigFormData>({
    resolver: zodResolver(configSchema),
    defaultValues: {
      baseModel: '',
      totalEpochs: 3,
      batchSize: 4,
      learningRate: 0.0002,
      contextLength: 2048,
    },
  });

  const trainingMutation = useMutation({
    mutationFn: async (data: ConfigFormData) => {
      const response = await apiRequest('POST', '/api/training/jobs', {
        ...data,
        framework,
      });
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/training/jobs'] });
      onTrainingStart(data.jobId);
      toast({
        title: "Success",
        description: "Training job started successfully",
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

  const onSubmit = (data: ConfigFormData) => {
    trainingMutation.mutate(data);
  };

  // Update base model when framework changes
  useEffect(() => {
    if (availableModels.length > 0) {
      form.setValue('baseModel', availableModels[0]);
    }
  }, [availableModels, form]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Model Configuration</span>
          <Settings className="w-5 h-5 text-gray-400" />
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="baseModel"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Base Model</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a base model" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {availableModels.map((model) => (
                        <SelectItem key={model} value={model}>
                          {model}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="totalEpochs"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Epochs</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="batchSize"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Batch Size</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="learningRate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Learning Rate</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.0001"
                      {...field}
                      onChange={(e) => field.onChange(parseFloat(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="contextLength"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Context Length</FormLabel>
                  <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value.toString()}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="2048">2048</SelectItem>
                      <SelectItem value="4096">4096</SelectItem>
                      <SelectItem value="8192">8192</SelectItem>
                      <SelectItem value="16384">16384</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              className="w-full"
              disabled={trainingMutation.isPending}
            >
              <Play className="w-4 h-4 mr-2" />
              {trainingMutation.isPending ? 'Starting...' : 'Start Training'}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
