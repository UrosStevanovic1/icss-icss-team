from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from ..database import get_db
from .. import models

router = APIRouter(prefix="/analytics", tags=["analytics"])

@router.get("/metrics")
def get_analytics_metrics(semester_id: int, db: Session = Depends(get_db)):

    # 1️⃣ Total Modules in Semester
    total_modules = db.query(models.Module)\
        .filter(models.Module.semester == semester_id)\
        .count()

    # 2️⃣ Scheduled Modules (JOIN properly)
    scheduled_modules = db.query(models.Module.module_code)\
        .join(models.OfferedModule, models.Module.module_code == models.OfferedModule.module_code)\
        .join(models.ScheduleEntry, models.OfferedModule.id == models.ScheduleEntry.offered_module_id)\
        .filter(models.Module.semester == semester_id)\
        .distinct()\
        .count()

    # 3️⃣ Planning Progress
    planning_progress = int((scheduled_modules / total_modules) * 100) if total_modules > 0 else 0

    # 4️⃣ Missing Units (Modules without OfferedModule)
    missing_units = db.query(models.Module)\
        .outerjoin(models.OfferedModule, models.Module.module_code == models.OfferedModule.module_code)\
        .filter(
            models.Module.semester == semester_id,
            models.OfferedModule.id == None
        )\
        .count()

    # 5️⃣ Staff Composition
    lecturer_stats = db.query(
        models.Lecturer.employment_type,
        func.count(models.Lecturer.id)
    ).group_by(models.Lecturer.employment_type).all()

    staff_data = [
        {"name": stat[0], "value": stat[1]}
        for stat in lecturer_stats
    ]

    # 6️⃣ Bar Chart Data
    modules = db.query(models.Module)\
        .filter(models.Module.semester == semester_id)\
        .all()

    bar_data = []

    for module in modules:
        scheduled_count = db.query(models.ScheduleEntry)\
            .join(models.OfferedModule, models.ScheduleEntry.offered_module_id == models.OfferedModule.id)\
            .filter(models.OfferedModule.module_code == module.module_code)\
            .count()

        bar_data.append({
            "name": module.name,
            "needed": 1,  # since you don’t have required_hours
            "scheduled": scheduled_count
        })

    return {
        "kpis": {
            "missing_units": missing_units,
            "pending_requests": 0,  # you don’t have request table
            "planning_progress": planning_progress,
            "total_modules": total_modules
        },
        "lecturer_stats": staff_data,
        "bar_data": bar_data
    }