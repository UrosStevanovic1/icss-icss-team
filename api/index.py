# api/index.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import datetime

from .database import engine
from . import models

# Importamos routers
from .routers.dev import router as dev_router
from .routers.auth_routes import router as auth_router
from .routers.programs import router as programs_router
from .routers.lecturers import router as lecturers_router
from .routers.modules import router as modules_router
from .routers.specializations import router as specializations_router
from .routers.groups import router as groups_router
from .routers.rooms import router as rooms_router
from .routers.constraints import router as constraints_router
from .routers.availabilities import router as availabilities_router

# Crear tablas
try:
    models.Base.metadata.create_all(bind=engine)
    print("✅ DB connected.")
except Exception as e:
    print("❌ DB Startup Error:", e)

app = FastAPI(title="Study Program Backend", root_path="/api")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {"message": "Backend Online"}

# ✅ RUTA NUEVA DE DIAGNÓSTICO
@app.get("/version")
def check_version():
    # Si ves este mensaje en el navegador, el deploy FUNCIONÓ.
    return {
        "status": "NUEVA VERSION DESPLEGADA",
        "timestamp": str(datetime.datetime.now()),
        "instruction": "Si lees esto, el código se actualizó correctamente."
    }

# Include routers
app.include_router(dev_router)
app.include_router(auth_router)
app.include_router(programs_router)
app.include_router(lecturers_router)
app.include_router(modules_router)
app.include_router(specializations_router)
app.include_router(groups_router)
app.include_router(rooms_router)
app.include_router(constraints_router)
app.include_router(availabilities_router)