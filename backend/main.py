from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes.admin import router as admin_router

app = FastAPI(title="Admin Panel API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(admin_router, prefix="/api/admin", tags=["admin"])

@app.get("/")
async def root():
    return {"message": "Admin Panel Backend is running"}
