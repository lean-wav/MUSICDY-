from fastapi import APIRouter
from app.api.v1.endpoints import login, users, posts, feed, payments, analytics, search, notifications, collaboration, chat

api_router = APIRouter()
api_router.include_router(login.router, tags=["login"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(posts.router, prefix="/posts", tags=["posts"])
api_router.include_router(feed.router, prefix="/feed", tags=["feed"])
api_router.include_router(payments.router, prefix="/payments", tags=["payments"])
api_router.include_router(analytics.router, prefix="/analytics", tags=["analytics"])
api_router.include_router(search.router, prefix="/search", tags=["search"])
api_router.include_router(collaboration.router, prefix="/collaboration", tags=["collaboration"])
api_router.include_router(chat.router, prefix="/chat", tags=["chat"])
api_router.include_router(notifications.router, prefix="/ws")
