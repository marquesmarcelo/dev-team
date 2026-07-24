---
name: geo
description: Use quando a feature envolver dados geográficos — localização, área, rota, raio de busca, mapa interativo. Cobre PostGIS (tipos, funções, índices GIST), API GeoJSON, Leaflet (frontend), GeoServer (opcional para camadas WMS/WFS), padrão brasileiro SIRGAS 2000 (EPSG:4674) e fontes de dados IBGE/CONCAR.
---

# Geo: PostGIS + Leaflet + GeoServer (opcional)

> Padrões universais do projeto (`CLAUDE.md`) se aplicam normalmente —
> UUIDs, hexagonal, CQRS, etc. Esta skill cobre apenas o que é específico
> de dados geográficos.

---

## Quando usar o quê

```
Dado geográfico simples (ponto, área, rota) + mapa de visualização
  → PostGIS no banco + API retornando GeoJSON + Leaflet no frontend
  → Não precisa de GeoServer

Múltiplas camadas temáticas + estilos complexos + integração com QGIS
+ grandes volumes de dados raster + publicação de serviços OGC para terceiros
  → PostGIS + GeoServer (WMS/WFS) + Leaflet consumindo WMS
  → GeoServer é um serviço adicional com seu próprio container
```

**Dúvida de quando usar GeoServer:** se o mapa precisa mostrar dados de
camadas externas (limites do IBGE, malha viária do DNIT) ou se o volume
de features for grande demais para carregar como GeoJSON bruto (>10k
features), considerar GeoServer.

---

## Padrão de coordenadas obrigatório no Brasil

| Item | Valor | Por quê |
|---|---|---|
| **Datum horizontal** | SIRGAS 2000 | Obrigatório por resolução do IBGE desde 2005 |
| **SRID no PostGIS** | **EPSG:4674** | SIRGAS 2000 geográfico (graus) |
| **SRID alternativo** | EPSG:31982 a 31985 | SIRGAS 2000 projetado (metros) por fuso UTM |
| **Formato de troca** | GeoJSON (RFC 7946) | Padrão web — coordenadas sempre em WGS84/SIRGAS |
| **Nunca usar** | SAD 69 (EPSG:4618), Córrego Alegre | Datums antigos, descontinuados pelo IBGE |

```sql
-- Verificar SRID no PostGIS
SELECT srtext FROM spatial_ref_sys WHERE srid = 4674;
-- Deve retornar: GEOGCS["SIRGAS 2000",...]
```

---

## PostGIS — banco de dados

### Instalação e extensão

```sql
-- Habilitar PostGIS no banco (uma vez por banco)
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_topology;

-- Verificar versão
SELECT PostGIS_Version();
```

### Tipos de geometria

```sql
-- Ponto (ex: localização de um endereço, sensor, estabelecimento)
localizacao GEOMETRY(POINT, 4674)

-- Polígono (ex: área de cobertura, lote, região)
area GEOMETRY(POLYGON, 4674)

-- Linha (ex: rota, via, trecho de rio)
trecho GEOMETRY(LINESTRING, 4674)

-- Genérico (aceita qualquer geometria — usar quando o tipo varia)
geometria GEOMETRY(GEOMETRY, 4674)

-- Multi (quando uma entidade tem múltiplas partes — ex: município com ilhas)
area GEOMETRY(MULTIPOLYGON, 4674)
```

### Migration com PostGIS

```sql
-- migration: criar tabela com campo geográfico
CREATE TABLE ponto_interesse (
  id            UUID PRIMARY KEY,
  nome          TEXT NOT NULL,
  descricao     TEXT,
  localizacao   GEOMETRY(POINT, 4674) NOT NULL,
  criado_em     TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  excluido_em   TIMESTAMPTZ
);

-- Índice GIST obrigatório em toda coluna de geometria com busca espacial
-- (B-tree não funciona para geometria — sempre GIST ou BRIN)
CREATE INDEX idx_ponto_interesse_localizacao
  ON ponto_interesse USING GIST (localizacao);
```

