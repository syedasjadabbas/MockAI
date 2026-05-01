from fastapi import FastAPI
from routes.admin import router as admin_router

app = FastAPI(title="Admin Panel API")

app.include_router(admin_router, prefix="/api/admin", tags=["admin"])

@app.get("/")
async def root():
    return {"message": "Admin Panel Backend is running"}
