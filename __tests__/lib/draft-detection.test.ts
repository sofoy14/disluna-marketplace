import { detectDraftIntent } from "@/lib/draft-detection"

describe('detectDraftIntent', () => {
    it('should detect strong keywords', () => {
        const result = detectDraftIntent('necesito un contrato de arrendamiento')
        expect(result.isDraft).toBe(true)
        expect(result.type).toBe('contrato')
    })

    it('should detect explicit drafting verbs', () => {
        const result = detectDraftIntent('redacta una tutela de salud')
        expect(result.isDraft).toBe(true)
        expect(result.type).toBe('tutela')
    })

    it('should not detect casual conversation', () => {
        const result = detectDraftIntent('hola, ¿cómo estás?')
        expect(result.isDraft).toBe(false)
    })

    it('should identify new document types', () => {
        const result = detectDraftIntent('necesito redactar una incapacidad')
        expect(result.isDraft).toBe(true)
        expect(result.type).toBe('incapacidad')
    })

    it('should return high confidence for explicit requests', () => {
        const result = detectDraftIntent('hazme un derecho de petición')
        expect(result.confidence).toBeGreaterThan(0.7)
    })
})
