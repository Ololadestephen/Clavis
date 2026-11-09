#!/usr/bin/env python3
import os
import subprocess
import tempfile
from PIL import Image

WORKSPACE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
OUTPUT_DIR_BRAND = os.path.join(WORKSPACE_DIR, "brand", "social")
OUTPUT_DIR_FRONTEND = os.path.join(WORKSPACE_DIR, "frontend", "public", "brand", "social")
CHROME_PATH = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

os.makedirs(OUTPUT_DIR_BRAND, exist_ok=True)
os.makedirs(OUTPUT_DIR_FRONTEND, exist_ok=True)

ICON_PATH = os.path.join(WORKSPACE_DIR, "frontend", "public", "clavis-icon.png")
WORDMARK_PATH = os.path.join(WORKSPACE_DIR, "frontend", "public", "clavis-wordmark.png")
BOT_LOGO_PATH = os.path.join(WORKSPACE_DIR, "frontend", "public", "brand", "bot-chain-logo.svg")

def render_html_to_jpeg(html_content: str, width: int, height: int, output_base_name: str):
    with tempfile.NamedTemporaryFile("w", suffix=".html", delete=False) as f:
        f.write(html_content)
        temp_html = f.name

    temp_png = temp_html.replace(".html", ".png")

    try:
        cmd = [
            CHROME_PATH,
            "--headless=new",
            "--disable-gpu",
            "--force-device-scale-factor=1",
            f"--window-size={width},{height}",
            f"--screenshot={temp_png}",
            f"file://{temp_html}"
        ]
        subprocess.run(cmd, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)

        im = Image.open(temp_png).convert("RGB")
        im = im.crop((0, 0, width, height))

        out_brand = os.path.join(OUTPUT_DIR_BRAND, f"{output_base_name}.jpg")
        out_frontend = os.path.join(OUTPUT_DIR_FRONTEND, f"{output_base_name}.jpg")

        im.save(out_brand, "JPEG", quality=96, optimize=True)
        im.save(out_frontend, "JPEG", quality=96, optimize=True)

        print(f"✓ Generated: {output_base_name}.jpg ({width}x{height})")
    finally:
        if os.path.exists(temp_html):
            os.remove(temp_html)
        if os.path.exists(temp_png):
            os.remove(temp_png)


# -------------------------------------------------------------
# 1. X Profile Picture (PFP) - 800x800
# -------------------------------------------------------------
pfp_html = f"""<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * {{ box-sizing: border-box; margin: 0; padding: 0; }}
  body {{
    width: 800px;
    height: 800px;
    background: radial-gradient(circle at 50% 50%, #0d2644 0%, #051424 60%, #020811 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    position: relative;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  }}
  .glow {{
    position: absolute;
    width: 650px;
    height: 650px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(16, 163, 127, 0.22) 0%, rgba(212, 175, 55, 0.15) 35%, transparent 70%);
    filter: blur(40px);
  }}
  .outer-ring {{
    position: absolute;
    width: 720px;
    height: 720px;
    border-radius: 50%;
    border: 1.5px solid rgba(255, 249, 229, 0.08);
  }}
  .middle-ring {{
    position: absolute;
    width: 630px;
    height: 630px;
    border-radius: 50%;
    border: 1px dashed rgba(16, 163, 127, 0.35);
  }}
  .inner-ring {{
    position: absolute;
    width: 530px;
    height: 530px;
    border-radius: 50%;
    border: 1px solid rgba(212, 175, 55, 0.2);
  }}
  .logo-box {{
    position: relative;
    width: 460px;
    height: 460px;
    display: flex;
    align-items: center;
    justify-content: center;
    filter: drop-shadow(0 20px 40px rgba(0, 0, 0, 0.8)) drop-shadow(0 0 35px rgba(255, 249, 229, 0.25));
  }}
  .logo-box img {{
    width: 100%;
    height: 100%;
    object-fit: contain;
  }}
</style>
</head>
<body>
  <div class="glow"></div>
  <div class="outer-ring"></div>
  <div class="middle-ring"></div>
  <div class="inner-ring"></div>
  <div class="logo-box">
    <img src="file://{ICON_PATH}" alt="Clavis Logo">
  </div>
</body>
</html>"""


