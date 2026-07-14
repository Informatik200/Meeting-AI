from datetime import datetime, timezone

from sqlalchemy import create_engine, Column, Integer, String, Text, DateTime
from sqlalchemy.orm import sessionmaker, declarative_base

from app.config import settings

sqlite_args = {"check_same_thread": False} if settings.database_url.startswith("sqlite") else {}
engine = create_engine(settings.database_url, connect_args=sqlite_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class Meeting(Base):
    __tablename__ = "meetings"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, default="Untitled Meeting")
    audio_path = Column(String, nullable=False)
    transcript = Column(Text, nullable=True)
    summary = Column(Text, nullable=True)
    key_points = Column(Text, nullable=True)   # stored as JSON string
    decisions = Column(Text, nullable=True)    # stored as JSON string
    action_items = Column(Text, nullable=True)  # stored as JSON string
    status = Column(String, default="uploaded")  # uploaded -> transcribing -> summarizing -> done -> failed
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


def init_db():
    Base.metadata.create_all(bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
