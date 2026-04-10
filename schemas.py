from pydantic import BaseModel
from typing import Optional

class CountryBase(BaseModel):
    country_name: str

class CountryCreate(CountryBase):
    pass

class Country(CountryBase):
    id: int
    
    class Config:
        from_attributes = True

class StateBase(BaseModel):
    state_name: str
    country_id: int

class StateCreate(StateBase):
    pass

class State(StateBase):
    id: int
    
    class Config:
        from_attributes = True

class DistrictBase(BaseModel):
    district_name: str
    state_id: int

class DistrictCreate(DistrictBase):
    pass

class District(DistrictBase):
    id: int
    
    class Config:
        from_attributes = True

class SubdistrictBase(BaseModel):
    subdistrict_name: str
    district_id: int

class SubdistrictCreate(SubdistrictBase):
    pass

class Subdistrict(SubdistrictBase):
    id: int
    
    class Config:
        from_attributes = True

class VillageBase(BaseModel):
    village_name: str
    subdistrict_id: int

class VillageCreate(VillageBase):
    pass

class Village(VillageBase):
    id: int
    
    class Config:
        from_attributes = True

# Response models with relationships
class VillageWithDetails(Village):
    subdistrict: Optional[Subdistrict] = None
    
    class Config:
        from_attributes = True

class SubdistrictWithDetails(Subdistrict):
    district: Optional[District] = None
    villages: list[Village] = []
    
    class Config:
        from_attributes = True

class DistrictWithDetails(District):
    state: Optional[State] = None
    subdistricts: list[Subdistrict] = []
    
    class Config:
        from_attributes = True

class StateWithDetails(State):
    country: Optional[Country] = None
    districts: list[District] = []
    
    class Config:
        from_attributes = True