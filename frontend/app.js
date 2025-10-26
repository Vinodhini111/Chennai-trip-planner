document.addEventListener("DOMContentLoaded", () => {
    // --- 1. GET ALL THE HTML ELEMENTS ---
    const searchForm = document.getElementById("search-form");
    if (!searchForm) return; // Don't run this script on homepage.html

    const sourceInput = document.getElementById("source");
    const destinationInput = document.getElementById("destination");
    const stationList = document.getElementById("station-list");
    const resultsContainer = document.getElementById("results-container");
    const resultsPlaceholder = document.getElementById("results-placeholder");
    const swapButton = document.getElementById("swap-btn");
    const searchButton = document.getElementById("search-btn");

    // --- 2. DEFINE THE BACKEND API URL ---
    const API_URL = "https://chennai-trip-planner-backend.onrender.com";

    // --- 3. LOAD ONLY THE STATIONS FOR AUTOCOMPLETE ---
    async function loadStations() {
        try {
            // Note: We are fetching this from the frontend folder, 
            // but in a real app, you'd make a /api/stations endpoint.
            // For simplicity, we'll just fetch a static file from the *backend* data folder.
            // This requires the backend data to be accessible, which is complex.
            
            // --- SIMPLER APPROACH ---
            // We'll just load the static station list from the backend's data folder.
            // To do this, we need to make the backend 'serve' this file.
            // Let's modify this: We'll create a /api/stations endpoint in server.js
            
            // --- EVEN SIMPLER APPROACH ---
            // Let's just fetch the stations from the backend API.
            // I'll add a new endpoint to server.js for this.
            
            // --- OK, FINAL, SIMPLEST APPROACH FOR THIS PROTOTYPE ---
            // The frontend has no access to the `backend/data` folder.
            // So, we must create a *copy* of `stations.json` in the `frontend` folder.
            // This is a bit redundant, but simplest for this HTML/CSS/JS/Node setup.
            
            // SO: Please create a `frontend/data/stations.json` file.
            // For now, I'll hardcode them to keep file count down,
            // but you should create that file and fetch it.
            
            const stations = [
                "Koyambedu", "Vadapalani", "Guindy", "Saidapet", "IIT Madras", "Adyar Depot", "Thiruvanmiyur", "SRP Tools", "Perungudi", "Thoraipakkam", "Sholinganallur", "Siruseri IT Park", "Kelambakkam", "Thiruvotriyur", "Tollgate", "Parrys Corner", "Central Station", "Anna Square", "Light House", "Velachery", "Anna Nagar", "T. Nagar", "Perambur", "Chromepet", "Tambaram", "Porur", "Poonamallee", "Avadi", "Ambattur", "Madhavaram", "Red Hills", "Chennai Beach", "Chennai Fort", "Park", "Egmore", "Nungambakkam", "Kodambakkam", "Mambalam", "St. Thomas Mount", "Pallavaram", "Thirumullaivoyal", "Pattabiram"
            ];
            populateDatalist(stations);

        } catch (error) {
            console.error("Failed to load station data:", error);
        }
    }

    function populateDatalist(stations) {
        stationList.innerHTML = '';
        stations.forEach(station => {
            const option = document.createElement('option');
            option.value = station;
            stationList.appendChild(option);
        });
    }

    // --- 4. HANDLE THE SEARCH FORM SUBMISSION ---
    searchForm.addEventListener("submit", async (e) => {
        e.preventDefault(); 
        const source = sourceInput.value.trim();
        const destination = destinationInput.value.trim();

        if (source === "" || destination === "") {
            displayMessage("Please enter both a source and a destination.", "error");
            return;
        }
        if (source.toLowerCase() === destination.toLowerCase()) {
            displayMessage("Source and destination cannot be the same.", "error");
            return;
        }
        
        // Show loading state
        searchButton.disabled = true;
        searchButton.innerText = "Searching...";
        resultsContainer.innerHTML = '';
        if(resultsPlaceholder) resultsPlaceholder.style.display = 'none';

        try {
            // --- THIS IS THE API CALL TO THE NODE.JS BACKEND ---
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ source, destination }),
            });

            if (!response.ok) {
                throw new Error('Network response was not ok');
            }

            const routes = await response.json();
            displayRoutes(routes, source, destination);

        } catch (error) {
            console.error('Error fetching routes:', error);
            displayMessage('Error connecting to the route server. Is it running?', 'error');
        } finally {
            // Restore button
            searchButton.disabled = false;
            searchButton.innerText = "Find Routes";
        }
    });
    
    // --- 5. SWAP BUTTON LOGIC ---
    swapButton.addEventListener("click", () => {
        const temp = sourceInput.value;
        sourceInput.value = destinationInput.value;
        destinationInput.value = temp;
    });

    // --- 6. DISPLAY THE RESULTS (FROM THE SERVER) ---
    function displayRoutes(routes, source, destination) {
        if (!routes) {
            displayMessage('No routes found.', 'error');
            return;
        }
        
        const { directRoutes, oneTransferRoutes, twoTransferRoutes } = routes;

        if (directRoutes.length === 0 && oneTransferRoutes.length === 0 && twoTransferRoutes.length === 0) {
            displayMessage(`No routes found from ${source} to ${destination}.`, "info");
            return;
        }

        // Display Direct Routes
        directRoutes.forEach(route => {
            resultsContainer.innerHTML += createDirectRouteHtml(route);
        });
        
        // Display 1-Transfer Routes
        oneTransferRoutes.forEach(route => {
             resultsContainer.innerHTML += createTransferRouteHtml(route, 1);
        });
        
        // Display 2-Transfer Routes
        twoTransferRoutes.forEach(route => {
             resultsContainer.innerHTML += createTransferRouteHtml(route, 2);
        });

        lucide.createIcons(); // Activate any new icons
    }
    
    // --- DISPLAY HELPER FUNCTIONS ---
    // (These are the same as the previous version, they just render HTML)
    
    function createDirectRouteHtml(route) {
        const isTrain = route.type === 'train';
        const icon = isTrain ? 'train-front' : 'bus';
        const borderColor = isTrain ? 'border-blue-500' : 'border-green-500';
        
        const timingHtml = isTrain ? `
            <div class="flex justify-between text-center mt-4">
                <div><span class="block text-sm text-gray-500">Depart</span><span class="block text-lg font-semibold text-blue-600">${route.timings.departureTime}</span></div>
                <div><span class="block text-sm text-gray-500">Arrive</span><span class="block text-lg font-semibold text-blue-600">${route.timings.arrivalTime}</span></div>
            </div>
        ` : `
            <div class="text-center mt-4 grid grid-cols-3 gap-2">
                <div><span class="block text-sm text-gray-500">First Bus</span><span class="block text-md font-semibold text-green-700">${route.timings.first_bus}</span></div>
                <div><span class="block text-sm text-gray-500">Last Bus</span><span class="block text-md font-semibold text-red-600">${route.timings.last_bus}</span></div>
                <div><span class="block text-sm text-gray-500">Frequency</span><span class="block text-md font-semibold text-gray-700">${route.timings.frequency_peak}</span></div>
            </div>
        `;
        return `<div class="bg-white p-5 rounded-lg shadow border-l-4 ${borderColor}"><div class="flex items-center mb-2"><i data-lucide="${icon}" class="w-6 h-6 ${isTrain ? 'text-blue-600' : 'text-green-600'} mr-3"></i><span class="text-xl font-semibold text-gray-800">${route.name}</span><span class="ml-auto text-sm font-medium text-green-600 bg-green-100 px-3 py-1 rounded-full">Direct Route</span></div>${timingHtml}</div>`;
    }
    
    function createTransferRouteHtml(route, transferCount) {
        const leg1Html = createLegHtml(route.leg1, 1);
        const leg2Html = createLegHtml(route.leg2, 2);
        const leg3Html = route.leg3 ? createLegHtml(route.leg3, 3) : '';
        const transferText = transferCount === 1 ? `Change at ${route.hub}` : `Change at ${route.hubA} & ${route.hubB}`;
        
        return `
            <div class="bg-white p-5 rounded-lg shadow border-l-4 border-yellow-500">
                <div class="flex items-center mb-4"><i data-lucide="arrow-left-right" class="w-6 h-6 text-yellow-600 mr-3"></i><span class="text-xl font-semibold text-gray-800">${transferCount}-Transfer Route</span><span class="ml-auto text-sm font-medium text-yellow-700 bg-yellow-100 px-3 py-1 rounded-full">${transferText}</span></div>
                ${leg1Html}
                <div class="text-center my-2 text-gray-500 text-sm font-medium">-- Transfer at ${route.hub || route.hubA} --</div>
                ${leg2Html}
                ${route.leg3 ? `<div class="text-center my-2 text-gray-500 text-sm font-medium">-- Transfer at ${route.hubB} --</div>${leg3Html}` : ''}
            </div>
        `;
    }

    function createLegHtml(leg, step) {
        const isTrain = leg.type === 'train';
        const icon = isTrain ? 'train-front' : 'bus';
        const timingHtml = isTrain ? `<p class="text-gray-600 text-sm">Depart: <b>${leg.timings.departureTime}</b> | Arrive: <b>${leg.timings.arrivalTime}</b></p>` : `<p class="text-gray-600 text-sm">Frequency: <b>${leg.timings.frequency_peak}</b></p>`;
        const sourceName = isTrain ? leg.journeyStops[0].name : leg.journeyStops[0];
        const destName = isTrain ? leg.journeyStops.slice(-1)[0].name : leg.journeyStops.slice(-1)[0];
        return `<div class="mb-2"><p class="text-gray-700 font-semibold mb-1"><i data-lucide="${icon}" class="w-4 h-4 inline-block mr-2 ${isTrain ? 'text-blue-600' : 'text-green-600'}"></i><b>Step ${step}:</b> Take ${leg.name}</p><div class="ml-7"><p class="text-gray-600 text-sm">From <b>${sourceName}</b> to <b>${destName}</b></p>${timingHtml}</div></div>`;
    }

    function displayMessage(message, type = "info") {
        const color = type === 'error' ? 'text-red-700 bg-red-100' : 'text-blue-700 bg-blue-100';
        resultsContainer.innerHTML = `<div class="${color} p-4 rounded-lg shadow">${message}</div>`;
        if(resultsPlaceholder) resultsPlaceholder.style.display = 'none';
    }

    // --- 7. START THE APP ---
    loadStations();
});
