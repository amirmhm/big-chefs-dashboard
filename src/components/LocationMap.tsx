import React, { useEffect, useState, useRef, useLayoutEffect } from 'react';
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

  // Function to fetch and parse destination data
  useEffect(() => {
    if (showDestinations && location) {
      console.log("Fetching destinations for:", location.name);
      // Determine which CSV file to load based on location name
      const csvFile = `/data/amir_final_${location.name}.csv`;
      
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

  // Clean up the map instance when component unmounts or when location changes
  useEffect(() => {
    return () => {
      if (mapRef.current) {
        try {
          mapRef.current.remove();
        } catch (e) {
          console.error("Error removing map:", e);
        }
        mapRef.current = null;
      }
    };
  }, []);

  // Initialize and update the map
  useEffect(() => {
    // Make sure we have a valid container and location data
    if (!mapContainerRef.current || !location?.latitude || !location?.longitude) {
      return;
    }

    // Clean up existing map
    if (mapRef.current) {
      try {
        mapRef.current.remove();
      } catch (e) {
        console.error("Error removing map:", e);
      }
      mapRef.current = null;
    }

    // Animation references for cleanup
    const animationRefs: number[] = [];
    let pulseAnimation: number | null = null;

    // Delay map initialization to ensure DOM is ready
    const initializeMap = () => {
      try {
        // Create new map instance
        const map = L.map(mapContainerRef.current!).setView(
          [Number(location.latitude), Number(location.longitude)], 
          zoom
        );
        
        // Store map reference
        mapRef.current = map;
        
        // Add tile layer
        L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
          subdomains: 'abcd',
          maxZoom: 19
        }).addTo(map);
        
        // Add map style controls
        const styleControlDiv = L.DomUtil.create('div', 'leaflet-bar leaflet-control');
        styleControlDiv.style.backgroundColor = 'white';
        styleControlDiv.style.padding = '5px';
        styleControlDiv.style.borderRadius = '4px';
        styleControlDiv.style.boxShadow = '0 1px 5px rgba(0,0,0,0.2)';
        styleControlDiv.style.display = 'flex';
        styleControlDiv.style.gap = '5px';

        const lightBtn = L.DomUtil.create('button', '', styleControlDiv);
        lightBtn.innerHTML = 'Light';
        lightBtn.style.background = '#f1f5f9';
        lightBtn.style.color = '#334155';
        lightBtn.style.border = '1px solid #e2e8f0';
        lightBtn.style.borderRadius = '3px';
        lightBtn.style.padding = '3px 7px';
        lightBtn.style.fontSize = '11px';
        lightBtn.style.cursor = 'pointer';
        lightBtn.style.fontWeight = 'bold';

        const darkBtn = L.DomUtil.create('button', '', styleControlDiv);
        darkBtn.innerHTML = 'Dark';
        darkBtn.style.background = '#1e293b';
        darkBtn.style.color = '#f8fafc';
        darkBtn.style.border = '1px solid #0f172a';
        darkBtn.style.borderRadius = '3px';
        darkBtn.style.padding = '3px 7px';
        darkBtn.style.fontSize = '11px';
        darkBtn.style.cursor = 'pointer';

        // Add the control to the map
        const styleControl = L.Control.extend({
          options: {
            position: 'topright'
          },
          onAdd: function() {
            return styleControlDiv;
          }
        });

        new styleControl().addTo(map);

        // Add event listeners
        lightBtn.addEventListener('click', () => {
          updateMapStyle('light');
        });

        darkBtn.addEventListener('click', () => {
          updateMapStyle('dark');
        });

        // Function to change map style
        const updateMapStyle = (style: 'light' | 'dark') => {
          if (!mapRef.current) return;
          
          // Remove current tile layer
          mapRef.current.eachLayer((layer) => {
            if (layer instanceof L.TileLayer) {
              mapRef.current?.removeLayer(layer);
            }
          });
          
          // Add new tile layer based on style
          if (style === 'light') {
            L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
              attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
              subdomains: 'abcd',
              maxZoom: 19
            }).addTo(mapRef.current);
            
            lightBtn.style.fontWeight = 'bold';
            darkBtn.style.fontWeight = 'normal';
          } else {
            L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
              attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
              subdomains: 'abcd',
              maxZoom: 19
            }).addTo(mapRef.current);
            
            lightBtn.style.fontWeight = 'normal';
            darkBtn.style.fontWeight = 'bold';
          }
        };

        // Add marker for the location
        const locationIcon = L.divIcon({
          className: 'custom-div-icon',
          html: `<div style="background-color: #3B82F6; width: 22px; height: 22px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 10px rgba(0,0,0,0.2);"></div>`,
          iconSize: [22, 22],
          iconAnchor: [11, 11]
        });

        const marker = L.marker([
          Number(location.latitude),
          Number(location.longitude)
        ], { icon: locationIcon }).addTo(map);

        // Add a popup with the location name
        marker.bindPopup(`
          <div class="location-popup" style="min-width: 200px; padding: 12px; border-radius: 8px;">
            <h3 style="margin: 0; font-size: 16px; color: #1e293b; font-weight: 600;">${location.displayName}</h3>
            <p style="margin: 8px 0 0 0; font-size: 12px; color: #64748b;">Lat: ${location.latitude?.toFixed(4) || 'N/A'}, Lng: ${location.longitude?.toFixed(4) || 'N/A'}</p>
            <div style="margin-top: 10px;">
              <a href="https://www.google.com/maps?q=${location.latitude},${location.longitude}" target="_blank" style="display: inline-block; padding: 5px 10px; background: #eff6ff; color: #3b82f6; border-radius: 4px; text-decoration: none; font-size: 12px; font-weight: 500;">View in Google Maps</a>
            </div>
          </div>
        `).openPopup();

        // Add a pulsing circle animation effect
        const pulsingCircle = L.circleMarker([Number(location.latitude), Number(location.longitude)], {
          color: '#3B82F6',
          fillColor: '#93C5FD',
          fillOpacity: 0.3,
          radius: 30,
          weight: 2,
          opacity: 0.5
        }).addTo(map);

        // Animate the circle
        let animationRadius = 30;
        pulseAnimation = window.setInterval(() => {
          animationRadius = animationRadius === 30 ? 40 : 30;
          pulsingCircle.setRadius(animationRadius);
          pulsingCircle.setStyle({
            fillOpacity: animationRadius === 30 ? 0.3 : 0.2
          });
        }, 1000);

        // Add a static circle to highlight the area
        L.circle([Number(location.latitude), Number(location.longitude)], {
          color: '#3B82F6',
          fillColor: '#93C5FD',
          fillOpacity: 0.1,
          radius: 300 // 300 meters radius
        }).addTo(map);

        // Add arcs to destinations if they exist
        if (destinations.length > 0) {
          console.log("Creating arcs for", destinations.length, "destinations");
          
          // Define a color scale based on visitor count
          const getColor = (count: number, max: number) => {
            // Use a gradient from blue to purple for better visual appeal
            const ratio = count / max;
            if (ratio > 0.75) return '#7c3aed'; // purple
            if (ratio > 0.5) return '#4f46e5';  // indigo
            if (ratio > 0.25) return '#3b82f6';  // blue
            return '#60a5fa';  // light blue
          };
          
          const maxVisitors = destinations[0].visitorCount;
          console.log("Max visitors:", maxVisitors);
          
          // Create an array of points for bounds calculation
          const allPoints: [number, number][] = [
            [Number(location.latitude), Number(location.longitude)]
          ];
          
          destinations.forEach((dest, index) => {
            console.log(`Processing destination ${index+1}:`, dest.name, `(${dest.lat}, ${dest.lng})`);
            
            // Skip if coordinates are invalid
            if (isNaN(dest.lat) || isNaN(dest.lng)) {
              console.warn("Invalid coordinates for", dest.name);
              return;
            }
            
            try {
              // Add point to bounds array
              allPoints.push([dest.lat, dest.lng]);
              
              // Create a simple line between the location and the destination
              const startLatLng = L.latLng(Number(location.latitude), Number(location.longitude));
              const endLatLng = L.latLng(dest.lat, dest.lng);
              
              // Get color and weight based on visitor count
              const color = getColor(dest.visitorCount, maxVisitors);
              const weight = Math.max(2, Math.min(6, (dest.visitorCount / maxVisitors) * 6));
              
              // Create direct line for simplicity and reliability
              L.polyline([startLatLng, endLatLng], {
                color: color,
                weight: weight,
                opacity: 0.8
              }).addTo(map);
              
              // Add destination marker
              const destMarker = L.circleMarker([dest.lat, dest.lng], {
                radius: Math.max(5, Math.min(12, (dest.visitorCount / maxVisitors) * 12)),
                fillColor: color,
                color: '#ffffff',
                weight: 2,
                opacity: 1,
                fillOpacity: 0.8
              }).addTo(map);
              
              // Add a popup with destination info
              destMarker.bindPopup(`
                <div style="min-width: 180px; padding: 10px;">
                  <h4 style="margin: 0; font-size: 14px; font-weight: bold;">${dest.name}</h4>
                  <div style="margin-top: 5px;">
                    <span style="font-size: 12px;">${dest.type || 'Unknown'}</span>
                    <span style="float: right; background: ${color}; color: white; padding: 1px 6px; border-radius: 10px; font-size: 11px;">${dest.visitorCount} visitors</span>
                  </div>
                </div>
              `);
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
    setTimeout(initializeMap, 100);

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
      }
    };
  }, [location, zoom, destinations]);
  
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
                        <button id="close-popup" class="text-gray-400 hover:text-gray-600">
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