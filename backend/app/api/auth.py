"""Auth router: register, login, me."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import create_access_token, hash_password, verify_password
from app.db.postgres import get_session
from app.db.models import User
from app.models.schemas import Token, UserLogin, UserOut, UserRegister
from app.api.deps import get_current_user

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
async def register(body: UserRegister, session: AsyncSession = Depends(get_session)):
    existing = await session.execute(
        select(User).where((User.email == body.email) | (User.username == body.username))
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Username or email already taken")

    user = User(
        username=body.username,
        email=body.email,
        password_hash=hash_password(body.password),
        full_name=body.full_name,
        position=body.position,
        department_id=body.department_id,
    )
    session.add(user)
    await session.commit()
    await session.refresh(user)

    return Token(access_token=create_access_token(user.id))


@router.post("/login", response_model=Token)
async def login(body: UserLogin, session: AsyncSession = Depends(get_session)):
    result = await session.execute(select(User).where(User.email == body.email))
    user = result.scalar_one_or_none()
    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    return Token(access_token=create_access_token(user.id))


@router.get("/me", response_model=UserOut)
async def me(current_user: User = Depends(get_current_user)):
    return _user_to_out(current_user)


def _user_to_out(user: User) -> UserOut:
    from app.models.schemas import DepartmentOut, SkillOut
    dept = None
    if user.department:
        dept = DepartmentOut(id=user.department.id, name=user.department.name, description=user.department.description)
    skills = [SkillOut(id=s.id, name=s.name) for s in (user.skills or [])]
    return UserOut(
        id=user.id,
        username=user.username,
        email=user.email,
        full_name=user.full_name,
        position=user.position,
        department=dept,
        skills=skills,
        bio=user.bio,
        avatar_url=user.avatar_url,
        is_admin=user.is_admin,
        created_at=user.created_at,
    )
