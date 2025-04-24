import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  BarChart, Bar, PieChart, Pie, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, ResponsiveContainer, Cell, LabelList 
} from 'recharts';
import Papa, { ParseResult } from 'papaparse';

// Enhanced TypeScript interfaces
interface CustomerData {
  MusteriKodu: number;
  MusteriBolge3: string;
  MusteriBolge4: string;
  SatisKanali: string;
  MusteriUnvan: string;
  MusteriTabelaAdi: string;
  MusteriCesidi: string;
  KoordinatX: string;
  KoordinatY: string;
  MapProfileScore: string;
  MapPopulationScore: string;
  'Mapin Segment': string;
  place_name: string;
  visitor_count: number;
  [key: string]: any;
}

interface ChartDataItem {
  name: string;
  value?: number;
  percent?: number;
  visitors?: number;
  visitorPercent?: number;
  avgVisitors?: number;
  type?: string;
  [key: string]: any;
}

// Constants
const COLORS = [
  '#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', 
  '#82ca9d', '#ffc658', '#8dd1e1', '#a4de6c', '#d0ed57', 
  '#83a6ed', '#9b82e8', '#c674d7', '#d467a4', '#e05c5c', 
  '#ea7e5d', '#f3a055'
];

const ERROR_MESSAGES = {
  FETCH_FAILED: 'Failed to fetch data. Please check your connection and try again.',
  PARSE_FAILED: 'Failed to parse data. The file format might be incorrect.',
};

