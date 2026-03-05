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
        seller_mp_token: Optional[str] = None # Seller's access token if connected
    ):
        try:
            if not mp: return None
            
            # Using Marketplace Split Payment
            # Logic: We create the preference using the SELLER'S credentials (if full marketplace)
            # OR we create it with OUR credentials and set 'marketplace_fee' (if handling funds aggregation)
            # For simplicity in this MVP: We assume we are the aggregator and use 'marketplace_fee'
            
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
                    "failure": success_url, # simplifying for MVP
                    "pending": success_url
                },
                "auto_return": "approved",
                "metadata": metadata,
                "marketplace_fee": price_amount * 0.07, # 7% fee
                "notification_url": "https://api.musicdy.com/api/v1/payments/mp/webhook" # TODO: Needs real URL
            }

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
