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
        refresh_url = getattr(settings, 'FRONTEND_URL', 'https://musicdy.com') + '/onboard/refresh'
        return_url = getattr(settings, 'FRONTEND_URL', 'https://musicdy.com') + '/onboard/return'
        account_link = payment_service.create_account_link(
            account_id=current_user.stripe_account_id,
            refresh_url=refresh_url,
            return_url=return_url,
        )
        return {"url": account_link.url}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/checkout/{beat_id}")
def create_checkout(
    beat_id: int,
    provider: str = "stripe", # stripe, mercadopago
    license: str = "basic",
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

    # Dynamic price extraction from beat licenses
    price_usd = 29.99
    price_ars = 35000.0
    
    if beat.licencias:
        if isinstance(beat.licencias, list) and len(beat.licencias) > 0:
            # Try to find the specific license requested
            best_match = next((l for l in beat.licencias if l.get('id') == license), None)
            if not best_match:
                # Fallback to Basic if not found
                best_match = next((l for l in beat.licencias if l.get('id') == 'basic'), beat.licencias[0])
            
            price_usd = float(best_match.get('price_usd', 29.99))
            price_ars = float(best_match.get('price_ars', price_usd * 800))
        elif isinstance(beat.licencias, dict) and len(beat.licencias) > 0:
            # Legacy structure fallback
            basic = beat.licencias.get('basic', list(beat.licencias.values())[0])
            price_usd = float(basic.get('precio', 29.99))
            price_ars = price_usd * 950 # Approximation for legacy
    
    if provider == "mercadopago":
        if not vendedor.mp_account_id:
            raise HTTPException(status_code=400, detail="El vendedor no acepta MercadoPago")
            
        preference = payment_service.create_mp_preference(
            price_amount=price_ars,
            product_name=f"Beat: {beat.titulo}",
            success_url="https://musicdy-backend.onrender.com/api/v1/payments/mp/success",
            metadata={
                "beat_id": beat.id,
                "buyer_id": current_user.id,
                "seller_id": vendedor.id
            },
            collector_id=vendedor.mp_account_id
        )
        if not preference:
            raise HTTPException(status_code=500, detail="Error creando preferencia MP")
            
        return {"url": preference["init_point"]} #init_point (real) or sandbox_init_point
        
    else: # Stripe
        if not vendedor.stripe_account_id:
             raise HTTPException(status_code=400, detail="El vendedor no tiene pagos configurados")
    
        frontend_url = getattr(settings, 'FRONTEND_URL', 'https://musicdy.com')
        session = payment_service.create_checkout_session(
            price_amount=int(price_usd * 100), # Stripe uses cents
            product_name=f"Beat: {beat.titulo}",
            success_url="https://musicdy-backend.onrender.com/api/v1/payments/success?session_id={CHECKOUT_SESSION_ID}",
            cancel_url=f"{frontend_url}/cancel",
            metadata={
                "beat_id": beat.id,
                "buyer_id": current_user.id,
                "seller_id": vendedor.id
            },
            connected_account_id=vendedor.stripe_account_id
        )
        
        if not session:
            raise HTTPException(status_code=500, detail="Error creando sesión de pago")
            
        return {"url": session.url}

@router.get("/wallet")
def get_wallet(
    db: Session = Depends(deps.get_db),
    current_user: Usuario = Depends(deps.get_current_user)
):
    """
    Get wallet balance and transaction history.
    """
    from app.models.models import Transaccion, Retiro
    
    # 1. Get transactions where user is seller (income) or buyer (expense)
    transactions = db.query(Transaccion).filter(
        (Transaccion.usuario_id == current_user.id) | 
        (Transaccion.vendedor_id == current_user.id)
    ).order_by(Transaccion.fecha.desc()).limit(20).all()
    
    # 2. Get withdrawals
    withdrawals = db.query(Retiro).filter(
        Retiro.usuario_id == current_user.id
    ).order_by(Retiro.fecha.desc()).all()
    
    return {
        "balance": current_user.wallet_balance,
        "transactions": [
            {
                "id": t.id,
                "monto": t.monto / 100,
                "currency": t.currency,
                "tipo": "venta" if t.vendedor_id == current_user.id else "compra",
                "fecha": str(t.fecha),
                "estado": t.estado
            } for t in transactions
        ],
        "withdrawals": [
            {
                "id": w.id,
                "monto": w.monto,
                "metodo": w.metodo,
                "estado": w.estado,
                "fecha": str(w.fecha)
            } for w in withdrawals
        ]
    }

@router.post("/withdraw")
def request_withdrawal(
    amount: float,
    method: str, # stripe, mercadopago
    db: Session = Depends(deps.get_db),
    current_user: Usuario = Depends(deps.get_current_user)
):
    """
    Request a payout from wallet balance.
    """
    if amount <= 0:
        raise HTTPException(status_code=400, detail="Monto inválido")
        
    if current_user.wallet_balance < amount:
        raise HTTPException(status_code=400, detail="Saldo insuficiente")
        
    # Check if user has the destination configured
    if method == "stripe" and not current_user.stripe_account_id:
        raise HTTPException(status_code=400, detail="No tienes una cuenta de Stripe vinculada")
    if method == "mercadopago" and not current_user.mp_account_id:
        raise HTTPException(status_code=400, detail="No tienes una cuenta de Mercado Pago vinculada")

    from app.models.models import Retiro
    
    # Create withdrawal record
    withdrawal = Retiro(
        usuario_id=current_user.id,
        monto=amount,
        metodo=method,
        estado="pendiente"
    )
    
    # Deduct from balance immediately (lock funds)
    current_user.wallet_balance -= amount
    
    db.add(withdrawal)
    db.commit()
    
    return {"message": "Solicitud de retiro enviada", "withdrawal_id": withdrawal.id}

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
    
    frontend_url = getattr(settings, 'FRONTEND_URL', 'https://musicdy.com')
    session = payment_service.create_checkout_session(
        price_amount=price_cents,
        product_name=f"Proyecto: {projeto.titulo}",
        success_url=f"{frontend_url}/success-collab?proyecto_id={projeto.id}",
        cancel_url=f"{frontend_url}/cancel-collab",
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
                        await notify_user(
                            p.usuario_id, 
                            "collab_payment_success", 
                            {"proyecto_id": proyecto_id, "monto": session.get("amount_total") / 100}
                        )
            else:
                # Handle standard beat purchase
                beat_id = int(metadata.get("beat_id"))
                seller_id = int(metadata.get("seller_id"))
                buyer_id = int(metadata.get("buyer_id"))
                
                from app.models.models import Publicacion, Transaccion, Usuario
                
                vendedor = db.query(Usuario).filter(Usuario.id == seller_id).first()
                if vendedor:
                    amount_cents = session.get("amount_total")
                    # Credit wallet (Stripe keeps fee, but for MVP we credit full amount minus imaginary fee or full amount)
                    amount_net = amount_cents / 100.0
                    vendedor.wallet_balance += amount_net
                    vendedor.sales_count += 1
                    
                    # Record transaction
                    trans = Transaccion(
                        usuario_id=buyer_id,
                        vendedor_id=seller_id,
                        publicacion_id=beat_id,
                        monto=amount_cents,
                        currency=session.get("currency", "usd"),
                        provider="stripe",
                        tipo_licencia=session.get("metadata", {}).get("license", "basic"),
                        stripe_payment_intent_id=session.get("payment_intent"),
                        estado="completado"
                    )
                    db.add(trans)
                    
                    # Notify seller
                    await notify_user(
                        seller_id, 
                        "NEW_SALE", 
                        {"beat_id": beat_id, "amount": amount_net},
                        db=db
                    )
                    
                    db.commit()
                    print(f"Payment successful. Credited {amount_net} to user {seller_id}")
        finally:
            db.close()

    return {"status": "success"}
