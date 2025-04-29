const fs = require('fs');
const path = require('path');

// Path to data directory
const dataDir = path.join(__dirname, '..', 'public', 'data');
const outputPath = path.join(dataDir, 'locations.json');

// Function to extract name and display name from folder name
function processFolder(folderName) {
  // Extract display name
  let name, displayName;
  
  // Check if it starts with BigChefs
  if (folderName.startsWith('BigChefs')) {
    // Remove BigChefs prefix if it exists
    name = folderName.replace(/^BigChefs/, '');
    // Format display name
    displayName = `Big Chefs ${name}`;
  } else {
    // Use folder name as is
    name = folderName;
    // Create a display name by adding spaces before capital letters
    displayName = folderName
      .replace(/([A-Z])/g, ' $1') // Add space before capital letters
      .replace(/^./, str => str.toUpperCase()) // Capitalize first letter
      .trim();
  }
  
  // Determine default file name - try different patterns
  let file = null;
  const folderPath = path.join(dataDir, folderName);
  
  // Try possible naming patterns
  const possibleFileNames = [
    `amir_final_${name.toLowerCase()}.csv`,
    `${name.toLowerCase()}_data.csv`,
    `${folderName.toLowerCase()}_data.csv`,
    `data_${folderName.toLowerCase()}.csv`
  ];
  
  // Check if any of the possible files exist
  for (const fileName of possibleFileNames) {
    if (fs.existsSync(path.join(folderPath, fileName))) {
      file = fileName;
      break;
    }
  }
  
  // If none of the patterns matched, find any CSV file
  if (!file) {
    // Try to find a CSV file with "final" or "data" in the name
    const files = fs.readdirSync(folderPath);
    const csvFiles = files.filter(f => f.endsWith('.csv') && (f.includes('final') || f.includes('data')));
    
    if (csvFiles.length > 0) {
      file = csvFiles[0];
    } else {
      // If no file with specific keywords, use any CSV file
      const allCsvFiles = files.filter(f => f.endsWith('.csv'));
      if (allCsvFiles.length > 0) {
        file = allCsvFiles[0];
      }
    }
  }
  
  // If no file was found, use a default name
  if (!file) {
    file = `data.csv`;
    console.warn(`Warning: No CSV file found in ${folderName}, using default name "${file}"`);
  }
  
  return {
    name,
    displayName,
    file,
    folderPath: folderName
  };
}

// Main function to generate locations.json
function generateLocationsJson() {
  try {
    // Read data directory and get all folders (not just BigChefs folders)
    const folders = fs.readdirSync(dataDir, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory() && !dirent.name.startsWith('.')) // Exclude hidden folders
      .map(dirent => dirent.name);
    
    // Process each folder
    const locations = folders.map(processFolder);
    
    // Write to locations.json
    fs.writeFileSync(outputPath, JSON.stringify(locations, null, 2));
    
    console.log(`Successfully generated locations.json with ${locations.length} locations`);
    console.log(locations);
    
  } catch (error) {
    console.error('Error generating locations.json:', error);
  }
}

// Run the generator
generateLocationsJson(); 