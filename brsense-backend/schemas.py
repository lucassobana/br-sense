from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from enum import Enum


class RoleEnum(str, Enum):
    ADMIN = "ADMIN"
    FAZENDEIRO = "FAZENDEIRO"
    PIVOZEIRO = "PIVOZEIRO"


# USER
class UserBase(BaseModel):
    name: str
    login: str
    role: RoleEnum


class UserCreate(UserBase):
    password: str


class User(UserBase):
    id: int

    class Config:
        orm_mode = True

class LoginSchema(BaseModel):
    login: str
    password: str

class RegisterSchema(BaseModel):
    name: str
    login: str
    password: str


# FAZENDA
class FazendaBase(BaseModel):
    name: str
    user_id: int


class FazendaCreate(FazendaBase):
    pass


class Fazenda(FazendaBase):
    id: int

    class Config:
        orm_mode = True


# SONDA
class SondaBase(BaseModel):
    name: str
    fazenda_id: int
    status: str
    moisture: int
    temp: int
    last_update: datetime


class SondaCreate(SondaBase):
    pass


class Sonda(SondaBase):
    id: int

    class Config:
        orm_mode = True


# PIVO
class PivoBase(BaseModel):
    name: str
    fazenda_id: int
    sector: int
    sonda_id: int


class PivoCreate(PivoBase):
    pass


class Pivo(PivoBase):
    id: int

    class Config:
        orm_mode = True


# PIVOZEIRO
class PivozeiroCreate(BaseModel):
    user_id: int
    fazenda_id: int
