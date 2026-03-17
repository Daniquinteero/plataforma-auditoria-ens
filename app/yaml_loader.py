import yaml
from pathlib import Path


def load_catalog(path: str) -> dict:
    """
    Carga el catálogo de controles desde un fichero YAML.

    :param path: ruta al archivo YAML
    :return: diccionario con el contenido del catálogo
    """
    file_path = Path(path)

    if not file_path.exists():
        raise FileNotFoundError(f"No se encontró el archivo: {path}")

    with open(file_path, "r", encoding="utf-8") as f:
        data = yaml.safe_load(f)

    if data is None:
        raise ValueError("El archivo YAML está vacío")

    validate_catalog(data)

    return data


def validate_catalog(data: dict) -> None:
    """
    Validaciones básicas del catálogo.
    Lanza excepción si algo está mal.
    """

    if "controles" not in data:
        raise ValueError("El catálogo debe tener una clave 'controles'")

    if not isinstance(data["controles"], list):
        raise ValueError("'controles' debe ser una lista")

    ids = set()

    for control in data["controles"]:
        if "id" not in control:
            raise ValueError("Todos los controles deben tener 'id'")

        if control["id"] in ids:
            raise ValueError(f"ID duplicado: {control['id']}")

        ids.add(control["id"])

