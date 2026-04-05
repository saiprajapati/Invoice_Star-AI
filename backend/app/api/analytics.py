from fastapi import APIRouter, HTTPException
from app.core.database import get_supabase
from collections import defaultdict
from datetime import datetime
import logging

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("/summary")
async def get_analytics_summary():
    """
    High-level analytics: total invoices, total spend, top vendors,
    monthly trends, currency breakdown.
    """
    try:
        db = get_supabase()
        result = db.table("invoices").select(
            "id, status, extracted_data, created_at, is_duplicate"
        ).eq("status", "completed").execute()
        
        invoices = result.data or []
        
        total_invoices = len(invoices)
        total_spend = 0.0
        vendor_spend = defaultdict(float)
        vendor_count = defaultdict(int)
        monthly_spend = defaultdict(float)
        currency_totals = defaultdict(float)
        duplicate_count = sum(1 for inv in invoices if inv.get("is_duplicate"))
        
        for inv in invoices:
            data = inv.get("extracted_data") or {}
            amount = data.get("total_amount") or 0
            vendor = data.get("vendor_name") or "Unknown"
            currency = data.get("currency") or "USD"
            created = inv.get("created_at", "")[:7]  # YYYY-MM
            
            total_spend += amount
            vendor_spend[vendor] += amount
            vendor_count[vendor] += 1
            currency_totals[currency] += amount
            if created:
                monthly_spend[created] += amount
        
        top_vendors = sorted(
            [{"vendor": k, "total_spend": round(v, 2), "invoice_count": vendor_count[k]}
             for k, v in vendor_spend.items()],
            key=lambda x: x["total_spend"],
            reverse=True
        )[:10]
        
        monthly_trends = sorted(
            [{"month": k, "total_spend": round(v, 2)} for k, v in monthly_spend.items()]
        )
        
        return {
            "total_invoices": total_invoices,
            "total_spend": round(total_spend, 2),
            "duplicate_invoices": duplicate_count,
            "top_vendors": top_vendors,
            "monthly_trends": monthly_trends,
            "currency_totals": {k: round(v, 2) for k, v in currency_totals.items()},
            "processing_stats": await _get_processing_stats(db),
        }
    except Exception as e:
        logger.error(f"Analytics summary failed: {e}")
        raise HTTPException(500, f"Analytics error: {str(e)}")


@router.get("/vendors")
async def get_vendor_analytics():
    """Per-vendor breakdown with invoice list."""
    db = get_supabase()
    result = db.table("invoices").select(
        "id, file_name, extracted_data, created_at, status"
    ).eq("status", "completed").execute()
    
    vendors = defaultdict(lambda: {"invoices": [], "total_spend": 0, "invoice_count": 0})
    
    for inv in (result.data or []):
        data = inv.get("extracted_data") or {}
        vendor = data.get("vendor_name") or "Unknown"
        amount = data.get("total_amount") or 0
        
        vendors[vendor]["invoices"].append({
            "id": inv["id"],
            "file_name": inv["file_name"],
            "amount": amount,
            "date": data.get("invoice_date"),
            "invoice_number": data.get("invoice_number"),
        })
        vendors[vendor]["total_spend"] += amount
        vendors[vendor]["invoice_count"] += 1
    
    return [
        {"vendor": k, **v, "total_spend": round(v["total_spend"], 2)}
        for k, v in vendors.items()
    ]


async def _get_processing_stats(db) -> dict:
    """Get counts by processing status."""
    result = db.table("invoices").select("status").execute()
    stats = defaultdict(int)
    for row in (result.data or []):
        stats[row["status"]] += 1
    return dict(stats)
