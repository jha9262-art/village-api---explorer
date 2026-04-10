from sqlalchemy import Column, Integer, String, ForeignKey, create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship, sessionmaker

Base = declarative_base()

class Country(Base):
    __tablename__ = "country"
    
    id = Column(Integer, primary_key=True, index=True)
    country_name = Column(String, nullable=False)
    
    states = relationship("State", back_populates="country")

class State(Base):
    __tablename__ = "state"
    
    id = Column(Integer, primary_key=True, index=True)
    state_name = Column(String, nullable=False)
    country_id = Column(Integer, ForeignKey("country.id"))
    
    country = relationship("Country", back_populates="states")
    districts = relationship("District", back_populates="state")

class District(Base):
    __tablename__ = "district"
    
    id = Column(Integer, primary_key=True, index=True)
    district_name = Column(String, nullable=False)
    state_id = Column(Integer, ForeignKey("state.id"))
    
    state = relationship("State", back_populates="districts")
    subdistricts = relationship("Subdistrict", back_populates="district")

class Subdistrict(Base):
    __tablename__ = "subdistrict"
    
    id = Column(Integer, primary_key=True, index=True)
    subdistrict_name = Column(String, nullable=False)
    district_id = Column(Integer, ForeignKey("district.id"))
    
    district = relationship("District", back_populates="subdistricts")
    villages = relationship("Village", back_populates="subdistrict")

class Village(Base):
    __tablename__ = "village"
    
    id = Column(Integer, primary_key=True, index=True)
    village_name = Column(String, nullable=False)
    subdistrict_id = Column(Integer, ForeignKey("subdistrict.id"))
    
    subdistrict = relationship("Subdistrict", back_populates="villages")