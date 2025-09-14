import React from 'react';

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
  const [tooltipData, setTooltipData] = React.useState<{
    show: boolean;
    x: number;
    y: number;
    label: string;
    value: number;
  }>({ show: false, x: 0, y: 0, label: '', value: 0 });

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
              const percentage = (item.value / total) * 100;
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
    const svgRef = React.useRef<SVGSVGElement>(null);

    // Fixed optimal width for 12 months (80px per month)
    const optimalWidth = Math.max(960, data.length * 80);
    const chartPadding = 40;
    const chartHeight = height - 80;

    // Calculate points with fixed optimal spacing
    const points = data.map((item, index) => {
      return {
        index,
        x: chartPadding + (index / (data.length - 1)) * (optimalWidth - chartPadding * 2),
        y: 30 + (1 - item.value / (maxValue || 1)) * (chartHeight - 60),
        ...item
      };
    });

    const handleMouseEnter = (event: React.MouseEvent, point: typeof points[0]) => {
      const rect = event.currentTarget.getBoundingClientRect();
      const parentRect = svgRef.current?.getBoundingClientRect();
      if (parentRect) {
        setTooltipData({
          show: true,
          x: rect.left - parentRect.left + rect.width / 2,
          y: rect.top - parentRect.top - 10,
          label: point.label,
          value: point.value
        });
      }
    };

    const handleMouseLeave = () => {
      setTooltipData({ show: false, x: 0, y: 0, label: '', value: 0 });
    };

    return (
      <div className="relative w-full">
        {/* Container with horizontal scroll */}
        <div className="overflow-x-auto overflow-y-visible">
          <div style={{ width: `${optimalWidth}px`, minWidth: '100%' }}>
            <svg
              ref={svgRef}
              width={optimalWidth}
              height={height}
              className="block"
            >
              {/* Grid lines */}
              {[0, 0.25, 0.5, 0.75, 1].map((ratio, index) => {
                const y = 30 + ratio * (chartHeight - 60);
                return (
                  <line
                    key={index}
                    x1={chartPadding}
                    y1={y}
                    x2={optimalWidth - chartPadding}
                    y2={y}
                    stroke="#F3F4F6"
                    strokeWidth="1"
                  />
                );
              })}

              {/* Line */}
              {points.length > 1 && (
                <polyline
                  points={points.map(p => `${p.x},${p.y}`).join(' ')}
                  fill="none"
                  stroke="#3B82F6"
                  strokeWidth="3"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
              )}

              {/* Points */}
              {points.map((point, index) => (
                <g key={index}>
                  <circle
                    cx={point.x}
                    cy={point.y}
                    r="5"
                    fill="#3B82F6"
                    stroke="white"
                    strokeWidth="2"
                    className="cursor-pointer hover:fill-blue-700 transition-colors duration-200"
                    onMouseEnter={(e) => handleMouseEnter(e, point)}
                    onMouseLeave={handleMouseLeave}
                  />
                  {showValues && point.value > 0 && (
                    <text
                      x={point.x}
                      y={point.y - 12}
                      textAnchor="middle"
                      className="text-xs fill-gray-600 font-medium"
                    >
                      {point.value.toLocaleString('it-IT')}
                    </text>
                  )}
                </g>
              ))}
            </svg>

            {/* X-axis labels */}
            <div className="relative mt-2" style={{ height: '20px' }}>
              {points.map((point, index) => (
                <div
                  key={index}
                  className="absolute text-xs text-gray-700 text-center"
                  style={{
                    left: `${point.x}px`,
                    width: '60px',
                    transform: 'translateX(-50%)'
                  }}
                >
                  {point.label}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Tooltip */}
        {tooltipData.show && (
          <div
            className="absolute z-20 bg-gray-900 text-white px-3 py-2 rounded-lg shadow-lg pointer-events-none text-sm whitespace-nowrap"
            style={{
              left: tooltipData.x,
              top: tooltipData.y,
              transform: 'translate(-50%, -100%)'
            }}
          >
            <div className="font-semibold">{tooltipData.label}</div>
            <div>€{tooltipData.value.toLocaleString('it-IT', {minimumFractionDigits: 2})}</div>
            <div
              className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0"
              style={{
                borderLeft: '4px solid transparent',
                borderRight: '4px solid transparent',
                borderTop: '4px solid #1F2937'
              }}
            />
          </div>
        )}
      </div>
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