### Funções PostGIS mais usadas

```sql
-- Criar ponto a partir de longitude/latitude (ordem: lon, lat no WKT)
ST_SetSRID(ST_MakePoint(-43.9345, -19.9167), 4674)  -- Belo Horizonte

-- Converter de WKT para geometry
ST_GeomFromText('POINT(-43.9345 -19.9167)', 4674)

-- Distância em metros entre dois pontos
-- (usar ST_Distance com geography para cálculo geodésico)
ST_Distance(
  localizacao::geography,
  ST_SetSRID(ST_MakePoint(-43.9345, -19.9167), 4674)::geography
) AS distancia_metros

-- Encontrar pontos em raio de 5km
WHERE ST_DWithin(
  localizacao::geography,
  ST_SetSRID(ST_MakePoint(-43.9345, -19.9167), 4674)::geography,
  5000  -- metros
)

-- Verificar se ponto está dentro de polígono
WHERE ST_Within(localizacao, area_de_cobertura)

-- Centroide de um polígono
ST_Centroid(area)

-- Converter geometry para GeoJSON (para API)
ST_AsGeoJSON(localizacao, 6)  -- 6 casas decimais (~11cm precisão)

-- Converter GeoJSON para geometry (para salvar)
ST_SetSRID(ST_GeomFromGeoJSON('{"type":"Point","coordinates":[-43.93,-19.91]}'), 4674)

-- Área em m² (usar ::geography para precisão geodésica)
ST_Area(area::geography)

-- Intersecção entre dois polígonos
ST_Intersects(area_a, area_b)
```

### Allowlist para ORDER BY com colunas geo

```go
// Nunca interpolar coluna geográfica em ORDER BY sem allowlist
// Usar distância calculada como campo nomeado:
var COLUNAS_ORDENAVEIS_GEO = map[string]string{
    "distancia": "ST_Distance(localizacao::geography, $1::geography)",
    "nome":      "nome",
}
```

---

## API — retornando GeoJSON

O padrão de resposta para dados geográficos é **GeoJSON (RFC 7946)**:

```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "geometry": {
        "type": "Point",
        "coordinates": [-43.9345, -19.9167]
      },
      "properties": {
        "id": "uuid",
        "nome": "Praça da Liberdade",
        "descricao": "..."
      }
    }
  ]
}
```

**Endpoints geo seguem o mesmo padrão REST** — não criar endpoints especiais:

```
GET /api/v1/pontos-interesse?lat=-19.9167&lon=-43.9345&raio=5000
  → FeatureCollection com pontos no raio de 5km

GET /api/v1/pontos-interesse/:id
  → Feature individual

POST /api/v1/pontos-interesse
  Body: { nome, descricao, localizacao: { type: "Point", coordinates: [lon, lat] } }
```

**Exemplo Go/Gin:**

```go
// domain/entity/ponto_interesse.go
type PontoInteresse struct {
    ID          uuid.UUID       `json:"id"`
    Nome        string          `json:"nome"`
    Localizacao GeoJSONGeometry `json:"localizacao"`
    // campos base omitidos para brevidade
}

type GeoJSONGeometry struct {
    Type        string    `json:"type"`
    Coordinates []float64 `json:"coordinates"`
}

// adapter/postgres/ponto_interesse_repository.go
func (r *SQLPontoInteresseRepository) BuscarNoRaio(
    ctx context.Context, lon, lat, raioMetros float64,
) ([]PontoInteresse, error) {
    rows, err := r.db.QueryContext(ctx, `
        SELECT
            id, nome,
            ST_AsGeoJSON(localizacao, 6)::json AS localizacao,
            ST_Distance(localizacao::geography, ST_SetSRID(
                ST_MakePoint($1, $2), 4674)::geography) AS distancia_m
        FROM ponto_interesse
        WHERE excluido_em IS NULL
          AND ST_DWithin(
              localizacao::geography,
              ST_SetSRID(ST_MakePoint($1, $2), 4674)::geography,
              $3
          )
        ORDER BY distancia_m
    `, lon, lat, raioMetros)
    // scan e return...
}
```

