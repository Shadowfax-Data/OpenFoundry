from datetime import datetime

from sqlalchemy import DateTime, create_engine
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, sessionmaker
from sqlalchemy.sql import func

from openfoundry.config import DATABASE_URL


def get_engine(**kwargs):
    connect_args = {
        "keepalives": 1,
        "keepalives_idle": 5,
        "keepalives_interval": 5,
        "keepalives_count": 5,
        "connect_timeout": 5,
    }
    return create_engine(
        DATABASE_URL, pool_pre_ping=True, connect_args=connect_args, **kwargs
    )


def keyvalgen(obj):
    """Generate attr name/val pairs, filtering out SQLA attrs."""
    excl = ("_sa_adapter", "_sa_instance_state")
    for k, v in vars(obj).items():
        if not k.startswith("_") and not any(hasattr(v, a) for a in excl):
            yield k, v


engine = get_engine()
session_local = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    __abstract__ = True

    created_on: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=func.now()
    )
    updated_on: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=func.now(), onupdate=func.now()
    )

    def __repr__(self):
        params = ", ".join(f"{k}={v}" for k, v in keyvalgen(self))
        return f"{self.__class__.__name__}({params})"
