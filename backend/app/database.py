from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text, create_engine
from sqlalchemy.orm import declarative_base, relationship, sessionmaker

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
    key_points = Column(Text, nullable=True)  # stored as JSON string
    decisions = Column(Text, nullable=True)  # stored as JSON string
    action_items = Column(Text, nullable=True)  # stored as JSON string
    status = Column(String, default="uploaded")  # uploaded -> transcribing -> summarizing -> done -> failed
    recording_type = Column(String, default="Unknown")
    confidence = Column(Integer, default=100)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    entities = relationship("MeetingEntity", back_populates="meeting", cascade="all, delete-orphan")


class Entity(Base):
    __tablename__ = "entities"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True, nullable=False)
    category = Column(String, nullable=False)  # people, projects, organizations, technologies, topics

    meetings = relationship("MeetingEntity", back_populates="entity", cascade="all, delete-orphan")


class MeetingEntity(Base):
    __tablename__ = "meeting_entities"

    meeting_id = Column(Integer, ForeignKey("meetings.id"), primary_key=True)
    entity_id = Column(Integer, ForeignKey("entities.id"), primary_key=True)
    context = Column(Text, nullable=True)

    meeting = relationship("Meeting", back_populates="entities")
    entity = relationship("Entity", back_populates="meetings")


def init_db():
    Base.metadata.create_all(bind=engine)

    from sqlalchemy import inspect, text

    inspector = inspect(engine)
    columns = [col["name"] for col in inspector.get_columns("meetings")]

    with engine.begin() as conn:
        if "recording_type" not in columns:
            conn.execute(text("ALTER TABLE meetings ADD COLUMN recording_type VARCHAR DEFAULT 'Unknown'"))
        if "confidence" not in columns:
            conn.execute(text("ALTER TABLE meetings ADD COLUMN confidence INTEGER DEFAULT 100"))


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
