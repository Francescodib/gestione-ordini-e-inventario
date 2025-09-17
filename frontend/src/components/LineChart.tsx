import React, { useRef } from 'react';
import type { ChartDataPoint } from './Chart';

interface LineChartProps {
  data: ChartDataPoint[];
  height: number;
  showValues: boolean;
  maxValue: number;
  colors: string[];
}

const LineChart: React.FC<LineChartProps> = ({
  data,
  height,
  showValues,
  maxValue,
  colors
}) => {
  const svgRef = useRef<SVGSVGElement>(null);

  // Fixed optimal width for data points (80px per point)
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

  // Create path for the line
  const linePath = points.map((point, index) =>
    `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`
  ).join(' ');

  // Create area path (filled area under the line)
  const areaPath = `${linePath} L ${points[points.length - 1]?.x || 0} ${chartHeight + 30} L ${chartPadding} ${chartHeight + 30} Z`;

  return (
    <div className="w-full overflow-x-auto">
      <div style={{ minWidth: `${optimalWidth}px` }}>
        <svg ref={svgRef} width={optimalWidth} height={height}>
          {/* Grid lines */}
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#f3f4f6" strokeWidth="1"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />

          {/* Area under line */}
          <path
            d={areaPath}
            fill="url(#gradient)"
            fillOpacity="0.3"
          />

          {/* Gradient definition */}
          <defs>
            <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" style={{ stopColor: colors[0], stopOpacity: 0.8 }} />
              <stop offset="100%" style={{ stopColor: colors[0], stopOpacity: 0.1 }} />
            </linearGradient>
          </defs>

          {/* Main line */}
          <path
            d={linePath}
            fill="none"
            stroke={colors[0]}
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Data points */}
          {points.map((point) => (
            <g key={point.label}>
              <circle
                cx={point.x}
                cy={point.y}
                r="4"
                fill="white"
                stroke={colors[0]}
                strokeWidth="3"
              />
              {showValues && (
                <text
                  x={point.x}
                  y={point.y - 10}
                  textAnchor="middle"
                  className="text-xs font-medium fill-gray-600"
                >
                  {point.value}
                </text>
              )}
            </g>
          ))}

          {/* X-axis labels */}
          {points.map((point) => (
            <text
              key={`label-${point.label}`}
              x={point.x}
              y={height - 10}
              textAnchor="middle"
              className="text-xs fill-gray-500"
            >
              {point.label}
            </text>
          ))}
        </svg>
      </div>
    </div>
  );
};

export default LineChart;