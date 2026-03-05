from fastapi import APIRouter, Depends, HTTPException, Request, Header
from sqlalchemy.orm import Session
from app.api import deps
from app.models.models import Usuario, Publicacion, Transaccion
from app.services.payment import payment_service
from app.core.config import settings
import stripe

router = APIRouter()

@router.post("/onboard")
def onboard_user(
    current_user: Usuario = Depends(deps.get_current_user),
    db: Session = Depends(deps.get_db)
):
    """
    Start Stripe Connect onboarding for a producer.
    """
    try:
        if not current_user.stripe_account_id:
            account = payment_service.create_connect_account(current_user.email)
            current_user.stripe_account_id = account.id
            db.commit()
        
        # Create account link
        account_link = payment_service.create_account_link(
            account_id=current_user.stripe_account_id,
            refresh_url="http://localhost:3000/onboard/refresh", # TODO: Move to settings
            return_url="http://localhost:3000/onboard/return",
        )
        return {"url": account_link.url}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/checkout/{beat_id}")
def create_checkout(
    beat_id: int,
    provider: str = "stripe", # stripe, mercadopago
    current_user: Usuario = Depends(deps.get_current_user),
    db: Session = Depends(deps.get_db)
):
    """
    Buy a beat.
    """
    beat = db.query(Publicacion).filter(Publicacion.id == beat_id).first()
    if not beat:
        raise HTTPException(status_code=404, detail="Beat not found")
        
    vendedor = db.query(Usuario).filter(Usuario.id == beat.usuario_id).first()
    if not vendedor:
         raise HTTPException(status_code=404, detail="Vendedor no encontrado")

    # TODO: Get real price from beat.licencias
    price = 2999 # $29.99 fixed for MVP demo (USD)
    price_ars = 35000 # 35,000 ARS fixed for MVP (ARS)
    
    if provider == "mercadopago":
        if not vendedor.mp_account_id:
            raise HTTPException(status_code=400, detail="El vendedor no acepta MercadoPago")
            
        preference = payment_service.create_mp_preference(
            price_amount=price_ars,
            product_name=f"Beat: {beat.titulo}",
            success_url="http://localhost:3000/success",
            metadata={
                "beat_id": beat.id,
                "buyer_id": current_user.id,
                "seller_id": vendedor.id
            }
        )
        if not preference:
            raise HTTPException(status_code=500, detail="Error creando preferencia MP")
            
        return {"url": preference["init_point"]} # or sandbox_init_point
        
    else: # Stripe
        if not vendedor.stripe_account_id:
             raise HTTPException(status_code=400, detail="El vendedor no tiene pagos configurados")
    
        session = payment_service.create_checkout_session(
            price_amount=price,
            product_name=f"Beat: {beat.titulo}",
            success_url="http://localhost:3000/success?session_id={CHECKOUT_SESSION_ID}",
            cancel_url="http://localhost:3000/cancel",
            metadata={
                "beat_id": beat.id,
                "buyer_id": current_user.id,
                "seller_id": vendedor.id
            },
            connected_account_id=vendedor.stripe_account_id
        )
        
        if not session:
            raise HTTPException(status_code=500, detail="Error creating payment session")
            
        return {"url": session.url}

@router.post("/checkout-collaboration/{proyecto_id}")
async def create_collaboration_checkout(
    proyecto_id: int,
    db: Session = Depends(deps.get_db),
    current_user: Usuario = Depends(deps.get_current_user),
):
    from app.models.models import ProyectoColaboracion
    
    projeto = db.query(ProyectoColaboracion).filter(ProyectoColaboracion.id == proyecto_id).first()
    if not projeto:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado")
    
    if not projeto.precio_fijo or projeto.precio_fijo <= 0:
         raise HTTPException(status_code=400, detail="Este proyecto no tiene un precio fijo establecido")

    # Receiver: the first participant that is NOT the current_user
    # (Simplifying for MVP 1-to-1 or common 1-initiator-pays-others model)
    colaborador_part = next((p for p in projeto.participantes if p.usuario_id != current_user.id), None)
    if not colaborador_part:
         raise HTTPException(status_code=400, detail="No hay colaborador para recibir el pago")
    
    vendedor = colaborador_part.usuario
    if not vendedor or not vendedor.stripe_account_id:
         raise HTTPException(status_code=400, detail="El colaborador no tiene cuenta de Stripe configurada")

    price_cents = int(projeto.precio_fijo * 100)
    
    session = payment_service.create_checkout_session(
        price_amount=price_cents,
        product_name=f"Proyecto: {projeto.titulo}",
        success_url=f"http://localhost:3000/success-collab?proyecto_id={projeto.id}",
        cancel_url=f"http://localhost:3000/cancel-collab",
        metadata={
            "proyecto_id": projeto.id,
            "buyer_id": current_user.id,
            "seller_id": vendedor.id,
            "type": "collaboration"
        },
        connected_account_id=vendedor.stripe_account_id
    )
    
    if not session:
        raise HTTPException(status_code=500, detail="Error al crear sesión de pago")
        
    return {"url": session.url}

@router.post("/webhook")
async def stripe_webhook(request: Request, stripe_signature: str = Header(None)):
    payload = await request.body()
    
    try:
        event = stripe.Webhook.construct_event(
            payload, stripe_signature, settings.STRIPE_WEBHOOK_SECRET
        )
    except Exception as e:
         raise HTTPException(status_code=400, detail="Webhook Error")

    if event["type"] == "checkout.session.completed":
        session = event["data"]["object"]
        metadata = session.get("metadata", {})
        
        db = next(deps.get_db())
        try:
            if metadata.get("type") == "collaboration":
                from app.models.models import ProyectoColaboracion
                proyecto_id = int(metadata.get("proyecto_id"))
                projeto = db.query(ProyectoColaboracion).filter(ProyectoColaboracion.id == proyecto_id).first()
                if projeto:
                    from .notifications import notify_user
                    import asyncio
                    
                    projeto.pago_estado = "completado"
                    db.commit()
                    
                    # Notificar a todos los participantes
                    for p in projeto.participantes:
                        asyncio.run(notify_user(
                            p.usuario_id, 
                            "collab_payment_success", 
                            {"proyecto_id": proyecto_id, "monto": session.get("amount_total") / 100}
                        ))
            else:
                # Handle standard beat purchase
                print(f"Payment successful for session {session['id']}")
                # ... existing beat sale logic ...
        finally:
            db.close()

    return {"status": "success"}
