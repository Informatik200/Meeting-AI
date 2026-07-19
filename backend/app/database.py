from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint, create_engine
from sqlalchemy.orm import declarative_base, relationship, sessionmaker

from app.config import settings

db_url = settings.database_url
if db_url.startswith("postgres://"):
    db_url = db_url.replace("postgres://", "postgresql://", 1)

sqlite_args = {"check_same_thread": False} if db_url.startswith("sqlite") else {}
engine = create_engine(db_url, connect_args=sqlite_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    # Nullable: a user who signs up via Google only never sets a password.
    hashed_password = Column(String, nullable=True)
    google_id = Column(String, unique=True, index=True, nullable=True)
    name = Column(String, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    meetings = relationship("Meeting", back_populates="owner", cascade="all, delete-orphan")


class RefreshToken(Base):
    __tablename__ = "refresh_tokens"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    # Only the hash is stored, same principle as passwords - a stolen DB
    # backup shouldn't hand out usable refresh tokens.
    token_hash = Column(String, unique=True, index=True, nullable=False)
    expires_at = Column(DateTime, nullable=False)
    revoked_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    user = relationship("User")


class Meeting(Base):
    __tablename__ = "meetings"

    id = Column(Integer, primary_key=True, index=True)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
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

    owner = relationship("User", back_populates="meetings")
    entities = relationship("MeetingEntity", back_populates="meeting", cascade="all, delete-orphan")


class Entity(Base):
    __tablename__ = "entities"
    __table_args__ = (UniqueConstraint("name", "category", "owner_id", name="uq_entity_name_category_owner"),)

    id = Column(Integer, primary_key=True, index=True)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    name = Column(String, index=True, nullable=False)
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
    meeting_columns = [col["name"] for col in inspector.get_columns("meetings")]
    entity_columns = [col["name"] for col in inspector.get_columns("entities")]

    with engine.begin() as conn:
        if "recording_type" not in meeting_columns:
            conn.execute(text("ALTER TABLE meetings ADD COLUMN recording_type VARCHAR DEFAULT 'Unknown'"))
        if "confidence" not in meeting_columns:
            conn.execute(text("ALTER TABLE meetings ADD COLUMN confidence INTEGER DEFAULT 100"))
        if "owner_id" not in meeting_columns:
            conn.execute(text("ALTER TABLE meetings ADD COLUMN owner_id INTEGER"))
        if "owner_id" not in entity_columns:
            conn.execute(text("ALTER TABLE entities ADD COLUMN owner_id INTEGER"))


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