# -------------------------------------------------------------
# 2. X Header / Cover Banner - 1500x500
# -------------------------------------------------------------
cover_html = f"""<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * {{ box-sizing: border-box; margin: 0; padding: 0; }}
  body {{
    width: 1500px;
    height: 500px;
    background: linear-gradient(135deg, #020912 0%, #051424 45%, #082138 85%, #04121f 100%);
    overflow: hidden;
    position: relative;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    color: #fff9e5;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 80px 0 380px; /* Leave left 380px clear for X avatar */
  }}
  .bg-grid {{
    position: absolute;
    inset: 0;
    background-image: 
      linear-gradient(to right, rgba(255,255,255,0.02) 1px, transparent 1px),
      linear-gradient(to bottom, rgba(255,255,255,0.02) 1px, transparent 1px);
    background-size: 40px 40px;
    opacity: 0.6;
  }}
  .ambient-glow-1 {{
    position: absolute;
    top: -150px;
    left: 200px;
    width: 600px;
    height: 600px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(16, 163, 127, 0.16) 0%, transparent 65%);
    filter: blur(60px);
  }}
  .ambient-glow-2 {{
    position: absolute;
    bottom: -150px;
    right: 100px;
    width: 700px;
    height: 700px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(212, 175, 55, 0.12) 0%, transparent 65%);
    filter: blur(60px);
  }}
  .left-content {{
    position: relative;
    z-index: 2;
    max-width: 620px;
  }}
  .badge {{
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 6px 14px;
    background: rgba(16, 163, 127, 0.12);
    border: 1px solid rgba(16, 163, 127, 0.35);
    border-radius: 20px;
    font-size: 13px;
    font-weight: 600;
    color: #34d399;
    letter-spacing: 0.8px;
    text-transform: uppercase;
    margin-bottom: 16px;
  }}
  .badge-dot {{
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: #10B981;
    box-shadow: 0 0 10px #10B981;
  }}
  .title-row {{
    display: flex;
    align-items: center;
    gap: 18px;
    margin-bottom: 8px;
  }}
  .title-icon {{
    width: 68px;
    height: 68px;
    filter: drop-shadow(0 0 15px rgba(255, 249, 229, 0.3));
  }}
  .title-icon img {{
    width: 100%;
    height: 100%;
    object-fit: contain;
  }}
  h1 {{
    font-size: 48px;
    font-weight: 800;
    letter-spacing: -0.5px;
    color: #ffffff;
    text-shadow: 0 2px 10px rgba(0, 0, 0, 0.5);
  }}
  .headline {{
    font-size: 20px;
    font-weight: 600;
    color: #e2e8f0;
    margin-bottom: 12px;
    letter-spacing: -0.2px;
  }}
  .subtext {{
    font-size: 15px;
    line-height: 1.5;
    color: #94a3b8;
    margin-bottom: 22px;
  }}
  .pills {{
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
  }}
  .pill {{
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 6px;
    font-size: 13px;
    color: #cbd5e1;
  }}
  .right-card {{
    position: relative;
    z-index: 2;
    width: 380px;
    background: rgba(8, 25, 43, 0.7);
    border: 1px solid rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(16px);
    border-radius: 16px;
    padding: 24px;
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.1);
  }}
  .card-top {{
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    padding-bottom: 14px;
    margin-bottom: 16px;
  }}
  .card-label {{
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 1px;
    color: #64748b;
    font-weight: 700;
  }}
  .card-status {{
    font-size: 12px;
    font-weight: 600;
    color: #10B981;
    background: rgba(16, 185, 129, 0.15);
    padding: 3px 8px;
    border-radius: 4px;
  }}
  .card-row {{
    display: flex;
    justify-content: space-between;
    margin-bottom: 12px;
    font-size: 13px;
  }}
  .card-row span {{ color: #94a3b8; }}
  .card-row strong {{ color: #f8fafc; font-weight: 600; }}
  .card-divider {{
    height: 1px;
    background: rgba(255, 255, 255, 0.08);
    margin: 14px 0;
  }}
  .card-footer {{
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 12px;
    color: #38bdf8;
  }}
</style>
</head>
<body>
  <div class="bg-grid"></div>
  <div class="ambient-glow-1"></div>
  <div class="ambient-glow-2"></div>

  <div class="left-content">
    <div class="badge">
      <span class="badge-dot"></span>
      BOT Chain Mainnet &middot; Chain ID 677
    </div>
    <div class="title-row">
      <div class="title-icon">
        <img src="file://{ICON_PATH}" alt="Clavis">
      </div>
      <h1>Clavis</h1>
    </div>
    <div class="headline">Programmable Native-BOT Inheritance Vault</div>
    <p class="subtext">
      On-chain asset custody escrow secured by multi-guardian consensus, proof-of-life heartbeats, and timelocked beneficiary release.
    </p>
    <div class="pills">
      <span class="pill">✦ Multi-Guardian Consensus</span>
      <span class="pill">✦ Proof-of-Life Timelocks</span>
      <span class="pill">✦ 100% Native BOT Custody</span>
      <span class="pill">✦ Isolated Vault Liabilities</span>
    </div>
  </div>

  <div class="right-card">
    <div class="card-top">
      <span class="card-label">On-Chain Escrow Protocol</span>
      <span class="card-status">Mainnet Active</span>
    </div>
    <div class="card-row">
      <span>Asset Custody:</span>
      <strong>Native BOT Escrow</strong>
    </div>
    <div class="card-row">
      <span>Consensus Model:</span>
      <strong>M-of-N Guardians (2/3)</strong>
    </div>
    <div class="card-row">
      <span>Heartbeat Automation:</span>
      <strong>Monotonic Request IDs</strong>
    </div>
    <div class="card-row">
      <span>Release Execution:</span>
      <strong>Direct On-Chain Transfer</strong>
    </div>
    <div class="card-divider"></div>
    <div class="card-footer">
      <span>Secured by BOT Chain</span>
      <strong>scan.botchain.ai</strong>
    </div>
  </div>
</body>
</html>"""


