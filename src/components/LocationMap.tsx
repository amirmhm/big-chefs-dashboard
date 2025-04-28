import React, { useEffect, useState, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './leaflet-icon-fix';
import Papa from 'papaparse';

interface LocationData {
  name: string;
  displayName: string;
  latitude?: number;
  longitude?: number;
}

interface DestinationPoint {
  name: string;
  lat: number;
  lng: number;
  visitorCount: number;
  type?: string;
}

interface LocationMapProps {
  location: LocationData;
  height?: number | string;
  width?: number | string;
  zoom?: number;
  showDestinations?: boolean;
  maxArcs?: number;
}

const LocationMap: React.FC<LocationMapProps> = ({ 
  location, 
  height = 500, 
  width = '100%',
  zoom = 15,
  showDestinations = true,
  maxArcs = 10
}) => {
  const [destinations, setDestinations] = useState<DestinationPoint[]>([]);
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInitializedRef = useRef(false);

  // Function to fetch and parse destination data
  useEffect(() => {
    if (showDestinations && location) {
      console.log("Fetching destinations for:", location.name);
      // Try different path formats for the CSV
      const csvFile = `${process.env.PUBLIC_URL}/data/amir_final_${location.name}.csv`;
      console.log("Attempting to fetch CSV from:", csvFile);
      
      // Fetch the CSV data
      fetch(csvFile)
        .then(response => {
          if (!response.ok) {
            throw new Error(`HTTP error ${response.status}`);
          }
          return response.text();
        })
        .then(csvData => {
          Papa.parse(csvData, {
            header: true,
            dynamicTyping: true,
            skipEmptyLines: true,
            complete: (results) => {
              console.log("CSV parsed, found rows:", results.data.length);
              // Process the top destinations by visitor count
              const topDestinations = results.data
                .filter((row: any) => {
                  const hasCoordinates = (row.KoordinatX && row.KoordinatY) || 
                                        (row.latitude && row.longitude);
                  const hasVisitors = row.visitor_count && row.visitor_count > 0;
                  return hasCoordinates && hasVisitors;
                })
                .map((row: any) => {
                  // Handle different CSV formats (Moda vs Tarabya)
                  const koordinatX = String(row.KoordinatX || row.latitude || "");
                  const koordinatY = String(row.KoordinatY || row.longitude || "");
                  
                  // Safely parse coordinates
                  const lat = parseFloat(koordinatX.replace(",", ".").replace("'", ""));
                  const lng = parseFloat(koordinatY.replace(",", ".").replace("'", ""));
                  const visitorCount = parseInt(String(row.visitor_count || 0));
                  
                  return {
                    name: row.place_name || row.MusteriTabelaAdi || "Unknown Location",
                    lat,
                    lng,
                    visitorCount,
                    type: row.MusteriCesidi || "Unspecified"
                  };
                })
                .filter((dest: DestinationPoint) => {
                  const validCoordinates = !isNaN(dest.lat) && !isNaN(dest.lng) && 
                                           Math.abs(dest.lat) <= 90 && Math.abs(dest.lng) <= 180;
                  return validCoordinates && dest.visitorCount > 0;
                })
                .sort((a: DestinationPoint, b: DestinationPoint) => b.visitorCount - a.visitorCount)
                .slice(0, maxArcs);
              
              console.log("Processed destinations:", topDestinations.length);
              setDestinations(topDestinations);
            },
            error: (error) => {
              console.error("Error parsing CSV:", error);
            }
          });
        })
        .catch(error => {
          console.error("Error loading destination data:", error);
        });
    }
  }, [location, showDestinations, maxArcs]);

  // Initialize and update the map
  useEffect(() => {
    // Make sure we have a valid container and location data
    if (!mapContainerRef.current || !location?.latitude || !location?.longitude) {
      return;
    }

    // Clean up existing map first to prevent duplicate initialization
    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
      mapInitializedRef.current = false;
    }

    // Animation references for cleanup
    const animationRefs: number[] = [];
    let pulseAnimation: number | null = null;

    // Initialize map
    const initializeMap = () => {
      try {
        if (mapInitializedRef.current) {
          console.log("Map already initialized, skipping");
          return;
        }

        // Create new map instance
        console.log("Creating new map instance");
        const map = L.map(mapContainerRef.current!).setView(
          [Number(location.latitude), Number(location.longitude)], 
          zoom
        );
        
        // Store map reference
        mapRef.current = map;
        mapInitializedRef.current = true;
        
        // Add tile layer - using a more modern style
        L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
          subdomains: 'abcd',
          maxZoom: 19
        }).addTo(map);
        
        // Add restaurant marker with pulse animation
        const restaurantMarker = L.circleMarker(
          [Number(location.latitude), Number(location.longitude)],
          {
            radius: 8,
            fillColor: '#3B82F6',
            color: '#2563EB',
            weight: 2,
            opacity: 1,
            fillOpacity: 0.9
          }
        ).addTo(map);
        
        // Add a pulse effect around the restaurant marker
        const pulse = L.circleMarker(
          [Number(location.latitude), Number(location.longitude)],
          {
            radius: 10,
            fillColor: '#3B82F6',
            color: '#2563EB',
            weight: 1,
            opacity: 0.3,
            fillOpacity: 0.3
          }
        ).addTo(map);
        
        // Pulse animation
        let size = 10;
        let increasing = true;
        pulseAnimation = window.setInterval(() => {
          if (increasing) {
            size += 0.5;
            if (size >= 25) increasing = false;
          } else {
            size -= 0.5;
            if (size <= 10) increasing = true;
          }
          pulse.setRadius(size);
        }, 50) as unknown as number;
        
        // Popup for main location
        restaurantMarker.bindPopup(`
          <div style="text-align: center; min-width: 180px; padding: 8px;">
            <h3 style="margin: 0 0 5px; font-size: 16px; font-weight: bold;">${location.displayName}</h3>
            <div style="font-size: 12px; color: #666;">${location.name}</div>
          </div>
        `);
        
        // Process and display arcs if we have destinations
        if (destinations.length > 0) {
          console.log("Drawing arcs for", destinations.length, "destinations");
          console.log("Destination data:", JSON.stringify(destinations));
          
          // Calculate the maximum visitor count for scaling
          const maxVisitors = Math.max(...destinations.map(d => d.visitorCount));
          console.log("Max visitors:", maxVisitors);
          
          // Track all points for bounding box
          const allPoints: [number, number][] = [[Number(location.latitude), Number(location.longitude)]];
          
          // Modern color palette for arcs
          const colors = [
            '#3B82F6', // blue
            '#8B5CF6', // indigo
            '#EC4899', // pink
            '#F97316', // orange
            '#10B981', // emerald
          ];
          
          // Process each destination
          destinations.forEach((dest, index) => {
            try {
              // Add this point to the bounding points
              allPoints.push([dest.lat, dest.lng]);
              
              // Calculate a normalized value for visual scaling (0.3 to 1)
              const normalizedValue = 0.3 + (dest.visitorCount / maxVisitors) * 0.7;
              
              // Get a color from our palette
              const colorIndex = index % colors.length;
              const color = colors[colorIndex];
              
              // Create a modern bezier curve arc between points
              const originPoint = [Number(location.latitude), Number(location.longitude)];
              const destPoint = [dest.lat, dest.lng];
              
              // Calculate control point for curve (elevated from midpoint)
              const midX = (originPoint[0] + destPoint[0]) / 2;
              const midY = (originPoint[1] + destPoint[1]) / 2;
              
              // Calculate distance for control point height
              const distance = Math.sqrt(
                Math.pow(destPoint[0] - originPoint[0], 2) + 
                Math.pow(destPoint[1] - originPoint[1], 2)
              );
              
              // Adjust control point height based on distance
              const controlHeight = distance * 0.2;
              
              // Find perpendicular direction to the line
              const dx = destPoint[0] - originPoint[0];
              const dy = destPoint[1] - originPoint[1];
              const normFactor = 1 / Math.sqrt(dx * dx + dy * dy);
              const perpX = -dy * normFactor;
              const perpY = dx * normFactor;
              
              // Create control point
              const controlPoint = [
                midX + perpX * controlHeight,
                midY + perpY * controlHeight
              ];
              
              // Generate curve points
              const curvePoints = [];
              for (let t = 0; t <= 1; t += 0.05) {
                // Quadratic Bezier curve formula
                const x = Math.pow(1 - t, 2) * originPoint[0] + 
                         2 * (1 - t) * t * controlPoint[0] + 
                         Math.pow(t, 2) * destPoint[0];
                         
                const y = Math.pow(1 - t, 2) * originPoint[1] + 
                         2 * (1 - t) * t * controlPoint[1] + 
                         Math.pow(t, 2) * destPoint[1];
                         
                curvePoints.push([x, y]);
              }
              
              // Create a polyline with the curve points
              const arcLine = L.polyline(curvePoints as [number, number][], {
                color: color,
                weight: 2 + (normalizedValue * 3), // Thicker for higher values
                opacity: 0.7,
                className: 'flow-arc'
              }).addTo(map);
              
              // Add destination marker
              const destMarker = L.circleMarker([dest.lat, dest.lng], {
                radius: 5 + (normalizedValue * 5),
                fillColor: color,
                color: 'white',
                weight: 2,
                opacity: 1,
                fillOpacity: 0.8
              }).addTo(map);
              
              // Add a more modern popup with destination info
              destMarker.bindPopup(`
                <div style="min-width: 200px; padding: 10px;">
                  <h4 style="margin: 0; font-size: 14px; font-weight: bold; color: #1F2937;">${dest.name}</h4>
                  <div style="margin-top: 8px; display: flex; justify-content: space-between; align-items: center;">
                    <span style="font-size: 12px; color: #6B7280;">${dest.type || 'Unknown'}</span>
                    <span style="background: ${color}; color: white; padding: 2px 8px; border-radius: 12px; font-size: 12px; font-weight: 500;">${dest.visitorCount} visitors</span>
                  </div>
                </div>
              `);
              
              // Animate the arc (optional)
              let offset = 0;
              const dashArray = 5 + normalizedValue * 5;
              
              // Create animation for flowing effect
              const animateArc = () => {
                offset = (offset + 1) % (dashArray * 2);
                arcLine.getElement()?.setAttribute('stroke-dasharray', `${dashArray},${dashArray}`);
                arcLine.getElement()?.setAttribute('stroke-dashoffset', String(offset));
              };
              
              // Start the animation
              animationRefs.push(window.setInterval(animateArc, 100) as unknown as number);
              
              // Apply the initial dash pattern
              arcLine.getElement()?.classList.add('animated-arc');
              animateArc();
            } catch (err) {
              console.error("Error creating arc for", dest.name, err);
            }
          });
          
          // Set bounds to include all points with padding
          if (allPoints.length > 1) {
            try {
              console.log("Setting map bounds for", allPoints.length, "points");
              const bounds = L.latLngBounds(allPoints.map(p => L.latLng(p[0], p[1])));
              map.fitBounds(bounds, { padding: [40, 40] });
            } catch (error) {
              console.error("Error setting map bounds:", error);
            }
          }
        } else {
          console.warn("No destinations found to display arcs");
        }
        
        // Force a redraw of the map
        setTimeout(() => {
          if (mapRef.current) {
            mapRef.current.invalidateSize(true);
          }
        }, 300);
      } catch (error) {
        console.error("Error initializing map:", error);
      }
    };

    // Delay map initialization to ensure DOM is fully rendered
    setTimeout(initializeMap, 300);

    // Cleanup function
    return () => {
      // Clear all animations
      if (pulseAnimation) {
        clearInterval(pulseAnimation);
      }
      
      animationRefs.forEach(intervalId => {
        clearInterval(intervalId);
      });

      // Clean up map instance
      if (mapRef.current) {
        try {
          mapRef.current.remove();
        } catch (e) {
          console.error("Error removing map:", e);
        }
        mapRef.current = null;
        mapInitializedRef.current = false;
      }
    };
  }, [location, zoom, destinations]);
  
  // Add CSS for arc animations
  useEffect(() => {
    const style = document.createElement('style');
    style.innerHTML = `
      .animated-arc {
        animation: flowAnimation 2s infinite linear;
      }
      @keyframes flowAnimation {
        0% {
          stroke-dashoffset: 0;
        }
        100% {
          stroke-dashoffset: 20;
        }
      }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);
  
  return (
    <div className="relative">
      <div 
        ref={mapContainerRef} 
        style={{ 
          height: typeof height === 'number' ? `${height}px` : height, 
          width: typeof width === 'number' ? `${width}px` : width,
          borderRadius: '0.75rem',
          overflow: 'hidden',
          boxShadow: '0 4px 15px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
          border: '1px solid #e2e8f0'
        }}
      />
      {destinations.length > 0 && (
        <div className="absolute top-4 left-4 bg-white/95 backdrop-blur-sm p-4 rounded-lg shadow-md border border-gray-100 text-xs z-[999]" style={{ maxWidth: '250px' }}>
          <div className="flex justify-between items-center mb-2">
            <h4 className="font-semibold text-gray-800 text-sm">Top Destinations</h4>
            <span className="bg-blue-100 text-blue-800 rounded-full px-2 py-0.5 text-xs">{destinations.length}</span>
          </div>
          <p className="text-gray-500 mb-3 text-xs">Customer flow from {location.displayName}</p>
          <ul className="max-h-[200px] overflow-y-auto">
            {destinations.slice(0, 5).map((dest, index) => (
              <li key={index} className="mb-2 pb-2 border-b border-gray-100 last:border-b-0 last:mb-0 last:pb-0">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-700 truncate" style={{ maxWidth: '170px' }} title={dest.name}>{dest.name}</span>
                  <span className="bg-blue-100 text-blue-800 rounded-full px-2 py-0.5">{dest.visitorCount}</span>
                </div>
                <div className="text-gray-500 text-xs mt-1">{dest.type || 'Unknown'}</div>
              </li>
            ))}
          </ul>
          {destinations.length > 5 && (
            <div className="mt-3 text-center">
              <button 
                className="text-blue-600 bg-blue-50 hover:bg-blue-100 transition-colors px-3 py-1.5 rounded text-xs font-medium w-full"
                onClick={() => {
                  const popup = document.createElement('div');
                  popup.className = 'fixed inset-0 bg-black/50 flex items-center justify-center z-[1000]';
                  popup.innerHTML = `
                    <div class="bg-white rounded-lg p-5 max-w-lg w-full max-h-[80vh] overflow-auto shadow-xl">
                      <div class="flex justify-between items-center mb-4">
                        <h3 class="font-bold text-lg text-gray-800">All Destinations (${destinations.length})</h3>
                        <button id="close-popup" class="text-gray-500 hover:text-gray-700">
                          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                          </svg>
                        </button>
                      </div>
                      <div>
                        ${destinations.map((dest, i) => `
                          <div class="py-2 ${i < destinations.length - 1 ? 'border-b border-gray-100' : ''}">
                            <div class="flex justify-between items-center">
                              <span class="font-medium text-gray-800">${dest.name}</span>
                              <span class="bg-blue-100 text-blue-800 rounded-full px-2 py-0.5 text-xs">${dest.visitorCount}</span>
                            </div>
                            <div class="text-gray-500 text-sm mt-1">${dest.type || 'Unknown'}</div>
                          </div>
                        `).join('')}
                      </div>
                    </div>
                  `;
                  document.body.appendChild(popup);
                  document.getElementById('close-popup')?.addEventListener('click', () => {
                    document.body.removeChild(popup);
                  });
                }}
              >
                View All Destinations
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default LocationMap; 