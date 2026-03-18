"""Roles: admin CRUD for roles and role assignment."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.postgres import get_session
from app.db.models import Role, User
from app.models.schemas import RoleCreate, RoleOut
from app.api.deps import get_current_user

router = APIRouter(prefix="/admin/roles", tags=["roles"])


def _require_admin(user: User) -> None:
    if not user.is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")


@router.get("/", response_model=list[RoleOut])
async def list_roles(
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    _require_admin(current_user)
    result = await session.execute(select(Role))
    return result.scalars().all()


@router.post("/", response_model=RoleOut, status_code=status.HTTP_201_CREATED)
async def create_role(
    body: RoleCreate,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    _require_admin(current_user)

    existing = await session.execute(
        select(Role).where(Role.name == body.name)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Role already exists")

    role = Role(name=body.name, permissions_json=body.permissions_json)
    session.add(role)
    await session.commit()
    await session.refresh(role)
    return role


@router.put("/{role_id}", response_model=RoleOut)
async def update_role(
    role_id: int,
    body: RoleCreate,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    _require_admin(current_user)
    role = await session.get(Role, role_id)
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")
    role.name = body.name
    role.permissions_json = body.permissions_json
    await session.commit()
    await session.refresh(role)
    return role


@router.delete("/{role_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_role(
    role_id: int,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    _require_admin(current_user)
    role = await session.get(Role, role_id)
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")
    await session.delete(role)
    await session.commit()


@router.post("/assign/{user_id}/{role_id}")
async def assign_role(
    user_id: int,
    role_id: int,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    _require_admin(current_user)
    user = await session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    role = await session.get(Role, role_id)
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")
    user.role_id = role_id
    await session.commit()
    return {"detail": f"Role '{role.name}' assigned to user '{user.username}'"}
