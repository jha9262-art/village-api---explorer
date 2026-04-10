# Indian Geography API

A FastAPI application that provides REST API endpoints for Indian geographical data including countries, states, districts, subdistricts, and villages.

## Features

- RESTful API endpoints for all geographical entities
- Hierarchical data relationships (Country > State > District > Subdistrict > Village)
- Search functionality
- Statistics endpoint
- Automatic API documentation at `/docs`

## Setup

1. **Install Python dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

2. **Database Setup:**
   - Make sure PostgreSQL is running
   - Create database: `village_api`
   - Run your data insertion script (`insert_data.py`) to populate the database

3. **Configure Database:**
   - Update `.env` file with your database credentials

4. **Run the API:**
   ```bash
   uvicorn main:app --reload
   ```

5. **Access the API:**
   - API: http://localhost:8000
   - Documentation: http://localhost:8000/docs
   - Alternative docs: http://localhost:8000/redoc

## API Endpoints

### Countries
- `GET /countries/` - List all countries
- `GET /countries/{id}` - Get country by ID

### States
- `GET /states/` - List all states
- `GET /states/{id}` - Get state with details
- `GET /states/{id}/districts` - Get districts in a state

### Districts
- `GET /districts/` - List all districts
- `GET /districts/{id}` - Get district with details
- `GET /districts/{id}/subdistricts` - Get subdistricts in a district

### Subdistricts
- `GET /subdistricts/` - List all subdistricts
- `GET /subdistricts/{id}` - Get subdistrict with details
- `GET /subdistricts/{id}/villages` - Get villages in a subdistrict

### Villages
- `GET /villages/` - List all villages
- `GET /villages/{id}` - Get village with details

### Search
- `GET /search/villages/?q={query}` - Search villages by name
- `GET /search/states/?q={query}` - Search states by name

### Statistics
- `GET /stats/` - Get count of all entities

## Data Structure

The API serves hierarchical geographical data:
- **Country** (India)
  - **State** (e.g., Bihar, Maharashtra)
    - **District** (e.g., Patna, Mumbai)
      - **Subdistrict** (e.g., Patna Sadar)
        - **Village** (e.g., various villages)

## Development

- Built with FastAPI for high performance
- SQLAlchemy ORM for database operations
- Pydantic for data validation
- PostgreSQL database
- Automatic OpenAPI documentation

## Deployment

The API can be deployed to:
- Vercel (serverless)
- Heroku
- AWS Lambda
- Docker container
- Any ASGI server