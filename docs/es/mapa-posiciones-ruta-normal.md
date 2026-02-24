# Normal Route Position Map (Canonical English)

This mapping is provided in English as the canonical project language.

## System Position: `horcones`
- Real milestone: Laguna de Horcones
- Altitude: 2,950 m
- Altitude band: `low`
- System characteristics:
  - First mountain-scale reveal
  - Mandatory park registration point
  - No major physiological pressure yet
  - Narrative role: scale revelation

## System Position: `confluencia`
- Real milestone: Confluencia
- Altitude: 3,390 m
- Altitude band: `low`
- System characteristics:
  - Route bifurcation (Plaza Francia vs Plaza de Mulas)
  - First contemplation-vs-progression decision
  - `terrain_load` variation by selected path
  - Start of mild physiological effects

## System Position: `plaza_de_mulas`
- Real milestone: Plaza de Mulas (Base Camp)
- Altitude: 4,350 m
- Altitude band: `mid`
- System characteristics:
  - Logistics hub with medical support
  - Typical 2–3 day acclimatization stay
  - External body-state assessment availability
  - Standard fallback return node

## System Position: `nido`
- Real milestone: Nido de Cóndores
- Altitude: 5,400 m
- Altitude band: `mid` (transition to `high`)
- System characteristics:
  - Psychological threshold
  - Start of significant cognitive degradation
  - Panoramic scale reveal
  - Higher access `terrain_load`

## System Position: `colera`
- Real milestone: Campamento Cólera
- Altitude: 6,000 m
- Altitude band: `high`
- System characteristics:
  - Last established camp
  - Severely degraded sleep (`wait` has net cost)
  - Logistic no-return threshold
  - Additional turns degrade more than they recover

## System Position: `independencia`
- Real milestone: Refugio Independencia (ruins)
- Altitude: 6,380 m
- Altitude band: `high`
- System characteristics:
  - Final checkpoint before summit sector
  - Higher legibility of white-wind signals for experienced climbers
  - No reliable shelter or camp functionality

## System Position: `canaleta`
- Real milestone: La Canaleta
- Altitude: 6,700–6,962 m
- Altitude band: `high` (maximum)
- System characteristics:
  - Maximum granularity of movement (step-level)
  - Maximum `terrain_load` on loose 45° slope
  - Maximum wind exposure
  - Peak cognitive degradation zone

## System Position: `cumbre`
- Real milestone: Aconcagua summit
- Altitude: 6,962 m
- Altitude band: `high` (maximum)
- System characteristics:
  - Transitional state, not stable endpoint
  - Summit stay measured in minutes, not turns
  - Descent starts immediately
  - System logic continues beyond summit (descent risk concentration)

## Proposed MRA v1 constants

```python
POSITIONS = [
    "horcones",
    "confluencia",
    "plaza_de_mulas",
    "nido",
    "colera",
    "independencia",
    "canaleta",
    "cumbre",
]

POSITION_TO_ALTITUDE = {
    "horcones": "low",
    "confluencia": "low",
    "plaza_de_mulas": "mid",
    "nido": "mid",
    "colera": "high",
    "independencia": "high",
    "canaleta": "high",
    "cumbre": "high",
}

POSITION_TERRAIN_BASE = {
    "horcones": 0,
    "confluencia": 0,
    "plaza_de_mulas": 1,
    "nido": 2,
    "colera": 2,
    "independencia": 3,
    "canaleta": 3,
    "cumbre": 3,
}
```
