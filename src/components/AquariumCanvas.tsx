'use client'

import { Simulation } from '@/simulation/core/Simulation'
import { useCallback, useEffect, useRef, useState } from 'react'

export default function AquariumCanvas() {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const simulationRef = useRef<Simulation | null>(null)
    const [isLoaded, setIsLoaded] = useState(false)

    // Mouse interaction state
    const isDragging = useRef(false)
    const lastMousePos = useRef({ x: 0, y: 0 })

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return

        // Set canvas size to fullscreen
        const updateSize = () => {
            canvas.width = window.innerWidth
            canvas.height = window.innerHeight
            if (simulationRef.current) {
                simulationRef.current.resize(canvas.width, canvas.height)
            }
        }

        updateSize()

        // Create and start simulation
        const simulation = new Simulation(canvas)
        simulationRef.current = simulation
        simulation.start().then(() => {
            setIsLoaded(true)
        })

        // Handle window resize
        window.addEventListener('resize', updateSize)

        // Pause when tab loses focus
        const handleVisibilityChange = () => {
            if (document.hidden && simulationRef.current) {
                simulationRef.current.pause()
            }
        }
        document.addEventListener('visibilitychange', handleVisibilityChange)

        // Cleanup
        return () => {
            window.removeEventListener('resize', updateSize)
            document.removeEventListener('visibilitychange', handleVisibilityChange)
            simulation.stop()
            simulationRef.current = null
        }
    }, [])

    // === EVENT HANDLERS ===

    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        if (e.button === 2) {
            // Right click - start panning
            isDragging.current = true
            lastMousePos.current = { x: e.clientX, y: e.clientY }
        } else if (e.button === 0) {
            // Left click - interaction
            simulationRef.current?.handleClick(e.clientX, e.clientY)
        }
    }, [])

    const handleMouseMove = useCallback((e: React.MouseEvent) => {
        if (isDragging.current && simulationRef.current) {
            const dx = lastMousePos.current.x - e.clientX
            const dy = lastMousePos.current.y - e.clientY
            simulationRef.current.pan(dx, dy)
            lastMousePos.current = { x: e.clientX, y: e.clientY }
        }
    }, [])

    const handleMouseUp = useCallback(() => {
        isDragging.current = false
    }, [])

    const handleWheel = useCallback((e: React.WheelEvent) => {
        if (simulationRef.current) {
            const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1
            simulationRef.current.zoom(zoomFactor, e.clientX, e.clientY)
        }
    }, [])

    const handleContextMenu = useCallback((e: React.MouseEvent) => {
        e.preventDefault() // Prevent context menu on right click
    }, [])

    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        if (!simulationRef.current) return

        switch (e.code) {
            case 'Space':
                e.preventDefault()
                simulationRef.current.togglePause()
                break
            case 'Digit1':
                simulationRef.current.setTimeScale(1)
                break
            case 'Digit2':
                simulationRef.current.setTimeScale(2)
                break
            case 'Digit3':
                simulationRef.current.setTimeScale(5)
                break
            case 'KeyR':
                simulationRef.current.resetCamera()
                break
        }
    }, [])

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [handleKeyDown])

    return (
        <div className="relative w-full h-screen overflow-hidden bg-black">
            <canvas
                ref={canvasRef}
                className="block"
                style={{ 
                    touchAction: 'none',
                    cursor: isDragging.current ? 'grabbing' : 'default'
                }}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onWheel={handleWheel}
                onContextMenu={handleContextMenu}
            />
            {!isLoaded && (
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-cyan-400 text-2xl font-mono animate-pulse">
                        Initializing Aquarium...
                    </div>
                </div>
            )}
            {/* Help overlay - bottom left */}
            <div className="absolute bottom-4 left-4 text-cyan-600 text-xs font-mono opacity-50 hover:opacity-100 transition-opacity">
                <div>SPACE - Pause</div>
                <div>1/2/3 - Speed x1/x2/x5</div>
                <div>R - Reset view</div>
                <div>Scroll - Zoom</div>
                <div>Right drag - Pan</div>
            </div>
        </div>
    )
}
