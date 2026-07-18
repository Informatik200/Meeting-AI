import os
import re

REPO_DIR = "/Users/rahultanwar/Documents/Codex/2026-07-15/build/meeting-ai"
IMAGE_REGEX = re.compile(r'!\[.*?\]\((.*?)\)')

def validate_markdown_images():
    print("Starting Markdown Image Validation...\n")
    results = []
    
    # Walk through the repo
    for root, dirs, files in os.walk(REPO_DIR):
        # Skip dependency/venv folders
        if any(skip in root for skip in [".venv", "node_modules", ".git", ".npm-cache"]):
            continue
            
        for file in files:
            if file.endswith(".md"):
                md_path = os.path.join(root, file)
                rel_md_path = os.path.relpath(md_path, REPO_DIR)
                
                with open(md_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                    
                matches = IMAGE_REGEX.findall(content)
                for img_path in matches:
                    # Resolve path relative to the markdown file's directory
                    md_dir = os.path.dirname(md_path)
                    resolved_img_path = os.path.abspath(os.path.join(md_dir, img_path))
                    exists = os.path.exists(resolved_img_path)
                    
                    results.append({
                        "file": rel_md_path,
                        "img_path": img_path,
                        "resolved_path": resolved_img_path,
                        "exists": exists
                    })
                    
    print("| Markdown File | Image Path | Exists |")
    print("|---|---|---|")
    for r in results:
        print(f"| {r['file']} | {r['img_path']} | {r['exists']} |")

if __name__ == "__main__":
    validate_markdown_images()
