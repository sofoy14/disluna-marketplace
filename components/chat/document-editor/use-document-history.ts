import { useState, useCallback } from 'react'

interface HistoryState {
    past: string[]
    present: string
    future: string[]
}

interface UseDocumentHistoryReturn {
    content: string
    setContent: (newContent: string) => void
    undo: () => void
    redo: () => void
    canUndo: boolean
    canRedo: boolean
}

export function useDocumentHistory(initialContent: string, limit: number = 50): UseDocumentHistoryReturn {
    const [state, setState] = useState<HistoryState>({
        past: [],
        present: initialContent,
        future: []
    })

    // Usamos referencia para evitar loops infinitos si el contenido cambia desde fuera
    // pero queremos que el usuario explícitamente llame a setContent para guardar en historial

    const setContent = useCallback((newContent: string) => {
        setState(currentState => {
            // Si el contenido es igual, no hacemos nada
            if (currentState.present === newContent) return currentState

            const newPast = [...currentState.past, currentState.present]
            if (newPast.length > limit) {
                newPast.shift() // Eliminar el más antiguo
            }

            return {
                past: newPast,
                present: newContent,
                future: [] // Limpiar futuro al hacer un nuevo cambio
            }
        })
    }, [limit])

    const undo = useCallback(() => {
        setState(currentState => {
            if (currentState.past.length === 0) return currentState

            const previous = currentState.past[currentState.past.length - 1]
            const newPast = currentState.past.slice(0, currentState.past.length - 1)

            return {
                past: newPast,
                present: previous,
                future: [currentState.present, ...currentState.future]
            }
        })
    }, [])

    const redo = useCallback(() => {
        setState(currentState => {
            if (currentState.future.length === 0) return currentState

            const next = currentState.future[0]
            const newFuture = currentState.future.slice(1)

            return {
                past: [...currentState.past, currentState.present],
                present: next,
                future: newFuture
            }
        })
    }, [])

    return {
        content: state.present,
        setContent,
        undo,
        redo,
        canUndo: state.past.length > 0,
        canRedo: state.future.length > 0
    }
}
