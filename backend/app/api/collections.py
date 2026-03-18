"""Collections: curated groups of REX sheets."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db.postgres import get_session
from app.db.models import Collection, CollectionItem, RexSheet, User
from app.models.schemas import (
    CollectionCreate,
    CollectionUpdate,
    CollectionItemAdd,
    CollectionOut,
    CollectionDetail,
    CollectionItemOut,
)
from app.api.deps import get_current_user

router = APIRouter(prefix="/collections", tags=["collections"])


@router.get("/", response_model=list[CollectionOut])
async def list_collections(
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    result = await session.execute(
        select(Collection)
        .options(selectinload(Collection.items))
        .where(
            or_(
                Collection.is_public == True,  # noqa: E712
                Collection.creator_id == current_user.id,
            )
        )
        .order_by(Collection.created_at.desc())
    )
    collections = result.scalars().all()
    return [
        CollectionOut(
            id=c.id,
            title=c.title,
            description=c.description,
            is_public=c.is_public,
            creator_id=c.creator_id,
            creator_name=c.creator.full_name if c.creator else "",
            item_count=len(c.items),
            created_at=c.created_at,
        )
        for c in collections
    ]


@router.post("/", response_model=CollectionOut, status_code=201)
async def create_collection(
    body: CollectionCreate,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    collection = Collection(
        creator_id=current_user.id,
        title=body.title,
        description=body.description,
        is_public=body.is_public,
    )
    session.add(collection)
    await session.commit()
    await session.refresh(collection)
    return CollectionOut(
        id=collection.id,
        title=collection.title,
        description=collection.description,
        is_public=collection.is_public,
        creator_id=collection.creator_id,
        creator_name=current_user.full_name,
        item_count=0,
        created_at=collection.created_at,
    )


@router.get("/{collection_id}", response_model=CollectionDetail)
async def get_collection(
    collection_id: int,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    result = await session.execute(
        select(Collection)
        .options(selectinload(Collection.items).selectinload(CollectionItem.rex_sheet))
        .where(Collection.id == collection_id)
    )
    collection = result.scalar_one_or_none()
    if not collection:
        raise HTTPException(status_code=404, detail="Collection not found")
    if not collection.is_public and collection.creator_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    items = [
        CollectionItemOut(
            id=item.id,
            rex_id=item.rex_id,
            position=item.position,
            note=item.note,
            rex_title=item.rex_sheet.title if item.rex_sheet else "",
        )
        for item in collection.items
    ]

    return CollectionDetail(
        id=collection.id,
        title=collection.title,
        description=collection.description,
        is_public=collection.is_public,
        creator_id=collection.creator_id,
        creator_name=collection.creator.full_name if collection.creator else "",
        item_count=len(items),
        created_at=collection.created_at,
        items=items,
    )


@router.put("/{collection_id}", response_model=CollectionOut)
async def update_collection(
    collection_id: int,
    body: CollectionUpdate,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    collection = await session.get(Collection, collection_id)
    if not collection:
        raise HTTPException(status_code=404, detail="Collection not found")
    if collection.creator_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the creator can update this collection")

    if body.title is not None:
        collection.title = body.title
    if body.description is not None:
        collection.description = body.description
    if body.is_public is not None:
        collection.is_public = body.is_public

    await session.commit()
    await session.refresh(collection)

    items_result = await session.execute(
        select(CollectionItem).where(CollectionItem.collection_id == collection_id)
    )
    item_count = len(items_result.scalars().all())

    return CollectionOut(
        id=collection.id,
        title=collection.title,
        description=collection.description,
        is_public=collection.is_public,
        creator_id=collection.creator_id,
        creator_name=current_user.full_name,
        item_count=item_count,
        created_at=collection.created_at,
    )


@router.delete("/{collection_id}")
async def delete_collection(
    collection_id: int,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    collection = await session.get(Collection, collection_id)
    if not collection:
        raise HTTPException(status_code=404, detail="Collection not found")
    if collection.creator_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the creator can delete this collection")
    await session.delete(collection)
    await session.commit()
    return {"status": "deleted"}


@router.post("/{collection_id}/items", response_model=CollectionItemOut, status_code=201)
async def add_item(
    collection_id: int,
    body: CollectionItemAdd,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    collection = await session.get(Collection, collection_id)
    if not collection:
        raise HTTPException(status_code=404, detail="Collection not found")
    if collection.creator_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the creator can add items")

    rex = await session.get(RexSheet, body.rex_id)
    if not rex:
        raise HTTPException(status_code=404, detail="REX sheet not found")

    existing = await session.execute(
        select(CollectionItem).where(
            CollectionItem.collection_id == collection_id,
            CollectionItem.rex_id == body.rex_id,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="REX already in collection")

    item = CollectionItem(
        collection_id=collection_id,
        rex_id=body.rex_id,
        position=body.position,
        note=body.note,
    )
    session.add(item)
    await session.commit()
    await session.refresh(item)

    return CollectionItemOut(
        id=item.id,
        rex_id=item.rex_id,
        position=item.position,
        note=item.note,
        rex_title=rex.title,
    )


@router.delete("/{collection_id}/items/{item_id}")
async def remove_item(
    collection_id: int,
    item_id: int,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    item = await session.get(CollectionItem, item_id)
    if not item or item.collection_id != collection_id:
        raise HTTPException(status_code=404, detail="Item not found")

    collection = await session.get(Collection, collection_id)
    if not collection or collection.creator_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the creator can remove items")

    await session.delete(item)
    await session.commit()
    return {"status": "deleted"}
