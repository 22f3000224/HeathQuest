"""
HealthQuest Backend Entry Point
Imports and runs the main FastAPI application from core
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from core.main import app

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)