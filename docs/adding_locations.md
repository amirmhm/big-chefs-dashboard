# Adding New Locations to the Big Chefs Dashboard

This document explains how to add new restaurant locations to the dashboard.

## Folder Structure

The dashboard now uses a folder-based approach to organize location data. Each restaurant location has its own folder within the `public/data` directory.

```
public/data/
├── BigChefsModa/
│   ├── BigChefsModa.csv      # Restaurant coordinates
│   └── amir_final_moda.csv   # Customer data
├── BigChefsTarabya/
│   ├── BigChefsTarabya.csv   # Restaurant coordinates
│   └── amir_final_tarabya.csv # Customer data
├── TheTownhouse/             # Example of location not starting with BigChefs
│   ├── TheTownhouse.csv      # Restaurant coordinates
│   └── amir_final_thetownhouse.csv # Customer data
└── locations.json            # Auto-generated locations list
```

## Adding a New Location

To add a new restaurant location, follow these steps:

1. **Create a folder** in the `public/data` directory. You can use two naming formats:
   
   - For Big Chefs locations: `BigChefs{LocationName}` (e.g., `BigChefsNisantasi`)
   - For other locations: Any folder name without spaces (e.g., `TheTownhouse`, `IstanbulCafe`) 

2. **Add the location coordinates file** in the folder. The file should be named to match the folder name (e.g., `TheTownhouse.csv` for the TheTownhouse folder).
   
   Example format for the coordinates file:
   ```
   name,lat,lng,province
   TheTownhouse,41.0485,28.9925,Istanbul
   ```

3. **Add the customer data file** in the same folder. The script will look for CSV files in the following order:
   
   - `amir_final_{locationname}.csv` (lowercase location name without the BigChefs prefix)
   - `{locationname}_data.csv`
   - `{foldername}_data.csv`
   - Any CSV file containing "final" or "data" in the name
   - Any CSV file in the folder

   The customer data CSV should contain columns similar to the existing data files, including:
   - MusteriKodu
   - MusteriBolge3
   - MusteriBolge4
   - SatisKanali
   - MusteriUnvan
   - MusteriTabelaAdi
   - MusteriCesidi
   - KoordinatX
   - KoordinatY
   - MapProfileScore
   - MapPopulationScore
   - Mapin Segment
   - place_name
   - visitor_count

4. **Generate the locations.json file** by running:
   ```
   npm run generate-locations
   ```
   
   This script will detect your new folder and update the locations list automatically.

5. **Start the application** to see your new location in the dashboard:
   ```
   npm start
   ```
   
   The location will be added to the locations list in the sidebar.

## Notes

- The location name displayed in the dashboard is automatically derived from the folder name:
  - For BigChefs locations: "Big Chefs {Name}" (e.g., "Big Chefs Nisantasi")
  - For other locations: Words are separated by capital letters (e.g., "The Townhouse" for TheTownhouse)
- If you want to use a different CSV file name, add it to the folder and the generator will find it automatically
- The `locations.json` file is automatically generated when you start the application (`npm start`) 