---

## Leaflet — mapa no frontend

### Instalação

```bash
# Next.js
npm install leaflet react-leaflet
npm install --save-dev @types/leaflet

# Angular
npm install leaflet
npm install --save-dev @types/leaflet
```

### Mapa base (Next.js — componente client-side obrigatório)

```tsx
// components/shared/geo/map-view.tsx
'use client'   // Leaflet não funciona em SSR — obrigatório
import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Corrigir ícone padrão do Leaflet (problema comum com bundlers)
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: '/leaflet/marker-icon-2x.png',
  iconUrl: '/leaflet/marker-icon.png',
  shadowUrl: '/leaflet/marker-shadow.png',
})

interface MapViewProps {
  center?: [number, number]   // [lat, lon] — padrão Leaflet (invertido do GeoJSON!)
  zoom?: number
  geojson?: GeoJSON.FeatureCollection
  height?: string
}

export function MapView({
  center = [-15.7942, -47.8822],  // Brasília como centro padrão do Brasil
  zoom = 10,
  geojson,
  height = '400px'
}: MapViewProps) {
  const mapRef = useRef<L.Map | null>(null)
  const divRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!divRef.current || mapRef.current) return

    mapRef.current = L.map(divRef.current).setView(center, zoom)

    // Tile layer OpenStreetMap (gratuito, sem API key)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(mapRef.current)

    return () => { mapRef.current?.remove(); mapRef.current = null }
  }, [])

  // Atualizar GeoJSON quando mudar
  useEffect(() => {
    if (!mapRef.current || !geojson) return
    const layer = L.geoJSON(geojson, {
      onEachFeature: (feature, layer) => {
        if (feature.properties?.nome) {
          layer.bindPopup(feature.properties.nome)
        }
      }
    }).addTo(mapRef.current)
    mapRef.current.fitBounds(layer.getBounds())
    return () => { layer.remove() }
  }, [geojson])

  return (
    <div
      ref={divRef}
      style={{ height }}
      aria-label="Mapa interativo"
      role="img"
    />
  )
}
```

**Atenção — ordem de coordenadas:**
- **GeoJSON:** `[longitude, latitude]` (lon, lat)
- **Leaflet:** `[latitude, longitude]` (lat, lon)
- Sempre converter ao passar dados do GeoJSON para o Leaflet

### Camada WMS do GeoServer (quando disponível)

```ts
// Adicionar camada WMS do GeoServer ao mapa Leaflet
L.tileLayer.wms('http://geoserver.empresa.com/geoserver/wms', {
  layers: 'workspace:nome_da_camada',
  format: 'image/png',
  transparent: true,
  attribution: 'Fonte: GeoServer',
  crs: L.CRS.EPSG4326,   // SIRGAS 2000 ≈ WGS84 para fins práticos na web
}).addTo(mapRef.current)
```

---

## GeoServer (opcional — ver "Quando usar o quê")

GeoServer é um servidor de dados geoespaciais que publica camadas via
protocolos OGC (WMS, WFS, WCS). Adicionar ao projeto quando necessário.

### Container no docker-compose

```yaml
# docker-compose.yaml
services:
  geoserver:
    image: kartoza/geoserver:2.24.0
    environment:
      GEOSERVER_DATA_DIR: /opt/geoserver/data_dir
      GEOWEBCACHE_CACHE_DIR: /opt/geoserver/gwc
      GEOSERVER_ADMIN_PASSWORD: ${GEOSERVER_ADMIN_PASSWORD}
      POSTGRES_JNDI_ENABLED: "true"
      HOST: postgres
      POSTGRES_PORT: 5432
      POSTGRES_DB: ${POSTGRES_DB}
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASS: ${POSTGRES_PASSWORD}
    volumes:
      - geoserver_data:/opt/geoserver/data_dir
    ports:
      - "8080:8080"   # acesso à UI admin: http://localhost:8080/geoserver
    depends_on:
      - postgres

volumes:
  geoserver_data:
```

