import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BarChart3 } from 'lucide-react';
import { useState } from 'react';

type MetricType = 'loss' | 'accuracy' | 'learning_rate';

export default function PerformanceChart() {
  const [selectedMetric, setSelectedMetric] = useState<MetricType>('loss');

  const metrics = [
    { id: 'loss' as MetricType, name: 'Loss', color: 'bg-primary' },
    { id: 'accuracy' as MetricType, name: 'Accuracy', color: 'bg-green-500' },
    { id: 'learning_rate' as MetricType, name: 'Learning Rate', color: 'bg-purple-500' },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Training Metrics</span>
          <div className="flex space-x-2">
            {metrics.map((metric) => (
              <Button
                key={metric.id}
                variant={selectedMetric === metric.id ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedMetric(metric.id)}
                className="text-xs"
              >
                {metric.name}
              </Button>
            ))}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
          <div className="text-center">
            <BarChart3 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Training {selectedMetric} chart will appear here</p>
            <p className="text-sm text-gray-400 mt-1">Real-time updates during training</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
