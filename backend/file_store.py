from pathlib import Path
import re
import shutil


FILES_BASE_DIR = Path("storage/files")


def safe_filename(filename: str) -> str:
    filename = filename.strip()
    filename = re.sub(r"[^a-zA-Z0-9._-]+", "_", filename)
    return filename or "evidence"


def save_uploaded_file(audit_id: str, control_id: str, filename: str, content: bytes) -> str:
    safe_name = safe_filename(filename)

    folder = FILES_BASE_DIR / audit_id / control_id
    folder.mkdir(parents=True, exist_ok=True)

    path = folder / safe_name

    if path.exists():
        stem = path.stem
        suffix = path.suffix
        i = 1
        while True:
            candidate = folder / f"{stem}_{i}{suffix}"
            if not candidate.exists():
                path = candidate
                break
            i += 1

    path.write_bytes(content)

    return str(path.as_posix())



def delete_audit_files(audit_id: str):
    folder = FILES_BASE_DIR / audit_id
    if folder.exists() and folder.is_dir():
        shutil.rmtree(folder)