# -------------------------------------------------------------
# 3. Partnership Announcement Graphic - 1600x900
# -------------------------------------------------------------
partnership_html = f"""<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * {{ box-sizing: border-box; margin: 0; padding: 0; }}
  body {{
    width: 1600px;
    height: 900px;
    background: radial-gradient(circle at 50% 30%, #0a2542 0%, #041424 55%, #01070e 100%);
    overflow: hidden;
    position: relative;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    color: #ffffff;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 60px 80px;
  }}
  .bg-grid {{
    position: absolute;
    inset: 0;
    background-image: 
      linear-gradient(to right, rgba(255,255,255,0.02) 1px, transparent 1px),
      linear-gradient(to bottom, rgba(255,255,255,0.02) 1px, transparent 1px);
    background-size: 50px 50px;
  }}
  .glow-left {{
    position: absolute;
    top: 200px;
    left: 100px;
    width: 600px;
    height: 600px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(212, 175, 55, 0.14) 0%, transparent 65%);
    filter: blur(70px);
  }}
  .glow-right {{
    position: absolute;
    top: 200px;
    right: 100px;
    width: 600px;
    height: 600px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(16, 163, 127, 0.2) 0%, transparent 65%);
    filter: blur(70px);
  }}
  .badge {{
    position: relative;
    z-index: 2;
    display: inline-flex;
    align-items: center;
    gap: 10px;
    padding: 8px 20px;
    background: rgba(16, 163, 127, 0.15);
    border: 1px solid rgba(16, 163, 127, 0.4);
    border-radius: 30px;
    font-size: 14px;
    font-weight: 700;
    color: #34d399;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    margin-bottom: 35px;
  }}
  .badge-dot {{
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #10B981;
    box-shadow: 0 0 12px #10B981;
  }}
  
  .logos-container {{
    position: relative;
    z-index: 2;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 40px;
    margin-bottom: 45px;
  }}
  .logo-card {{
    width: 360px;
    height: 180px;
    background: rgba(13, 31, 53, 0.65);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 20px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 20px;
    box-shadow: 0 25px 50px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(12px);
  }}
  .logo-card.clavis {{
    border-color: rgba(212, 175, 55, 0.35);
  }}
  .logo-card.botchain {{
    border-color: rgba(16, 163, 127, 0.35);
  }}
  .clavis-brand-inner {{
    display: flex;
    align-items: center;
    gap: 16px;
  }}
  .clavis-brand-inner img {{
    height: 60px;
    width: 60px;
    object-fit: contain;
  }}
  .clavis-name {{
    font-size: 38px;
    font-weight: 800;
    letter-spacing: -0.5px;
    color: #ffffff;
  }}
  .card-subtitle {{
    font-size: 13px;
    color: #94a3b8;
    text-transform: uppercase;
    letter-spacing: 1px;
    margin-top: 8px;
  }}
  .bot-logo-inner {{
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
  }}
  .bot-logo-inner img {{
    height: 48px;
    max-width: 280px;
    object-fit: contain;
  }}
  .cross-node {{
    display: flex;
    align-items: center;
    justify-content: center;
    width: 64px;
    height: 64px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.2);
    font-size: 28px;
    font-weight: 300;
    color: #cbd5e1;
    box-shadow: 0 0 30px rgba(16, 163, 127, 0.3);
  }}
  
  .headline-box {{
    position: relative;
    z-index: 2;
    text-align: center;
    max-width: 1000px;
    margin-bottom: 45px;
  }}
  h2 {{
    font-size: 46px;
    font-weight: 800;
    letter-spacing: -0.5px;
    color: #ffffff;
    margin-bottom: 14px;
    text-shadow: 0 3px 15px rgba(0, 0, 0, 0.6);
  }}
  .subhead {{
    font-size: 20px;
    color: #94a3b8;
    line-height: 1.5;
  }}

  .features-grid {{
    position: relative;
    z-index: 2;
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 24px;
    max-width: 1200px;
    width: 100%;
    margin-bottom: 40px;
  }}
  .feature-item {{
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 12px;
    padding: 20px 24px;
    backdrop-filter: blur(8px);
  }}
  .feature-item h3 {{
    font-size: 16px;
    font-weight: 700;
    color: #f1f5f9;
    margin-bottom: 8px;
    display: flex;
    align-items: center;
    gap: 8px;
  }}
  .feature-item h3 span {{
    color: #10B981;
  }}
  .feature-item p {{
    font-size: 14px;
    color: #94a3b8;
    line-height: 1.45;
  }}
  
  .footer-row {{
    position: relative;
    z-index: 2;
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    max-width: 1200px;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
    padding-top: 24px;
    font-size: 14px;
    color: #64748b;
  }}
  .footer-row strong {{
    color: #38bdf8;
  }}
</style>
</head>
<body>
  <div class="bg-grid"></div>
  <div class="glow-left"></div>
  <div class="glow-right"></div>

  <div class="badge">
    <span class="badge-dot"></span>
    Official Ecosystem Partnership &middot; BOT Chain Mainnet
  </div>

  <div class="logos-container">
    <div class="logo-card clavis">
      <div class="clavis-brand-inner">
        <img src="file://{ICON_PATH}" alt="Clavis">
        <div class="clavis-name">Clavis</div>
      </div>
      <div class="card-subtitle">Programmable Inheritance Vault</div>
    </div>

    <div class="cross-node">&times;</div>

    <div class="logo-card botchain">
      <div class="bot-logo-inner">
        <img src="file://{BOT_LOGO_PATH}" alt="BOT Chain">
      </div>
      <div class="card-subtitle">AI & EVM Infrastructure Layer</div>
    </div>
  </div>

  <div class="headline-box">
    <h2>Securing Digital Continuity & Native Asset Inheritance</h2>
    <p class="subhead">
      Clavis deploys programmable multi-guardian inheritance escrow to the BOT Chain Mainnet ecosystem.
    </p>
  </div>

  <div class="features-grid">
    <div class="feature-item">
      <h3><span>✦</span> Native BOT Escrow</h3>
      <p>Explicit on-chain fund accounting. Escrowed BOT is held directly on BOT Chain with zero intermediate bridge risks.</p>
    </div>
    <div class="feature-item">
      <h3><span>✦</span> Multi-Guardian Consensus</h3>
      <p>Configured guardians verify inactivity without ever obtaining custody or redirection rights over the escrowed funds.</p>
    </div>
    <div class="feature-item">
      <h3><span>✦</span> Proof-of-Life Timelocks</h3>
      <p>Automated heartbeat countdowns, monotonic recovery IDs, and grace periods with full owner cancellation control.</p>
    </div>
  </div>

  <div class="footer-row">
    <span>Ecosystem Deployment: <strong>BOT Chain Mainnet (Chain ID 677)</strong></span>
    <span>Explorer & Verification: <strong>scan.botchain.ai</strong></span>
  </div>
</body>
</html>"""

def main():
    print("Generating social assets in JPEG format...")
    render_html_to_jpeg(pfp_html, 800, 800, "clavis-x-pfp-800x800")
    render_html_to_jpeg(pfp_html, 800, 800, "clavis-pfp")
    
    render_html_to_jpeg(cover_html, 1500, 500, "clavis-x-cover-1500x500")
    render_html_to_jpeg(cover_html, 1500, 500, "clavis-cover")
    
    render_html_to_jpeg(partnership_html, 1600, 900, "clavis-botchain-partnership-1600x900")
    render_html_to_jpeg(partnership_html, 1600, 900, "clavis-partnership")
    print("All assets generated successfully!")

if __name__ == "__main__":
    main()
