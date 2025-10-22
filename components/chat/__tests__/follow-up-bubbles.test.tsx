import { render, screen, fireEvent } from '@testing-library/react'
import { FollowUpBubbles, generateSimilarFollowUps } from '../follow-up-bubbles'

// Mock de framer-motion para evitar problemas en tests
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}))

describe('generateSimilarFollowUps', () => {
  it('debe generar 3 preguntas para área laboral', () => {
    const result = generateSimilarFollowUps(
      "¿Cuándo firmaste el contrato y con qué empresa?",
      { practiceArea: "laboral", jurisdiction: "Colombia" }
    )

    expect(result).toHaveLength(3)
    expect(result.every(q => q.length <= 90)).toBe(true)
    expect(result.every(q => q.includes('¿'))).toBe(true)
  })

  it('debe generar preguntas relevantes para área penal', () => {
    const result = generateSimilarFollowUps(
      "¿En qué ciudad ocurrió el hecho?",
      { practiceArea: "penal" }
    )

    expect(result).toHaveLength(3)
    expect(result.some(q => q.includes('fecha') || q.includes('hora'))).toBe(true)
    expect(result.some(q => q.includes('testigo') || q.includes('cámara'))).toBe(true)
  })

  it('debe generar preguntas relevantes para área civil', () => {
    const result = generateSimilarFollowUps(
      "¿Cuál es el valor adeudado y desde cuándo?",
      { practiceArea: "civil" }
    )

    expect(result).toHaveLength(3)
    expect(result.some(q => q.includes('contrato') || q.includes('factura'))).toBe(true)
    expect(result.some(q => q.includes('requerimiento') || q.includes('pago'))).toBe(true)
  })

  it('debe generar preguntas relevantes para área familia', () => {
    const result = generateSimilarFollowUps(
      "¿Buscas divorcio de mutuo acuerdo o contencioso?",
      { practiceArea: "familia" }
    )

    expect(result).toHaveLength(3)
    expect(result.some(q => q.includes('hijo') || q.includes('bien'))).toBe(true)
    expect(result.some(q => q.includes('acuerdo') || q.includes('custodia'))).toBe(true)
  })

  it('debe usar fallback genérico para preguntas cortas', () => {
    const result = generateSimilarFollowUps("Hola")

    expect(result).toHaveLength(3)
    expect(result.every(q => q.length <= 90)).toBe(true)
  })

  it('no debe repetir la pregunta original', () => {
    const original = "¿Cuándo ocurrió el accidente?"
    const result = generateSimilarFollowUps(original)

    expect(result).not.toContain(original)
    expect(result.every(q => q !== original)).toBe(true)
  })

  it('debe filtrar preguntas demasiado largas', () => {
    const result = generateSimilarFollowUps(
      "¿Puedes proporcionarme información detallada sobre todos los aspectos relacionados con este caso legal?"
    )

    expect(result.every(q => q.length <= 90)).toBe(true)
  })

  it('debe deduplicar preguntas semánticamente similares', () => {
    const result = generateSimilarFollowUps(
      "¿Cuándo ocurrió el hecho?",
      { practiceArea: "penal" }
    )

    const normalized = result.map(q => 
      q.toLowerCase().replace(/[¿?¡!.,;:]/g, '').trim()
    )
    const unique = [...new Set(normalized)]
    
    expect(normalized.length).toBe(unique.length)
  })
})

describe('FollowUpBubbles component', () => {
  const mockOnSelect = jest.fn()

  beforeEach(() => {
    mockOnSelect.mockClear()
  })

  it('debe renderizar 3 burbujas', () => {
    render(
      <FollowUpBubbles
        lastBotQuestion="¿Cuándo ocurrió el accidente?"
        onSelect={mockOnSelect}
      />
    )

    const buttons = screen.getAllByRole('button')
    expect(buttons).toHaveLength(3)
  })

  it('debe llamar onSelect al hacer clic en una burbuja', () => {
    render(
      <FollowUpBubbles
        lastBotQuestion="¿Cuándo ocurrió el accidente?"
        onSelect={mockOnSelect}
      />
    )

    const firstButton = screen.getAllByRole('button')[0]
    fireEvent.click(firstButton)

    expect(mockOnSelect).toHaveBeenCalledTimes(1)
    expect(typeof mockOnSelect.mock.calls[0][0]).toBe('string')
  })

  it('debe tener aria-label correcto', () => {
    render(
      <FollowUpBubbles
        lastBotQuestion="¿Cuándo ocurrió el accidente?"
        onSelect={mockOnSelect}
      />
    )

    const buttons = screen.getAllByRole('button')
    buttons.forEach(button => {
      expect(button).toHaveAttribute('aria-label')
      expect(button.getAttribute('aria-label')).toMatch(/^Sugerencia: /)
    })
  })

  it('debe ser navegable por teclado', () => {
    render(
      <FollowUpBubbles
        lastBotQuestion="¿Cuándo ocurrió el accidente?"
        onSelect={mockOnSelect}
      />
    )

    const firstButton = screen.getAllByRole('button')[0]
    
    // Test Enter key
    fireEvent.keyDown(firstButton, { key: 'Enter' })
    expect(mockOnSelect).toHaveBeenCalledTimes(1)

    mockOnSelect.mockClear()

    // Test Space key
    fireEvent.keyDown(firstButton, { key: ' ' })
    expect(mockOnSelect).toHaveBeenCalledTimes(1)
  })

  it('debe mostrar el título', () => {
    render(
      <FollowUpBubbles
        lastBotQuestion="¿Cuándo ocurrió el accidente?"
        onSelect={mockOnSelect}
      />
    )

    expect(screen.getByText('Sigue con una de estas preguntas')).toBeInTheDocument()
  })

  it('debe aceptar className personalizado', () => {
    const { container } = render(
      <FollowUpBubbles
        lastBotQuestion="¿Cuándo ocurrió el accidente?"
        onSelect={mockOnSelect}
        className="custom-class"
      />
    )

    expect(container.firstChild).toHaveClass('custom-class')
  })

  it('no debe renderizar si la pregunta es muy corta', () => {
    const { container } = render(
      <FollowUpBubbles
        lastBotQuestion="Hi"
        onSelect={mockOnSelect}
      />
    )

    // Debe renderizar con fallback genérico
    expect(container.querySelector('[role="button"]')).toBeTruthy()
  })

  it('debe contextualizar por jurisdicción y área práctica', () => {
    render(
      <FollowUpBubbles
        lastBotQuestion="¿Cuándo firmaste el contrato?"
        jurisdiction="Colombia"
        practiceArea="laboral"
        onSelect={mockOnSelect}
      />
    )

    const buttons = screen.getAllByRole('button')
    expect(buttons).toHaveLength(3)
    
    // Al menos una pregunta debe ser relevante al área laboral
    const buttonTexts = buttons.map(b => b.textContent || '')
    expect(buttonTexts.some(text => 
      text.includes('contrato') || text.includes('cargo') || text.includes('empresa')
    )).toBe(true)
  })
})
