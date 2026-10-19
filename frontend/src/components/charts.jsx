import React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';
import { cssVar } from '../utils/helpers';

/**
 * Shared Recharts wrappers so pages stay declarative and DRY.
 * Colors resolve CSS variables so charts follow light/dark themes.
 */

// Multi-series area chart over a time axis
export function AreaSeriesChart({ data, series, height = '100%', margin }) {
  const textColor = cssVar('--text-secondary');
  const gridColor = cssVar('--border-subtle');
  void margin;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data}>
        <XAxis dataKey="label" stroke={textColor} />
        <YAxis stroke={textColor} />
        <CartesianGrid stroke={gridColor} vertical={false} />
        <Tooltip />
        <Legend />
        {series.map((s) => (
          <Area key={s.key} type="monotone" dataKey={s.key} stroke={s.color} fill={s.color} fillOpacity={s.fillOpacity ?? 0.15} stackId={s.stackId} />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
}

// Multiple line chart over a time axis
export function MultiLineChart({ data, series, height = '100%' }) {
  const textColor = cssVar('--text-secondary');
  const gridColor = cssVar('--border-subtle');
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data}>
        <XAxis dataKey="label" stroke={textColor} />
        <YAxis stroke={textColor} />
        <CartesianGrid stroke={gridColor} vertical={false} />
        <Tooltip />
        <Legend />
        {series.map((s) => (
          <Line key={s.key} type="linear" dataKey={s.key} stroke={s.color} dot={s.dot ?? false} />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

// Vertical bar chart (single or stacked)
export function VerticalBarChart({ data, xKey = 'label', series, height = '100%' }) {
  const textColor = cssVar('--text-secondary');
  const gridColor = cssVar('--border-subtle');
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data}>
        <XAxis dataKey={xKey} stroke={textColor} />
        <YAxis stroke={textColor} />
        <CartesianGrid stroke={gridColor} vertical={false} />
        <Tooltip />
        <Legend />
        {series.map((s) => (
          <Bar key={s.key} dataKey={s.key} fill={s.color} stackId={s.stackId} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

// Horizontal bar chart (e.g. fraud by merchant category)
export function HorizontalBarChart({ data, xKey = 'label', valueKey = 'value', color, height = '100%' }) {
  const textColor = cssVar('--text-secondary');
  const gridColor = cssVar('--border-subtle');
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data}>
        <XAxis dataKey={valueKey} stroke={textColor} />
        <YAxis dataKey={xKey} stroke={textColor} />
        <CartesianGrid stroke={gridColor} vertical />
        <Tooltip />
        <Bar layout="horizontal" dataKey={valueKey} fill={color} />
      </BarChart>
    </ResponsiveContainer>
  );
}

// Donut chart
export function DonutChart({ data, height = '100%', innerRadius = '62%' }) {
  const textColor = cssVar('--text-secondary');
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart data={data}>
        <Tooltip />
        <Legend />
        {data.map((entry) => (
          <Pie key={entry.name} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={innerRadius} outerRadius="90%" fill={entry.color} />
        ))}
      </PieChart>
    </ResponsiveContainer>
  );
}

// Simple donut with a single Pie layer over the full dataset
export function SimpleDonutChart({ data, height = '100%', innerRadius = '62%' }) {
  const textColor = cssVar('--text-secondary');
  void textColor;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart data={data}>
        <Tooltip />
        {data.map((entry) => (
          <Pie key={entry.name} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={innerRadius} outerRadius="90%" fill={entry.color} label />
        ))}
      </PieChart>
    </ResponsiveContainer>
  );
}

export default { AreaSeriesChart, MultiLineChart, VerticalBarChart, HorizontalBarChart, DonutChart, SimpleDonutChart };