const CustomerAnalysisDashboard: React.FC = () => {
  // Properly typed state variables
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [data, setData] = useState<CustomerData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'distribution' | 'visitors'>('distribution');
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [totalCount, setTotalCount] = useState<number>(0);
  
  // Processed data states with proper types
  const [salesChannelData, setSalesChannelData] = useState<ChartDataItem[]>([]);
  const [customerTypeData, setCustomerTypeData] = useState<ChartDataItem[]>([]);
  const [segmentData, setSegmentData] = useState<ChartDataItem[]>([]);
  const [visitorSegmentData, setVisitorSegmentData] = useState<ChartDataItem[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [regionCustomerTypeData, setRegionCustomerTypeData] = useState<ChartDataItem[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [scoreData, setScoreData] = useState<ChartDataItem[]>([]);
  
  // Additional chart data
  const [topDestinationsData, setTopDestinationsData] = useState<ChartDataItem[]>([]);
  const [visitorsByTypeData, setVisitorsByTypeData] = useState<ChartDataItem[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [visitorsByRegionData, setVisitorsByRegionData] = useState<ChartDataItem[]>([]);
  
  // Individual data processing functions - memoized for performance
  const processChannelDistribution = useCallback((data: CustomerData[]): void => {
    const distribution: Record<string, number> = {};
    const total = data.length;
    
    data.forEach(row => {
      const channel = row.SatisKanali;
      distribution[channel] = (distribution[channel] || 0) + 1;
    });
    
    const chartData = Object.keys(distribution).map(key => ({
      name: key,
      value: distribution[key],
      percent: parseFloat((distribution[key] / total * 100).toFixed(1))
    }));
    
    setSalesChannelData(chartData);
  }, []);
  
  const processCustomerTypeDistribution = useCallback((data: CustomerData[]): void => {
    const distribution: Record<string, number> = {};
    const total = data.length;
    
    data.forEach(row => {
      const type = row.MusteriCesidi;
      distribution[type] = (distribution[type] || 0) + 1;
    });
    
    const chartData = Object.keys(distribution)
      .map(key => ({
        name: key,
        value: distribution[key],
        percent: parseFloat((distribution[key] / total * 100).toFixed(1))
      }))
      .sort((a, b) => b.value - a.value);
    
    setCustomerTypeData(chartData);
  }, []);
  
  const processSegmentDistribution = useCallback((data: CustomerData[]): void => {
    const distribution: Record<string, number> = {};
    const total = data.length;
    
    data.forEach(row => {
      const segment = row['Mapin Segment'];
      distribution[segment] = (distribution[segment] || 0) + 1;
    });
    
    const chartData = Object.keys(distribution)
      .map(key => ({
        name: key,
        value: distribution[key],
        percent: parseFloat((distribution[key] / total * 100).toFixed(1))
      }))
      .sort((a, b) => b.value - a.value);
    
    setSegmentData(chartData);
  }, []);
  
  const processVisitorsBySegment = useCallback((data: CustomerData[], totalVisitors: number): void => {
    interface SegmentInfo {
      count: number;
      totalVisitors: number;
    }
    
    const segments: Record<string, SegmentInfo> = {};
    
    data.forEach(row => {
      const segment = row['Mapin Segment'];
      if (!segments[segment]) {
        segments[segment] = {
          count: 0,
          totalVisitors: 0
        };
      }
      
      segments[segment].count += 1;
      segments[segment].totalVisitors += row.visitor_count || 0;
    });
    
    const chartData = Object.keys(segments)
      .map(key => ({
        name: key,
        visitors: segments[key].totalVisitors,
        avgVisitors: Math.round(segments[key].totalVisitors / segments[key].count),
        visitorPercent: parseFloat((segments[key].totalVisitors / totalVisitors * 100).toFixed(1))
      }))
      .sort((a, b) => b.visitorPercent - a.visitorPercent)
      .slice(0, 10);
    
    setVisitorSegmentData(chartData);
  }, []);
  
  const processTopDestinations = useCallback((data: CustomerData[], totalVisitors: number): void => {
    const destinations = data
      .map(row => ({
        name: row.place_name || row.MusteriTabelaAdi,
        visitors: row.visitor_count || 0,
        visitorPercent: parseFloat(((row.visitor_count || 0) / totalVisitors * 100).toFixed(1)),
        type: row.MusteriCesidi
      }))
      .filter(item => item.name && item.visitors > 0) // Filter out entries with no name or visitors
      .sort((a, b) => b.visitors - a.visitors)
      .slice(0, 10);
    
    setTopDestinationsData(destinations);
  }, []);
  
  const processVisitorsByCustomerType = useCallback((data: CustomerData[], totalVisitors: number): void => {
    const typeVisitors: Record<string, number> = {};
    
    data.forEach(row => {
      const type = row.MusteriCesidi;
      if (!typeVisitors[type]) {
        typeVisitors[type] = 0;
      }
      typeVisitors[type] += row.visitor_count || 0;
    });
    
    const typeData = Object.keys(typeVisitors)
      .map(type => ({
        name: type,
        visitors: typeVisitors[type],
        visitorPercent: parseFloat((typeVisitors[type] / totalVisitors * 100).toFixed(1))
      }))
      .sort((a, b) => b.visitors - a.visitors);
    
    setVisitorsByTypeData(typeData);
  }, []);
  
  const processVisitorsByRegion = useCallback((data: CustomerData[], totalVisitors: number): void => {
    const regionVisitors: Record<string, number> = {};
    
    data.forEach(row => {
      const region = row.MusteriBolge4;
      if (!regionVisitors[region]) {
        regionVisitors[region] = 0;
      }
      regionVisitors[region] += row.visitor_count || 0;
    });
    
    const regionData = Object.keys(regionVisitors)
      .map(region => ({
        name: region,
        visitors: regionVisitors[region],
        visitorPercent: parseFloat((regionVisitors[region] / totalVisitors * 100).toFixed(1))
      }))
      .sort((a, b) => b.visitors - a.visitors);
    
    setVisitorsByRegionData(regionData);
  }, []);
  
  const processRegionByCustomerType = useCallback((data: CustomerData[]): void => {
    const regionsByType: Record<string, Record<string, number>> = {};
    const uniqueRegions = new Set<string>();
    const uniqueTypes = new Set<string>();
    
    data.forEach(row => {
      const region = row.MusteriBolge3;
      const type = row.MusteriCesidi;
      
      uniqueRegions.add(region);
      uniqueTypes.add(type);
      
      if (!regionsByType[type]) {
        regionsByType[type] = {};
      }
      
      regionsByType[type][region] = (regionsByType[type][region] || 0) + 1;
    });
    
    const regions = Array.from(uniqueRegions);
    
    const chartData = Array.from(uniqueTypes)
      .map(type => {
        const result: ChartDataItem = { name: type };
        
        regions.forEach(region => {
          result[region] = regionsByType[type][region] || 0;
        });
        
        return result;
      })
      .filter(item => {
        return regions.some(region => (item[region] as number) >= 2);
      });
    
    setRegionCustomerTypeData(chartData);
  }, []);
  
  const processScoreDistribution = useCallback((data: CustomerData[]): void => {
    const chartData = data.map(row => ({
      id: row.MusteriKodu,
      name: row.MusteriTabelaAdi,
      profileScore: parseFloat(String(row.MapProfileScore).replace(',', '.')),
      populationScore: parseFloat(String(row.MapPopulationScore).replace(',', '.')),
      visitors: row.visitor_count || 0,
      segment: row['Mapin Segment'],
      channel: row.SatisKanali
    }));
    
    setScoreData(chartData);
  }, []);
  
  // Main data processing function - memoized to avoid unnecessary recalculations
  const processData = useCallback((data: CustomerData[]): void => {
    // Set total count for percentage calculations
    setTotalCount(data.length);
    const totalVisitors = data.reduce((sum, row) => sum + (row.visitor_count || 0), 0);
    
    // Process data for visualizations
    processChannelDistribution(data);
    processCustomerTypeDistribution(data);
    processSegmentDistribution(data);
    processVisitorsBySegment(data, totalVisitors);
    processRegionByCustomerType(data);
    processScoreDistribution(data);
    processTopDestinations(data, totalVisitors);
    processVisitorsByCustomerType(data, totalVisitors);
    processVisitorsByRegion(data, totalVisitors);
  }, [
    processChannelDistribution,
    processCustomerTypeDistribution,
    processSegmentDistribution,
    processVisitorsBySegment,
    processRegionByCustomerType,
    processScoreDistribution,
    processTopDestinations,
    processVisitorsByCustomerType,
    processVisitorsByRegion
  ]);
  
  // Fetch data with improved error handling
  useEffect(() => {
    const fetchData = async (): Promise<void> => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch('/data/amir_final.csv');
        
        if (!response.ok) {
          throw new Error(`HTTP error ${response.status}`);
        }
        
        const text = await response.text();
        
        Papa.parse(text, {
          header: true,
          dynamicTyping: true,
          skipEmptyLines: true,
          complete: (result: ParseResult) => {
            if (result.errors.length > 0) {
              setError(ERROR_MESSAGES.PARSE_FAILED);
              setLoading(false);
              return;
            }
            
            setData(result.data as CustomerData[]);
            processData(result.data as CustomerData[]);
            setLoading(false);
          },
          error: () => {
            setError(ERROR_MESSAGES.PARSE_FAILED);
            setLoading(false);
          }
        });
      } catch (error) {
        console.error('Error reading file:', error);
        setError(ERROR_MESSAGES.FETCH_FAILED);
        setLoading(false);
      }
    };
    
    fetchData();
  }, [processData]);
  
  // Memoized render functions to prevent unnecessary re-renders
  const renderDistributionTab = useMemo(() => {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-2">Sales Channel Distribution</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={salesChannelData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  innerRadius={0}
                  paddingAngle={2}
                  label={({name, percent}) => `${name}: ${(percent * 100).toFixed(0)}%`}
                >
                  {salesChannelData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={COLORS[index % COLORS.length]} 
                      stroke="#fff"
                      strokeWidth={1}
                    />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value, name, props) => {
                    const entry = props.payload;
                    return [`${entry.percent}% (${value} locations)`, 'Distribution'];
                  }}
                  wrapperStyle={{ zIndex: 1000 }}
                />
                <Legend 
                  layout="horizontal" 
                  verticalAlign="bottom" 
                  align="center" 
                  iconType="circle"
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-2">Top Customer Types</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={customerTypeData.slice(0, 6)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="name" 
                  angle={-45} 
                  textAnchor="end" 
                  height={80} 
                  tick={{ fontSize: 12 }}
                  interval={0}
                />
                <YAxis 
                  label={{ 
                    value: 'Percentage (%)', 
                    angle: -90, 
                    position: 'insideLeft',
                    style: { textAnchor: 'middle' }
                  }}
                  domain={[0, 55]}
                  ticks={[0, 10, 20, 30, 40, 50]} 
                />
                <Tooltip 
                  formatter={(value, name, props) => {
                    const entry = props.payload;
                    return [`${entry.percent}% (${entry.value} locations)`, 'Distribution'];
                  }}
                  cursor={{ fill: 'rgba(0, 0, 0, 0.05)' }}
                  wrapperStyle={{ zIndex: 1000 }}
                />
                <Bar 
                  dataKey="percent" 
                  fill="#8884d8" 
                  name="Percentage"
                  animationDuration={1000}
                  animationBegin={200}
                >
                  {customerTypeData.slice(0, 6).map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={COLORS[index % COLORS.length]} 
                    />
                  ))}
                  <LabelList dataKey="percent" position="top" formatter={(value: number) => `${value}%`} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow md:col-span-2">
          <h3 className="text-lg font-semibold mb-2">Segment Distribution</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart 
                data={segmentData}
                margin={{ top: 10, right: 30, left: 20, bottom: 10 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="name" 
                  tick={{ fontSize: 11 }}
                  interval={0}
                />
                <YAxis 
                  label={{ 
                    value: 'Percentage (%)', 
                    angle: -90, 
                    position: 'insideLeft',
                    style: { textAnchor: 'middle' }
                  }}
                />
                <Tooltip 
                  formatter={(value, name, props) => {
                    const entry = props.payload;
                    return [`${entry.percent}% (${entry.value} locations)`, 'Distribution'];
                  }}
                  cursor={{ fill: 'rgba(0, 0, 0, 0.05)' }}
                  wrapperStyle={{ zIndex: 1000 }}
                />
                <Bar 
                  dataKey="percent" 
                  fill="#82ca9d" 
                  name="Percentage"
                  animationDuration={1500}
                >
                  {segmentData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={COLORS[index % COLORS.length]} 
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    );
  }, [salesChannelData, customerTypeData, segmentData]);
  
  const renderVisitorsTab = useMemo(() => {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-4 rounded-lg shadow md:col-span-2">
          <h3 className="text-lg font-semibold mb-2">Visitor Distribution by Segment</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart 
                data={visitorSegmentData}
                margin={{ top: 10, right: 30, left: 20, bottom: 10 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="name" 
                  tick={{ fontSize: 12 }}
                  interval={0}
                />
                <YAxis 
                  label={{ 
                    value: 'Percentage of Visitors (%)', 
                    angle: -90, 
                    position: 'insideLeft',
                    style: { textAnchor: 'middle' }
                  }}
                  domain={[0, Math.ceil(visitorSegmentData[0]?.visitorPercent || 0) + 5]}
                />
                <Tooltip 
                  formatter={(value, name, props) => {
                    const entry = props.payload;
                    return [
                      name === 'visitorPercent' 
                        ? `${value}% (${entry.visitors} visitors)` 
                        : value,
                      name === 'visitorPercent' ? 'Percentage of Total Visitors' : name
                    ];
                  }}
                  cursor={{ fill: 'rgba(0, 0, 0, 0.05)' }}
                  wrapperStyle={{ zIndex: 1000 }}
                />
                <Bar 
                  dataKey="visitorPercent" 
                  fill="#8884d8" 
                  name="Visitor Percentage"
                  animationDuration={1000}
                >
                  {visitorSegmentData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={COLORS[index % COLORS.length]} 
                    />
                  ))}
                  <LabelList dataKey="visitorPercent" position="top" formatter={(value: number) => `${value}%`} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow md:col-span-2">
          <h3 className="text-lg font-semibold mb-2">Top Destinations After Big Chefs Moda</h3>
          <div className="h-80"> {/* Increased height for better readability */}
            <ResponsiveContainer width="100%" height="100%">
              <BarChart 
                data={topDestinationsData} 
                layout="vertical"
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  type="number" 
                  label={{ 
                    value: 'Visitor Percentage (%)', 
                    position: 'insideBottom', 
                    offset: -5 
                  }}
                  domain={[0, Math.ceil(topDestinationsData[0]?.visitorPercent || 0) + 1]}
                />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  width={160}
                  tick={{ fontSize: 11 }}
                />
                <Tooltip 
                  formatter={(value: number, name: string) => [
                    `${value}% (${topDestinationsData.find(d => d.visitorPercent !== undefined && Math.abs(d.visitorPercent - value) < 0.01)?.visitors || 0} visitors)`,
                    'Percentage of Total Visitors'
                  ]}
                  labelFormatter={(value: string) => {
                    const item = topDestinationsData.find(d => d.name === value);
                    return `${value}${item ? ` - ${item.type}` : ''}`;
                  }}
                  cursor={{ fill: 'rgba(0, 0, 0, 0.05)' }}
                  wrapperStyle={{ zIndex: 1000 }}
                />
                <Bar 
                  dataKey="visitorPercent" 
                  fill="#8884d8"
                  animationDuration={1200}
                  animationBegin={300}
                >
                  {topDestinationsData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={COLORS[index % COLORS.length]} 
                    />
                  ))}
                  <LabelList dataKey="visitorPercent" position="right" formatter={(value: number) => `${value}%`} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow md:col-span-2">
          <h3 className="text-lg font-semibold mb-2">Visitor Distribution by Venue Type</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={visitorsByTypeData.slice(0, 6)}
                  dataKey="visitorPercent"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  innerRadius={30} // Added inner radius for donut style
                  paddingAngle={3} // Added padding between segments
                  label={({name, percent}) => `${name}: ${(percent * 100).toFixed(0)}%`}
                >
                  {visitorsByTypeData.slice(0, 6).map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={COLORS[index % COLORS.length]} 
                      stroke="#fff"
                      strokeWidth={1}
                    />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value, name, props) => {
                    const entry = props.payload;
                    return [`${value}% (${entry.visitors} visitors)`, 'Visitor Percentage'];
                  }}
                  wrapperStyle={{ zIndex: 1000 }}
                />
                <Legend 
                  layout="horizontal" 
                  verticalAlign="bottom" 
                  align="center"
                  wrapperStyle={{ paddingTop: '10px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    );
  }, [visitorSegmentData, topDestinationsData, visitorsByTypeData]);
  
  // Render function for the active tab
  const renderContent = (): React.ReactNode => {
    if (loading) {
      return (
        <div className="flex justify-center items-center py-12 animate-pulse">
          <div className="text-center">
            <div className="w-16 h-16 border-t-4 border-b-4 border-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-lg text-gray-600">Loading data...</p>
          </div>
        </div>
      );
    }
    
    if (error) {
      return (
        <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-lg my-4">
          <h3 className="text-lg font-semibold mb-2">Error Loading Data</h3>
          <p>{error}</p>
          <button 
            className="mt-3 bg-red-100 hover:bg-red-200 text-red-800 px-4 py-2 rounded transition-colors"
            onClick={() => window.location.reload()}
          >
            Retry
          </button>
        </div>
      );
    }
    
    switch (activeTab) {
      case 'distribution':
        return renderDistributionTab;
      case 'visitors':
        return renderVisitorsTab;
      default:
        return renderDistributionTab;
    }
  };
  
  // Tab switching with keyboard support for accessibility
  const handleTabSwitch = (tab: 'distribution' | 'visitors') => {
    setActiveTab(tab);
  };
  
  const handleTabKeyDown = (e: React.KeyboardEvent, tab: 'distribution' | 'visitors') => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setActiveTab(tab);
    }
  };
  
  return (
    <div className="bg-gray-100 p-4 rounded-lg shadow-md max-w-7xl mx-auto my-4">
      <h2 className="text-2xl font-bold mb-2 text-gray-800" id="dashboard-title">Big Chefs Moda Customer Analysis Dashboard</h2>
      <p className="mb-4 text-gray-600">This dashboard shows where customers of Big Chefs Moda visited on the same day after their visit to Big Chefs.</p>
      
      <div className="mb-6" role="tablist" aria-labelledby="dashboard-title">
        <div className="flex border-b">
          <button 
            className={`py-2 px-4 font-medium focus:outline-none focus:ring-2 focus:ring-blue-300 transition-colors ${
              activeTab === 'distribution' 
                ? 'border-b-2 border-blue-500 text-blue-500' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => handleTabSwitch('distribution')}
            onKeyDown={(e) => handleTabKeyDown(e, 'distribution')}
            role="tab"
            aria-selected={activeTab === 'distribution'}
            aria-controls="distribution-panel"
            id="distribution-tab"
            tabIndex={activeTab === 'distribution' ? 0 : -1}
          >
            Customer Distribution
          </button>
          <button 
            className={`py-2 px-4 font-medium focus:outline-none focus:ring-2 focus:ring-blue-300 transition-colors ${
              activeTab === 'visitors' 
                ? 'border-b-2 border-blue-500 text-blue-500' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => handleTabSwitch('visitors')}
            onKeyDown={(e) => handleTabKeyDown(e, 'visitors')}
            role="tab"
            aria-selected={activeTab === 'visitors'}
            aria-controls="visitors-panel"
            id="visitors-tab"
            tabIndex={activeTab === 'visitors' ? 0 : -1}
          >
            Visitors & Insights
          </button>
        </div>
      </div>
      
      <div 
        id={`${activeTab}-panel`}
        role="tabpanel"
        aria-labelledby={`${activeTab}-tab`}
      >
        {renderContent()}
      </div>
      
      <div className="mt-6 bg-blue-50 p-4 rounded-lg text-sm">
        <p><strong>Data Summary:</strong> Analyzed 66 customer locations that were visited by Big Chefs Moda customers on the same day, with a total of 5,684 visitors. Average visitors per location: 86.12.</p>
        <p>Most secondary destinations are in Istanbul Anadolu (98.5%) with only 1.5% in Istanbul Avrupa. The most common destination type is Modern Pub & Bistro (48.5% of all post-Big Chefs visits).</p>
        <p><strong>Note:</strong> This analysis shows post-visit patterns of Big Chefs Moda customers, highlighting their preference for modern dining and entertainment options.</p>
      </div>
      
      <div className="mt-4 text-right text-xs text-gray-500">
        <p>Last updated: {new Date().toLocaleDateString()}</p>
      </div>
    </div>
  );
};

export default CustomerAnalysisDashboard;