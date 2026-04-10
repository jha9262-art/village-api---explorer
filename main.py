from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
import models
import schemas
import database

app = FastAPI(title="Indian Geography API", description="API for Indian geographical data", version="1.0.0")

# Create tables
models.Base.metadata.create_all(bind=database.engine)

@app.get("/")
def read_root():
    return {"message": "Welcome to Indian Geography API"}

# Country endpoints
@app.get("/countries/", response_model=List[schemas.Country])
def get_countries(skip: int = 0, limit: int = 100, db: Session = Depends(database.get_db)):
    countries = db.query(models.Country).offset(skip).limit(limit).all()
    return countries

@app.get("/countries/{country_id}", response_model=schemas.Country)
def get_country(country_id: int, db: Session = Depends(database.get_db)):
    country = db.query(models.Country).filter(models.Country.id == country_id).first()
    if not country:
        raise HTTPException(status_code=404, detail="Country not found")
    return country

# State endpoints
@app.get("/states/", response_model=List[schemas.State])
def get_states(skip: int = 0, limit: int = 100, db: Session = Depends(database.get_db)):
    states = db.query(models.State).offset(skip).limit(limit).all()
    return states

@app.get("/states/{state_id}", response_model=schemas.StateWithDetails)
def get_state(state_id: int, db: Session = Depends(database.get_db)):
    state = db.query(models.State).filter(models.State.id == state_id).first()
    if not state:
        raise HTTPException(status_code=404, detail="State not found")
    return state

@app.get("/states/{state_id}/districts", response_model=List[schemas.District])
def get_state_districts(state_id: int, db: Session = Depends(database.get_db)):
    districts = db.query(models.District).filter(models.District.state_id == state_id).all()
    return districts

# District endpoints
@app.get("/districts/", response_model=List[schemas.District])
def get_districts(skip: int = 0, limit: int = 100, db: Session = Depends(database.get_db)):
    districts = db.query(models.District).offset(skip).limit(limit).all()
    return districts

@app.get("/districts/{district_id}", response_model=schemas.DistrictWithDetails)
def get_district(district_id: int, db: Session = Depends(database.get_db)):
    district = db.query(models.District).filter(models.District.id == district_id).first()
    if not district:
        raise HTTPException(status_code=404, detail="District not found")
    return district

@app.get("/districts/{district_id}/subdistricts", response_model=List[schemas.Subdistrict])
def get_district_subdistricts(district_id: int, db: Session = Depends(database.get_db)):
    subdistricts = db.query(models.Subdistrict).filter(models.Subdistrict.district_id == district_id).all()
    return subdistricts

# Subdistrict endpoints
@app.get("/subdistricts/", response_model=List[schemas.Subdistrict])
def get_subdistricts(skip: int = 0, limit: int = 100, db: Session = Depends(database.get_db)):
    subdistricts = db.query(models.Subdistrict).offset(skip).limit(limit).all()
    return subdistricts

@app.get("/subdistricts/{subdistrict_id}", response_model=schemas.SubdistrictWithDetails)
def get_subdistrict(subdistrict_id: int, db: Session = Depends(database.get_db)):
    subdistrict = db.query(models.Subdistrict).filter(models.Subdistrict.id == subdistrict_id).first()
    if not subdistrict:
        raise HTTPException(status_code=404, detail="Subdistrict not found")
    return subdistrict

@app.get("/subdistricts/{subdistrict_id}/villages", response_model=List[schemas.Village])
def get_subdistrict_villages(subdistrict_id: int, db: Session = Depends(database.get_db)):
    villages = db.query(models.Village).filter(models.Village.subdistrict_id == subdistrict_id).all()
    return villages

# Village endpoints
@app.get("/villages/", response_model=List[schemas.Village])
def get_villages(skip: int = 0, limit: int = 100, db: Session = Depends(database.get_db)):
    villages = db.query(models.Village).offset(skip).limit(limit).all()
    return villages

@app.get("/villages/{village_id}", response_model=schemas.VillageWithDetails)
def get_village(village_id: int, db: Session = Depends(database.get_db)):
    village = db.query(models.Village).filter(models.Village.id == village_id).first()
    if not village:
        raise HTTPException(status_code=404, detail="Village not found")
    return village

# Search endpoints
@app.get("/search/villages/", response_model=List[schemas.Village])
def search_villages(q: str, db: Session = Depends(database.get_db)):
    villages = db.query(models.Village).filter(models.Village.village_name.ilike(f"%{q}%")).limit(50).all()
    return villages

@app.get("/search/states/", response_model=List[schemas.State])
def search_states(q: str, db: Session = Depends(database.get_db)):
    states = db.query(models.State).filter(models.State.state_name.ilike(f"%{q}%")).all()
    return states

# Statistics endpoint
@app.get("/stats/")
def get_statistics(db: Session = Depends(database.get_db)):
    country_count = db.query(models.Country).count()
    state_count = db.query(models.State).count()
    district_count = db.query(models.District).count()
    subdistrict_count = db.query(models.Subdistrict).count()
    village_count = db.query(models.Village).count()
    
    return {
        "countries": country_count,
        "states": state_count,
        "districts": district_count,
        "subdistricts": subdistrict_count,
        "villages": village_count
    }