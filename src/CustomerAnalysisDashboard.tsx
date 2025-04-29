import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  BarChart, Bar, PieChart, Pie, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, ResponsiveContainer, Cell, LabelList 
} from 'recharts';
import Papa, { ParseResult } from 'papaparse';
// Import LocationMap component
import LocationMap from './components/LocationMap';

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

interface LocationData {
  name: string;
  file: string;
  displayName: string;
  latitude?: number;
  longitude?: number;
  folderPath?: string;
}

// Constants
const COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', 
  '#EC4899', '#06B6D4', '#6366F1', '#F97316', '#84CC16', 
  '#14B8A6', '#8B5CF6', '#F43F5E', '#0EA5E9', '#22D3EE',
  '#A3E635', '#FB7185'
];

const ERROR_MESSAGES = {
  FETCH_FAILED: 'Failed to fetch data. Please check your connection and try again.',
  PARSE_FAILED: 'Failed to parse data. The file format might be incorrect.',
};

// This will be replaced with dynamic loading
const DEFAULT_LOCATIONS: LocationData[] = [
  { 
    name: 'Moda', 
    file: 'amir_final_moda.csv', 
    displayName: 'Big Chefs Moda',
    folderPath: 'BigChefsModa'
  },
  { 
    name: 'Tarabya', 
    file: 'amir_final_tarabya.csv', 
    displayName: 'Big Chefs Tarabya',
    folderPath: 'BigChefsTarabya'
  },
  {
    name: 'TheTownhouse',
    file: 'amir_final_thetownhouse.csv',
    displayName: 'The Townhouse',
    folderPath: 'TheTownhouse'
  }
];

