import os
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

load_dotenv()

# get url from environment
raw_url = os.getenv("DATABASE_URL")

if not raw_url:
    raise ValueError("DATABASE_URL is not set. Please add it to your .env file.")

# posgress url compatibility
db_url = raw_url.replace("postgres://", "postgresql://", 1)

# Create engine with SSL requirements for Neon
engine = create_engine(
    db_url,
    pool_pre_ping=True,  # Helps handle dropped connections
    connect_args={"sslmode": "require"}
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()