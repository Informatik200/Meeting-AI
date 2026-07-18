import os
import xml.etree.ElementTree as ET
from PIL import Image, ImageDraw, ImageFont

# Set output directory
DIAGRAMS_DIR = "/Users/rahultanwar/Documents/Codex/2026-07-15/build/meeting-ai/docs/diagrams"
os.makedirs(DIAGRAMS_DIR, exist_ok=True)

# Styles
BG_COLOR_HEX = "#0A0A0A"
BG_COLOR_RGB = (10, 10, 10)
STROKE_COLOR_HEX = "#FFFFFF"
STROKE_COLOR_RGB = (255, 255, 255)
TEXT_COLOR_HEX = "#E8E6E1"
TEXT_COLOR_RGB = (232, 230, 225)
ACCENT_COLOR_HEX = "#C8F135"
ACCENT_COLOR_RGB = (200, 241, 53)
SURFACE_COLOR_HEX = "#121212"
SURFACE_COLOR_RGB = (18, 18, 18)
ELEVATED_COLOR_HEX = "#1A1A1A"
ELEVATED_COLOR_RGB = (26, 26, 26)

def create_svg(filename, width, height, nodes, connections):
    filepath = os.path.join(DIAGRAMS_DIR, filename)
    svg_elements = []
    svg_elements.append(f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" viewBox="0 0 {width} {height}">')
    svg_elements.append(f'  <rect width="100%" height="100%" fill="{BG_COLOR_HEX}"/>')
    
    # Define marker for arrows
    svg_elements.append('  <defs>')
    svg_elements.append(f'    <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">')
    svg_elements.append(f'      <path d="M 0 1 L 10 5 L 0 9 z" fill="{STROKE_COLOR_HEX}"/>')
    svg_elements.append('    </marker>')
    svg_elements.append('  </defs>')

    # Connections
    for conn in connections:
        x1, y1, x2, y2 = conn['points']
        label = conn.get('label', '')
        svg_elements.append(f'  <path d="M {x1} {y1} L {x2} {y2}" stroke="{STROKE_COLOR_HEX}" stroke-width="1.5" fill="none" marker-end="url(#arrow)"/>')
        if label:
            lx, ly = (x1 + x2) / 2, (y1 + y2) / 2 - 8
            svg_elements.append(f'  <text x="{lx}" y="{ly}" fill="{TEXT_COLOR_HEX}" font-family="sans-serif" font-size="11" text-anchor="middle">{label}</text>')

    # Nodes
    for n in nodes:
        x, y, w, h = n['x'], n['y'], n['w'], n['h']
        label = n['label']
        shape = n.get('shape', 'rect')
        color = n.get('color', SURFACE_COLOR_HEX)
        border_color = n.get('border', STROKE_COLOR_HEX)
        
        if shape == 'cylinder':
            # Cylinder top ellipse
            svg_elements.append(f'  <path d="M {x} {y + 15} L {x} {y + h - 15} A {w/2} 15 0 0 0 {x + w} {y + h - 15} L {x + w} {y + 15} A {w/2} 15 0 0 0 {x} {y + 15} A {w/2} 15 0 0 0 {x + w} {y + 15} Z" fill="{color}" stroke="{border_color}" stroke-width="1.5"/>')
        else:
            # Rounded rect
            svg_elements.append(f'  <rect x="{x}" y="{y}" width="{w}" height="{h}" rx="8" ry="8" fill="{color}" stroke="{border_color}" stroke-width="1.5"/>')

        # Text (multiline support)
        lines = label.split('\n')
        start_y = y + (h - (len(lines) - 1) * 16) / 2 + 4
        for i, line in enumerate(lines):
            svg_elements.append(f'  <text x="{x + w/2}" y="{start_y + i*16}" fill="{TEXT_COLOR_HEX}" font-family="sans-serif" font-size="12" font-weight="bold" text-anchor="middle">{line}</text>')

    svg_elements.append('</svg>')
    
    with open(filepath, 'w') as f:
        f.write('\n'.join(svg_elements))
    print(f"Created SVG: {filename}")

def create_png(filename, width, height, nodes, connections):
    filepath = os.path.join(DIAGRAMS_DIR, filename)
    img = Image.new('RGB', (width, height), color=BG_COLOR_RGB)
    draw = ImageDraw.Draw(img)
    
    # Try to load a clean font, fallback to default
    try:
        font = ImageFont.load_default()
    except IOError:
        font = ImageFont.load_default()

    # Connections
    for conn in connections:
        x1, y1, x2, y2 = conn['points']
        draw.line([(x1, y1), (x2, y2)], fill=STROKE_COLOR_RGB, width=2)
        
        # Simple arrow tip drawing
        import math
        angle = math.atan2(y2 - y1, x2 - x1)
        arrow_len = 10
        ax1 = x2 - arrow_len * math.cos(angle - math.pi/6)
        ay1 = y2 - arrow_len * math.sin(angle - math.pi/6)
        ax2 = x2 - arrow_len * math.cos(angle + math.pi/6)
        ay2 = y2 - arrow_len * math.sin(angle + math.pi/6)
        draw.polygon([(x2, y2), (ax1, ay1), (ax2, ay2)], fill=STROKE_COLOR_RGB)

        # Label
        label = conn.get('label', '')
        if label:
            lx, ly = (x1 + x2) / 2, (y1 + y2) / 2 - 12
            draw.text((lx, ly), label, fill=TEXT_COLOR_RGB, anchor="ms", font=font)

    # Nodes
    for n in nodes:
        x, y, w, h = n['x'], n['y'], n['w'], n['h']
        label = n['label']
        shape = n.get('shape', 'rect')
        color_hex = n.get('color', SURFACE_COLOR_HEX)
        
        # Simple color mapping
        if color_hex == SURFACE_COLOR_HEX:
            color_rgb = SURFACE_COLOR_RGB
        elif color_hex == ELEVATED_COLOR_HEX:
            color_rgb = ELEVATED_COLOR_RGB
        else:
            color_rgb = SURFACE_COLOR_RGB

        border_hex = n.get('border', STROKE_COLOR_HEX)
        border_rgb = ACCENT_COLOR_RGB if border_hex == ACCENT_COLOR_HEX else STROKE_COLOR_RGB

        if shape == 'cylinder':
            # Simplistic 2D cylinder drawing: body rect + top/bottom ellipses
            draw.rectangle([x, y + 10, x + w, y + h - 10], fill=color_rgb, outline=border_rgb, width=2)
            draw.ellipse([x, y, x + w, y + 20], fill=color_rgb, outline=border_rgb, width=2)
            draw.ellipse([x, y + h - 20, x + w, y + h], fill=color_rgb, outline=border_rgb, width=2)
        else:
            # Rounded rect
            draw.rounded_rectangle([x, y, x + w, y + h], radius=8, fill=color_rgb, outline=border_rgb, width=2)

        # Label Text (multiline support)
        lines = label.split('\n')
        start_y = y + (h - (len(lines) - 1) * 16) / 2
        for i, line in enumerate(lines):
            draw.text((x + w/2, start_y + i*16), line, fill=TEXT_COLOR_RGB, anchor="mm", font=font)

    img.save(filepath, 'PNG')
    print(f"Created PNG: {filename}")

def create_drawio(filename, nodes, connections):
    filepath = os.path.join(DIAGRAMS_DIR, filename)
    root = ET.Element("mxfile", host="Electron", version="20.0.0", type="device")
    diagram = ET.SubElement(root, "diagram", id=filename.split('.')[0], name="Page-1")
    mxGraphModel = ET.SubElement(diagram, "mxGraphModel", dx="1000", dy="1000", grid="1", gridSize="10", guides="1", tooltips="1", connect="1", arrows="1", fold="1", page="1", pageScale="1", pageWidth="850", pageHeight="1100")
    root_cell = ET.SubElement(mxGraphModel, "root")
    
    # Layer cells
    ET.SubElement(root_cell, "mxCell", id="0")
    ET.SubElement(root_cell, "mxCell", id="1", parent="0")

    # Add Nodes
    for i, n in enumerate(nodes):
        nid = f"node_{i}"
        label = n['label'].replace('\n', '<br/>')
        shape = "mxgraph.flowchart.database" if n.get('shape') == 'cylinder' else "rounded=1"
        style = f"whiteSpace=wrap;html=1;fillColor={n.get('color', SURFACE_COLOR_HEX)};strokeColor={n.get('border', STROKE_COLOR_HEX)};fontColor={TEXT_COLOR_HEX};fontSize=12;fontStyle=1;{shape}"
        
        cell = ET.SubElement(root_cell, "mxCell", id=nid, value=label, style=style, vertex="1", parent="1")
        ET.SubElement(cell, "mxGeometry", x=str(n['x']), y=str(n['y']), width=str(n['w']), height=str(n['h']), as_="geometry")

    # Add Connections
    for j, conn in enumerate(connections):
        cid = f"conn_{j}"
        x1, y1, x2, y2 = conn['points']
        style = f"edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor={STROKE_COLOR_HEX};fillColor=none;strokeWidth=1.5;"
        
        cell = ET.SubElement(root_cell, "mxCell", id=cid, value=conn.get('label', ''), style=style, edge="1", parent="1")
        # Geometry with points
        geom = ET.SubElement(cell, "mxGeometry", relative="1", as_="geometry")
        mxPoint1 = ET.SubElement(geom, "mxPoint", x=str(x1), y=str(y1), as_="sourcePoint")
        mxPoint2 = ET.SubElement(geom, "mxPoint", x=str(x2), y=str(y2), as_="targetPoint")

    tree = ET.ElementTree(root)
    tree.write(filepath, encoding="utf-8", xml_declaration=True)
    print(f"Created Draw.io: {filename}")

# --- Generate All 7 Diagram Files ---

# 1. ARCHITECTURE Diagram
arch_nodes = [
    {"x": 50, "y": 150, "w": 140, "h": 80, "label": "Client Interface\n(Next.js App)", "border": ACCENT_COLOR_HEX},
    {"x": 260, "y": 80, "w": 180, "h": 70, "label": "FastAPI Web Server\n(API & Auth Rails)"},
    {"x": 260, "y": 220, "w": 180, "h": 70, "label": "Background Tasks\n(Pipeline Coordinator)"},
    {"x": 520, "y": 80, "w": 140, "h": 80, "label": "Database Engine\n(SQLite/PostgreSQL)", "shape": "cylinder"},
    {"x": 520, "y": 210, "w": 140, "h": 70, "label": "local whisper CLI\n(Transcription)"},
    {"x": 520, "y": 310, "w": 140, "h": 70, "label": "Google Gemini API\n(Summarization)"},
    {"x": 260, "y": 350, "w": 180, "h": 70, "label": "Future worker cluster\n(Celery / Redis)", "color": ELEVATED_COLOR_HEX}
]
arch_connections = [
    {"points": (190, 190, 260, 115), "label": "JSON / Cookie"},
    {"points": (260, 255, 190, 190), "label": "Poll / GET"},
    {"points": (350, 150, 350, 220), "label": "Delegate"},
    {"points": (440, 115, 520, 115), "label": "Query"},
    {"points": (440, 255, 520, 245), "label": "Spawn"},
    {"points": (440, 270, 520, 345), "label": "Request"},
    {"points": (350, 290, 350, 350), "label": "Scalability"}
]
create_svg("architecture.svg", 750, 450, arch_nodes, arch_connections)
create_png("architecture.png", 750, 450, arch_nodes, arch_connections)
create_drawio("architecture.drawio", arch_nodes, arch_connections)

# 2. APP_FLOW Diagram
flow_nodes = [
    {"x": 50, "y": 50, "w": 150, "h": 60, "label": "Unauthenticated User"},
    {"x": 250, "y": 50, "w": 150, "h": 60, "label": "AuthScreen\n(JWT Cookie Set)"},
    {"x": 450, "y": 50, "w": 150, "h": 60, "label": "Dashboard Main\n(Workspace Sheet)", "border": ACCENT_COLOR_HEX},
    {"x": 450, "y": 170, "w": 150, "h": 60, "label": "Capture Flow\n(Mic / Upload Trigger)"},
    {"x": 250, "y": 170, "w": 150, "h": 60, "label": "AI Processing Timeline\n(done / failed states)"},
    {"x": 50, "y": 170, "w": 150, "h": 60, "label": "Workspace Consumption\n(Overview / Chat / PDF)"}
]
flow_connections = [
    {"points": (200, 80, 250, 80), "label": "Redirect"},
    {"points": (400, 80, 450, 80), "label": "Success"},
    {"points": (525, 110, 525, 170), "label": "Record"},
    {"points": (450, 200, 400, 200), "label": "Background task"},
    {"points": (250, 200, 200, 200), "label": "Update UI"}
]
create_svg("app_flow.svg", 700, 300, flow_nodes, flow_connections)
create_png("app_flow.png", 700, 300, flow_nodes, flow_connections)
create_drawio("app_flow.drawio", flow_nodes, flow_connections)

# 3. BACKEND_SCHEMA Diagram
schema_nodes = [
    {"x": 50, "y": 50, "w": 160, "h": 90, "label": "users\n- id (PK)\n- email (UQ)\n- hashed_password", "shape": "cylinder"},
    {"x": 270, "y": 50, "w": 160, "h": 90, "label": "meetings\n- id (PK)\n- owner_id (FK)\n- status, summary", "shape": "cylinder"},
    {"x": 490, "y": 50, "w": 160, "h": 90, "label": "refresh_tokens\n- id (PK)\n- user_id (FK)\n- token_hash", "shape": "cylinder"},
    {"x": 270, "y": 190, "w": 160, "h": 90, "label": "meeting_entities\n- meeting_id (PK, FK)\n- entity_id (PK, FK)", "shape": "cylinder"},
    {"x": 50, "y": 190, "w": 160, "h": 90, "label": "entities\n- id (PK)\n- owner_id (FK)\n- name, category", "shape": "cylinder"}
]
schema_connections = [
    {"points": (210, 95, 270, 95), "label": "1 to *"},
    {"points": (210, 110, 490, 110), "label": "1 to *"},
    {"points": (350, 140, 350, 190), "label": "1 to *"},
    {"points": (210, 235, 270, 235), "label": "1 to *"}
]
create_svg("backend_schema.svg", 700, 330, schema_nodes, schema_connections)
create_png("backend_schema.png", 700, 330, schema_nodes, schema_connections)
create_drawio("backend_schema.drawio", schema_nodes, schema_connections)

# 4. IMPLEMENTATION_PLAN Diagram
impl_nodes = [
    {"x": 50, "y": 50, "w": 140, "h": 65, "label": "Phase 1: Foundations\nWhisper & APIs"},
    {"x": 240, "y": 50, "w": 140, "h": 65, "label": "Phase 2: Scalability\nBackground jobs"},
    {"x": 430, "y": 50, "w": 140, "h": 65, "label": "Phase 3: Auth & Sec\nJWT Cookie Isolation"},
    {"x": 430, "y": 170, "w": 140, "h": 65, "label": "Phase 4: Design Refine\nGraphite Dark UI"},
    {"x": 240, "y": 170, "w": 140, "h": 65, "label": "Production release\nRender / Railway"}
]
impl_connections = [
    {"points": (190, 82, 240, 82), "label": "Next"},
    {"points": (380, 82, 430, 82), "label": "Next"},
    {"points": (500, 115, 500, 170), "label": "Next"},
    {"points": (430, 202, 380, 202), "label": "Next"}
]
create_svg("implementation_plan.svg", 620, 290, impl_nodes, impl_connections)
create_png("implementation_plan.png", 620, 290, impl_nodes, impl_connections)
create_drawio("implementation_plan.drawio", impl_nodes, impl_connections)

# 5. TRD Sequence Diagram
trd_nodes = [
    {"x": 50, "y": 50, "w": 100, "h": 50, "label": "Next.js Client"},
    {"x": 250, "y": 50, "w": 100, "h": 50, "label": "FastAPI Web"},
    {"x": 450, "y": 50, "w": 100, "h": 50, "label": "SQLite/Postgres", "shape": "cylinder"},
    {"x": 250, "y": 160, "w": 100, "h": 50, "label": "Background Thread"}
]
trd_connections = [
    {"points": (100, 100, 250, 100), "label": "POST /upload"},
    {"points": (350, 100, 450, 100), "label": "Write initial row"},
    {"points": (300, 100, 300, 160), "label": "Delegate task"},
    {"points": (250, 120, 100, 120), "label": "Return metadata"},
    {"points": (100, 140, 250, 140), "label": "GET /meetings/{id} (polling)"}
]
create_svg("trd.svg", 600, 260, trd_nodes, trd_connections)
create_png("trd.png", 600, 260, trd_nodes, trd_connections)
create_drawio("trd.drawio", trd_nodes, trd_connections)

# 6. PRD User Journey Diagram
prd_nodes = [
    {"x": 50, "y": 50, "w": 120, "h": 60, "label": "1. Landing Area\nEmpty visual slate"},
    {"x": 220, "y": 50, "w": 120, "h": 60, "label": "2. Capture Trigger\nDrag / Mic recording"},
    {"x": 390, "y": 50, "w": 120, "h": 60, "label": "3. Polling checks\nLive updates"},
    {"x": 390, "y": 160, "w": 120, "h": 60, "label": "4. Consumption\nOverview / Transcribe"},
    {"x": 220, "y": 160, "w": 120, "h": 60, "label": "5. Memory Search\nAI grounding chat"}
]
prd_connections = [
    {"points": (170, 80, 220, 80), "label": "Upload"},
    {"points": (340, 80, 390, 80), "label": "Processing"},
    {"points": (450, 110, 450, 160), "label": "Completed"},
    {"points": (390, 190, 340, 190), "label": "Query tag graph"}
]
create_svg("prd.svg", 580, 280, prd_nodes, prd_connections)
create_png("prd.png", 580, 280, prd_nodes, prd_connections)
create_drawio("prd.drawio", prd_nodes, prd_connections)

# 7. UI_UX_BRIEF Layout Diagram
ui_nodes = [
    {"x": 50, "y": 50, "w": 130, "h": 120, "label": "Column 1: Sidebar Rail\n- Nav links (Home, Search)\n- Account settings\n(240px width)"},
    {"x": 220, "y": 50, "w": 200, "h": 120, "label": "Column 2: Workspace Sheet\n- Title (inline editable)\n- Tabs: Overview / Transcribe\n(720px max reading width)", "border": ACCENT_COLOR_HEX},
    {"x": 460, "y": 50, "w": 130, "h": 120, "label": "Column 3: AI Helper\n- Chat input console\n- Quick actions grid\n(320px width)"}
]
ui_connections = [
    {"points": (180, 110, 220, 110), "label": "Select"},
    {"points": (420, 110, 460, 110), "label": "Grounds"}
]
create_svg("ui_ux_brief.svg", 640, 220, ui_nodes, ui_connections)
create_png("ui_ux_brief.png", 640, 220, ui_nodes, ui_connections)
create_drawio("ui_ux_brief.drawio", ui_nodes, ui_connections)

print("ALL DIAGRAMS COMPLETED SUCCESSFULLY!")
