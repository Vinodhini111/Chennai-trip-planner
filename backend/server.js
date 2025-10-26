const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;

// --- Middleware ---
app.use(cors()); // Allow frontend to call this API
app.use(express.json()); // Allow server to read JSON from requests

// --- Load Data Into Memory ---
let allRoutes = [];
let allStations = [];
const MAJOR_HUBS = [
    "Guindy", "Central Station", "Saidapet", "Thiruvanmiyur", "Adyar Depot", 
    "Koyambedu", "Egmore", "St. Thomas Mount", "T. Nagar", "Parrys Corner", 
    "Tambaram", "Avadi", "Ambattur", "Perambur", "Park", "Chennai Beach"
];

try {
    const busData = fs.readFileSync(path.join(__dirname, 'data', 'bus_routes.json'), 'utf8');
    const trainData = fs.readFileSync(path.join(__dirname, 'data', 'train_routes.json'), 'utf8');
    const stationData = fs.readFileSync(path.join(__dirname, 'data', 'stations.json'), 'utf8');
    
    allRoutes = [...JSON.parse(busData), ...JSON.parse(trainData)];
    allStations = JSON.parse(stationData);
    console.log('Data loaded successfully!');
} catch (error) {
    console.error('Error loading data:', error);
}

// --- API Endpoint ---
// The frontend will call this URL
app.post('/api/find-routes', (req, res) => {
    const { source, destination } = req.body;

    if (!source || !destination) {
        return res.status(400).json({ error: 'Source and destination are required.' });
    }

    // Run the advanced pathfinding logic
    const routes = findComplexRoutes(source, destination);
    res.json(routes);
});

// --- The Pathfinding "Brain" ---
// This now finds 0, 1, AND 2-transfer routes.
function findComplexRoutes(source, destination) {
    const sourceLower = source.toLowerCase();
    const destinationLower = destination.toLowerCase();

    let directRoutes = [];
    let oneTransferRoutes = [];
    let twoTransferRoutes = []; // <-- NEW: For 2 transfers / 3 legs

    // --- Logic 1: Find Direct Routes (Source -> Dest) ---
    const leg1Direct = findRouteLeg(sourceLower, destinationLower, allRoutes);
    directRoutes = leg1Direct.map(leg => ({ type: "direct", ...leg }));

    // --- Logic 2: Find 1-Transfer Routes (Source -> HubA -> Dest) ---
    for (const hubA of MAJOR_HUBS) {
        const hubALower = hubA.toLowerCase();
        if (hubALower === sourceLower || hubALower === destinationLower) continue;

        const leg1s = findRouteLeg(sourceLower, hubALower, allRoutes);
        if (leg1s.length > 0) {
            // Find leg 2, but don't use the same route ID
            const leg2s = findRouteLeg(hubALower, destinationLower, allRoutes.filter(r => !leg1s.map(l => l.id).includes(r.id)));
            for (const leg1 of leg1s) {
                for (const leg2 of leg2s) {
                    oneTransferRoutes.push({ type: "1-transfer", hub: hubA, leg1, leg2 });
                }
            }
        }
    }

    // --- Logic 3: Find 2-Transfer Routes (Source -> HubA -> HubB -> Dest) ---
    // This is the "two or three trains or buses" you wanted!
    for (const hubA of MAJOR_HUBS) {
        const hubALower = hubA.toLowerCase();
        if (hubALower === sourceLower || hubALower === destinationLower) continue;

        const leg1s = findRouteLeg(sourceLower, hubALower, allRoutes);
        if (leg1s.length === 0) continue; // No path from source to HubA

        for (const hubB of MAJOR_HUBS) {
            const hubBLower = hubB.toLowerCase();
            if (hubBLower === sourceLower || hubBLower === destinationLower || hubBLower === hubALower) continue;

            // Find leg 2 (HubA -> HubB)
            const leg2s = findRouteLeg(hubALower, hubBLower, allRoutes);
            if (leg2s.length === 0) continue; // No path from HubA to HubB

            // Find leg 3 (HubB -> Dest)
            const leg3s = findRouteLeg(hubBLower, destinationLower, allRoutes);
            
            // If we find all 3 legs, we have a 2-transfer route!
            for (const leg1 of leg1s) {
                for (const leg2 of leg2s) {
                    // Ensure we're not just getting on/off the same bus/train
                    if (leg1.id === leg2.id) continue;
                    for (const leg3 of leg3s) {
                        if (leg2.id === leg3.id) continue;
                        twoTransferRoutes.push({ type: "2-transfer", hubA, hubB, leg1, leg2, leg3 });
                    }
                }
            }
        }
    }

    return { 
        directRoutes: directRoutes.slice(0, 3), 
        oneTransferRoutes: oneTransferRoutes.slice(0, 3), // Limit results for sanity
        twoTransferRoutes: twoTransferRoutes.slice(0, 2)  // 2-transfer routes can be many
    };
}

// Helper: Finds all possible legs between two points
function findRouteLeg(sourceLower, destinationLower, routesToSearch) {
    let legs = [];
    for (const route of routesToSearch) {
        const stopNames = route.type === 'train' ? route.stops.map(stop => stop.name) : route.stops;
        const stopNamesLower = stopNames.map(s => s.toLowerCase()); 
        
        const sourceIndex = stopNamesLower.indexOf(sourceLower);
        const destIndex = stopNamesLower.indexOf(destinationLower);

        if (sourceIndex > -1 && destIndex > -1 && destIndex > sourceIndex) {
            const journeyStops = route.stops.slice(sourceIndex, destIndex + 1);
            legs.push({ ...route, journeyStops, timings: getTimings(route, journeyStops) });
        }
    }
    return legs; // Return all possible legs
}

// Helper: Gets timing info
function getTimings(route, journeyStops) {
    if (route.type === 'train') {
        return {
            departureTime: journeyStops[0].time,
            arrivalTime: journeyStops[journeyStops.length - 1].time
        };
    } else {
        return {
            first_bus: route.first_bus,
            last_bus: route.last_bus,
            frequency_peak: route.frequency_peak
        };
    }
}

// --- Start the Server ---
app.listen(PORT, () => {
    console.log(`Backend server is running on http://localhost:${PORT}`);
});
