"""Departments router."""

from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.postgres import get_session
from app.db.models import Department, User
from app.models.schemas import DepartmentOut

router = APIRouter(prefix="/departments", tags=["departments"])


@router.get("", response_model=list[DepartmentOut])
async def list_departments(session: AsyncSession = Depends(get_session)):
    result = await session.execute(
        select(Department.id, Department.name, Department.description, func.count(User.id).label("member_count"))
        .outerjoin(User, User.department_id == Department.id)
        .group_by(Department.id, Department.name, Department.description)
        .order_by(Department.name)
    )
    rows = result.all()
    return [DepartmentOut(id=r.id, name=r.name, description=r.description, member_count=r.member_count) for r in rows]
