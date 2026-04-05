from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import invoices, analytics, health
from app.core.config import settings

app = FastAPI(
    title="Invoice Extraction AI",
    description="AI-powered invoice data extraction and analytics",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router, prefix="/api/v1", tags=["health"])
app.include_router(invoices.router, prefix="/api/v1/invoices", tags=["invoices"])
app.include_router(analytics.router, prefix="/api/v1/analytics", tags=["analytics"])


@app.get("/")
async def root():
    return {"message": "Invoice Extraction AI API", "version": "1.0.0"}
