from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_

from app.api import deps
from app.models.models import Usuario, ProyectoColaboracion, ParticipanteColaboracion, SolicitudColaboracion, MensajeColaboracion
from app.schemas import collaboration as schemas
from .notifications import notify_user

router = APIRouter()

@router.get("/conexiones", response_model=List[Any]) # UserResponse but dynamic
def get_connections(
    db: Session = Depends(deps.get_db),
    current_user: Usuario = Depends(deps.get_current_user),
):
    """
    Get mutual followers (Connections).
    """
    # Followed by current user
    following = db.query(Seguimiento.seguido_id).filter(Seguimiento.seguidor_id == current_user.id).all()
    following_ids = [f[0] for f in following]
    
    # Followers of current user
    followers = db.query(Seguimiento.seguidor_id).filter(Seguimiento.seguido_id == current_user.id).all()
    followers_ids = [f[0] for f in followers]
    
    # Intersection
    connection_ids = set(following_ids).intersection(set(followers_ids))
    
    connections = db.query(Usuario).filter(Usuario.id.in_(connection_ids)).all()
    return connections

@router.post("/solicitudes", response_model=schemas.SolicitudColaboracionResponse)
async def create_request(
    *,
    db: Session = Depends(deps.get_db),
    request_in: schemas.SolicitudColaboracionCreate,
    current_user: Usuario = Depends(deps.get_current_user),
):
    solicitud = SolicitudColaboracion(
        emisor_id=current_user.id,
        receptor_id=request_in.receptor_id,
        tipo_proyecto=request_in.tipo_proyecto,
        propuesta_economica=request_in.propuesta_economica,
        mensaje_inicial=request_in.mensaje_inicial,
        estado="pendiente"
    )
    db.add(solicitud)
    db.commit()
    db.refresh(solicitud)
    
    # Notificar al receptor
    await notify_user(
        solicitud.receptor_id, 
        "collab_request", 
        {"de": current_user.username, "tipo": solicitud.tipo_proyecto}
    )
    return solicitud

@router.get("/solicitudes", response_model=List[schemas.SolicitudColaboracionResponse])
def list_requests(
    db: Session = Depends(deps.get_db),
    current_user: Usuario = Depends(deps.get_current_user),
):
    return db.query(SolicitudColaboracion).filter(
        or_(SolicitudColaboracion.emisor_id == current_user.id, SolicitudColaboracion.receptor_id == current_user.id)
    ).all()

@router.patch("/solicitudes/{solicitud_id}", response_model=schemas.SolicitudColaboracionResponse)
async def update_request_status(
    solicitud_id: int,
    status: str, # aceptada, rechazada
    db: Session = Depends(deps.get_db),
    current_user: Usuario = Depends(deps.get_current_user),
):
    solicitud = db.query(SolicitudColaboracion).filter(SolicitudColaboracion.id == solicitud_id).first()
    if not solicitud or solicitud.receptor_id != current_user.id:
        raise HTTPException(status_code=404, detail="Solicitud no encontrada")
    
    solicitud.estado = status
    db.commit()
    
    # Notificar al emisor
    await notify_user(
        solicitud.emisor_id, 
        "collab_status", 
        {"por": current_user.username, "estado": status, "tipo": solicitud.tipo_proyecto}
    )
    
    # If accepted, create the project automatically for MVP
    if status == "aceptada":
        proyecto = ProyectoColaboracion(
            titulo=f"Proyecto {solicitud.tipo_proyecto} - {solicitud.emisor.username} & {solicitud.receptor.username}",
            tipo=solicitud.tipo_proyecto,
            estado="en_proceso",
            precio_fijo=solicitud.propuesta_economica,
            descripcion_acuerdo=solicitud.mensaje_inicial,
        )
        db.add(proyecto)
        db.flush()
        
        # Add participants
        p1 = ParticipanteColaboracion(proyecto_id=proyecto.id, usuario_id=solicitud.emisor_id, rol="Iniciador")
        p2 = ParticipanteColaboracion(proyecto_id=proyecto.id, usuario_id=solicitud.receptor_id, rol="Colaborador")
        db.add(p1)
        db.add(p2)
        db.commit()

    return solicitud

@router.get("/proyectos", response_model=List[schemas.ProyectoColaboracionResponse])
def list_projects(
    db: Session = Depends(deps.get_db),
    current_user: Usuario = Depends(deps.get_current_user),
):
    # Joined load participants to check if current_user is in them
    return db.query(ProyectoColaboracion).join(ParticipanteColaboracion).filter(
        ParticipanteColaboracion.usuario_id == current_user.id
    ).all()

@router.get("/proyectos/{proyecto_id}", response_model=schemas.ProyectoColaboracionResponse)
def get_project(
    proyecto_id: int,
    db: Session = Depends(deps.get_db),
    current_user: Usuario = Depends(deps.get_current_user),
):
    projeto = db.query(ProyectoColaboracion).filter(ProyectoColaboracion.id == proyecto_id).first()
    # Check participation
    if not any(p.usuario_id == current_user.id for p in projeto.participantes):
        raise HTTPException(status_code=403, detail="No eres parte de este proyecto")
    return projeto