### Variáveis de ambiente

```bash
# .env.example
GEOSERVER_URL=http://geoserver:8080/geoserver
GEOSERVER_ADMIN_USER=admin
GEOSERVER_ADMIN_PASSWORD=        # nunca hardcoded
GEOSERVER_WORKSPACE=nome_do_projeto
```

### Configuração via REST API do GeoServer

O GeoServer expõe REST API para criar workspaces, stores e camadas
programaticamente — útil para automatizar a publicação de camadas:

```bash
# Criar workspace
curl -u admin:senha -X POST \
  http://geoserver/rest/workspaces \
  -H "Content-Type: application/json" \
  -d '{"workspace":{"name":"meu_projeto"}}'

# Publicar camada PostGIS via datastore
curl -u admin:senha -X POST \
  http://geoserver/rest/workspaces/meu_projeto/datastores \
  -H "Content-Type: application/json" \
  -d '{
    "dataStore": {
      "name": "postgis",
      "connectionParameters": {
        "host": "postgres", "port": 5432,
        "database": "meu_banco",
        "user": "usuario", "passwd": "senha",
        "dbtype": "postgis"
      }
    }
  }'
```

---

## Fontes de dados geográficos brasileiros

| Fonte | O que tem | URL |
|---|---|---|
| **IBGE** | Malha municipal, estadual, CEPs, setores censitários | https://geoftp.ibge.gov.br |
| **CONCAR** | Cartografia oficial do Brasil, normas INDE | https://www.concar.gov.br |
| **INDE** | Infraestrutura Nacional de Dados Espaciais — catálogo | https://inde.gov.br |
| **DNIT** | Rodovias federais, trechos, geometria viária | https://www.gov.br/dnit |
| **ANS/ANATEL** | Cobertura de planos, municípios atendidos | dados.gov.br |
| **OpenStreetMap Brasil** | Dado colaborativo, boa cobertura urbana | https://download.geofabrik.de/south-america/brazil.html |

**Formato de download padrão:** Shapefile (`.shp`) ou GeoPackage (`.gpkg`).
Para importar ao PostGIS:
```bash
# Importar Shapefile ao PostGIS (shp2pgsql ou ogr2ogr)
ogr2ogr -f "PostgreSQL" \
  PG:"host=localhost dbname=meu_banco user=usuario" \
  municipios_brasil.shp \
  -nln municipios \
  -t_srs EPSG:4674 \    # reprojetar para SIRGAS 2000 se necessário
  -lco GEOMETRY_NAME=geometria \
  -lco FID=id
```

---

## Checklist geo no dev-fullstack

- [ ] Extensão PostGIS habilitada no banco (`CREATE EXTENSION IF NOT EXISTS postgis`)
- [ ] SRID EPSG:4674 (SIRGAS 2000) em todas as colunas de geometria
- [ ] Índice GIST criado em toda coluna de geometria com busca espacial
- [ ] API retorna GeoJSON (RFC 7946) — coordenadas em [lon, lat]
- [ ] Leaflet renderizado client-side (Next.js: `'use client'`)
- [ ] Ícones do Leaflet corrigidos (problema do bundler)
- [ ] Coordenadas convertidas ao passar GeoJSON → Leaflet ([lon,lat] → [lat,lon])
- [ ] `aria-label` no container do mapa
- [ ] Se GeoServer: container no docker-compose + variáveis no .env.example
- [ ] Dados IBGE/externos: SRID verificado e reprojetado para EPSG:4674 se necessário
