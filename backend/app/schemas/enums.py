from enum import Enum

class TipoContenido(str, Enum):
    BEAT = "beat"
    OWN_MUSIC = "own_music"
    FOR_YOU = "for_you"
    VIDEO = "video"
    VIDEO_TERCEROS = "video_terceros"
    RECOMENDACION = "recomendacion"

class GeneroMusical(str, Enum):
    TRAP = "trap"
    REGGAETON = "reggaeton"
    POP = "pop"
    RAP = "rap"
    ROCK = "rock"
    ELECTRONICA = "electronica"
    OTRO = "otro"

class TipoLicencia(str, Enum):
    LEASE = "lease"           # MP3 320kbps, hasta 2500 copias
    LEASE_WAV = "lease_wav"   # WAV 32bits + MP3 320kbps, hasta 5000 copias
    PREMIUM = "premium"       # WAV + MP3 + Stems, hasta 5000 copias
    EXCLUSIVE = "exclusive"   # Todo sin límites + Exclusividad
    CUSTOM = "custom"         # Términos personalizados

class FormatoAudio(str, Enum):
    MP3_320 = "mp3_320"
    WAV_32 = "wav_32"
    STEMS = "stems"           # Pistas separadas