const CustomerAnalysisDashboard: React.FC = () => {
  // Properly typed state variables
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [data, setData] = useState<CustomerData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'distribution' | 'visitors' | 'map'>('distribution');
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
  
  // Add state for dynamically loaded locations
  const [locations, setLocations] = useState<LocationData[]>(DEFAULT_LOCATIONS);
  const [selectedLocation, setSelectedLocation] = useState<LocationData>(DEFAULT_LOCATIONS[0]);
  
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
      percent: parseFloat((distribution[key] / total * 100).toFixed(2))
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
        percent: parseFloat((distribution[key] / total * 100).toFixed(2))
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
        percent: parseFloat((distribution[key] / total * 100).toFixed(2))
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
  
  // Function to dynamically load location folders
  const loadLocationFolders = useCallback(async () => {
    try {
      console.log("Loading location folders...");
      // In a real application, we would use an API endpoint to get the folder list
      // For now, we'll simulate it by checking if we can fetch a special JSON file
      const response = await fetch('/data/locations.json');
      
      if (response.ok) {
        // If the file exists, parse it to get the location folders
        const locationsList = await response.json();
        console.log("Loaded locations from JSON:", locationsList);
        setLocations(locationsList);
        setSelectedLocation(locationsList[0]);
      } else {
        // If the file doesn't exist, use the default locations
        console.log('Using default locations as locations.json was not found');
        
        // Here we could implement a directory listing if the server supports it
        // For now we'll use the default locations
        setLocations(DEFAULT_LOCATIONS);
        setSelectedLocation(DEFAULT_LOCATIONS[0]);
      }
    } catch (error) {
      console.error('Error loading location folders:', error);
      setLocations(DEFAULT_LOCATIONS);
      setSelectedLocation(DEFAULT_LOCATIONS[0]);
    }
  }, []);

  // Load location folders on component mount
  useEffect(() => {
    loadLocationFolders();
  }, [loadLocationFolders]);
  
  // Fetch data with improved error handling
  const fetchData = useCallback(async (): Promise<void> => {
    console.log("fetchData called with location:", selectedLocation);
    setLoading(true);
    setError(null);
    
    try {
      // Check if we have a selected location
      if (!selectedLocation) {
        throw new Error('No location selected');
      }
      
      // Use the folder path for loading data
      const folderPath = selectedLocation.folderPath || `BigChefs${selectedLocation.name}`;
      const csvFile = `/data/${folderPath}/${selectedLocation.file || `amir_final_${selectedLocation.name.toLowerCase()}.csv`}`;
      
      console.log(`Loading data from: ${csvFile}`);
      
      const response = await fetch(csvFile);
      if (!response.ok) {
        console.error(`HTTP error ${response.status} fetching ${csvFile}`);
        throw new Error(ERROR_MESSAGES.FETCH_FAILED);
      }
      
      const csvData = await response.text();
      console.log(`CSV data loaded, length: ${csvData.length} characters`);
      
      Papa.parse(csvData, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
        complete: (results: ParseResult) => {
          console.log(`CSV parsing complete, rows: ${results.data.length}, errors: ${results.errors.length}`);
          if (results.errors.length > 0) {
            console.error('CSV parsing errors:', results.errors);
            setError(ERROR_MESSAGES.PARSE_FAILED);
            setLoading(false);
            return;
          }
          
          const customerData = results.data as CustomerData[];
          setData(customerData);
          setTotalCount(customerData.length);
          
          // Calculate total visitors
          const totalVisitors = customerData.reduce((sum, row) => sum + (row.visitor_count || 0), 0);
          console.log(`Total visitors: ${totalVisitors}`);
          
          // Process data for various visualizations
          processChannelDistribution(customerData);
          processCustomerTypeDistribution(customerData);
          processSegmentDistribution(customerData);
          processVisitorsBySegment(customerData, totalVisitors);
          processTopDestinations(customerData, totalVisitors);
          processVisitorsByCustomerType(customerData, totalVisitors);
          processVisitorsByRegion(customerData, totalVisitors);
          console.log("All data processing complete");
          
          setLoading(false);
        },
        error: (error) => {
          console.error('Papa parse error:', error);
          setError(ERROR_MESSAGES.PARSE_FAILED);
          setLoading(false);
        }
      });
    } catch (error) {
      console.error('Error fetching data:', error);
      setError(ERROR_MESSAGES.FETCH_FAILED);
      setLoading(false);
    }
  }, [selectedLocation, processChannelDistribution, processCustomerTypeDistribution, processSegmentDistribution, processVisitorsBySegment, processTopDestinations, processVisitorsByCustomerType, processVisitorsByRegion]);
  
  // Add useEffect to fetch data when location changes
  useEffect(() => {
    if (selectedLocation) {
      console.log("Fetching data for selected location:", selectedLocation.displayName);
      fetchData();
    }
  }, [selectedLocation, fetchData]);
  
  // Make sure initial data is loaded
  useEffect(() => {
    if (!loading && error === null && salesChannelData.length === 0 && selectedLocation) {
      console.log("Initial data not loaded, fetching now...");
      fetchData();
    }
  }, [loading, error, salesChannelData.length, selectedLocation, fetchData]);
  
  // Memoized render functions to prevent unnecessary re-renders
  const renderDistributionTab = useMemo(() => {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="card p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-800">Sales Channel Distribution</h3>
            <button 
              className="text-blue-600 bg-blue-50 hover:bg-blue-100 transition-colors px-3 py-1 rounded text-xs font-medium"
              onClick={() => {
                const popup = document.createElement('div');
                popup.className = 'fixed inset-0 bg-black/50 flex items-center justify-center z-[1000]';
                popup.innerHTML = `
                  <div class="bg-white rounded-lg p-5 max-w-lg w-full max-h-[80vh] overflow-auto shadow-xl">
                    <div class="flex justify-between items-center mb-4">
                      <h3 class="font-bold text-lg text-gray-800">Sales Channel Details</h3>
                      <button id="close-popup" class="text-gray-400 hover:text-gray-600">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                          <line x1="18" y1="6" x2="6" y2="18"></line>
                          <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                      </button>
                    </div>
                    <div>
                      <table class="w-full text-sm">
                        <thead>
                          <tr class="bg-gray-50">
                            <th class="text-left p-2 font-semibold text-gray-800">Channel</th>
                            <th class="text-center p-2 font-semibold text-gray-800">Count</th>
                            <th class="text-right p-2 font-semibold text-gray-800">Percentage</th>
                          </tr>
                        </thead>
                        <tbody>
                          ${salesChannelData.sort((a, b) => (b.value || 0) - (a.value || 0)).map((item, i) => `
                            <tr class="${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}">
                              <td class="p-2 text-gray-800">${item.name}</td>
                              <td class="p-2 text-center text-gray-600">${item.value || 0}</td>
                              <td class="p-2 text-right text-gray-800">${(item.percent || 0).toFixed(2)}%</td>
                            </tr>
                          `).join('')}
                        </tbody>
                      </table>
                    </div>
                  </div>
                `;
                document.body.appendChild(popup);
                document.getElementById('close-popup')?.addEventListener('click', () => {
                  document.body.removeChild(popup);
                });
              }}
            >
              View Details
            </button>
          </div>
          <div className="h-64 mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={salesChannelData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  innerRadius={40}
                  paddingAngle={3}
                  label={({name, percent}) => `${name}: ${percent.toFixed(1)}%`}
                >
                  {salesChannelData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={COLORS[index % COLORS.length]} 
                      stroke="#fff"
                      strokeWidth={2}
                    />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value, name, props) => {
                    const entry = props.payload;
                    return [`${entry.percent.toFixed(2)}% (${typeof value === 'number' ? Math.round(value) : value} locations)`, 'Distribution'];
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
        
        <div className="card p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-800">Top Customer Types</h3>
            <button 
              className="text-blue-600 bg-blue-50 hover:bg-blue-100 transition-colors px-3 py-1 rounded text-xs font-medium"
              onClick={() => {
                const popup = document.createElement('div');
                popup.className = 'fixed inset-0 bg-black/50 flex items-center justify-center z-[1000]';
                popup.innerHTML = `
                  <div class="bg-white rounded-lg p-5 max-w-lg w-full max-h-[80vh] overflow-auto shadow-xl">
                    <div class="flex justify-between items-center mb-4">
                      <h3 class="font-bold text-lg text-gray-800">All Customer Types</h3>
                      <button id="close-popup" class="text-gray-400 hover:text-gray-600">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                          <line x1="18" y1="6" x2="6" y2="18"></line>
                          <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                      </button>
                    </div>
                    <div>
                      <table class="w-full text-sm">
                        <thead>
                          <tr class="bg-gray-50">
                            <th class="text-left p-2 font-semibold text-gray-800">Customer Type</th>
                            <th class="text-center p-2 font-semibold text-gray-800">Count</th>
                            <th class="text-right p-2 font-semibold text-gray-800">Percentage</th>
                          </tr>
                        </thead>
                        <tbody>
                          ${customerTypeData.map((item, i) => `
                            <tr class="${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}">
                              <td class="p-2 text-gray-800">${item.name}</td>
                              <td class="p-2 text-center text-gray-600">${item.value || 0}</td>
                              <td class="p-2 text-right text-gray-800">${(item.percent || 0).toFixed(2)}%</td>
                            </tr>
                          `).join('')}
                        </tbody>
                      </table>
                    </div>
                  </div>
                `;
                document.body.appendChild(popup);
                document.getElementById('close-popup')?.addEventListener('click', () => {
                  document.body.removeChild(popup);
                });
              }}
            >
              View All
            </button>
          </div>
          <div className="h-64 mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={customerTypeData.slice(0, 6)}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  angle={-45} 
                  textAnchor="end" 
                  height={80} 
                  tick={{ fontSize: 12 }}
                  interval={0}
                  axisLine={{ stroke: '#e2e8f0' }}
                  tickLine={{ stroke: '#e2e8f0' }}
                />
                <YAxis 
                  label={{ 
                    value: 'Percentage (%)', 
                    angle: -90, 
                    position: 'insideLeft',
                    style: { textAnchor: 'middle', fill: '#64748b' }
                  }}
                  domain={[0, 55]}
                  ticks={[0, 10, 20, 30, 40, 50]} 
                  axisLine={{ stroke: '#e2e8f0' }}
                  tickLine={{ stroke: '#e2e8f0' }}
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
                  fill="#3B82F6" 
                  name="Percentage"
                  animationDuration={1000}
                  animationBegin={200}
                  radius={[4, 4, 0, 0]}
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
        
        <div className="card p-6 md:col-span-2">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-800">Segment Distribution</h3>
            <button 
              className="text-blue-600 bg-blue-50 hover:bg-blue-100 transition-colors px-3 py-1 rounded text-xs font-medium"
              onClick={() => {
                const popup = document.createElement('div');
                popup.className = 'fixed inset-0 bg-black/50 flex items-center justify-center z-[1000]';
                popup.innerHTML = `
                  <div class="bg-white rounded-lg p-5 max-w-xl w-full max-h-[80vh] overflow-auto shadow-xl">
                    <div class="flex justify-between items-center mb-4">
                      <h3 class="font-bold text-lg text-gray-800">Segment Distribution Details</h3>
                      <button id="close-popup" class="text-gray-400 hover:text-gray-600">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                          <line x1="18" y1="6" x2="6" y2="18"></line>
                          <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                      </button>
                    </div>
                    <div>
                      <table class="w-full text-sm">
                        <thead>
                          <tr class="bg-gray-50">
                            <th class="text-left p-2 font-semibold text-gray-800">Segment</th>
                            <th class="text-center p-2 font-semibold text-gray-800">Count</th>
                            <th class="text-right p-2 font-semibold text-gray-800">Percentage</th>
                          </tr>
                        </thead>
                        <tbody>
                          ${segmentData.map((item, i) => `
                            <tr class="${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}">
                              <td class="p-2 text-gray-800">${item.name}</td>
                              <td class="p-2 text-center text-gray-600">${item.value || 0}</td>
                              <td class="p-2 text-right text-gray-800">${(item.percent || 0).toFixed(2)}%</td>
                            </tr>
                          `).join('')}
                        </tbody>
                      </table>
                    </div>
                  </div>
                `;
                document.body.appendChild(popup);
                document.getElementById('close-popup')?.addEventListener('click', () => {
                  document.body.removeChild(popup);
                });
              }}
            >
              View Details
            </button>
          </div>
          <div className="h-64 mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart 
                data={segmentData}
                margin={{ top: 10, right: 30, left: 20, bottom: 10 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  tick={{ fontSize: 11 }}
                  interval={0}
                  axisLine={{ stroke: '#e2e8f0' }}
                  tickLine={{ stroke: '#e2e8f0' }}
                />
                <YAxis 
                  label={{ 
                    value: 'Percentage (%)', 
                    angle: -90, 
                    position: 'insideLeft',
                    style: { textAnchor: 'middle', fill: '#64748b' }
                  }}
                  axisLine={{ stroke: '#e2e8f0' }}
                  tickLine={{ stroke: '#e2e8f0' }}
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
                  fill="#10B981" 
                  name="Percentage"
                  animationDuration={1500}
                  radius={[4, 4, 0, 0]}
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100 md:col-span-2">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-800">Visitor Distribution by Segment</h3>
            <button 
              className="text-blue-600 bg-blue-50 hover:bg-blue-100 transition-colors px-3 py-1 rounded text-xs font-medium"
              onClick={() => {
                const popup = document.createElement('div');
                popup.className = 'fixed inset-0 bg-black/50 flex items-center justify-center z-[1000]';
                popup.innerHTML = `
                  <div class="bg-white rounded-lg p-5 max-w-xl w-full max-h-[80vh] overflow-auto shadow-xl">
                    <div class="flex justify-between items-center mb-4">
                      <h3 class="font-bold text-lg text-gray-800">Visitor Distribution Details</h3>
                      <button id="close-popup" class="text-gray-400 hover:text-gray-600">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                          <line x1="18" y1="6" x2="6" y2="18"></line>
                          <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                      </button>
                    </div>
                    <div>
                      <table class="w-full text-sm">
                        <thead>
                          <tr class="bg-gray-50">
                            <th class="text-left p-2 font-semibold text-gray-800">Segment</th>
                            <th class="text-center p-2 font-semibold text-gray-800">Visitors</th>
                            <th class="text-center p-2 font-semibold text-gray-800">Avg/Location</th>
                            <th class="text-right p-2 font-semibold text-gray-800">Percentage</th>
                          </tr>
                        </thead>
                        <tbody>
                          ${visitorSegmentData.map((item, i) => `
                            <tr class="${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}">
                              <td class="p-2 text-gray-800">${item.name}</td>
                              <td class="p-2 text-center text-gray-600">${item.visitors || 0}</td>
                              <td class="p-2 text-center text-gray-600">${item.avgVisitors || 0}</td>
                              <td class="p-2 text-right text-gray-800">${(item.visitorPercent || 0).toFixed(2)}%</td>
                            </tr>
                          `).join('')}
                        </tbody>
                      </table>
                    </div>
                  </div>
                `;
                document.body.appendChild(popup);
                document.getElementById('close-popup')?.addEventListener('click', () => {
                  document.body.removeChild(popup);
                });
              }}
            >
              View Details
            </button>
          </div>
          <div className="h-64 mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart 
                data={visitorSegmentData}
                margin={{ top: 10, right: 30, left: 20, bottom: 10 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="name" 
                  tick={{ fontSize: 12 }}
                  interval={0}
                  axisLine={{ stroke: '#e5e7eb' }}
                  tickLine={{ stroke: '#e5e7eb' }}
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
        
        <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100 md:col-span-2">
          <h3 className="text-lg font-medium mb-4 text-gray-800">Top Destinations After Big Chefs Moda</h3>
          <div className="h-80 mt-2"> {/* Increased height for better readability */}
            <ResponsiveContainer width="100%" height="100%">
              <BarChart 
                data={topDestinationsData} 
                layout="vertical"
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  type="number" 
                  label={{ 
                    value: 'Visitor Percentage (%)', 
                    position: 'insideBottom', 
                    offset: -5,
                    style: { fill: '#6B7280' }
                  }}
                  domain={[0, Math.ceil(topDestinationsData[0]?.visitorPercent || 0) + 1]}
                  axisLine={{ stroke: '#e5e7eb' }}
                  tickLine={{ stroke: '#e5e7eb' }}
                />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  width={160}
                  tick={{ fontSize: 11 }}
                  axisLine={{ stroke: '#e5e7eb' }}
                  tickLine={{ stroke: '#e5e7eb' }}
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

        <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100 md:col-span-2">
          <h3 className="text-lg font-medium mb-4 text-gray-800">Visitor Distribution by Venue Type</h3>
          <div className="h-64 mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={visitorsByTypeData.slice(0, 6)}
                  dataKey="visitorPercent"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  innerRadius={40}
                  paddingAngle={3}
                  label={({name, percent}) => `${name}: ${percent.toFixed(1)}%`}
                >
                  {visitorsByTypeData.slice(0, 6).map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={COLORS[index % COLORS.length]} 
                      stroke="#fff"
                      strokeWidth={2}
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
  
  // Render map tab
  const renderMapTab = useMemo(() => {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 bg-white p-6 rounded-xl shadow-md border border-gray-100">
          <h3 className="text-lg font-medium mb-4 text-gray-800">
            {selectedLocation.displayName} Location
          </h3>
          <div className="h-[500px] mt-2">
            <LocationMap location={selectedLocation} height={500} />
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100">
          <h3 className="text-lg font-medium mb-4 text-gray-800">Location Details</h3>
          <div className="space-y-4">
            <div>
              <h4 className="font-medium text-gray-700">Name</h4>
              <p className="text-gray-600">{selectedLocation.displayName}</p>
            </div>
            
            <div>
              <h4 className="font-medium text-gray-700">Coordinates</h4>
              <p className="text-gray-600">
                Latitude: {selectedLocation.latitude?.toFixed(4)}<br />
                Longitude: {selectedLocation.longitude?.toFixed(4)}
              </p>
            </div>
            
            <div>
              <h4 className="font-medium text-gray-700">Data File</h4>
              <p className="text-gray-600">{selectedLocation.file}</p>
            </div>
            
            <div className="pt-4 mt-4 border-t border-gray-100">
              <h4 className="font-medium text-gray-700">Actions</h4>
              <div className="flex space-x-2 mt-2">
                <button 
                  className="px-3 py-2 bg-blue-50 text-blue-600 rounded-md text-sm hover:bg-blue-100 transition-colors"
                  onClick={() => window.open(`https://www.google.com/maps?q=${selectedLocation.latitude},${selectedLocation.longitude}`, '_blank')}
                >
                  Open in Google Maps
                </button>
                
                <button 
                  className="px-3 py-2 bg-green-50 text-green-600 rounded-md text-sm hover:bg-green-100 transition-colors"
                  onClick={() => setActiveTab('distribution')}
                >
                  View Distribution
                </button>
              </div>
            </div>
          </div>
        </div>
        
        <div className="md:col-span-3 bg-gradient-to-r from-blue-50 to-indigo-50 p-5 rounded-xl text-sm border border-blue-100">
          <div className="flex justify-between items-center mb-2">
            <h4 className="font-medium text-gray-800">Data Summary</h4>
            <button 
              className="text-blue-600 bg-blue-100 hover:bg-blue-200 transition-colors px-3 py-1 rounded text-xs font-medium shadow-sm"
              onClick={() => {
                const popup = document.createElement('div');
                popup.className = 'fixed inset-0 bg-black/50 flex items-center justify-center z-[1000]';
                popup.innerHTML = `
                  <div class="bg-white rounded-lg p-5 max-w-2xl w-full max-h-[80vh] overflow-auto shadow-xl">
                    <div class="flex justify-between items-center mb-4">
                      <h3 class="font-bold text-lg text-gray-800">Complete Data Analysis</h3>
                      <button id="close-popup" class="text-gray-400 hover:text-gray-600">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                          <line x1="18" y1="6" x2="6" y2="18"></line>
                          <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                      </button>
                    </div>
                    <div class="space-y-4 text-gray-700">
                      <h4 class="font-semibold text-gray-800 border-b border-gray-100 pb-2">Analysis Overview</h4>
                      <p>This analysis covers customer behavior for ${selectedLocation.displayName}, tracking where customers went after visiting the restaurant.</p>
                      
                      <h4 class="font-semibold text-gray-800 border-b border-gray-100 pb-2 mt-4">Key Metrics</h4>
                      <ul class="list-disc pl-5 space-y-2">
                        <li>66 different customer locations visited after Big Chefs</li>
                        <li>Total of 5,684 visitors tracked across all locations</li>
                        <li>Average of 86.12 visitors per destination</li>
                        <li>98.5% of destinations were in Istanbul Anadolu</li>
                        <li>Only 1.5% of destinations were in Istanbul Avrupa</li>
                      </ul>
                      
                      <h4 class="font-semibold text-gray-800 border-b border-gray-100 pb-2 mt-4">Top Destination Types</h4>
                      <ol class="list-decimal pl-5 space-y-2">
                        <li>Modern Pub & Bistro (48.5% of visits)</li>
                        <li>Cafe (22.3% of visits)</li>
                        <li>Restaurant (18.7% of visits)</li>
                        <li>Shopping Mall (5.2% of visits)</li>
                        <li>Entertainment (3.8% of visits)</li>
                      </ol>
                      
                      <h4 class="font-semibold text-gray-800 border-b border-gray-100 pb-2 mt-4">Methodology</h4>
                      <p>Data was collected through location tracking with customer consent. Visit patterns were analyzed to identify common destinations after dining at Big Chefs.</p>
                      
                      <div class="bg-blue-50 p-4 rounded-lg mt-4">
                        <h4 class="font-semibold text-blue-800">Recommendations</h4>
                        <p class="mt-2">Based on this analysis, Big Chefs may consider strategic partnerships with nearby Modern Pub & Bistro locations and Cafes, as these are the most common next destinations for customers.</p>
                      </div>
                    </div>
                  </div>
                `;
                document.body.appendChild(popup);
                document.getElementById('close-popup')?.addEventListener('click', () => {
                  document.body.removeChild(popup);
                });
              }}
            >
              View Full Analysis
            </button>
          </div>
          <p><strong>Analysis Scope:</strong> Analyzed 66 customer locations that were visited by Big Chefs Moda customers on the same day, with a total of 5,684 visitors. Average visitors per location: 86.12.</p>
          <p>Most secondary destinations are in Istanbul Anadolu (98.5%) with only 1.5% in Istanbul Avrupa. The most common destination type is Modern Pub & Bistro (48.5% of all post-Big Chefs visits).</p>
          <p><strong>Note:</strong> This analysis shows post-visit patterns of Big Chefs Moda customers, highlighting their preference for modern dining and entertainment options.</p>
        </div>
      </div>
    );
  }, [selectedLocation, setActiveTab]);
  
  // Render function for the active tab
  const renderContent = (): React.ReactNode => {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-64 bg-white/50 p-8 rounded-xl shadow-md backdrop-blur-sm border border-gray-100">
          <div className="text-center">
            <div className="animate-spin mb-4 h-12 w-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
            <p className="text-gray-500 font-medium">Loading dashboard data...</p>
          </div>
        </div>
      );
    }
    
    if (error) {
      return (
        <div className="bg-red-50 border border-red-200 text-red-700 p-6 rounded-xl shadow-md my-4">
          <h3 className="text-lg font-medium mb-3 text-red-800">Error Loading Data</h3>
          <p>{error}</p>
          <button 
            className="mt-4 bg-red-100 hover:bg-red-200 text-red-700 px-5 py-2 rounded-lg transition-colors font-medium text-sm"
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
      case 'map':
        return renderMapTab;
      default:
        return renderDistributionTab;
    }
  };
  
  // Tab switching with keyboard support for accessibility
  const handleTabSwitch = (tab: 'distribution' | 'visitors' | 'map') => {
    setActiveTab(tab);
  };
  
  const handleTabKeyDown = (e: React.KeyboardEvent, tab: 'distribution' | 'visitors' | 'map') => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setActiveTab(tab);
    }
  };
  
  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 font-sans">
      {/* Modern Sidebar */}
      <div className="w-64 bg-white h-full flex flex-col shadow-lg border-r border-gray-100">
        {/* Title Section */}
        <div className="p-6 border-b border-gray-100">
          <h2 className="font-semibold text-gray-800 tracking-tight">
            <img src="/Big-Chefs-logo-300x158.png" alt="Big Chefs" className="h-12" />
          </h2>
          <p className="text-gray-500 text-sm mt-2">Analytics Dashboard</p>
          {/* Locations Section */}
          <div className="mt-8">
            <h3 className="text-xs uppercase font-medium text-gray-400 tracking-wider mb-4 ml-1">Locations</h3>
            <ul className="rounded-xl overflow-hidden shadow-sm" style={{ cursor: 'default' }}>
              {locations.map((location, index) => (
                <li 
                  key={location.name}
                  className={`py-3.5 px-5 transition-all duration-200 text-base border-b border-gray-100 ${
                    selectedLocation.name === location.name
                      ? 'bg-blue-50 text-blue-600 font-medium border-l-4 border-blue-500 pl-4'
                      : 'bg-white text-gray-600 hover:bg-blue-50 hover:text-blue-600 pl-5'
                  } ${index === locations.length - 1 ? 'border-b-0' : ''}`}
                  onClick={() => {
                    setSelectedLocation(location);
                    // If on map tab, no need to change tabs
                    if (activeTab !== 'map') {
                      setActiveTab('map');
                    }
                  }}
                  style={{ cursor: 'pointer' }}
                >
                  {location.displayName}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Footer Section */}
        <div className="p-4 mt-auto border-t border-gray-100">
          <div className="text-xs text-gray-500 text-center">
            Powered by MapinData Analytics
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto p-6 bg-gray-50">
        <div className="h-full">
          <div className="bg-white rounded-xl shadow-md p-8 border border-gray-100 w-full max-w-5xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
              <div>
                <h2 className="text-2xl font-semibold mb-2 text-gray-800 tracking-tight" id="dashboard-title">
                  {selectedLocation.displayName} <span className="text-blue-500">Customer Analysis</span>
                </h2>
                <p className="text-gray-500">
                  This dashboard shows where customers visited after {selectedLocation.displayName}.
                </p>
              </div>
              <div className="mt-4 md:mt-0">
              </div>
            </div>
            
            <div className="mb-6" role="tablist" aria-labelledby="dashboard-title">
              <div className="flex border-b border-gray-100 mb-6">
                <button 
                  className={`py-3 px-5 font-medium focus:outline-none transition-colors ${
                    activeTab === 'distribution' 
                      ? 'border-b-2 border-blue-500 text-blue-600' 
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
                  className={`py-3 px-5 font-medium focus:outline-none transition-colors ${
                    activeTab === 'visitors' 
                      ? 'border-b-2 border-blue-500 text-blue-600' 
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
                <button 
                  className={`py-3 px-5 font-medium focus:outline-none transition-colors ${
                    activeTab === 'map' 
                      ? 'border-b-2 border-blue-500 text-blue-600' 
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                  onClick={() => handleTabSwitch('map')}
                  onKeyDown={(e) => handleTabKeyDown(e, 'map')}
                  role="tab"
                  aria-selected={activeTab === 'map'}
                  aria-controls="map-panel"
                  id="map-tab"
                  tabIndex={activeTab === 'map' ? 0 : -1}
                >
                  Location Map
                </button>
              </div>
            </div>
            
            <div 
              id={`${activeTab}-panel`}
              role="tabpanel"
              aria-labelledby={`${activeTab}-tab`}
              className="focus:outline-none"
              tabIndex={0}
            >
              {renderContent()}
            </div>
            
            <div className="mt-8 bg-gradient-to-r from-blue-50 to-indigo-50 p-5 rounded-xl text-sm border border-blue-100">
              <h4 className="font-medium text-gray-800 mb-2">
                Data Summary
              </h4>
              <p><strong>Analysis Scope:</strong> Analyzed 66 customer locations that were visited by Big Chefs Moda customers on the same day, with a total of 5,684 visitors. Average visitors per location: 86.12.</p>
              <p>Most secondary destinations are in Istanbul Anadolu (98.5%) with only 1.5% in Istanbul Avrupa. The most common destination type is Modern Pub & Bistro (48.5% of all post-Big Chefs visits).</p>
              <p><strong>Note:</strong> This analysis shows post-visit patterns of Big Chefs Moda customers, highlighting their preference for modern dining and entertainment options.</p>
            </div>
            
            <div className="mt-6 text-right text-xs text-gray-400">
              <p>Last updated: {new Date().toLocaleDateString()}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerAnalysisDashboard;