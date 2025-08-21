from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Dict, Optional
import random
import math
import time
from datetime import datetime
import uvicorn
import asyncio
from threading import Thread
import json

app = FastAPI(title="AuraCare Vital Signs Service", version="1.0.0")

# Pydantic models
class VitalSigns(BaseModel):
    heartRate: float
    bloodPressure: Dict[str, float]
    oxygenSaturation: float
    temperature: float
    respiratoryRate: float
    timestamp: str
    roomNumber: str
    status: str

class VitalSignsUpdate(BaseModel):
    heartRate: Optional[float] = None
    bloodPressure: Optional[Dict[str, float]] = None
    oxygenSaturation: Optional[float] = None
    temperature: Optional[float] = None
    respiratoryRate: Optional[float] = None

# Global storage for live vital signs data
live_vital_signs = {}
room_patterns = {}

# Realistic vital signs ranges for different patient conditions
patient_conditions = {
    "normal": {
        "heartRate": {"min": 60, "max": 100, "base": 75},
        "bloodPressure": {"systolic": {"min": 90, "max": 140, "base": 120}, "diastolic": {"min": 60, "max": 90, "base": 80}},
        "oxygenSaturation": {"min": 95, "max": 100, "base": 98},
        "temperature": {"min": 97.0, "max": 99.5, "base": 98.6},
        "respiratoryRate": {"min": 12, "max": 20, "base": 16}
    },
    "critical": {
        "heartRate": {"min": 40, "max": 150, "base": 110},
        "bloodPressure": {"systolic": {"min": 70, "max": 200, "base": 160}, "diastolic": {"min": 40, "max": 120, "base": 100}},
        "oxygenSaturation": {"min": 85, "max": 95, "base": 92},
        "temperature": {"min": 95.0, "max": 104.0, "base": 101.5},
        "respiratoryRate": {"min": 8, "max": 35, "base": 25}
    },
    "recovering": {
        "heartRate": {"min": 65, "max": 110, "base": 85},
        "bloodPressure": {"systolic": {"min": 100, "max": 160, "base": 135}, "diastolic": {"min": 65, "max": 95, "base": 85}},
        "oxygenSaturation": {"min": 92, "max": 99, "base": 96},
        "temperature": {"min": 97.5, "max": 100.5, "base": 99.2},
        "respiratoryRate": {"min": 14, "max": 24, "base": 18}
    }
}

def initialize_room_pattern(room_number: str):
    """Initialize a room with a random patient condition and pattern"""
    if room_number not in room_patterns:
        # Randomly assign a patient condition
        condition = random.choice(list(patient_conditions.keys()))
        
        # Create unique pattern for this room
        room_patterns[room_number] = {
            "condition": condition,
            "base_values": patient_conditions[condition],
            "phase_offset": random.uniform(0, 2 * math.pi),  # Random phase
            "noise_factor": random.uniform(0.05, 0.15),      # Random noise level
            "trend_factor": random.uniform(-0.1, 0.1),       # Slight trend over time
            "last_update": time.time()
        }

def generate_live_vital_signs(room_number: str) -> VitalSigns:
    """Generate continuously changing vital signs based on time and patterns"""
    current_time = time.time()
    
    # Initialize room pattern if not exists
    initialize_room_pattern(room_number)
    pattern = room_patterns[room_number]
    
    # Calculate time-based variations
    time_factor = current_time * 0.1  # Slow time progression
    sine_wave = math.sin(time_factor + pattern["phase_offset"])
    cosine_wave = math.cos(time_factor * 0.5 + pattern["phase_offset"])
    
    # Add trend over time
    trend = pattern["trend_factor"] * (current_time - pattern["last_update"]) / 3600  # Per hour
    
    def generate_vital_sign(base_config, wave_factor=1.0):
        base = base_config["base"]
        min_val = base_config["min"]
        max_val = base_config["max"]
        
        # Combine multiple wave patterns for realistic variation
        variation = (sine_wave * 0.6 + cosine_wave * 0.4) * wave_factor
        noise = random.uniform(-pattern["noise_factor"], pattern["noise_factor"])
        
        # Calculate final value with trend
        value = base + (variation * (max_val - min_val) * 0.1) + noise + trend
        
        # Clamp to realistic ranges
        return max(min_val, min(max_val, value))
    
    # Generate each vital sign with different wave patterns
    heart_rate = generate_vital_sign(pattern["base_values"]["heartRate"], 1.2)
    systolic = generate_vital_sign(pattern["base_values"]["bloodPressure"]["systolic"], 0.8)
    diastolic = generate_vital_sign(pattern["base_values"]["bloodPressure"]["diastolic"], 0.8)
    oxygen = generate_vital_sign(pattern["base_values"]["oxygenSaturation"], 0.5)
    temperature = generate_vital_sign(pattern["base_values"]["temperature"], 0.3)
    respiratory_rate = generate_vital_sign(pattern["base_values"]["respiratoryRate"], 1.0)
    
    # Determine status based on values
    status = "normal"
    if (heart_rate > 100 or heart_rate < 60 or 
        systolic > 140 or diastolic > 90 or 
        oxygen < 95 or temperature > 100.4 or respiratory_rate > 20):
        status = "warning"
    if (heart_rate > 120 or heart_rate < 50 or 
        systolic > 160 or diastolic > 100 or 
        oxygen < 90 or temperature > 102 or respiratory_rate > 25):
        status = "critical"
    
    # Update last update time
    pattern["last_update"] = current_time
    
    return VitalSigns(
        heartRate=round(heart_rate, 1),
        bloodPressure={"systolic": round(systolic, 1), "diastolic": round(diastolic, 1)},
        oxygenSaturation=round(oxygen, 1),
        temperature=round(temperature, 1),
        respiratoryRate=round(respiratory_rate, 1),
        timestamp=datetime.now().isoformat(),
        roomNumber=room_number,
        status=status
    )

def update_live_vital_signs():
    """Background thread to continuously update vital signs"""
    while True:
        try:
            # Update all active rooms
            for room_number in list(live_vital_signs.keys()):
                live_vital_signs[room_number] = generate_live_vital_signs(room_number)
            
            # Sleep for 2 seconds (simulating real-time monitoring)
            time.sleep(2)
        except Exception as e:
            print(f"Error updating vital signs: {e}")
            time.sleep(5)

@app.get("/")
async def root():
    return {"message": "AuraCare Vital Signs Service", "version": "1.0.0"}

@app.get("/vitals/{room_number}", response_model=VitalSigns)
async def get_vital_signs(room_number: str):
    """Get live vital signs for a specific room"""
    try:
        # Add room to active monitoring if not already
        if room_number not in live_vital_signs:
            live_vital_signs[room_number] = generate_live_vital_signs(room_number)
        
        # Return current live vital signs
        return live_vital_signs[room_number]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating vital signs: {str(e)}")

@app.put("/vitals/{room_number}", response_model=VitalSigns)
async def update_vital_signs(room_number: str, update_data: VitalSignsUpdate):
    """Update vital signs for a specific room"""
    try:
        # Get current live vital signs
        current_vitals = generate_live_vital_signs(room_number)
        
        # Update with provided data
        update_dict = update_data.dict(exclude_unset=True)
        for key, value in update_dict.items():
            if hasattr(current_vitals, key):
                setattr(current_vitals, key, value)
        
        # Update timestamp
        current_vitals.timestamp = datetime.now().isoformat()
        
        # Recalculate status based on updated values
        heart_rate = current_vitals.heartRate
        systolic = current_vitals.bloodPressure["systolic"]
        diastolic = current_vitals.bloodPressure["diastolic"]
        oxygen = current_vitals.oxygenSaturation
        temp = current_vitals.temperature
        resp_rate = current_vitals.respiratoryRate
        
        status = "normal"
        if (heart_rate > 100 or heart_rate < 60 or 
            systolic > 140 or diastolic > 90 or 
            oxygen < 95 or temp > 100.4 or resp_rate > 20):
            status = "warning"
        if (heart_rate > 120 or heart_rate < 50 or 
            systolic > 160 or diastolic > 100 or 
            oxygen < 90 or temp > 102 or resp_rate > 25):
            status = "critical"
        
        current_vitals.status = status
        
        # Store updated vital signs in live data
        live_vital_signs[room_number] = current_vitals
        
        return current_vitals
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating vital signs: {str(e)}")

@app.get("/vitals")
async def get_all_vital_signs():
    """Get vital signs for all active rooms"""
    try:
        all_vitals = {}
        for room_number in live_vital_signs.keys():
            all_vitals[room_number] = live_vital_signs[room_number].dict()
        return all_vitals
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating vital signs: {str(e)}")

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "service": "AuraCare Vital Signs Service",
        "active_rooms": len(live_vital_signs),
        "total_patterns": len(room_patterns)
    }

@app.get("/rooms")
async def get_active_rooms():
    """Get list of all active rooms being monitored"""
    return {
        "active_rooms": list(live_vital_signs.keys()),
        "room_patterns": {room: pattern["condition"] for room, pattern in room_patterns.items()},
        "total_rooms": len(live_vital_signs)
    }

@app.post("/rooms/{room_number}/activate")
async def activate_room(room_number: str):
    """Activate monitoring for a specific room"""
    try:
        if room_number not in live_vital_signs:
            live_vital_signs[room_number] = generate_live_vital_signs(room_number)
            return {"message": f"Room {room_number} activated for monitoring", "room": room_number}
        else:
            return {"message": f"Room {room_number} is already being monitored", "room": room_number}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error activating room: {str(e)}")

@app.delete("/rooms/{room_number}/deactivate")
async def deactivate_room(room_number: str):
    """Deactivate monitoring for a specific room"""
    try:
        if room_number in live_vital_signs:
            del live_vital_signs[room_number]
            if room_number in room_patterns:
                del room_patterns[room_number]
            return {"message": f"Room {room_number} deactivated", "room": room_number}
        else:
            return {"message": f"Room {room_number} was not being monitored", "room": room_number}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deactivating room: {str(e)}")

if __name__ == "__main__":
    # Start background thread for live vital signs updates
    update_thread = Thread(target=update_live_vital_signs, daemon=True)
    update_thread.start()
    
    print("🚀 Starting AuraCare Vital Signs Service...")
    print("📊 Live vital signs will be updated every 2 seconds")
    print("🏥 Service will automatically generate data for any room number")
    print("🌐 API available at: http://localhost:8001")
    print("📖 API docs at: http://localhost:8001/docs")
    
    uvicorn.run(app, host="0.0.0.0", port=8001)
