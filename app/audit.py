def auditar_controles(controles):
    resultados = []

    for control in controles:
        print(f"\n=== CONTROL: {control['id']} ===")
        print(control.get("titulo", ""))

        respuestas = []

        preguntas = control.get("preguntas", [])

        for p in preguntas:
            while True:
                resp = input(f"{p['texto']} (s/n): ").strip().lower()
                if resp in ["s", "n"]:
                    break
                print("Respuesta inválida")

            respuestas.append(resp == "s")

        # lógica simple: si todas son True → cumple
        cumple = all(respuestas) if respuestas else False

        resultado = {
            "control_id": control["id"],
            "cumple": cumple,
            "respuestas": respuestas
        }

        resultados.append(resultado)

        print(f"Resultado: {'CUMPLE' if cumple else 'NO CUMPLE'}")

    return resultados