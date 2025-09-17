import React from 'react';
import LineChart from './LineChart';

export interface ChartDataPoint {
  label: string;
  value: number;
  color?: string;
}

interface ChartProps {
  data: ChartDataPoint[];
  type: 'bar' | 'pie' | 'line';
  title?: string;
  height?: number;
  showValues?: boolean;
}

const Chart: React.FC<ChartProps> = ({
  data,
  type,
  title,
  height = 300,
  showValues = true
}) => {
  const colors = [
    '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
    '#06B6D4', '#84CC16', '#F97316', '#EC4899', '#6B7280'
  ];

  const maxValue = Math.max(...data.map(d => d.value));
  // Tooltip functionality removed as it's handled in LineChart component

  const renderBarChart = () => {
    return (
      <div className="flex items-end justify-between space-x-2 h-full">
        {data.map((item, index) => {
          const barHeight = (item.value / maxValue) * (height - 60);
          const color = item.color || colors[index % colors.length];

          return (
            <div key={item.label} className="flex flex-col items-center flex-1">
              <div className="flex flex-col items-center justify-end" style={{ height: height - 60 }}>
                {showValues && (
                  <span className="text-xs text-gray-600 mb-1 font-medium">
                    {item.value}
                  </span>
                )}
                <div
                  className="w-full rounded-t-md transition-all duration-500 ease-in-out"
                  style={{
                    height: `${barHeight}px`,
                    backgroundColor: color,
                    minHeight: item.value > 0 ? '4px' : '0px'
                  }}
                />
              </div>
              <div className="text-xs text-gray-700 text-center mt-2 px-1 leading-tight">
                {item.label}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderPieChart = () => {
    const total = data.reduce((sum, item) => sum + item.value, 0);
    let currentAngle = 0;
    const radius = Math.min(height, 200) / 3;
    const centerX = radius + 20;
    const centerY = radius + 20;

    return (
      <div className="flex items-center justify-center">
        <div className="relative">
          <svg width={radius * 2 + 40} height={radius * 2 + 40}>
            {data.map((item, index) => {
              // const percentage = (item.value / total) * 100;
              const angle = (item.value / total) * 360;
              const color = item.color || colors[index % colors.length];

              const startAngleRad = (currentAngle * Math.PI) / 180;
              const endAngleRad = ((currentAngle + angle) * Math.PI) / 180;

              const x1 = centerX + radius * Math.cos(startAngleRad);
              const y1 = centerY + radius * Math.sin(startAngleRad);
              const x2 = centerX + radius * Math.cos(endAngleRad);
              const y2 = centerY + radius * Math.sin(endAngleRad);

              const largeArcFlag = angle > 180 ? 1 : 0;

              const pathData = [
                `M ${centerX} ${centerY}`,
                `L ${x1} ${y1}`,
                `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
                'Z'
              ].join(' ');

              currentAngle += angle;

              return (
                <path
                  key={item.label}
                  d={pathData}
                  fill={color}
                  stroke="white"
                  strokeWidth="2"
                />
              );
            })}
          </svg>

          {/* Legend */}
          <div className="absolute left-full ml-4 top-0 space-y-2">
            {data.map((item, index) => {
              const color = item.color || colors[index % colors.length];
              const percentage = ((item.value / total) * 100).toFixed(1);

              return (
                <div key={item.label} className="flex items-center space-x-2 text-sm">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: color }}
                  />
                  <span className="text-gray-700">
                    {item.label}: {showValues && `${item.value} (${percentage}%)`}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  const renderLineChart = () => {
    return (
      <LineChart
        data={data}
        height={height}
        showValues={showValues}
        maxValue={maxValue}
        colors={colors}
      />
    );
  };

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        Nessun dato da visualizzare
      </div>
    );
  }

  return (
    <div className="bg-white p-4 rounded-lg border border-gray-200">
      {title && (
        <h3 className="text-lg font-semibold text-gray-900 mb-4 text-center">
          {title}
        </h3>
      )}
      <div style={{ height: height }}>
        {type === 'bar' && renderBarChart()}
        {type === 'pie' && renderPieChart()}
        {type === 'line' && renderLineChart()}
      </div>
    </div>
  );
};

export default Chart;