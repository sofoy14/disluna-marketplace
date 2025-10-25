import { parseModelAnswer } from "../../../lib/parsers/model-answer"

const sampleContent = `
Planteamiento del problema jurídico

El Ministerio Público consulta sobre la aplicación de la Ley 1437 de 2011.

## Bibliografía
- [Ley 1437 de 2011](https://www.suin.gov.co/lei-1437-2011)
- Sentencia T-123 de 2018 — Corte Constitucional (https://www.corteconstitucional.gov.co/T-123-18)
`

describe("parseModelAnswer", () => {
  it("separates bibliography section and normalizes citations", () => {
    const result = parseModelAnswer(sampleContent)

    expect(result.text).toContain("Planteamiento del problema jurídico")
    expect(result.text).not.toContain("Bibliografía")
    expect(result.citations).toBeDefined()
    expect(result.citations?.length).toBe(2)
    expect(result.citations?.[0].title).toBe("Ley 1437 de 2011")
    expect(result.citations?.[0].url).toBe("https://www.suin.gov.co/lei-1437-2011")
  })

  it("detects inline bibliography sentences", () => {
    const content = `
Análisis preliminar

Fuentes consultadas: [Decreto 1082 de 2015](https://www.funcionpublica.gov.co/decreto-1082) ; Resolución 123 del 2020 https://www.minjusticia.gov.co/res-123-2020
`
    const result = parseModelAnswer(content)

    expect(result.text).not.toContain("Fuentes consultadas")
    expect(result.citations?.length).toBe(2)
    expect(result.citations?.[0].title).toContain("Decreto 1082 de 2015")
    expect(result.citations?.[1].url).toBe("https://www.minjusticia.gov.co/res-123-2020")
  })

  it("uses backend bibliography when available", () => {
    const backendResult = parseModelAnswer("Respuesta sin sección visible", {
      citationsFromBackend: [
        {
          id: "foo",
          title: "Ley 80 de 1993",
          url: "https://www.suin.gov.co/ley-80-1993",
          type: "ley",
          description: "Contratación estatal"
        }
      ]
    })

    expect(backendResult.text).toBe("Respuesta sin sección visible")
    expect(backendResult.citations?.length).toBe(1)
    expect(backendResult.citations?.[0].title).toBe("Ley 80 de 1993")
    expect(backendResult.citations?.[0].type).toBe("ley")
  })

  it("returns clean text when no citations are present", () => {
    const content = "Respuesta directa sin referencias externas."
    const result = parseModelAnswer(content)

    expect(result.text).toBe(content)
    expect(result.citations).toBeUndefined()
  })
})
