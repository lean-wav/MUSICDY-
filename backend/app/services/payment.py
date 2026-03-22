import stripe
import mercadopago
from app.core.config import settings
from typing import Optional

stripe.api_key = settings.STRIPE_API_KEY
mp = mercadopago.SDK(settings.MERCADOPAGO_ACCESS_TOKEN) if settings.MERCADOPAGO_ACCESS_TOKEN else None

class PaymentService:
    @staticmethod
    def create_checkout_session(
        price_amount: int, # in cents
        product_name: str,
        success_url: str,
        cancel_url: str,
        metadata: dict = {},
        connected_account_id: Optional[str] = None
    ):
        try:
            session_data = {
                "payment_method_types": ["card"],
                "line_items": [{
                    "price_data": {
                        "currency": "usd",
                        "product_data": {
                            "name": product_name,
                        },
                        "unit_amount": price_amount,
                    },
                    "quantity": 1,
                }],
                "mode": "payment",
                "success_url": success_url,
                "cancel_url": cancel_url,
                "metadata": metadata,
            }
            
            # If buying from a producer (Connect), add application_fee or transfer_data
            if connected_account_id:
                session_data["payment_intent_data"] = {
                    "application_fee_amount": int(price_amount * 0.07), # 7% platform fee (User request)
                    "transfer_data": {
                        "destination": connected_account_id,
                    },
                }
                
            checkout_session = stripe.checkout.Session.create(**session_data)
            return checkout_session
        except Exception as e:
            print(f"Stripe Error: {e}")
            return None

    @staticmethod
    def create_mp_preference(
        price_amount: float, # in ARS
        product_name: str,
        success_url: str,
        metadata: dict = {},
        collector_id: Optional[str] = None # Seller's MP ID if known
    ):
        try:
            if not mp: return None
            
            preference_data = {
                "items": [
                    {
                        "title": product_name,
                        "quantity": 1,
                        "currency_id": "ARS",
                        "unit_price": price_amount
                    }
                ],
                "back_urls": {
                    "success": success_url,
                    "failure": success_url,
                    "pending": success_url
                },
                "auto_return": "approved",
                "metadata": metadata,
                "notification_url": "https://api.musicdy.com/api/v1/payments/mp/webhook",
                # The fee we take (User requested 7%)
                "marketplace_fee": float(price_amount * 0.07),
            }

            # If we want the payment to go straight to seller (Connect-like)
            if collector_id:
                # Note: In a real MP implementation, this requires OAuth token
                # For MVP demo purposes, we set metadata to track logic
                preference_data["metadata"]["mp_collector_id"] = collector_id

            preference_response = mp.preference().create(preference_data)
            return preference_response["response"]
        except Exception as e:
             print(f"MercadoPago Error: {e}")
             return None

    @staticmethod
    def create_account_link(account_id: str, refresh_url: str, return_url: str):
        return stripe.AccountLink.create(
            account=account_id,
            refresh_url=refresh_url,
            return_url=return_url,
            type="account_onboarding",
        )

    @staticmethod
    def create_connect_account(email: str):
         return stripe.Account.create(
            type="express",
            email=email,
            capabilities={
                "card_payments": {"requested": True},
                "transfers": {"requested": True},
            },
        )

payment_service = PaymentService()
