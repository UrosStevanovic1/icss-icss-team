from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from ..database import get_db
from .. import models

router = APIRouter(prefix="/analytics", tags=["analytics"])

@router.get("/summary")
def get_analytics_summary(semester_id: int, db: Session = Depends(get_db)):
    # 1. Total Modules in this semester
    total_modules = db.query(models.Module).filter(models.Module.semester == semester_id).count()
    
    # 2. Scheduled vs Unscheduled (Insights)
    scheduled_count = db.query(models.ScheduleEntry).filter(models.ScheduleEntry.semester == str(semester_id)).count()
    
    # 3. Regulatory Check: Missing Lecturers
    # Modules that exist for this semester but aren't in OfferedModules yet
    offered_module_ids = db.query(models.OfferedModule.module_code).all()
    missing_lecturers = db.query(models.Module).filter(
        models.Module.semester == semester_id,
        ~models.Module.module_code.in_([m[0] for m in offered_module_ids])
    ).count()

    # 4. Lecturer Types (Pie Chart Data)
    emp_stats = db.query(
        models.Lecturer.employment_type, func.count(models.Lecturer.id)
    ).group_by(models.Lecturer.employment_type).all()

    return {
        "kpis": {
            "missing_units": missing_lecturers,
            "pending_requests": 5, # Placeholder for your logic
            "planning_progress": int((scheduled_count / total_modules * 100)) if total_modules > 0 else 0,
            "total_modules": total_modules
        },
        "lecturer_stats": [{"name": s[0], "value": s[1]} for s in emp_stats]
    }