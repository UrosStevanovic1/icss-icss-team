import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from dotenv import load_dotenv

load_dotenv()


raw_url = os.getenv("DATABASE_URL")


if not raw_url:

    print("WARNING: DATABASE_URL not set. App will crash if DB is accessed.")
    db_url = "sqlite:///./build_dummy.db"
else:

    db_url = raw_url.replace("postgres://", "postgresql://", 1)


engine = create_engine(
    db_url,
    pool_pre_ping=True,
    connect_args={"sslmode": "require"} if "postgresql" in db_url else {}
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()