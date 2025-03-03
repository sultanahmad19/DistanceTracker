class Achievement {
    constructor(id, name, description, threshold) {
        this.id = id;
        this.name = name;
        this.description = description;
        this.threshold = threshold;
        this.unlocked = false;
    }
}

class AchievementManager {
    constructor() {
        this.achievements = [
            new Achievement('first_steps', 'First Steps', 'Walk your first 100 meters', 100),
            new Achievement('kilometer_club', 'Kilometer Club', 'Complete your first kilometer', 1000),
            new Achievement('going_places', 'Going Places', 'Travel 5 kilometers', 5000),
            new Achievement('marathon_spirit', 'Marathon Spirit', 'Cover a distance of 10 kilometers', 10000)
        ];
        this.loadUnlockedAchievements();
    }

    loadUnlockedAchievements() {
        const saved = localStorage.getItem('unlockedAchievements');
        if (saved) {
            const unlockedIds = JSON.parse(saved);
            this.achievements.forEach(achievement => {
                achievement.unlocked = unlockedIds.includes(achievement.id);
            });
        }
    }

    saveUnlockedAchievements() {
        const unlockedIds = this.achievements
            .filter(a => a.unlocked)
            .map(a => a.id);
        localStorage.setItem('unlockedAchievements', JSON.stringify(unlockedIds));
    }

    checkAchievements(distance) {
        const newAchievements = this.achievements.filter(achievement => 
            !achievement.unlocked && distance >= achievement.threshold
        );

        if (newAchievements.length > 0) {
            newAchievements.forEach(achievement => {
                achievement.unlocked = true;
                this.showAchievementAlert(achievement);
            });
            this.saveUnlockedAchievements();
        }
    }

    showAchievementAlert(achievement) {
        const alertDiv = document.createElement('div');
        alertDiv.className = 'achievement-alert';
        alertDiv.innerHTML = `
            <i class="fas fa-trophy"></i>
            <div class="achievement-content">
                <h4>${achievement.name}</h4>
                <p>${achievement.description}</p>
            </div>
        `;
        document.body.appendChild(alertDiv);

        setTimeout(() => alertDiv.classList.add('show'), 100);

        setTimeout(() => {
            alertDiv.classList.remove('show');
            setTimeout(() => alertDiv.remove(), 500);
        }, 3000);
    }
}

class DistanceTracker {
    constructor() {
        this.isTracking = false;
        this.watchId = null;
        this.lastPosition = null;
        this.totalDistance = 0;
        this.trackButton = document.getElementById('trackButton');
        this.statusIndicator = document.getElementById('statusIndicator');
        this.statusText = document.getElementById('statusText');
        this.lastSessionData = document.getElementById('lastSessionData');
        this.achievementManager = new AchievementManager();

        // Constants
        this.STEP_LENGTH = 0.7; // Average step length in meters

        this.initializeElements();
        this.loadLastSession();
        this.setupEventListeners();
    }

    initializeElements() {
        this.displays = {
            kilometers: document.getElementById('kilometers'),
            meters: document.getElementById('meters'),
            steps: document.getElementById('steps')
        };
    }

    setupEventListeners() {
        this.trackButton.addEventListener('click', () => this.toggleTracking());
    }

    toggleTracking() {
        if (!this.isTracking) {
            this.startTracking();
        } else {
            this.stopTracking();
        }
    }

    startTracking() {
        if (!navigator.geolocation) {
            this.updateStatus('Geolocation is not supported by your browser', false);
            return;
        }

        this.isTracking = true;
        this.totalDistance = 0;
        this.updateDisplays();
        this.trackButton.innerHTML = '<i class="fas fa-stop"></i> Stop Tracking';
        this.trackButton.classList.add('tracking');
        this.statusIndicator.classList.add('active');
        this.updateStatus('Tracking active...', true);

        this.watchId = navigator.geolocation.watchPosition(
            position => this.handlePosition(position),
            error => this.handleError(error),
            {
                enableHighAccuracy: true,
                timeout: 5000,
                maximumAge: 0
            }
        );
    }

    stopTracking() {
        if (this.watchId !== null) {
            navigator.geolocation.clearWatch(this.watchId);
            this.watchId = null;
        }

        this.isTracking = false;
        this.lastPosition = null;
        this.trackButton.innerHTML = '<i class="fas fa-play"></i> Start Tracking';
        this.trackButton.classList.remove('tracking');
        this.statusIndicator.classList.remove('active');
        this.updateStatus('Tracking stopped', false);

        this.saveSession();
    }

    handlePosition(position) {
        if (this.lastPosition === null) {
            this.lastPosition = position;
            return;
        }

        const distance = this.calculateDistance(
            this.lastPosition.coords.latitude,
            this.lastPosition.coords.longitude,
            position.coords.latitude,
            position.coords.longitude
        );

        this.totalDistance += distance;
        this.lastPosition = position;
        this.updateDisplays();
    }

    calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371e3; // Earth's radius in meters
        const φ1 = lat1 * Math.PI/180;
        const φ2 = lat2 * Math.PI/180;
        const Δφ = (lat2-lat1) * Math.PI/180;
        const Δλ = (lon2-lon1) * Math.PI/180;

        const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
                Math.cos(φ1) * Math.cos(φ2) *
                Math.sin(Δλ/2) * Math.sin(Δλ/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

        return R * c; // Distance in meters
    }

    updateDisplays() {
        const kilometers = this.totalDistance / 1000;
        const meters = this.totalDistance;
        const steps = Math.round(meters / this.STEP_LENGTH);

        this.displays.kilometers.textContent = kilometers.toFixed(2);
        this.displays.meters.textContent = meters.toFixed(2);
        this.displays.steps.textContent = steps;

        // Check for achievements
        this.achievementManager.checkAchievements(meters);
    }

    handleError(error) {
        let message = 'An unknown error occurred';
        switch(error.code) {
            case error.PERMISSION_DENIED:
                message = 'Please enable location permissions';
                break;
            case error.POSITION_UNAVAILABLE:
                message = 'Location information is unavailable';
                break;
            case error.TIMEOUT:
                message = 'Location request timed out';
                break;
        }
        this.updateStatus(message, false);
        this.stopTracking();
    }

    updateStatus(message, isTracking) {
        this.statusText.textContent = message;
    }

    saveSession() {
        const session = {
            distance: this.totalDistance,
            timestamp: new Date().toISOString()
        };
        localStorage.setItem('lastSession', JSON.stringify(session));
        this.loadLastSession();
    }

    loadLastSession() {
        const lastSession = localStorage.getItem('lastSession');
        if (lastSession) {
            const session = JSON.parse(lastSession);
            const date = new Date(session.timestamp);
            const formattedDate = date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
            this.lastSessionData.textContent = 
                `Distance: ${(session.distance / 1000).toFixed(2)} km on ${formattedDate}`;
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new DistanceTracker();
});