@router.get("/proyectos/{proyecto_id}/mensajes", response_model=List[schemas.MensajeColaboracionResponse])
def get_project_messages(
    proyecto_id: int,
    db: Session = Depends(deps.get_db),
    current_user: Usuario = Depends(deps.get_current_user),
):
    # Check participation
    projeto = db.query(ProyectoColaboracion).filter(ProyectoColaboracion.id == proyecto_id).first()
    if not projeto or not any(p.usuario_id == current_user.id for p in projeto.participantes):
        raise HTTPException(status_code=403, detail="No eres parte de este proyecto")
        
    return db.query(MensajeColaboracion).filter(MensajeColaboracion.proyecto_id == proyecto_id).order_by(MensajeColaboracion.fecha.asc()).all()

@router.post("/proyectos/{proyecto_id}/mensajes", response_model=schemas.MensajeColaboracionResponse)
async def send_project_message(
    proyecto_id: int,
    message_in: schemas.MensajeColaboracionCreate,
    db: Session = Depends(deps.get_db),
    current_user: Usuario = Depends(deps.get_current_user),
):
    # Check participation
    projeto = db.query(ProyectoColaboracion).filter(ProyectoColaboracion.id == proyecto_id).first()
    if not projeto or not any(p.usuario_id == current_user.id for p in projeto.participantes):
         raise HTTPException(status_code=403, detail="Acceso denegado")
         
    mensaje = MensajeColaboracion(
        proyecto_id=proyecto_id,
        usuario_id=current_user.id,
        texto=message_in.texto
    )
    db.add(mensaje)
    db.commit()
    db.refresh(mensaje)
    
    # Notificar a otros participantes
    for p in projeto.participantes:
        if p.usuario_id != current_user.id:
            await notify_user(
                p.usuario_id, 
                "collab_message", 
                {"de": current_user.username, "texto": mensaje.texto, "proyecto_id": proyecto_id}
            )
            
    return mensaje

@router.post("/proyectos/{proyecto_id}/archivos")
async def upload_project_file(
    proyecto_id: int,
    nombre: str,
    url: str,
    version: str = "v1",
    db: Session = Depends(deps.get_db),
    current_user: Usuario = Depends(deps.get_current_user),
):
    projeto = db.query(ProyectoColaboracion).filter(ProyectoColaboracion.id == proyecto_id).first()
    if not projeto or not any(p.usuario_id == current_user.id for p in projeto.participantes):
         raise HTTPException(status_code=403, detail="Acceso denegado")
    
    # Update JSON field (Postgres/SQLite JSON handling)
    archivos = list(projeto.archivos) if projeto.archivos else []
    archivos.append({"nombre": nombre, "url": url, "version": version, "por": current_user.username, "fecha": str(datetime.now())})
    projeto.archivos = archivos
    
    # Add to history
    historial = list(projeto.historial) if projeto.historial else []
    historial.append({"evento": f"Archivo subido: {nombre}", "usuario": current_user.username, "fecha": str(datetime.now())})
    projeto.historial = historial
    
    db.commit()
    
    # Notificar a otros
    for p in projeto.participantes:
        if p.usuario_id != current_user.id:
            await notify_user(
                p.usuario_id, 
                "collab_file", 
                {"por": current_user.username, "archivo": nombre, "proyecto_id": proyecto_id}
            )
            
    return {"status": "success"}

@router.patch("/proyectos/{proyecto_id}/splits")
async def update_project_splits(
    proyecto_id: int,
    splits_in: schemas.SplitUpdateRequest,
    db: Session = Depends(deps.get_db),
    current_user: Usuario = Depends(deps.get_current_user),
):
    projeto = db.query(ProyectoColaboracion).filter(ProyectoColaboracion.id == proyecto_id).first()
    if not projeto:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado")
        
    # Verificar iniciador (quien propone el split sheet por ahora)
    iniciador = next((p for p in projeto.participantes if p.rol == "Iniciador"), None)
    if not iniciador or iniciador.usuario_id != current_user.id:
        raise HTTPException(status_code=403, detail="Solo el iniciador puede modificar el split sheet")
        
    # Validar 100% total
    total = sum(s.split_porcentual for s in splits_in.splits)
    if abs(total - 100.0) > 0.01:
        raise HTTPException(status_code=400, detail="La suma de los splits debe ser exactamente 100%")
        
    for s in splits_in.splits:
        part = db.query(ParticipanteColaboracion).filter(
            ParticipanteColaboracion.proyecto_id == proyecto_id,
            ParticipanteColaboracion.usuario_id == s.usuario_id
        ).first()
        if part:
            part.split_porcentual = s.split_porcentual
            
    # Add to history
    historial = list(projeto.historial) if projeto.historial else []
    historial.append({"evento": "Split Sheet actualizado", "usuario": current_user.username, "fecha": str(datetime.now())})
    projeto.historial = historial
    
    db.commit()
    
    # Notificar a todos
    for p in projeto.participantes:
        if p.usuario_id != current_user.id:
            await notify_user(
                p.usuario_id, 
                "collab_split_update", 
                {"por": current_user.username, "proyecto_id": proyecto_id}
            )
            
    return {"status": "success"}

from datetime import datetime
